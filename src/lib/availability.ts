// shortcut: offset fixo, exato porque São Paulo não tem horário de verão desde 2019; trocar por uma lib de fuso se o salão mudar de cidade ou o horário de verão voltar
export const SALON_UTC_OFFSET = "-03:00";
export const SLOT_STEP_MIN = 30;

export type Interval = { startsAt: Date; endsAt: Date };
export type Slot = { startsAt: Date; endsAt: Date; available: boolean };

type BuildSlotsInput = {
  /** Dia local do salão, "YYYY-MM-DD" */
  date: string;
  /** null = fechado nesse dia */
  hours: { opensAt: number; closesAt: number } | null;
  durationMin: number;
  capacity: number;
  /** Reservas confirmadas da experiência que tocam esse dia */
  bookings: Interval[];
  now: Date;
};

/** Converte "YYYY-MM-DD" + minutos desde 00:00 (hora local do salão) em um instante UTC. */
export function salonTime(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${SALON_UTC_OFFSET}`);
}

/** Dia local do salão ("YYYY-MM-DD") em que cai o instante `at`. */
export function salonDate(at: Date): string {
  const offsetMin = Number(SALON_UTC_OFFSET.slice(0, 3)) * 60;
  return new Date(at.getTime() + offsetMin * 60_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado, no fuso do salão. */
export function salonWeekday(date: string): number {
  return salonTime(date, 12 * 60).getUTCDay();
}

/**
 * Gera os horários do dia a cada SLOT_STEP_MIN. Um horário fica indisponível quando
 * já passou ou quando as reservas que se sobrepõem a ele atingiram a capacidade.
 */
export function buildSlots({ date, hours, durationMin, capacity, bookings, now }: BuildSlotsInput): Slot[] {
  if (!hours) return [];

  const slots: Slot[] = [];
  for (let m = hours.opensAt; m + durationMin <= hours.closesAt; m += SLOT_STEP_MIN) {
    const startsAt = salonTime(date, m);
    const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
    const overlapping = bookings.filter((b) => overlaps(b, { startsAt, endsAt })).length;
    slots.push({ startsAt, endsAt, available: startsAt > now && overlapping < capacity });
  }
  return slots;
}

export const CHANGE_DEADLINE_HOURS = 24;

/** Remarcar ou cancelar só até 24h antes do início. */
export function isChangeable(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - now.getTime() >= CHANGE_DEADLINE_HOURS * 3_600_000;
}

/** Intervalos meio-abertos [início, fim): encostar não é sobrepor. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}
