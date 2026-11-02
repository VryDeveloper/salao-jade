import { randomBytes } from "node:crypto";
import type { Experience, Prisma } from "@/generated/prisma/client";
import { addDays, buildSlots, salonDate, salonTime, salonWeekday, type Slot } from "./availability";
import { db } from "./db";

type Client = typeof db | Prisma.TransactionClient;

export class BookingError extends Error {}

export const BOOKING_WINDOW_DAYS = 7;

export function getActiveExperiences() {
  return db.experience.findMany({ where: { active: true }, orderBy: { durationMin: "asc" } });
}

/** Horário de funcionamento de cada dia; null = fechado (sem expediente ou com folga cadastrada). */
export async function getSchedule(dates: string[], client: Client = db) {
  const [hours, closures] = await Promise.all([
    client.openingHours.findMany(),
    client.closure.findMany({ where: { date: { in: dates.map((d) => new Date(d)) } } }),
  ]);
  const closed = new Set(closures.map((c) => c.date.toISOString().slice(0, 10)));
  return dates.map((date) => ({
    date,
    hours: closed.has(date) ? null : (hours.find((h) => h.weekday === salonWeekday(date)) ?? null),
  }));
}

/** Os horários do dia para a experiência, com as reservas atuais do banco. */
export async function getSlots(experience: Experience, date: string, now: Date, client: Client = db): Promise<Slot[]> {
  const dayStart = salonTime(date, 0);
  const dayEnd = salonTime(addDays(date, 1), 0);
  const [[{ hours }], bookings] = await Promise.all([
    getSchedule([date], client),
    client.booking.findMany({
      where: { experienceId: experience.id, status: "CONFIRMED", startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return buildSlots({ date, hours, durationMin: experience.durationMin, capacity: experience.capacity, bookings, now });
}

type NewBooking = { userId: string; experienceId: string; startsAt: Date; guests: number; now?: Date };

/**
 * Cria a reserva sem estourar a capacidade, mesmo com pedidos simultâneos:
 * trava a linha da experiência (FOR UPDATE) para que as reservas dela sejam
 * checadas e gravadas uma de cada vez, e reusa buildSlots para validar o horário.
 */
export function createBooking({ userId, experienceId, startsAt, guests, now = new Date() }: NewBooking) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM "Experience" WHERE id = ${experienceId} FOR UPDATE`;
    const experience = await tx.experience.findUnique({ where: { id: experienceId } });
    if (!experience?.active) throw new BookingError("Essa experiência não está disponível.");
    if (guests < 1 || guests > experience.maxGuests) {
      throw new BookingError(`${experience.name} aceita de 1 a ${experience.maxGuests} pessoas.`);
    }

    const slots = await getSlots(experience, salonDate(startsAt), now, tx);
    const slot = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
    if (!slot?.available) throw new BookingError("Esse horário acabou de ficar indisponível. Escolha outro.");

    return tx.booking.create({
      data: {
        code: `JD-${randomBytes(3).toString("hex").toUpperCase()}`,
        userId,
        experienceId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        guests,
      },
      include: { experience: { select: { name: true } } },
    });
  });
}
