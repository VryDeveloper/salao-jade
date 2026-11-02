import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type CSSProperties } from "react";
import { primaryButton } from "@/components/field";
import { SiteHeader, SiteHeaderShell } from "@/components/site-header";
import { isChangeable, salonDate } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/bookings";
import { dayChip, formatLongDate, formatTime } from "@/lib/format";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Minhas reservas — Salão Jade" };

export default function ReservasPage(props: PageProps<"/reservas">) {
  return (
    <>
      <Suspense fallback={<SiteHeaderShell current="reservas" />}>
        <SiteHeader current="reservas" />
      </Suspense>
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-5 pt-12 pb-18 sm:px-8">
        <Suspense
          fallback={
            <div aria-busy="true" className="skeleton h-64 rounded-lg">
              <span className="sr-only">Carregando suas reservas…</span>
            </div>
          }
        >
          <Bookings searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}

const pluralPeople = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;

async function Bookings({ searchParams }: { searchParams: PageProps<"/reservas">["searchParams"] }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams, connection()]);
  const now = new Date();
  const { upcoming, history } = await getUserBookings(user.id, now);
  const rescheduled = upcoming.find((b) => b.code === params.remarcada);

  return (
    <>
      {rescheduled && (
        <p role="status" className="rounded-lg border border-gold/40 bg-[#221b16] px-5 py-4">
          Reserva <strong>{rescheduled.code}</strong> remarcada para {formatLongDate(rescheduled.startsAt)} às{" "}
          {formatTime(rescheduled.startsAt)}.
        </p>
      )}

      <section aria-labelledby="h-prox" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="h-prox" className="font-display text-4xl font-semibold sm:text-5xl">
            Próximas reservas
          </h1>
          <Link
            href="/agenda"
            className="flex h-11 items-center rounded-md border border-gold px-5 text-sm font-semibold text-gold transition-[color,background-color,scale] duration-150 hover:bg-gold/10 hover:text-[#e2c27f] active:scale-[0.97]"
          >
            Nova reserva
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-5 rounded-lg border border-dashed border-[#3a2f27] p-8">
            <p className="text-muted">Você não tem reservas marcadas.</p>
            <Link href="/agenda" className={`${primaryButton} max-w-60`}>
              Reservar horário
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col border-t border-line">
            {upcoming.map((b, i) => {
              const chip = dayChip(salonDate(b.startsAt));
              const label = `${b.experience.name} de ${formatLongDate(b.startsAt)}`;
              const changeable = isChangeable(b.startsAt, now);
              return (
                <li
                  key={b.id}
                  style={{ "--i": i } as CSSProperties}
                  className="stagger flex animate-rise flex-wrap items-center gap-6 border-b border-line py-6"
                >
                  <div className="flex w-[72px] shrink-0 flex-col items-center">
                    <span className="text-xs font-bold tracking-[0.1em] text-muted uppercase">{chip.weekday}</span>
                    <span className="font-display text-[40px] leading-none font-semibold">{chip.day}</span>
                  </div>
                  <div className="flex flex-[1_1_260px] flex-col gap-1.5">
                    <strong className="text-[17px]">{b.experience.name}</strong>
                    <span className="text-sm text-muted">
                      {formatTime(b.startsAt)} · {b.experience.durationMin} min · {pluralPeople(b.guests)} · {b.code}
                    </span>
                  </div>
                  {changeable ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/agenda?exp=${b.experience.slug}&dia=${salonDate(b.startsAt)}&remarcar=${b.id}`}
                        aria-label={`Remarcar ${label}`}
                        className="flex h-11 items-center rounded-md border border-line-strong px-4 text-sm text-cream transition-[border-color,scale] duration-150 hover:border-gold active:scale-[0.97]"
                      >
                        Remarcar
                      </Link>
                      <CancelButton bookingId={b.id} label={label} />
                    </div>
                  ) : (
                    <span className="text-[13px] text-muted">Alterações só até 24h antes</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="h-hist" className="flex flex-col gap-4">
          <h2 id="h-hist" className="text-[13px] font-bold tracking-[0.14em] text-label uppercase">
            Histórico
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-muted">
            {history.map((b) => (
              <li key={b.id}>
                {b.experience.name} · {formatLongDate(b.startsAt)} · {pluralPeople(b.guests)}
                {b.status === "CANCELLED" && " · cancelada"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
