import Link from "next/link";
import { connection } from "next/server";
import { ParamLink } from "./param-link";
import { SelectedMorph } from "@/components/transitions";
import { addDays, DEFAULT_DURATION_MIN, DURATIONS_MIN, isValidDuration, salonDate } from "@/lib/availability";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_WINDOW_DAYS, getActiveExperiences, getChangeableBooking, getSchedule, getSlots } from "@/lib/bookings";
import { dayChip, durationOf, formatDuration, formatLongDate, formatRange } from "@/lib/format";
import { BookingPanel } from "./booking-panel";

const HAN: Record<string, string> = { "mesa-de-cha": "茶", "cerimonia-gongfu": "功", "cha-e-dim-sum": "点" };
const sectionTitle = "text-[13px] font-bold tracking-[0.14em] text-label uppercase";
// Cards clicáveis: transição de cor + leve afundada ao pressionar
const pressable =
  "relative overflow-hidden transition-[border-color,background-color,color,translate,scale] duration-200 ease-out active:scale-[0.98]";

type Param = string | string[] | undefined;
type SearchParams = Promise<{ exp?: Param; dur?: Param; dia?: Param; remarcar?: Param }>;

/** Lê a URL (?exp=&dur=&dia=&remarcar=) e o banco: renderize dentro de <Suspense>. */
export async function AgendaPicker({ searchParams }: { searchParams: SearchParams }) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser(), connection()]);
  const now = new Date();
  const dates = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(salonDate(now), i));
  const [experiences, schedule] = await Promise.all([getActiveExperiences(), getSchedule(dates)]);

  if (experiences.length === 0) {
    return <p className="text-muted">Nenhuma experiência disponível no momento.</p>;
  }

  // Remarcação: só vale para reserva do próprio usuário, ainda dentro do prazo
  const rescheduling =
    typeof params.remarcar === "string" ? await getChangeableBooking(user.id, params.remarcar, now) : null;
  const lockedExperience = rescheduling && experiences.find((e) => e.id === rescheduling.experienceId);

  // Valores da URL só valem se baterem com uma opção real
  const experience = lockedExperience || experiences.find((e) => e.slug === params.exp) || experiences[0];
  const urlDuration = Number(params.dur);
  const durationMin = isValidDuration(urlDuration)
    ? urlDuration
    : lockedExperience
      ? durationOf(rescheduling.startsAt, rescheduling.endsAt)
      : DEFAULT_DURATION_MIN;
  const day =
    schedule.find((d) => d.hours && d.date === params.dia)?.date ?? schedule.find((d) => d.hours)?.date ?? null;
  const slots = day
    ? await getSlots(day, durationMin, now, { userId: user.id, ignoreBookingId: rescheduling?.id })
    : [];
  const href = ({
    exp = experience.slug,
    dur = durationMin,
    dia = day,
  }: {
    exp?: string;
    dur?: number;
    dia?: string | null;
  }) =>
    `/agenda?exp=${exp}&dur=${dur}${dia ? `&dia=${dia}` : ""}${lockedExperience ? `&remarcar=${rescheduling.id}` : ""}`;

  return (
    <BookingPanel
      key={`${experience.id}:${durationMin}:${day}:${rescheduling?.id}`}
      experience={{ id: experience.id, name: experience.name, maxGuests: experience.maxGuests }}
      holderName={user.name}
      durationMin={durationMin}
      day={day}
      slots={slots.map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        available: s.available,
        mine: s.mine && {
          startsAt: s.mine.startsAt.toISOString(),
          endsAt: s.mine.endsAt.toISOString(),
          exact: s.mine.exact,
        },
      }))}
      reschedule={
        lockedExperience
          ? { bookingId: rescheduling.id, code: rescheduling.code, companions: rescheduling.companions }
          : undefined
      }
    >
      {params.remarcar && !lockedExperience && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-5 py-4 text-danger">
          Essa reserva não pode mais ser remarcada. Você pode fazer uma nova abaixo.
        </p>
      )}
      {lockedExperience ? (
        <p className="rounded-lg border border-gold/40 bg-[#221b16] px-5 py-4 leading-relaxed">
          Remarcando <strong>{rescheduling.code}</strong> · {experience.name}, hoje marcada para{" "}
          {formatLongDate(rescheduling.startsAt)}, {formatRange(rescheduling.startsAt, rescheduling.endsAt)}. Escolha a
          nova duração, dia e horário.{" "}
          <Link
            href="/reservas"
            transitionTypes={["nav-forward"]}
            className="font-semibold text-gold hover:text-[#e2c27f]"
          >
            Desistir
          </Link>
        </p>
      ) : (
        <section aria-labelledby="h-exp" className="flex flex-col gap-4">
          <h2 id="h-exp" className={sectionTitle}>
            1 · Experiência
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
            {experiences.map((e) => {
              const active = e.id === experience.id;
              return (
                <SelectedMorph key={e.id} name="experiencia-ativa" active={active}>
                  <ParamLink
                    param="exp"
                    value={e.slug}
                    href={href({ exp: e.slug })}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`${pressable} flex items-center gap-3.5 rounded-lg border p-[18px] text-cream ${
                      active ? "border-gold bg-[#221b16]" : "border-[#3a2f27] bg-panel hover:border-line-strong"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full font-han text-xl transition-colors duration-200 ${
                        active ? "bg-cinnabar text-paper" : "border border-line-strong text-gold"
                      }`}
                    >
                      {HAN[e.slug] ?? "茶"}
                    </span>
                    <span className="flex flex-col gap-1">
                      <strong className="text-base">{e.name}</strong>
                      <span className="text-[13px] text-muted">{e.description}</span>
                      <span className="text-[13px] text-placeholder">Até {e.maxGuests} pessoas</span>
                    </span>
                  </ParamLink>
                </SelectedMorph>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="h-dur" className="flex flex-col gap-4">
        <h2 id="h-dur" className={sectionTitle}>
          2 · Quanto tempo você quer ficar
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {DURATIONS_MIN.map((min) => {
            const active = min === durationMin;
            return (
              <SelectedMorph key={min} name="duracao-ativa" active={active}>
                <ParamLink
                  param="dur"
                  value={String(min)}
                  href={href({ dur: min })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`${pressable} flex h-12 items-center justify-center rounded-lg border text-[15px] ${
                    active
                      ? "border-gold bg-[#221b16] font-bold text-cream"
                      : "border-[#3a2f27] bg-panel text-cream hover:border-line-strong"
                  }`}
                >
                  {formatDuration(min)}
                </ParamLink>
              </SelectedMorph>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="h-dia" className="flex flex-col gap-4">
        <h2 id="h-dia" className={sectionTitle}>
          3 · Dia
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
                <span key={date} className={`${base} border-[#3a2f27] bg-panel text-placeholder`}>
                  {content}
                  <span className="text-[10px] tracking-[0.1em] uppercase">Fechado</span>
                </span>
              );
            }
            const active = date === day;
            return (
              <SelectedMorph key={date} name="dia-ativo" active={active}>
                <ParamLink
                  param="dia"
                  value={date}
                  href={href({ dia: date })}
                  scroll={false}
                  aria-current={active ? "date" : undefined}
                  className={`${pressable} ${base} ${
                    active
                      ? "border-cream bg-cream text-ink"
                      : "border-[#3a2f27] bg-panel text-cream hover:-translate-y-px hover:border-line-strong"
                  }`}
                >
                  {content}
                </ParamLink>
              </SelectedMorph>
            );
          })}
        </div>
      </section>
    </BookingPanel>
  );
}

export function AgendaSkeleton() {
  return (
    <div className="flex flex-wrap gap-8" aria-busy="true">
      <span className="sr-only">Carregando a agenda…</span>
      <div aria-hidden="true" className="flex flex-[999_1_600px] flex-col gap-10">
        <div className="skeleton h-[84px] rounded-lg" />
        <div className="skeleton h-[84px] rounded-lg" />
        <div className="skeleton h-48 rounded-lg" />
      </div>
      <div aria-hidden="true" className="skeleton h-96 flex-[1_1_320px] rounded-[10px]" />
    </div>
  );
}
