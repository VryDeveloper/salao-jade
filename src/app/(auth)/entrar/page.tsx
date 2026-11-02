import { PageTransition } from "@/components/transitions";
import type { Metadata } from "next";
import { Brand, Lattice } from "@/components/brand";
import { InkFluid } from "@/components/ink-fluid";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Salão Jade" };

export default function LoginPage() {
  return (
    <PageTransition>
      <main className="flex min-h-screen flex-wrap">
        <section
          aria-label="Salão Jade"
          className="relative flex min-h-[420px] flex-[1_1_520px] flex-col justify-between gap-12 overflow-hidden border-r border-line bg-panel p-8 sm:p-14"
        >
          <InkFluid />
          <Lattice />
          <div className="relative">
            <Brand size={44} />
          </div>
          <div className="relative flex max-w-[540px] flex-col gap-9">
            <div
              aria-hidden="true"
              className="flex size-40 items-center justify-center rounded-full border border-gold sm:size-[232px]"
            >
              <div className="flex size-[136px] items-center justify-center rounded-full bg-cinnabar font-han text-7xl text-paper sm:size-[196px] sm:text-[104px]">
                茶
              </div>
            </div>
            <p className="font-display text-4xl leading-[1.08] font-medium italic sm:text-5xl">
              Uma pausa para o chá, reservada no seu horário.
            </p>
          </div>
          <p className="relative text-[13px] tracking-[0.14em] text-muted uppercase">Terça a domingo · 11h às 22h</p>
        </section>

        <section className="flex flex-[1_1_440px] items-center justify-center px-6 py-14">
          <LoginForm />
        </section>
      </main>
    </PageTransition>
  );
}
