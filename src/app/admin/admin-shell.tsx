import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { MaskLine } from "@/components/mask-line";
import { SiteHeader, SiteHeaderShell } from "@/components/site-header";
import { ContentIn, PageTransition, SkeletonOut } from "@/components/transitions";

type Tab = "reservas" | "clientes" | "funcionamento";

const TABS: { tab: Tab; href: string; label: string }[] = [
  { tab: "reservas", href: "/admin", label: "Reservas" },
  { tab: "clientes", href: "/admin/clientes", label: "Clientes" },
  { tab: "funcionamento", href: "/admin/funcionamento", label: "Funcionamento" },
];
const direction = (from: Tab, to: Tab) =>
  TABS.findIndex((t) => t.tab === to) > TABS.findIndex((t) => t.tab === from) ? "nav-forward" : "nav-back";

/** Moldura das telas do painel: cabeçalho, título, abas e o conteúdo (que lê sessão e banco) em Suspense. */
export function AdminShell({ current, title, children }: { current: Tab; title: string; children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<SiteHeaderShell current="admin" />}>
        <SiteHeader current="admin" />
      </Suspense>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-5 pt-12 pb-18 sm:px-8">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Painel do salão</span>
            <h1 className="font-display text-5xl leading-none font-semibold">
              <MaskLine>{title}</MaskLine>
            </h1>
          </div>
          <nav aria-label="Seções do painel" className="flex flex-wrap gap-2">
            {TABS.map((t) =>
              t.tab === current ? (
                <Link
                  key={t.tab}
                  href={t.href}
                  aria-current="page"
                  className="rounded-full border border-gold bg-[#221b16] px-4 py-2.5 text-sm font-semibold"
                >
                  {t.label}
                </Link>
              ) : (
                <Link
                  key={t.tab}
                  href={t.href}
                  transitionTypes={[direction(current, t.tab)]}
                  className="rounded-full border border-[#3a2f27] px-4 py-2.5 text-sm text-muted transition-[color,border-color] duration-200 hover:border-line-strong hover:text-cream"
                >
                  {t.label}
                </Link>
              ),
            )}
          </nav>
          <Suspense
            fallback={
              <SkeletonOut>
                <div aria-busy="true" className="skeleton h-72 rounded-lg">
                  <span className="sr-only">Carregando…</span>
                </div>
              </SkeletonOut>
            }
          >
            <ContentIn>
              <div className="flex flex-col gap-8">{children}</div>
            </ContentIn>
          </Suspense>
        </main>
      </PageTransition>
    </>
  );
}

export const panel = "rounded-[10px] border border-[#3a2f27] bg-panel p-6";
export const sectionTitle = "font-display text-3xl font-semibold";
