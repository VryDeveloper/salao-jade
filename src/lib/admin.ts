import { addDays, salonDate, salonTime } from "./availability";
import { db } from "./db";

/** Recusa de uma ação do painel, com a mensagem que o admin vê. */
export class AdminError extends Error {}

const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

const dayRange = (date: string) => ({ gte: salonTime(date, 0), lt: salonTime(addDays(date, 1), 0) });

const adminBookingInclude = {
  experience: { select: { name: true } },
  room: { select: { name: true } },
  user: { select: { name: true, email: true, phone: true } },
} as const;

/** Números do topo do painel. */
export async function getOverview(now = new Date()) {
  const today = salonDate(now);
  const [todayCount, weekCount, customers] = await Promise.all([
    db.booking.count({ where: { status: "CONFIRMED", startsAt: dayRange(today) } }),
    db.booking.count({
      where: { status: "CONFIRMED", startsAt: { gte: now, lt: salonTime(addDays(today, 7), 0) } },
    }),
    db.user.count({ where: { role: "USER" } }),
  ]);
  return { today, todayCount, weekCount, customers };
}

/** Todas as reservas de um dia (de qualquer cliente), por horário e sala. */
export function getBookingsOfDay(date: string) {
  if (!isDay(date)) throw new AdminError("Data inválida.");
  return db.booking.findMany({
    where: { startsAt: dayRange(date) },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { room: { number: "asc" } }],
    include: adminBookingInclude,
  });
}

/** O salão pode cancelar a qualquer momento antes do início: a regra das 24h vale só para o cliente. */
export async function adminCancelBooking(bookingId: string, now = new Date()) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED") throw new AdminError("Reserva não encontrada ou já cancelada.");
  if (booking.startsAt <= now) throw new AdminError("Essa reserva já começou ou passou.");
  return db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
}

/** Clientes com contato, quantas reservas confirmadas têm e a próxima visita. */
export async function getCustomers(now = new Date()) {
  const users = await db.user.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      bookings: {
        where: { status: "CONFIRMED" },
        orderBy: { startsAt: "asc" },
        select: { startsAt: true, endsAt: true, experience: { select: { name: true } } },
      },
    },
  });
  return users.map(({ bookings, ...u }) => ({
    ...u,
    total: bookings.length,
    next: bookings.find((b) => b.startsAt > now) ?? null,
  }));
}

/* ---------- Funcionamento ---------- */

export function getClosures(now = new Date()) {
  return db.closure.findMany({ where: { date: { gte: new Date(salonDate(now)) } }, orderBy: { date: "asc" } });
}

/** Fecha um dia. Recusa se já houver reserva confirmada nele: o salão cancela antes, cliente por cliente. */
export async function addClosure(date: string, reason: string, now = new Date()) {
  if (!isDay(date)) throw new AdminError("Escolha uma data.");
  if (date < salonDate(now)) throw new AdminError("Essa data já passou.");
  const affected = await db.booking.count({ where: { status: "CONFIRMED", startsAt: dayRange(date) } });
  if (affected > 0) {
    throw new AdminError(
      `Há ${affected} ${affected === 1 ? "reserva confirmada" : "reservas confirmadas"} nesse dia. Cancele antes de fechar.`,
    );
  }
  const exists = await db.closure.findUnique({ where: { date: new Date(date) } });
  if (exists) throw new AdminError("Esse dia já está fechado.");
  return db.closure.create({ data: { date: new Date(date), reason: reason.trim().slice(0, 120) || null } });
}

export function removeClosure(date: string) {
  if (!isDay(date)) throw new AdminError("Data inválida.");
  return db.closure.deleteMany({ where: { date: new Date(date) } });
}

export function getRooms() {
  return db.room.findMany({ orderBy: { number: "asc" } });
}

/** Desativar sala com reservas futuras deixaria clientes sem sala: recusa e diz quantas são. */
export async function setRoomActive(roomId: string, active: boolean, now = new Date()) {
  if (!active) {
    const future = await db.booking.count({ where: { roomId, status: "CONFIRMED", startsAt: { gt: now } } });
    if (future > 0) {
      throw new AdminError(`Essa sala tem ${future} ${future === 1 ? "reserva futura" : "reservas futuras"}.`);
    }
  }
  return db.room.update({ where: { id: roomId }, data: { active } });
}

export function getExperiences() {
  return db.experience.findMany({ orderBy: { name: "asc" } });
}

/** Desativar só tira a experiência da agenda; reservas já feitas continuam valendo. */
export function setExperienceActive(experienceId: string, active: boolean) {
  return db.experience.update({ where: { id: experienceId }, data: { active } });
}
