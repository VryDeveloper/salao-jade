// shortcut: offset fixo, exato porque São Paulo não tem horário de verão desde 2019; trocar por uma lib de fuso se o salão mudar de cidade ou o horário de verão voltar
export const SALON_UTC_OFFSET = "-03:00";
export const SLOT_STEP_MIN = 30;
/** Quanto tempo o cliente pode ficar: de 30 min a 2 h, de meia em meia hora */
export const DURATIONS_MIN = [30, 60, 90, 120] as const;
export const DEFAULT_DURATION_MIN = 60;

export type Interval = { startsAt: Date; endsAt: Date };
export type Slot = {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
  /** Sala livre durante todo o intervalo (a primeira, em ordem); null se todas ocupadas */
  roomId: string | null;
  /**
   * Reserva do próprio cliente que se sobrepõe a este horário, ou null. `exact`: é a própria reserva
   * (mesmo início e fim), não só um horário vizinho que bate nela.
   */
  mine: (Interval & { exact: boolean }) | null;
};

type BuildSlotsInput = {
  /** Dia local do salão, "YYYY-MM-DD" */
  date: string;
  /** null = fechado nesse dia */
  hours: { opensAt: number; closesAt: number } | null;
  durationMin: number;
  /** Ids das salas ativas, na ordem em que devem ser ocupadas */
  rooms: string[];
  /** Reservas confirmadas (de qualquer experiência) que tocam esse dia */
  bookings: (Interval & { roomId: string; userId: string })[];
  /** Cliente que está vendo a grade; sem ele, nenhum horário conta como "seu" */
  userId?: string;
  now: Date;
};

export const isValidDuration = (min: number) => (DURATIONS_MIN as readonly number[]).includes(min);

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
 * Gera os horários do dia a cada SLOT_STEP_MIN para a duração escolhida. Um horário fica livre
 * quando ainda não passou, existe uma sala sem nenhuma reserva sobreposta durante todo o
 * intervalo, e o cliente não tem outra reserva nesse intervalo.
 */
export function buildSlots({ date, hours, durationMin, rooms, bookings, userId, now }: BuildSlotsInput): Slot[] {
  if (!hours) return [];

  const slots: Slot[] = [];
  for (let m = hours.opensAt; m + durationMin <= hours.closesAt; m += SLOT_STEP_MIN) {
    const startsAt = salonTime(date, m);
    const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
    const overlapping = bookings.filter((b) => overlaps(b, { startsAt, endsAt }));
    // Por sala, não por contagem: 4 reservas em só 3 salas ainda deixam uma sala livre
    const busy = new Set(overlapping.map((b) => b.roomId));
    const roomId = rooms.find((r) => !busy.has(r)) ?? null;
    const own = userId === undefined ? undefined : overlapping.find((b) => b.userId === userId);
    const mine = own
      ? {
          startsAt: own.startsAt,
          endsAt: own.endsAt,
          exact: own.startsAt.getTime() === startsAt.getTime() && own.endsAt.getTime() === endsAt.getTime(),
        }
      : null;
    slots.push({ startsAt, endsAt, roomId, mine, available: startsAt > now && roomId !== null && !mine });
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
