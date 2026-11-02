import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import {
  addDays,
  buildSlots,
  isChangeable,
  isValidDuration,
  salonDate,
  salonTime,
  salonWeekday,
  type Slot,
} from "./availability";
import { db } from "./db";
import { companionsSchema } from "./validation";

type Client = typeof db | Prisma.TransactionClient;

export class BookingError extends Error {}

export const BOOKING_WINDOW_DAYS = 7;

export function getActiveExperiences() {
  return db.experience.findMany({ where: { active: true }, orderBy: { name: "asc" } });
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

type SlotQuery = {
  client?: Client;
  /** Cliente vendo a grade: os horários dele aparecem como "seus" e não podem ser reservados de novo */
  userId?: string;
  /** Ao remarcar, a própria reserva não ocupa sala nem conta como sobreposição */
  ignoreBookingId?: string;
};

/** Os horários do dia para a duração escolhida, com a ocupação real das salas. */
export async function getSlots(
  date: string,
  durationMin: number,
  now: Date,
  { client = db, userId, ignoreBookingId }: SlotQuery = {},
): Promise<Slot[]> {
  const dayStart = salonTime(date, 0);
  const dayEnd = salonTime(addDays(date, 1), 0);
  const [[{ hours }], rooms, bookings] = await Promise.all([
    getSchedule([date], client),
    client.room.findMany({ where: { active: true }, orderBy: { number: "asc" }, select: { id: true } }),
    client.booking.findMany({
      where: {
        status: "CONFIRMED",
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      },
      select: { startsAt: true, endsAt: true, roomId: true, userId: true },
    }),
  ]);
  return buildSlots({ date, hours, durationMin, rooms: rooms.map((r) => r.id), bookings, userId, now });
}

type SlotRequest = {
  userId: string;
  experienceId: string;
  startsAt: Date;
  durationMin: number;
  /** Nomes dos acompanhantes; o titular é o dono da conta. Pessoas = 1 + acompanhantes. */
  companions: string[];
  now: Date;
  ignoreBookingId?: string;
};

/**
 * Valida o pedido dentro da transação e escolhe a sala. O FOR UPDATE nas salas faz as reservas
 * serem checadas e gravadas uma de cada vez: nem pedidos simultâneos ocupam a mesma sala,
 * nem o mesmo cliente consegue duas reservas sobrepostas abrindo duas abas.
 */
async function claimSlot(tx: Prisma.TransactionClient, req: SlotRequest) {
  await tx.$executeRaw`SELECT 1 FROM "Room" FOR UPDATE`;

  if (!isValidDuration(req.durationMin)) throw new BookingError("Escolha uma duração de 30 minutos a 2 horas.");
  const experience = await tx.experience.findUnique({ where: { id: req.experienceId } });
  if (!experience?.active) throw new BookingError("Essa experiência não está disponível.");
  const names = companionsSchema.safeParse(req.companions);
  if (!names.success) throw new BookingError(names.error.issues[0].message + ".");
  const guests = names.data.length + 1;
  if (guests > experience.maxGuests) {
    throw new BookingError(`${experience.name} aceita de 1 a ${experience.maxGuests} pessoas.`);
  }

  const slots = await getSlots(salonDate(req.startsAt), req.durationMin, req.now, {
    client: tx,
    userId: req.userId,
    ignoreBookingId: req.ignoreBookingId,
  });
  const slot = slots.find((s) => s.startsAt.getTime() === req.startsAt.getTime());
  if (slot?.mine) throw new BookingError("Você já tem uma reserva nesse horário.");
  if (!slot?.available || !slot.roomId) {
    throw new BookingError("Esse horário acabou de ficar indisponível. Escolha outro.");
  }
  return { ...slot, roomId: slot.roomId, guests, companions: names.data };
}

const bookingInclude = {
  experience: { select: { name: true } },
  room: { select: { name: true } },
  user: { select: { name: true } },
} as const;

type NewBooking = Omit<SlotRequest, "now" | "ignoreBookingId"> & { now?: Date };

export function createBooking({ now = new Date(), ...req }: NewBooking) {
  return db.$transaction(async (tx) => {
    const slot = await claimSlot(tx, { ...req, now });
    return tx.booking.create({
      data: {
        code: `JD-${randomBytes(3).toString("hex").toUpperCase()}`,
        userId: req.userId,
        experienceId: req.experienceId,
        roomId: slot.roomId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        guests: slot.guests,
        companions: slot.companions,
      },
      include: bookingInclude,
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

type Reschedule = {
  userId: string;
  bookingId: string;
  startsAt: Date;
  durationMin: number;
  companions: string[];
  now?: Date;
};

export function rescheduleBooking({
  userId,
  bookingId,
  startsAt,
  durationMin,
  companions,
  now = new Date(),
}: Reschedule) {
  return db.$transaction(async (tx) => {
    const booking = await findChangeable(tx, userId, bookingId, now);
    const slot = await claimSlot(tx, {
      userId,
      experienceId: booking.experienceId,
      startsAt,
      durationMin,
      companions,
      now,
      ignoreBookingId: booking.id,
    });
    return tx.booking.update({
      where: { id: booking.id },
      data: {
        roomId: slot.roomId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        guests: slot.guests,
        companions: slot.companions,
      },
      include: bookingInclude,
    });
  });
}

export async function cancelBooking({
  userId,
  bookingId,
  now = new Date(),
}: {
  userId: string;
  bookingId: string;
  now?: Date;
}) {
  const booking = await findChangeable(db, userId, bookingId, now);
  return db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
}

/** Próximas reservas confirmadas e o histórico recente (passadas ou canceladas). */
export async function getUserBookings(userId: string, now = new Date()) {
  const include = {
    experience: { select: { name: true, slug: true } },
    room: { select: { name: true } },
    user: { select: { name: true } },
  };
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
