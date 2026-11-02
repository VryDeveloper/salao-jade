// Teste de integração do painel: precisa do Postgres do docker-compose rodando e semeado
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdminError, addClosure, adminCancelBooking, removeClosure, setRoomActive } from "./admin";
import { salonTime } from "./availability";
import { db } from "./db";

const EMAIL = "admintest@salaojade.test";
// Uma terça bem no futuro, longe de qualquer dado real
const DAY = "2027-01-12";
let userId: string;
let experienceId: string;

/** Reserva gravada direto no banco: aqui o que se testa são as regras do painel, não as da reserva. */
const insertBooking = (startsAt: Date, roomId = "sala-3") =>
  db.booking.create({
    data: {
      code: `JD-T${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
      userId,
      experienceId,
      roomId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60_000),
      guests: 1,
    },
  });

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.closure.deleteMany({ where: { date: new Date(DAY) } });
  userId = (await db.user.create({ data: { name: "Teste Painel", email: EMAIL, passwordHash: "x" } })).id;
  experienceId = (await db.experience.findUniqueOrThrow({ where: { slug: "mesa-de-cha" } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.closure.deleteMany({ where: { date: new Date(DAY) } });
  await db.room.update({ where: { id: "sala-3" }, data: { active: true } });
  await db.$disconnect();
});

describe("cancelar pelo painel", () => {
  it("o salão cancela mesmo a menos de 24h, o que o cliente não pode", async () => {
    const booking = await insertBooking(salonTime(DAY, 16 * 60));
    const twoHoursBefore = new Date(booking.startsAt.getTime() - 2 * 3_600_000);
    expect((await adminCancelBooking(booking.id, twoHoursBefore)).status).toBe("CANCELLED");
    await expect(adminCancelBooking(booking.id, twoHoursBefore)).rejects.toThrow(AdminError);
  });

  it("não cancela o que já começou", async () => {
    const booking = await insertBooking(salonTime(DAY, 18 * 60));
    await expect(adminCancelBooking(booking.id, new Date(booking.startsAt.getTime() + 60_000))).rejects.toThrow(
      "já começou",
    );
  });
});

describe("folgas", () => {
  const before = new Date("2026-12-01T12:00:00Z");

  it("não fecha um dia com reserva confirmada", async () => {
    await expect(addClosure(DAY, "Feriado", before)).rejects.toThrow("reserva confirmada");
  });

  it("fecha um dia livre, não duplica, e reabre", async () => {
    await db.booking.updateMany({ where: { userId }, data: { status: "CANCELLED" } });
    await addClosure(DAY, "  Feriado  ", before);
    expect((await db.closure.findUnique({ where: { date: new Date(DAY) } }))?.reason).toBe("Feriado");
    await expect(addClosure(DAY, "", before)).rejects.toThrow("já está fechado");
    await removeClosure(DAY);
    expect(await db.closure.findUnique({ where: { date: new Date(DAY) } })).toBeNull();
  });

  it("recusa data que já passou", async () => {
    await expect(addClosure("2026-01-01", "", before)).rejects.toThrow("já passou");
  });
});

describe("salas", () => {
  it("não desativa sala com reserva futura; desativa quando não há", async () => {
    const booking = await insertBooking(salonTime(DAY, 12 * 60), "sala-3");
    await expect(setRoomActive("sala-3", false)).rejects.toThrow("reserva futura");
    await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    expect((await setRoomActive("sala-3", false)).active).toBe(false);
  });
});
