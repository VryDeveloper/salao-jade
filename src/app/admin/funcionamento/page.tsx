import type { Metadata } from "next";
import { connection } from "next/server";
import { primaryButton } from "@/components/field";
import { getClosures, getExperiences, getRooms } from "@/lib/admin";
import { salonDate } from "@/lib/availability";
import { requireAdmin } from "@/lib/auth";
import { formatLongDate } from "@/lib/format";
import { closeDay, reopenDay, toggleExperience, toggleRoom } from "../actions";
import { AdminForm } from "../admin-form";
import { AdminShell, panel, sectionTitle } from "../admin-shell";

export const metadata: Metadata = { title: "Funcionamento — Painel do salão" };

export default function OperationsPage() {
  return (
    <AdminShell current="funcionamento" title="Funcionamento">
      <Operations />
    </AdminShell>
  );
}

const smallButton =
  "h-10 cursor-pointer rounded-md border px-4 text-sm transition-[border-color,background-color,scale] duration-150 active:scale-[0.97]";

async function Operations() {
  await Promise.all([requireAdmin(), connection()]);
  const [closures, rooms, experiences] = await Promise.all([getClosures(), getRooms(), getExperiences()]);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] items-start gap-6">
      <section aria-labelledby="h-folgas" className={`${panel} flex flex-col gap-5`}>
        <div className="flex flex-col gap-1">
          <h2 id="h-folgas" className={sectionTitle}>
            Folgas e feriados
          </h2>
          <p className="text-sm text-muted">Um dia fechado some da agenda dos clientes.</p>
        </div>
        <AdminForm action={closeDay} className="gap-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            <label className="flex flex-col gap-2 text-[13px] font-semibold text-label">
              Data
              <input
                type="date"
                name="date"
                required
                min={salonDate(new Date())}
                className="h-11 rounded-md border border-line-strong bg-field px-3 text-sm text-cream [color-scheme:dark]"
              />
            </label>
            <label className="flex flex-col gap-2 text-[13px] font-semibold text-label">
              Motivo (opcional)
              <input
                name="reason"
                maxLength={120}
                placeholder="Ex.: Feriado de Natal"
                className="h-11 rounded-md border border-line-strong bg-field px-3 text-sm text-cream placeholder:text-placeholder"
              />
            </label>
          </div>
          <button type="submit" className={`${primaryButton} h-11`}>
            Fechar esse dia
          </button>
        </AdminForm>
        {closures.length === 0 ? (
          <p className="text-sm text-muted">Nenhum dia fechado daqui pra frente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {closures.map((c) => {
              const date = c.date.toISOString().slice(0, 10);
              return (
                <li
                  key={date}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[#221b16] px-4 py-3"
                >
                  <span>
                    <strong className="block">{formatLongDate(date)}</strong>
                    <span className="text-sm text-muted">{c.reason ?? "Sem motivo informado"}</span>
                  </span>
                  <AdminForm action={reopenDay}>
                    <input type="hidden" name="date" value={date} />
                    <button type="submit" className={`${smallButton} border-line-strong hover:border-gold`}>
                      Reabrir
                    </button>
                  </AdminForm>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="h-salas" className={`${panel} flex flex-col gap-4`}>
          <h2 id="h-salas" className={sectionTitle}>
            Salas
          </h2>
          <ul className="flex flex-col gap-2">
            {rooms.map((r) => (
              <Toggle key={r.id} id={r.id} name={r.name} active={r.active} action={toggleRoom} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-exp" className={`${panel} flex flex-col gap-4`}>
          <div className="flex flex-col gap-1">
            <h2 id="h-exp" className={sectionTitle}>
              Experiências
            </h2>
            <p className="text-sm text-muted">Desativar tira da agenda; reservas já feitas continuam valendo.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {experiences.map((e) => (
              <Toggle key={e.id} id={e.id} name={e.name} active={e.active} action={toggleExperience} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Toggle({
  id,
  name,
  active,
  action,
}: {
  id: string;
  name: string;
  active: boolean;
  action: typeof toggleRoom;
}) {
  return (
    <li className="rounded-md bg-[#221b16] px-4 py-3">
      <AdminForm action={action}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className={`size-2.5 rounded-full ${active ? "bg-gold" : "bg-line-strong"}`} />
            <strong>{name}</strong>
            <span className="text-sm text-muted">{active ? "Ativa" : "Desativada"}</span>
          </span>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={String(!active)} />
          <button
            type="submit"
            aria-label={`${active ? "Desativar" : "Ativar"} ${name}`}
            className={`${smallButton} ${active ? "border-line-strong hover:border-danger" : "border-gold text-gold hover:bg-gold/10"}`}
          >
            {active ? "Desativar" : "Ativar"}
          </button>
        </div>
      </AdminForm>
    </li>
  );
}
