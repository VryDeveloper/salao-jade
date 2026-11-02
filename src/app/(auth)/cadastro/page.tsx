import type { Metadata } from "next";
import { Brand, Lattice } from "@/components/brand";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta — Salão Jade" };

const STEPS = [
  { n: "一", title: "Veja horários em tempo real", text: "Só aparece o que está livre de verdade." },
  { n: "二", title: "Reserve em três toques", text: "Experiência, dia e horário. Pronto." },
  { n: "三", title: "Remarque quando precisar", text: "Gerencie tudo em Minhas reservas." },
];

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-wrap">
      <section className="flex flex-[1_1_480px] flex-col items-center justify-center gap-8 px-6 py-14">
        <div className="w-full max-w-[460px]">
          <Brand />
        </div>
        <SignupForm />
      </section>

      <section
        aria-label="Por que reservar"
        className="relative flex min-h-[420px] flex-[1_1_520px] flex-col justify-center gap-10 overflow-hidden border-l border-line bg-panel p-8 sm:p-14"
      >
        <Lattice />
        <p className="relative max-w-[520px] font-display text-4xl leading-[1.1] font-medium italic sm:text-[44px]">
          A água certa, a folha certa, o momento certo.
        </p>
        <ol className="relative flex max-w-[460px] flex-col gap-7">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-5">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gold font-han text-lg text-gold"
              >
                {step.n}
              </span>
              <div className="flex flex-col gap-1">
                <strong className="text-base">{step.title}</strong>
                <span className="text-sm leading-relaxed text-muted">{step.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
