import { salonTime } from "./availability";

const TZ = "America/Sao_Paulo";

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longDateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short" });

export const formatTime = (at: Date | string) => timeFmt.format(new Date(at));

/** "16:00–17:30" */
export const formatRange = (from: Date | string, to: Date | string) => `${formatTime(from)}–${formatTime(to)}`;

/** 30 → "30 min", 60 → "1 h", 90 → "1h30", 120 → "2 h" */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Duração de uma reserva a partir do início e do fim. */
export const durationOf = (from: Date | string, to: Date | string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);

/** "sábado, 7 de novembro" para um instante ou um dia "YYYY-MM-DD". */
export const formatLongDate = (at: Date | string) =>
  longDateFmt.format(typeof at === "string" && at.length === 10 ? salonTime(at, 12 * 60) : new Date(at));

/** { weekday: "Sáb", day: "07" } para os botões de dia. */
export function dayChip(date: string) {
  const weekday = weekdayFmt.format(salonTime(date, 12 * 60)).replace(".", "");
  return { weekday: weekday[0].toUpperCase() + weekday.slice(1), day: date.slice(8) };
}
