"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { FormAlert, primaryButton } from "@/components/field";
import { formatLongDate, formatTime } from "@/lib/format";
import { bookSlot } from "./actions";

type Props = {
  experience: { id: string; name: string; maxGuests: number };
  /** null quando não há dia aberto na janela */
  day: string | null;
  slots: { startsAt: string; available: boolean }[];
  /** Presente no modo remarcar */
  reschedule?: { bookingId: string; code: string; guests: number };
  /** Seções de experiência e dia, renderizadas no servidor */
  children: ReactNode;
};

const sectionTitle = "text-[13px] font-bold tracking-[0.14em] text-label uppercase";
const slotBase = "h-12 rounded-md text-[15px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function BookingPanel({ experience, day, slots, reschedule, children }: Props) {
  const [state, action, pending] = useActionState(bookSlot, undefined);
  const [selected, setSelected] = useState<string | null>(null);
  const [guests, setGuests] = useState(reschedule?.guests ?? Math.min(2, experience.maxGuests));
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
              3 · Horários disponíveis
            </h2>
            <div className="flex flex-wrap gap-[18px] text-[13px] text-muted">
              <Legend className="border border-placeholder">Livre</Legend>
              <Legend className="bg-cinnabar">Selecionado</Legend>
              <Legend className="border border-dashed border-line-strong">Ocupado</Legend>
            </div>
          </div>

          {day ? (
            <>
              <p className="text-sm text-muted" aria-live="polite">
                {freeCount === 0
                  ? `Nenhum horário livre em ${formatLongDate(day)}.`
                  : `${freeCount} ${freeCount === 1 ? "horário livre" : "horários livres"} em ${formatLongDate(day)}`}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5">
                {slots.map((slot) => {
                  const time = formatTime(slot.startsAt);
                  if (!slot.available) {
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        disabled
                        aria-label={`${time}, ocupado`}
                        className={`${slotBase} cursor-not-allowed border border-dashed border-line text-[#6b6055] line-through`}
                      >
                        {time}
                      </button>
                    );
                  }
                  const isSelected = slot.startsAt === chosen?.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => pick(slot.startsAt)}
                      className={`${slotBase} cursor-pointer border ${
                        isSelected
                          ? "border-cinnabar bg-cinnabar font-bold text-paper"
                          : "border-line-strong text-cream hover:border-gold"
                      }`}
                    >
                      {time}
                    </button>
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
          <div role="status" className="flex flex-col gap-4">
            <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Reserva confirmada</p>
            <p className="leading-relaxed">
              {confirmed.experience}, {formatLongDate(confirmed.startsAt)} às {formatTime(confirmed.startsAt)} para{" "}
              {confirmed.guests} {confirmed.guests === 1 ? "pessoa" : "pessoas"}.
            </p>
            <p className="text-sm text-muted">
              Código <strong className="text-cream tabular-nums">{confirmed.code}</strong>
            </p>
            <button
              type="button"
              onClick={() => setDismissed(confirmed.code)}
              className="h-11 cursor-pointer rounded-md border border-gold text-sm font-semibold text-gold hover:text-[#e2c27f]"
            >
              Fazer outra reserva
            </button>
            <Link href="/reservas" className="text-center text-sm font-semibold text-gold hover:text-[#e2c27f]">
              Ver minhas reservas
            </Link>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-[22px]">
            <input type="hidden" name="experienceId" value={experience.id} />
            <input type="hidden" name="startsAt" value={chosen?.startsAt ?? ""} />
            <input type="hidden" name="guests" value={guests} />
            {reschedule && <input type="hidden" name="bookingId" value={reschedule.bookingId} />}

            <dl className="flex flex-col gap-4">
              <Row label="Experiência">{experience.name}</Row>
              <Row label="Data">{day ? formatLongDate(day) : "—"}</Row>
              <Row label="Horário">{chosen ? formatTime(chosen.startsAt) : "—"}</Row>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs tracking-[0.12em] text-muted uppercase">Pessoas</dt>
                  <dd className="font-semibold" aria-live="polite">
                    {guests} {guests === 1 ? "pessoa" : "pessoas"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <StepButton label="Menos uma pessoa" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}>
                    −
                  </StepButton>
                  <StepButton
                    label="Mais uma pessoa"
                    disabled={guests >= experience.maxGuests}
                    onClick={() => setGuests(guests + 1)}
                  >
                    +
                  </StepButton>
                </div>
              </div>
            </dl>

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
      className="size-11 cursor-pointer rounded-full border border-line-strong text-xl text-cream hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
