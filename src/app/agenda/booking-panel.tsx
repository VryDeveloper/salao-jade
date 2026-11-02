"use client";

import Link from "next/link";
import { useActionState, useState, type CSSProperties, type ReactNode } from "react";
import { FormAlert, primaryButton } from "@/components/field";
import { formatDuration, formatLongDate, formatRange } from "@/lib/format";
import { bookSlot } from "./actions";

type Props = {
  experience: { id: string; name: string; maxGuests: number };
  durationMin: number;
  /** null quando não há dia aberto na janela */
  day: string | null;
  /** `mine`: o próprio cliente já tem reserva que se sobrepõe a este horário */
  slots: { startsAt: string; endsAt: string; available: boolean; mine: boolean }[];
  /** Presente no modo remarcar */
  reschedule?: { bookingId: string; code: string; companions: string[] };
  /** Nome do titular, primeiro participante de toda reserva */
  holderName: string;
  /** Seções de experiência e dia, renderizadas no servidor */
  children: ReactNode;
};

const sectionTitle = "text-[13px] font-bold tracking-[0.14em] text-label uppercase";
const slotBase =
  "h-12 w-full rounded-md text-sm tabular-nums transition-[background-color,border-color,color,translate,scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function BookingPanel({ experience, durationMin, day, slots, reschedule, holderName, children }: Props) {
  const [state, action, pending] = useActionState(bookSlot, undefined);
  const [selected, setSelected] = useState<string | null>(null);
  // Um nome por acompanhante; o número de pessoas é o titular + essa lista
  const [companions, setCompanions] = useState<string[]>(reschedule?.companions ?? []);
  const guests = companions.length + 1;
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Some da seleção se o horário deixou de estar livre (ex.: depois do refresh)
  const chosen = slots.find((s) => s.startsAt === selected && s.available);
  const confirmed = state?.booking && state.booking.code !== dismissed ? state.booking : null;
  const freeCount = slots.filter((s) => s.available).length;

  const pick = (startsAt: string) => {
    setSelected(startsAt);
    if (state?.booking) setDismissed(state.booking.code);
  };

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-10">
        {children}

        <section aria-labelledby="h-hora" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="h-hora" className={sectionTitle}>
              4 · Horário de chegada
            </h2>
            <div className="flex flex-wrap gap-[18px] text-[13px] text-muted">
              <Legend className="border border-placeholder">Livre</Legend>
              <Legend className="bg-cinnabar">Selecionado</Legend>
              <Legend className="border border-dashed border-gold/70">Conflita com sua reserva</Legend>
              <Legend className="border border-[#3a2f27] bg-panel">Ocupado</Legend>
            </div>
          </div>

          {day ? (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {freeCount === 0
                  ? `Nenhum horário livre para ${formatDuration(durationMin)} em ${formatLongDate(day)}.`
                  : `${freeCount} ${freeCount === 1 ? "horário livre" : "horários livres"} para ${formatDuration(durationMin)} em ${formatLongDate(day)}`}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2.5">
                {slots.map((slot, i) => {
                  // O card mostra o intervalo inteiro da duração escolhida, não só a chegada
                  const time = formatRange(slot.startsAt, slot.endsAt);
                  const isSelected = slot.startsAt === chosen?.startsAt;
                  return (
                    // Entrada em sequência no invólucro; o botão fica livre para o "pop" da seleção
                    <div key={slot.startsAt} className="stagger animate-rise" style={{ "--i": i } as CSSProperties}>
                      {slot.mine ? (
                        <button
                          type="button"
                          disabled
                          aria-label={`${time}, conflita com uma reserva sua`}
                          title="Esse intervalo bate com uma reserva sua"
                          className={`${slotBase} cursor-not-allowed border border-dashed border-gold/70 bg-gold/5 text-gold`}
                        >
                          {time}
                        </button>
                      ) : !slot.available ? (
                        <button
                          type="button"
                          disabled
                          aria-label={`${time}, ocupado`}
                          className={`${slotBase} cursor-not-allowed border border-[#3a2f27] bg-panel text-placeholder line-through decoration-placeholder/70`}
                        >
                          {time}
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => pick(slot.startsAt)}
                          className={`${slotBase} cursor-pointer border active:scale-[0.96] ${
                            isSelected
                              ? "animate-pop border-cinnabar bg-cinnabar font-bold text-paper"
                              : "border-line-strong text-cream hover:-translate-y-px hover:border-gold"
                          }`}
                        >
                          {time}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-[#3a2f27] p-6 text-center text-muted">
              Não há dias abertos nos próximos dias.
            </p>
          )}
        </section>
      </div>

      <aside
        aria-labelledby="h-resumo"
        className="flex flex-[1_1_320px] flex-col gap-[22px] rounded-[10px] border border-[#3a2f27] bg-panel p-7"
      >
        <h2 id="h-resumo" className="font-display text-[30px] font-semibold">
          {reschedule ? `Remarcar ${reschedule.code}` : "Sua reserva"}
        </h2>

        {confirmed ? (
          <div role="status" className="flex animate-rise flex-col gap-4">
            <p className="flex items-center gap-2.5 text-xs font-bold tracking-[0.18em] text-gold uppercase">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0" fill="none">
                <circle cx="12" cy="12" r="11" className="fill-cinnabar" />
                <path
                  d="M7 12.5l3.2 3.2L17 9"
                  stroke="#fbf3e6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="24"
                  className="animate-draw"
                />
              </svg>
              Reserva confirmada
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Experiência">{confirmed.experience}</Detail>
              <Detail label="Sala">{confirmed.room}</Detail>
              <Detail label="Data">{formatLongDate(confirmed.startsAt)}</Detail>
              <Detail label="Horário">{formatRange(confirmed.startsAt, confirmed.endsAt)}</Detail>
              <Detail label="Código">
                <span className="tabular-nums">{confirmed.code}</span>
              </Detail>
              <div className="col-span-2 flex flex-col gap-0.5">
                <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">
                  Participantes ({confirmed.participants.length})
                </dt>
                <dd className="font-semibold">{confirmed.participants.join(", ")}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDismissed(confirmed.code)}
              className="h-11 cursor-pointer rounded-md border border-gold text-sm font-semibold text-gold transition-[color,background-color,scale] duration-150 hover:bg-gold/10 hover:text-[#e2c27f] active:scale-[0.98]"
            >
              Fazer outra reserva
            </button>
            <Link
              href="/reservas"
              transitionTypes={["nav-forward"]}
              className="text-center text-sm font-semibold text-gold hover:text-[#e2c27f]"
            >
              Ver minhas reservas
            </Link>
          </div>
        ) : (
          <form action={action} className="flex animate-rise flex-col gap-[22px]">
            <input type="hidden" name="experienceId" value={experience.id} />
            <input type="hidden" name="startsAt" value={chosen?.startsAt ?? ""} />
            <input type="hidden" name="durationMin" value={durationMin} />
            {reschedule && <input type="hidden" name="bookingId" value={reschedule.bookingId} />}

            <dl className="flex flex-col gap-4">
              <Row label="Experiência">{experience.name}</Row>
              <Row label="Data">{day ? formatLongDate(day) : "—"}</Row>
              <Row label="Horário">
                {chosen ? `${formatRange(chosen.startsAt, chosen.endsAt)} (${formatDuration(durationMin)})` : "—"}
              </Row>
              <Row label="Sala">{chosen ? "Definida ao confirmar" : "—"}</Row>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs tracking-[0.12em] text-muted uppercase">Pessoas</dt>
                  <dd className="font-semibold" aria-live="polite">
                    <span key={guests} className="inline-block animate-rise">
                      {guests} {guests === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <StepButton
                    label="Menos uma pessoa"
                    disabled={guests <= 1}
                    onClick={() => setCompanions(companions.slice(0, -1))}
                  >
                    −
                  </StepButton>
                  <StepButton
                    label="Mais uma pessoa"
                    disabled={guests >= experience.maxGuests}
                    onClick={() => setCompanions([...companions, ""])}
                  >
                    +
                  </StepButton>
                </div>
              </div>
            </dl>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-xs tracking-[0.12em] text-muted uppercase">Quem vai participar</legend>
              <p className="flex h-11 items-center rounded-md bg-[#221b16] px-3.5 text-sm">
                {holderName} <span className="ml-2 text-xs text-muted">(você, titular)</span>
              </p>
              {companions.map((name, i) => (
                <div key={i} className="flex animate-rise flex-col gap-1.5">
                  <label htmlFor={`companion-${i}`} className="text-[13px] font-semibold text-label">
                    Acompanhante {i + 1}
                  </label>
                  <input
                    id={`companion-${i}`}
                    name="companion"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setCompanions(companions.map((c, j) => (j === i ? e.target.value : c)))}
                    className="h-11 rounded-md border border-line-strong bg-field px-3.5 text-sm text-cream transition-[border-color] duration-150 placeholder:text-placeholder focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  />
                </div>
              ))}
            </fieldset>

            <FormAlert message={state?.error} />

            {chosen ? (
              <button type="submit" disabled={pending} className={primaryButton}>
                {pending ? "Salvando…" : reschedule ? "Confirmar novo horário" : "Confirmar reserva"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="h-[52px] cursor-not-allowed rounded-md bg-[#2a221c] text-[15px] font-bold tracking-wider text-placeholder"
              >
                Escolha um horário
              </button>
            )}
            <p className="text-[13px] leading-relaxed text-muted">
              Até {experience.maxGuests} pessoas nesta experiência.
            </p>
          </form>
        )}
      </aside>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-3 rounded-[3px] ${className}`} />
      {children}
    </span>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line pb-4">
      <dt className="text-xs tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="font-semibold">
        {/* Remonta quando o valor muda: o novo valor entra suave em vez de trocar seco */}
        <span key={String(children)} className="inline-block animate-rise">
          {children}
        </span>
      </dd>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="size-11 cursor-pointer rounded-full border border-line-strong text-xl text-cream transition-[border-color,scale] duration-150 hover:border-gold active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
