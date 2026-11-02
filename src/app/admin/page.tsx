import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BookingCard } from "@/components/booking-card";
import { addDays } from "@/lib/availability";
import { getBookingsOfDay, getOverview } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatLongDate } from "@/lib/format";
import { CancelButton } from "../reservas/cancel-button";
import { cancelAsAdmin } from "./actions";
import { AdminShell, panel, sectionTitle } from "./admin-shell";

export const metadata: Metadata = { title: "Painel do salão — Salão Jade" };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <AdminShell current="reservas" title="Reservas">
      <DayBookings searchParams={props.searchParams} />
    </AdminShell>
  );
}

async function DayBookings({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const [params] = await Promise.all([searchParams, requireAdmin(), connection()]);
  const now = new Date();
  const overview = await getOverview(now);
  const day = typeof params.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.dia) ? params.dia : overview.today;
  const bookings = await getBookingsOfDay(day);
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const people = confirmed.reduce((sum, b) => sum + b.guests, 0);
  const dayLink = (d: string) => `/admin?dia=${d}`;

  return (
    <>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Stat label="Reservas hoje">{overview.todayCount}</Stat>
        <Stat label="Próximos 7 dias">{overview.weekCount}</Stat>
        <Stat label="Clientes cadastrados">{overview.customers}</Stat>
      </dl>

      <section aria-labelledby="h-dia" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="h-dia" className={sectionTitle}>
              {formatLongDate(day)}
            </h2>
            <p className="text-sm text-muted">
              {confirmed.length} {confirmed.length === 1 ? "reserva confirmada" : "reservas confirmadas"}, {people}{" "}
              {people === 1 ? "pessoa" : "pessoas"}
            </p>
          </div>
          {/* GET simples: funciona sem JavaScript e deixa o dia na URL */}
          <form action="/admin" className="flex flex-wrap items-end gap-2">
            <Link
              href={dayLink(addDays(day, -1))}
              aria-label="Dia anterior"
              className="flex size-11 items-center justify-center rounded-md border border-line-strong hover:border-gold"
            >
              ‹
            </Link>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-label">
              Dia
              <input
                type="date"
                name="dia"
                defaultValue={day}
                className="h-11 rounded-md border border-line-strong bg-field px-3 text-sm text-cream [color-scheme:dark]"
              />
            </label>
            <button
              type="submit"
              className="h-11 cursor-pointer rounded-md border border-gold px-4 text-sm font-semibold text-gold hover:bg-gold/10"
            >
              Ver
            </button>
            <Link
              href={dayLink(addDays(day, 1))}
              aria-label="Próximo dia"
              className="flex size-11 items-center justify-center rounded-md border border-line-strong hover:border-gold"
            >
              ›
            </Link>
          </form>
        </div>

        {bookings.length === 0 ? (
          <p className={`${panel} text-muted`}>Nenhuma reserva nesse dia.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,460px),1fr))] gap-4">
            {bookings.map((b, i) => (
              <li key={b.id}>
                <BookingCard
                  booking={b}
                  index={i}
                  extra={
                    <div className="flex flex-col gap-1 rounded-md bg-[#221b16] px-4 py-3 text-sm">
                      <span className="text-[11px] tracking-[0.12em] text-muted uppercase">Cliente</span>
                      <strong>{b.user.name}</strong>
                      <a href={`mailto:${b.user.email}`} className="-my-1 self-start py-2 text-gold hover:text-[#e2c27f]">
                        {b.user.email}
                      </a>
                      {b.user.phone ? (
                        <a
                          href={`tel:${b.user.phone.replace(/[^\d+]/g, "")}`}
                          className="-my-1 self-start py-2 text-gold hover:text-[#e2c27f]"
                        >
                          {b.user.phone}
                        </a>
                      ) : (
                        <span className="text-muted">Sem telefone</span>
                      )}
                    </div>
                  }
                  actions={
                    b.status === "CONFIRMED" && b.startsAt > now ? (
                      <CancelButton
                        bookingId={b.id}
                        label={`${b.experience.name} de ${b.user.name}`}
                        action={cancelAsAdmin}
                      />
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={`${panel} flex flex-col gap-1`}>
      <dt className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</dt>
      <dd className="font-display text-4xl font-semibold">{children}</dd>
    </div>
  );
}
