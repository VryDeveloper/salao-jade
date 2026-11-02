import Link from "next/link";
import { primaryButton } from "@/components/field";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div aria-hidden="true" className="flex size-40 items-center justify-center rounded-full border border-gold">
        <div className="flex size-34 items-center justify-center rounded-full bg-cinnabar font-han text-7xl text-paper">
          茶
        </div>
      </div>
      <h1 className="font-display text-5xl font-semibold">Salão Jade</h1>
      <p className="max-w-md font-display text-2xl text-muted italic">
        Uma pausa para o chá, reservada no seu horário.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/agenda" className={primaryButton}>
          Reservar horário
        </Link>
        <Link href="/cadastro" className="py-3 text-sm font-semibold text-gold hover:text-[#e2c27f]">
          Criar conta
        </Link>
      </div>
    </main>
  );
}
