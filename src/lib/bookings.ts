import { randomBytes } from "node:crypto";
import type { Experience, Prisma } from "@/generated/prisma/client";
import { addDays, buildSlots, isChangeable, salonDate, salonTime, salonWeekday, type Slot } from "./availability";
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

/**
 * Os horários do dia para a experiência, com as reservas atuais do banco.
 * `ignoreBookingId`: ao remarcar, a própria reserva não ocupa vaga.
 */
export async function getSlots(
  experience: Experience,
  date: string,
  now: Date,
  { client = db, ignoreBookingId }: { client?: Client; ignoreBookingId?: string } = {},
): Promise<Slot[]> {
  const dayStart = salonTime(date, 0);
  const dayEnd = salonTime(addDays(date, 1), 0);
  const [[{ hours }], bookings] = await Promise.all([
    getSchedule([date], client),
    client.booking.findMany({
      where: {
        experienceId: experience.id,
        status: "CONFIRMED",
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return buildSlots({ date, hours, durationMin: experience.durationMin, capacity: experience.capacity, bookings, now });
}

type SlotRequest = { experienceId: string; startsAt: Date; guests: number; now: Date; ignoreBookingId?: string };

/**
 * Valida o pedido dentro da transação. O FOR UPDATE na experiência faz as reservas
 * dela serem checadas e gravadas uma de cada vez, então a capacidade nunca estoura.
 */
async function claimSlot(tx: Prisma.TransactionClient, { experienceId, startsAt, guests, now, ignoreBookingId }: SlotRequest) {
  await tx.$executeRaw`SELECT 1 FROM "Experience" WHERE id = ${experienceId} FOR UPDATE`;
  const experience = await tx.experience.findUnique({ where: { id: experienceId } });
  if (!experience?.active) throw new BookingError("Essa experiência não está disponível.");
  if (guests < 1 || guests > experience.maxGuests) {
    throw new BookingError(`${experience.name} aceita de 1 a ${experience.maxGuests} pessoas.`);
  }

  const slots = await getSlots(experience, salonDate(startsAt), now, { client: tx, ignoreBookingId });
  const slot = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot?.available) throw new BookingError("Esse horário acabou de ficar indisponível. Escolha outro.");
  return slot;
}

type NewBooking = { userId: string; experienceId: string; startsAt: Date; guests: number; now?: Date };

export function createBooking({ userId, experienceId, startsAt, guests, now = new Date() }: NewBooking) {
  return db.$transaction(async (tx) => {
    const slot = await claimSlot(tx, { experienceId, startsAt, guests, now });
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

/** Reserva do usuário que ainda pode ser alterada; erro se não for dele, já passou do prazo ou foi cancelada. */
async function findChangeable(client: Client, userId: string, bookingId: string, now: Date) {
  const booking = await client.booking.findFirst({ where: { id: bookingId, userId, status: "CONFIRMED" } });
  if (!booking) throw new BookingError("Reserva não encontrada.");
  if (!isChangeable(booking.startsAt, now)) {
    throw new BookingError("Alterações só são possíveis até 24 horas antes do horário.");
  }
  return booking;
}

export function getChangeableBooking(userId: string, bookingId: string, now = new Date()) {
  return findChangeable(db, userId, bookingId, now).catch((err) => {
    if (err instanceof BookingError) return null;
    throw err;
  });
}

type Reschedule = { userId: string; bookingId: string; startsAt: Date; guests: number; now?: Date };

export function rescheduleBooking({ userId, bookingId, startsAt, guests, now = new Date() }: Reschedule) {
  return db.$transaction(async (tx) => {
    const booking = await findChangeable(tx, userId, bookingId, now);
    const slot = await claimSlot(tx, {
      experienceId: booking.experienceId,
      startsAt,
      guests,
      now,
      ignoreBookingId: booking.id,
    });
    return tx.booking.update({
      where: { id: booking.id },
      data: { startsAt: slot.startsAt, endsAt: slot.endsAt, guests },
    });
  });
}

export async function cancelBooking({ userId, bookingId, now = new Date() }: { userId: string; bookingId: string; now?: Date }) {
  const booking = await findChangeable(db, userId, bookingId, now);
  return db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
}

/** Próximas reservas confirmadas e o histórico recente (passadas ou canceladas). */
export async function getUserBookings(userId: string, now = new Date()) {
  const include = { experience: { select: { name: true, slug: true, durationMin: true } } };
  const [upcoming, history] = await Promise.all([
    db.booking.findMany({
      where: { userId, status: "CONFIRMED", startsAt: { gt: now } },
      orderBy: { startsAt: "asc" },
      include,
    }),
    db.booking.findMany({
      where: { userId, OR: [{ status: "CANCELLED" }, { startsAt: { lte: now } }] },
      orderBy: { startsAt: "desc" },
      take: 10,
      include,
    }),
  ]);
  return { upcoming, history };
}
