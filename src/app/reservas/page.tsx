import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { primaryButton } from "@/components/field";
import { MaskLine } from "@/components/mask-line";
import { SiteHeader, SiteHeaderShell } from "@/components/site-header";
import { ContentIn, PageTransition, SkeletonOut } from "@/components/transitions";
import { isChangeable, salonDate } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { getUserBookings } from "@/lib/bookings";
import { durationOf, formatLongDate, formatRange } from "@/lib/format";
import { CancelButton } from "./cancel-button";
import { BookingCard, participantsOf } from "@/components/booking-card";

export const metadata: Metadata = { title: "Minhas reservas — Salão Jade" };

export default function ReservasPage(props: PageProps<"/reservas">) {
  return (
    <>
      <Suspense fallback={<SiteHeaderShell current="reservas" />}>
        <SiteHeader current="reservas" />
      </Suspense>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-5 pt-12 pb-18 sm:px-8">
          <Suspense
            fallback={
              <SkeletonOut>
                <div aria-busy="true" className="skeleton h-64 rounded-lg">
                  <span className="sr-only">Carregando suas reservas…</span>
                </div>
              </SkeletonOut>
            }
          >
            <ContentIn>
              <div className="flex flex-col gap-10">
                <Bookings searchParams={props.searchParams} />
              </div>
            </ContentIn>
          </Suspense>
        </main>
      </PageTransition>
    </>
  );
}

async function Bookings({ searchParams }: { searchParams: PageProps<"/reservas">["searchParams"] }) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams, connection()]);
  const now = new Date();
  const { upcoming, history } = await getUserBookings(user.id, now);
  const rescheduled = upcoming.find((b) => b.code === params.remarcada);

  return (
    <>
      {rescheduled && (
        <p role="status" className="rounded-lg border border-gold/40 bg-[#221b16] px-5 py-4">
          Reserva <strong>{rescheduled.code}</strong> remarcada para {formatLongDate(rescheduled.startsAt)},{" "}
          {formatRange(rescheduled.startsAt, rescheduled.endsAt)}, {rescheduled.room.name}.
        </p>
      )}

      <section aria-labelledby="h-prox" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="h-prox" className="font-display text-4xl font-semibold sm:text-5xl">
            <MaskLine>Próximas reservas</MaskLine>
          </h1>
          <Link
            href="/agenda"
            transitionTypes={["nav-back"]}
            className="flex h-11 items-center rounded-md border border-gold px-5 text-sm font-semibold text-gold transition-[color,background-color,scale] duration-150 hover:bg-gold/10 hover:text-[#e2c27f] active:scale-[0.97]"
          >
            Nova reserva
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="flex flex-col items-start gap-5 rounded-lg border border-dashed border-[#3a2f27] p-8">
            <p className="text-muted">Você não tem reservas marcadas.</p>
            <Link href="/agenda" transitionTypes={["nav-back"]} className={`${primaryButton} max-w-60`}>
              Reservar horário
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-4">
            {upcoming.map((b, i) => {
              const label = `${b.experience.name} de ${formatLongDate(b.startsAt)}`;
              const changeable = isChangeable(b.startsAt, now);
              return (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    index={i}
                    actions={
                      changeable ? (
                        <>
                          <Link
                            href={`/agenda?exp=${b.experience.slug}&dur=${durationOf(b.startsAt, b.endsAt)}&dia=${salonDate(b.startsAt)}&remarcar=${b.id}`}
                            aria-label={`Remarcar ${label}`}
                            transitionTypes={["nav-back"]}
                            className="flex h-11 items-center rounded-md border border-line-strong px-4 text-sm text-cream transition-[border-color,scale] duration-150 hover:border-gold active:scale-[0.97]"
                          >
                            Remarcar
                          </Link>
                          <CancelButton bookingId={b.id} label={label} />
                        </>
                      ) : (
                        <span className="text-[13px] text-muted">Alterações só até 24h antes</span>
                      )
                    }
                  />
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
                {b.experience.name} · {formatLongDate(b.startsAt)}, {formatRange(b.startsAt, b.endsAt)} · {b.room.name}{" "}
                · {participantsOf(b).join(", ")}
                {b.status === "CANCELLED" && " · cancelada"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
