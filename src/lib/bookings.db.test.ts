// Teste de integração: precisa do Postgres do docker-compose rodando e semeado (npm run db:up && npm run db:seed)
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, salonDate, salonTime, salonWeekday } from "./availability";
import { BookingError, cancelBooking, createBooking, rescheduleBooking } from "./bookings";
import { db } from "./db";

const EMAIL = "concorrencia@salaojade.test";
let userId: string;

// Um sábado daqui a pelo menos uma semana: sempre aberto e no futuro
let date = addDays(salonDate(new Date()), 7);
while (salonWeekday(date) !== 6) date = addDays(date, 1);
const startsAt = salonTime(date, 16 * 60);

const experience = (slug: string) => db.experience.findUniqueOrThrow({ where: { slug } });

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  userId = (await db.user.create({ data: { name: "Teste Concorrência", email: EMAIL, passwordHash: "x" } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } }); // apaga as reservas em cascata
  await db.$disconnect();
});

/** Dispara `n` reservas ao mesmo tempo para o mesmo horário. */
async function race(slug: string, n: number) {
  const { id } = await experience(slug);
  const results = await Promise.allSettled(
    Array.from({ length: n }, () => createBooking({ userId, experienceId: id, startsAt, guests: 2 })),
  );
  const rejected = results.filter((r) => r.status === "rejected");
  for (const r of rejected) expect(r.reason).toBeInstanceOf(BookingError);
  return results.length - rejected.length;
}

describe("createBooking com pedidos simultâneos", () => {
  it("capacidade 1: de 10 pedidos ao mesmo tempo, só 1 vira reserva", async () => {
    expect(await race("cerimonia-gongfu", 10)).toBe(1);
  });

  it("capacidade 6: de 10 pedidos ao mesmo tempo, exatamente 6 viram reserva", async () => {
    expect(await race("mesa-de-cha", 10)).toBe(6);
  });
});

describe("createBooking valida o pedido", () => {
  it("recusa horário fora da grade de 30 min", async () => {
    const { id } = await experience("cha-e-dim-sum");
    const offGrid = salonTime(date, 16 * 60 + 10);
    await expect(createBooking({ userId, experienceId: id, startsAt: offGrid, guests: 2 })).rejects.toThrow(BookingError);
  });

  it("recusa mais pessoas que o permitido", async () => {
    const { id, maxGuests } = await experience("cha-e-dim-sum");
    await expect(createBooking({ userId, experienceId: id, startsAt, guests: maxGuests + 1 })).rejects.toThrow(BookingError);
  });

  it("recusa dia fechado (segunda)", async () => {
    const { id } = await experience("cha-e-dim-sum");
    const monday = salonTime(addDays(date, 2), 16 * 60);
    await expect(createBooking({ userId, experienceId: id, startsAt: monday, guests: 2 })).rejects.toThrow(BookingError);
  });
});

describe("remarcar e cancelar", () => {
  const sunday = addDays(date, 1);
  const at = (minutes: number) => salonTime(sunday, minutes);

  it("remarcar para um horário que se sobrepõe ao atual: a própria reserva não ocupa a vaga", async () => {
    const { id } = await experience("cerimonia-gongfu"); // capacidade 1
    const booking = await createBooking({ userId, experienceId: id, startsAt: at(16 * 60), guests: 2 });
    const moved = await rescheduleBooking({ userId, bookingId: booking.id, startsAt: at(16 * 60 + 30), guests: 3 });
    expect(moved.startsAt).toEqual(at(16 * 60 + 30));
    expect(moved.guests).toBe(3);
  });

  it("não deixa remarcar para um horário que já está lotado", async () => {
    const { id } = await experience("cerimonia-gongfu");
    const mine = await createBooking({ userId, experienceId: id, startsAt: at(12 * 60), guests: 2 });
    const theirs = await createBooking({ userId, experienceId: id, startsAt: at(19 * 60), guests: 2 });
    await expect(rescheduleBooking({ userId, bookingId: mine.id, startsAt: theirs.startsAt, guests: 2 })).rejects.toThrow(
      "indisponível",
    );
  });

  it("só o dono cancela, e a vaga volta a ficar livre", async () => {
    const { id } = await experience("cerimonia-gongfu");
    const booking = await createBooking({ userId, experienceId: id, startsAt: at(14 * 60), guests: 2 });
    await expect(cancelBooking({ userId: "outro-usuario", bookingId: booking.id })).rejects.toThrow("não encontrada");

    await cancelBooking({ userId, bookingId: booking.id });
    const again = await createBooking({ userId, experienceId: id, startsAt: at(14 * 60), guests: 2 });
    expect(again.status).toBe("CONFIRMED");
  });

  it("recusa alteração a menos de 24h do horário", async () => {
    const { id } = await experience("cha-e-dim-sum");
    const booking = await createBooking({ userId, experienceId: id, startsAt: at(18 * 60), guests: 2 });
    const now = new Date(booking.startsAt.getTime() - 23 * 3_600_000);
    await expect(cancelBooking({ userId, bookingId: booking.id, now })).rejects.toThrow("24 horas");
  });
});
