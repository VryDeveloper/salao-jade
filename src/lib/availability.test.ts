import { describe, expect, it } from "vitest";
import {
  addDays,
  buildSlots,
  isChangeable,
  isValidDuration,
  overlaps,
  salonDate,
  salonTime,
  salonWeekday,
} from "./availability";

const DATE = "2026-11-07"; // sábado
const HOURS = { opensAt: 11 * 60, closesAt: 22 * 60 };
const BEFORE = new Date("2026-11-01T00:00:00Z");
const ROOMS = ["sala-1", "sala-2", "sala-3", "sala-4"];

const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00-03:00`);
const hhmm = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const booking = (from: string, to: string, roomId: string, userId = "outro") => ({
  startsAt: at(from),
  endsAt: at(to),
  roomId,
  userId,
});

describe("salonTime / salonDate / salonWeekday", () => {
  it("converte hora local do salão para UTC", () => {
    expect(salonTime(DATE, 11 * 60).toISOString()).toBe("2026-11-07T14:00:00.000Z");
  });

  it("salonDate usa o dia local, não o UTC", () => {
    // 01:30 UTC de domingo ainda é sábado 22:30 em São Paulo
    expect(salonDate(new Date("2026-11-08T01:30:00Z"))).toBe("2026-11-07");
    expect(salonDate(new Date("2026-11-08T03:00:00Z"))).toBe("2026-11-08");
  });

  it("addDays atravessa mês e ano", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("calcula o dia da semana no fuso do salão", () => {
    expect(salonWeekday("2026-11-07")).toBe(6);
    expect(salonWeekday("2026-11-09")).toBe(1);
  });
});

describe("isValidDuration", () => {
  it("aceita só 30 min a 2 h, de meia em meia hora", () => {
    expect([30, 60, 90, 120].every(isValidDuration)).toBe(true);
    expect([0, 15, 45, 150, 180].some(isValidDuration)).toBe(false);
  });
});

describe("buildSlots", () => {
  const base = { date: DATE, hours: HOURS, durationMin: 120, rooms: ROOMS, bookings: [], now: BEFORE };
  const slotAt = (slots: ReturnType<typeof buildSlots>, time: string) =>
    slots.find((s) => s.startsAt.getTime() === at(time).getTime())!;

  it("gera horários a cada 30 min que terminam até o fechamento, conforme a duração", () => {
    const twoHours = buildSlots(base).map((s) => hhmm(s.startsAt));
    expect(twoHours[0]).toBe("11:00");
    expect(twoHours.at(-1)).toBe("20:00"); // 20:00 + 2 h = 22:00
    expect(buildSlots({ ...base, durationMin: 30 }).map((s) => hhmm(s.startsAt)).at(-1)).toBe("21:30");
  });

  it("dia fechado não tem horários", () => {
    expect(buildSlots({ ...base, hours: null })).toEqual([]);
  });

  it("ocupa a primeira sala livre durante todo o intervalo", () => {
    const slots = buildSlots({ ...base, bookings: [booking("14:00", "15:00", "sala-1")] });
    expect(slotAt(slots, "13:30").roomId).toBe("sala-2"); // 13:30–15:30 cruza a reserva da sala 1
    expect(slotAt(slots, "15:00").roomId).toBe("sala-1"); // encosta às 15:00, não sobrepõe
    expect(slotAt(slots, "11:00").roomId).toBe("sala-1"); // 11:00–13:00 termina antes da reserva
  });

  it("fica indisponível só quando as 4 salas estão ocupadas no intervalo", () => {
    const three = ["sala-1", "sala-2", "sala-3"].map((r) => booking("16:00", "17:00", r));
    expect(slotAt(buildSlots({ ...base, durationMin: 60, bookings: three }), "16:00")).toMatchObject({
      available: true,
      roomId: "sala-4",
    });

    const four = [...three, booking("16:30", "17:30", "sala-4")];
    expect(slotAt(buildSlots({ ...base, durationMin: 60, bookings: four }), "16:00")).toMatchObject({
      available: false,
      roomId: null,
    });
  });

  it("conta por sala, não por número de reservas", () => {
    // 4 reservas sobrepostas, mas duas na mesma sala em momentos diferentes: a sala 4 continua livre
    const bookings = [
      booking("14:00", "14:30", "sala-1"),
      booking("15:00", "15:30", "sala-1"),
      booking("14:00", "16:00", "sala-2"),
      booking("14:00", "16:00", "sala-3"),
    ];
    expect(slotAt(buildSlots({ ...base, bookings }), "14:00")).toMatchObject({ available: true, roomId: "sala-4" });
  });

  it("o próprio cliente não consegue outra reserva sobreposta, mesmo com sala livre", () => {
    const bookings = [booking("16:00", "17:00", "sala-1", "eu")];
    const slots = buildSlots({ ...base, durationMin: 60, bookings, userId: "eu" });
    expect(slotAt(slots, "15:30")).toMatchObject({ mine: true, available: false, roomId: "sala-2" });
    expect(slotAt(slots, "17:00")).toMatchObject({ mine: false, available: true });

    // para outra pessoa, o mesmo horário segue livre
    expect(slotAt(buildSlots({ ...base, durationMin: 60, bookings, userId: "voce" }), "16:00").available).toBe(true);
  });

  it("horário que já passou fica indisponível", () => {
    const slots = buildSlots({ ...base, durationMin: 30, now: at("15:10") });
    expect(hhmm(slots.find((s) => s.available)!.startsAt)).toBe("15:30");
  });
});

describe("isChangeable", () => {
  it("permite até exatamente 24h antes", () => {
    const startsAt = at("16:00");
    expect(isChangeable(startsAt, new Date(startsAt.getTime() - 24 * 3_600_000))).toBe(true);
    expect(isChangeable(startsAt, new Date(startsAt.getTime() - 24 * 3_600_000 + 1))).toBe(false);
  });
});

describe("overlaps", () => {
  it("intervalos que só encostam não se sobrepõem", () => {
    expect(overlaps({ startsAt: at("10:00"), endsAt: at("11:00") }, { startsAt: at("11:00"), endsAt: at("12:00") })).toBe(false);
    expect(overlaps({ startsAt: at("10:00"), endsAt: at("11:01") }, { startsAt: at("11:00"), endsAt: at("12:00") })).toBe(true);
  });
});
