import { PageTransition } from "@/components/transitions";
import Link from "next/link";
import { primaryButton } from "@/components/field";
import { InkFluid } from "@/components/ink-fluid";
import { MaskLine } from "@/components/mask-line";

export default function Home() {
  return (
    <PageTransition>
      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-6 py-16 text-center">
        <InkFluid background="#12100e" />
        <div
          aria-hidden="true"
          className="relative flex size-40 animate-settle items-center justify-center rounded-full border border-gold"
        >
          <div className="flex size-34 items-center justify-center rounded-full bg-cinnabar font-han text-7xl text-paper">
            茶
          </div>
        </div>
        <h1 className="relative font-display text-5xl font-semibold">
          <MaskLine delay={180}>Salão Jade</MaskLine>
        </h1>
        <p className="relative max-w-md font-display text-2xl text-muted italic">
          <MaskLine delay={300}>Uma pausa para o chá, reservada no seu horário.</MaskLine>
        </p>
        <div className="relative flex w-full max-w-xs animate-rise flex-col gap-3 [animation-delay:480ms]">
          <Link href="/agenda" transitionTypes={["nav-forward"]} className={primaryButton}>
            Reservar horário
          </Link>
          <Link
            href="/cadastro"
            transitionTypes={["nav-forward"]}
            className="py-3 text-sm font-semibold text-gold hover:text-[#e2c27f]"
          >
            Criar conta
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
