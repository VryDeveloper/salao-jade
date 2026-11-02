import { expect, it } from "vitest";
import { durationOf, formatDuration, formatRange } from "./format";

it("formatDuration escreve como se fala", () => {
  expect([30, 60, 90, 120].map(formatDuration)).toEqual(["30 min", "1 h", "1h30", "2 h"]);
});

it("formatRange e durationOf usam o horário do salão", () => {
  const from = "2026-11-07T19:00:00.000Z"; // 16:00 em São Paulo
  const to = "2026-11-07T20:30:00.000Z";
  expect(formatRange(from, to)).toBe("16:00–17:30");
  expect(durationOf(from, to)).toBe(90);
});
