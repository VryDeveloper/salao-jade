// Teste de integração: precisa do Postgres do docker-compose rodando e semeado (npm run db:up && npm run db:seed)
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, salonDate, salonTime, salonWeekday } from "./availability";
import { BookingError, createBooking } from "./bookings";
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
