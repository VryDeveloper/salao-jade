// Teste de integração: precisa do Postgres do docker-compose rodando e semeado (npm run db:up && npm run db:seed)
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, salonDate, salonTime, salonWeekday } from "./availability";
import { BookingError, cancelBooking, createBooking, rescheduleBooking } from "./bookings";
import { db } from "./db";

const PREFIX = "dbtest-";
let users: string[] = [];

// Um sábado daqui a pelo menos uma semana: sempre aberto, no futuro e fora da janela do e2e
let saturday = addDays(salonDate(new Date()), 7);
while (salonWeekday(saturday) !== 6) saturday = addDays(saturday, 1);
const sunday = addDays(saturday, 1);
const sat = (minutes: number) => salonTime(saturday, minutes);
const sun = (minutes: number) => salonTime(sunday, minutes);

const experienceId = async (slug: string) => (await db.experience.findUniqueOrThrow({ where: { slug } })).id;

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  users = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const user = await db.user.create({
        data: { name: `Teste ${i}`, email: `${PREFIX}${i}@salaojade.test`, passwordHash: "x" },
      });
      return user.id;
    }),
  );
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: PREFIX } } }); // apaga as reservas em cascata
  await db.$disconnect();
});

/** Dispara os pedidos ao mesmo tempo e devolve as reservas criadas; as recusas têm de ser BookingError. */
async function race(requests: Parameters<typeof createBooking>[0][]) {
  const results = await Promise.allSettled(requests.map((r) => createBooking(r)));
  for (const r of results) if (r.status === "rejected") expect(r.reason).toBeInstanceOf(BookingError);
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

describe("pedidos simultâneos", () => {
  it("10 pessoas no mesmo horário: exatamente 4 conseguem, uma em cada sala", async () => {
    const id = await experienceId("mesa-de-cha");
    const created = await race(
      users
        .slice(0, 10)
        .map((userId) => ({
          userId,
          experienceId: id,
          startsAt: sat(16 * 60),
          durationMin: 60,
          companions: ["Ana Lima"],
        })),
    );
    expect(created).toHaveLength(4);
    expect(new Set(created.map((b) => b.roomId)).size).toBe(4);
  });

  it("a mesma pessoa pedindo 5 vezes ao mesmo tempo fica com 1 reserva", async () => {
    const id = await experienceId("mesa-de-cha");
    const created = await race(
      Array.from({ length: 5 }, () => ({
        userId: users[10],
        experienceId: id,
        startsAt: sat(19 * 60),
        durationMin: 60,
        companions: ["Ana Lima"],
      })),
    );
    expect(created).toHaveLength(1);
  });
});

describe("regras da reserva", () => {
  it("a mesma pessoa não consegue reserva sobreposta, nem em outra experiência", async () => {
    await createBooking({
      userId: users[11],
      experienceId: await experienceId("mesa-de-cha"),
      startsAt: sat(12 * 60),
      durationMin: 60,
      companions: ["Ana Lima"],
    });
    await expect(
      createBooking({
        userId: users[11],
        experienceId: await experienceId("cha-e-dim-sum"),
        startsAt: sat(12 * 60 + 30),
        durationMin: 30,
        companions: ["Ana Lima"],
      }),
    ).rejects.toThrow("Você já tem uma reserva nesse horário");
  });

  it("guarda a duração escolhida", async () => {
    const booking = await createBooking({
      userId: users[11],
      experienceId: await experienceId("cerimonia-gongfu"),
      startsAt: sat(13 * 60),
      durationMin: 120,
      companions: ["Ana Lima"],
    });
    expect(booking.endsAt.getTime() - booking.startsAt.getTime()).toBe(120 * 60_000);
  });

  it("guarda os nomes dos acompanhantes e conta o titular", async () => {
    const booking = await createBooking({
      userId: users[11],
      experienceId: await experienceId("cha-e-dim-sum"),
      startsAt: sat(19 * 60),
      durationMin: 60,
      companions: ["  Ana Lima ", "Bia Rocha"],
    });
    expect(booking.companions).toEqual(["Ana Lima", "Bia Rocha"]);
    expect(booking.guests).toBe(3);
  });

  it("recusa acompanhante sem nome", async () => {
    await expect(
      createBooking({
        userId: users[11],
        experienceId: await experienceId("cha-e-dim-sum"),
        startsAt: sat(21 * 60),
        durationMin: 30,
        companions: ["Ana Lima", " "],
      }),
    ).rejects.toThrow("nome de cada acompanhante");
  });

  it.each([
    ["duração fora de 30 min a 2 h", { startsAt: sat(17 * 60), durationMin: 45, companions: ["Ana Lima"] }],
    ["horário fora da grade de 30 min", { startsAt: sat(17 * 60 + 10), durationMin: 60, companions: ["Ana Lima"] }],
    [
      "mais pessoas que o permitido",
      { startsAt: sat(17 * 60), durationMin: 60, companions: Array.from({ length: 98 }, (_, i) => `Pessoa ${i}`) },
    ],
    [
      "dia fechado (segunda)",
      { startsAt: salonTime(addDays(saturday, 2), 17 * 60), durationMin: 60, companions: ["Ana Lima"] },
    ],
    ["passar do fechamento", { startsAt: sat(21 * 60), durationMin: 120, companions: ["Ana Lima"] }],
  ])("recusa %s", async (_, req) => {
    await expect(
      createBooking({ userId: users[0], experienceId: await experienceId("cha-e-dim-sum"), ...req }),
    ).rejects.toThrow(BookingError);
  });
});

describe("remarcar e cancelar", () => {
  it("remarcar para um horário que se sobrepõe ao atual, mudando a duração", async () => {
    const id = await experienceId("cerimonia-gongfu");
    const booking = await createBooking({
      userId: users[0],
      experienceId: id,
      startsAt: sun(13 * 60),
      durationMin: 60,
      companions: ["Ana Lima"],
    });
    const moved = await rescheduleBooking({
      userId: users[0],
      bookingId: booking.id,
      startsAt: sun(13 * 60 + 30),
      durationMin: 120,
      companions: ["Ana Lima", "Bia Rocha"],
    });
    expect(moved.startsAt).toEqual(sun(13 * 60 + 30));
    expect(moved.endsAt).toEqual(sun(15 * 60 + 30));
    expect(moved.guests).toBe(3);
  });

  it("não deixa remarcar para um horário com as 4 salas ocupadas", async () => {
    const id = await experienceId("mesa-de-cha");
    await race(
      users
        .slice(1, 5)
        .map((userId) => ({
          userId,
          experienceId: id,
          startsAt: sun(18 * 60),
          durationMin: 60,
          companions: ["Ana Lima"],
        })),
    );
    const mine = await createBooking({
      userId: users[5],
      experienceId: id,
      startsAt: sun(11 * 60),
      durationMin: 60,
      companions: ["Ana Lima"],
    });
    await expect(
      rescheduleBooking({
        userId: users[5],
        bookingId: mine.id,
        startsAt: sun(18 * 60),
        durationMin: 60,
        companions: ["Ana Lima"],
      }),
    ).rejects.toThrow("indisponível");
  });

  it("só o dono cancela, e a sala volta a ficar livre", async () => {
    const id = await experienceId("mesa-de-cha");
    const full = await race(
      users
        .slice(6, 10)
        .map((userId) => ({
          userId,
          experienceId: id,
          startsAt: sun(20 * 60),
          durationMin: 60,
          companions: ["Ana Lima"],
        })),
    );
    const late = {
      userId: users[10],
      experienceId: id,
      startsAt: sun(20 * 60),
      durationMin: 60,
      companions: ["Ana Lima"],
    };
    await expect(createBooking(late)).rejects.toThrow("indisponível");

    await expect(cancelBooking({ userId: users[10], bookingId: full[0].id })).rejects.toThrow("não encontrada");
    await cancelBooking({ userId: full[0].userId, bookingId: full[0].id });
    expect((await createBooking(late)).roomId).toBe(full[0].roomId);
  });

  it("recusa alteração a menos de 24h do horário", async () => {
    const booking = await createBooking({
      userId: users[11],
      experienceId: await experienceId("cha-e-dim-sum"),
      startsAt: sun(16 * 60),
      durationMin: 30,
      companions: ["Ana Lima"],
    });
    const now = new Date(booking.startsAt.getTime() - 23 * 3_600_000);
    await expect(cancelBooking({ userId: users[11], bookingId: booking.id, now })).rejects.toThrow("24 horas");
  });
});
