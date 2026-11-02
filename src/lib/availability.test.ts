import { describe, expect, it } from "vitest";
import { buildSlots, overlaps, salonTime, salonWeekday } from "./availability";

const DATE = "2026-11-07"; // sábado
const HOURS = { opensAt: 11 * 60, closesAt: 22 * 60 };
const BEFORE = new Date("2026-11-01T00:00:00Z");

const at = (hhmm: string) => new Date(`${DATE}T${hhmm}:00-03:00`);
const times = (slots: { startsAt: Date }[]) =>
  slots.map((s) => s.startsAt.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }));

describe("salonTime / salonWeekday", () => {
  it("converte hora local do salão para UTC", () => {
    expect(salonTime(DATE, 11 * 60).toISOString()).toBe("2026-11-07T14:00:00.000Z");
  });

  it("calcula o dia da semana no fuso do salão", () => {
    expect(salonWeekday("2026-11-07")).toBe(6);
    expect(salonWeekday("2026-11-09")).toBe(1);
  });
});

describe("buildSlots", () => {
  const base = { date: DATE, hours: HOURS, durationMin: 90, capacity: 1, bookings: [], now: BEFORE };

  it("gera horários a cada 30 min e só os que terminam até o fechamento", () => {
    const t = times(buildSlots(base));
    expect(t[0]).toBe("11:00");
    expect(t.at(-1)).toBe("20:30"); // 20:30 + 90 min = 22:00
    expect(t).toHaveLength(20);
  });

  it("dia fechado não tem horários", () => {
    expect(buildSlots({ ...base, hours: null })).toEqual([]);
  });

  it("reserva bloqueia todo horário que se sobrepõe a ela", () => {
    const slots = buildSlots({ ...base, bookings: [{ startsAt: at("14:00"), endsAt: at("15:30") }] });
    const blocked = times(slots.filter((s) => !s.available));
    // 12:30 termina às 14:00 (encosta, não sobrepõe); 15:30 começa quando a reserva termina
    expect(blocked).toEqual(["13:00", "13:30", "14:00", "14:30", "15:00"]);
  });

  it("respeita a capacidade de reservas simultâneas", () => {
    const booking = { startsAt: at("14:00"), endsAt: at("15:30") };
    const slot14 = (bookings: typeof booking[]) =>
      buildSlots({ ...base, capacity: 2, bookings }).find((s) => s.startsAt.getTime() === at("14:00").getTime())!;

    expect(slot14([booking]).available).toBe(true);
    expect(slot14([booking, booking]).available).toBe(false);
  });

  it("horário que já passou fica indisponível", () => {
    const slots = buildSlots({ ...base, now: at("15:10") });
    expect(times(slots.filter((s) => s.available))[0]).toBe("15:30");
  });
});

describe("overlaps", () => {
  it("intervalos que só encostam não se sobrepõem", () => {
    expect(overlaps({ startsAt: at("10:00"), endsAt: at("11:00") }, { startsAt: at("11:00"), endsAt: at("12:00") })).toBe(false);
    expect(overlaps({ startsAt: at("10:00"), endsAt: at("11:01") }, { startsAt: at("11:00"), endsAt: at("12:00") })).toBe(true);
  });
});
