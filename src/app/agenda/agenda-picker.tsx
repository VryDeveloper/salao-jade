import Link from "next/link";
import { connection } from "next/server";
import { addDays, salonDate } from "@/lib/availability";
import { BOOKING_WINDOW_DAYS, getActiveExperiences, getSchedule, getSlots } from "@/lib/bookings";
import { dayChip } from "@/lib/format";
import { BookingPanel } from "./booking-panel";

const HAN: Record<string, string> = { "mesa-de-cha": "茶", "cerimonia-gongfu": "功", "cha-e-dim-sum": "点" };
const sectionTitle = "text-[13px] font-bold tracking-[0.14em] text-label uppercase";

type SearchParams = Promise<{ exp?: string | string[]; dia?: string | string[] }>;

/** Lê a URL (?exp=&dia=) e o banco: renderize dentro de <Suspense>. */
export async function AgendaPicker({ searchParams }: { searchParams: SearchParams }) {
  const [params] = await Promise.all([searchParams, connection()]);
  const now = new Date();
  const dates = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(salonDate(now), i));
  const [experiences, schedule] = await Promise.all([getActiveExperiences(), getSchedule(dates)]);

  if (experiences.length === 0) {
    return <p className="text-muted">Nenhuma experiência disponível no momento.</p>;
  }

  // Valores da URL só valem se baterem com uma opção real
  const experience = experiences.find((e) => e.slug === params.exp) ?? experiences[0];
  const day = schedule.find((d) => d.hours && d.date === params.dia)?.date ?? schedule.find((d) => d.hours)?.date ?? null;
  const slots = day ? await getSlots(experience, day, now) : [];
  const href = (exp: string, dia: string | null) => `/agenda?exp=${exp}${dia ? `&dia=${dia}` : ""}`;

  return (
    <BookingPanel
      key={`${experience.id}:${day}`}
      experience={{ id: experience.id, name: experience.name, maxGuests: experience.maxGuests }}
      day={day}
      slots={slots.map((s) => ({ startsAt: s.startsAt.toISOString(), available: s.available }))}
    >
      <section aria-labelledby="h-exp" className="flex flex-col gap-4">
        <h2 id="h-exp" className={sectionTitle}>
          1 · Experiência
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {experiences.map((e) => {
            const active = e.id === experience.id;
            return (
              <Link
                key={e.id}
                href={href(e.slug, day)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-3.5 rounded-lg border p-[18px] text-cream ${
                  active ? "border-gold bg-[#221b16]" : "border-[#3a2f27] bg-panel hover:border-line-strong"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full font-han text-xl ${
                    active ? "bg-cinnabar text-paper" : "border border-line-strong text-gold"
                  }`}
                >
                  {HAN[e.slug] ?? "茶"}
                </span>
                <span className="flex flex-col gap-1">
                  <strong className="text-base">{e.name}</strong>
                  <span className="text-[13px] text-muted">
                    {e.durationMin} min · até {e.maxGuests} pessoas
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="h-dia" className="flex flex-col gap-4">
        <h2 id="h-dia" className={sectionTitle}>
          2 · Dia
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(76px,1fr))] gap-2.5">
          {schedule.map(({ date, hours }) => {
            const chip = dayChip(date);
            const content = (
              <>
                <span className="text-xs font-bold tracking-[0.1em] uppercase">{chip.weekday}</span>
                <span className="font-display text-[32px] leading-none font-semibold">{chip.day}</span>
              </>
            );
            const base = "flex h-[84px] flex-col items-center justify-center gap-0.5 rounded-lg border";
            if (!hours) {
              return (
                <span key={date} className={`${base} border-dashed border-line text-[#6b6055]`}>
                  {content}
                  <span className="text-[10px] tracking-[0.1em] uppercase">Fechado</span>
                </span>
              );
            }
            const active = date === day;
            return (
              <Link
                key={date}
                href={href(experience.slug, date)}
                scroll={false}
                aria-current={active ? "date" : undefined}
                className={`${base} ${
                  active ? "border-cream bg-cream text-ink" : "border-[#3a2f27] bg-panel text-cream hover:border-line-strong"
                }`}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </BookingPanel>
  );
}

export function AgendaSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-wrap gap-8">
      <div className="flex flex-[999_1_600px] flex-col gap-10">
        <div className="h-[84px] rounded-lg bg-panel" />
        <div className="h-[84px] rounded-lg bg-panel" />
        <div className="h-48 rounded-lg bg-panel" />
      </div>
      <div className="h-96 flex-[1_1_320px] rounded-[10px] bg-panel" />
    </div>
  );
}
