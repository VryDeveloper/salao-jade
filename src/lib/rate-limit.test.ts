import { expect, it } from "vitest";
import { isRateLimited, resetRateLimit } from "./rate-limit";

it("bloqueia depois do limite e libera quando a janela vence", () => {
  const opts = { max: 2, windowMs: 1000, now: 0 };
  expect(isRateLimited("k", opts)).toBe(false);
  expect(isRateLimited("k", opts)).toBe(false);
  expect(isRateLimited("k", opts)).toBe(true);
  expect(isRateLimited("k", { ...opts, now: 1000 })).toBe(false);
});

it("reset zera a contagem", () => {
  const opts = { max: 1, windowMs: 1000, now: 0 };
  isRateLimited("r", opts);
  resetRateLimit("r");
  expect(isRateLimited("r", opts)).toBe(false);
});
