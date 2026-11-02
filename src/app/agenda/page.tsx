import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader, SiteHeaderShell } from "@/components/site-header";
import { AgendaPicker, AgendaSkeleton } from "./agenda-picker";

export const metadata: Metadata = { title: "Agendar — Salão Jade" };

export default function AgendaPage(props: PageProps<"/agenda">) {
  return (
    <>
      <Suspense fallback={<SiteHeaderShell current="agenda" />}>
        <SiteHeader current="agenda" />
      </Suspense>
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-5 pt-12 pb-18 sm:px-8">
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Nova reserva</span>
          <h1 className="font-display text-5xl leading-none font-semibold sm:text-[56px]">Escolha seu momento</h1>
        </div>
        <Suspense fallback={<AgendaSkeleton />}>
          <AgendaPicker searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
