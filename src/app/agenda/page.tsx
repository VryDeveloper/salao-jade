import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderShell } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Agendar — Salão Jade" };

export default function AgendaPage() {
  return (
    <>
      <Suspense fallback={<SiteHeaderShell />}>
        <SiteHeader />
      </Suspense>
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-2.5 px-5 py-12 sm:px-8">
        <span className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Nova reserva</span>
        <h1 className="font-display text-5xl leading-none font-semibold sm:text-[56px]">Escolha seu momento</h1>
        <Suspense fallback={<p className="h-6" />}>
          <Greeting />
        </Suspense>
      </main>
    </>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <p className="text-muted">
      Olá, {user.name.split(" ")[0]}. A escolha de experiência, dia e horário chega na próxima etapa.
    </p>
  );
}
