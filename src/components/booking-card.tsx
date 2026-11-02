import type { CSSProperties, ReactNode } from "react";
import { salonDate } from "@/lib/availability";
import { dayChip, durationOf, formatDuration, formatLongDate, formatRange } from "@/lib/format";

export type BookingCardData = {
  code: string;
  status: "CONFIRMED" | "CANCELLED";
  startsAt: Date;
  endsAt: Date;
  guests: number;
  companions: string[];
  experience: { name: string };
  room: { name: string };
  /** Titular: dono da conta que fez a reserva */
  user: { name: string };
};

/** Lista de quem participa: titular primeiro; reservas antigas, de antes dos nomes, mostram quantos faltam. */
export function participantsOf(b: Pick<BookingCardData, "guests" | "companions" | "user">) {
  const unnamed = b.guests - 1 - b.companions.length;
  return [`${b.user.name} (titular)`, ...b.companions, ...(unnamed > 0 ? [`+${unnamed} sem nome informado`] : [])];
}

/**
 * Cartão com tudo de uma reserva. `extra` entra entre os detalhes e as ações
 * (o painel do salão usa para os dados de contato do cliente).
 */
export function BookingCard({
  booking: b,
  index = 0,
  extra,
  actions,
}: {
  booking: BookingCardData;
  index?: number;
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  const chip = dayChip(salonDate(b.startsAt));
  const cancelled = b.status === "CANCELLED";
  return (
    <article
      aria-labelledby={`reserva-${b.code}`}
      style={{ "--i": index } as CSSProperties}
      className={`stagger flex animate-rise flex-col gap-5 rounded-[10px] border p-6 ${
        cancelled ? "border-line bg-ink opacity-70" : "border-[#3a2f27] bg-panel"
      }`}
    >
      <header className="flex items-start gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-[#221b16] py-2">
          <span className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">{chip.weekday}</span>
          <span className="font-display text-3xl leading-none font-semibold">{chip.day}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={`reserva-${b.code}`} className="font-display text-2xl leading-tight font-semibold">
            {b.experience.name}
          </h3>
          <p className="text-sm text-muted">{formatLongDate(b.startsAt)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.08em] uppercase ${
            cancelled ? "border-line-strong text-placeholder" : "border-gold/50 text-gold"
          }`}
        >
          {cancelled ? "Cancelada" : "Confirmada"}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Item label="Sala">{b.room.name}</Item>
        <Item label="Horário">{formatRange(b.startsAt, b.endsAt)}</Item>
        <Item label="Duração">{formatDuration(durationOf(b.startsAt, b.endsAt))}</Item>
        <Item label="Código">
          <span className="tabular-nums">{b.code}</span>
        </Item>
      </dl>

      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] tracking-[0.12em] text-muted uppercase">Participantes ({b.guests})</h4>
        <ul className="flex flex-wrap gap-2">
          {participantsOf(b).map((name, i) => (
            <li key={i} className="rounded-md bg-[#221b16] px-3 py-1.5 text-sm">
              {name}
            </li>
          ))}
        </ul>
      </div>

      {extra}
      {actions && <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">{actions}</footer>}
    </article>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
