import Link from "next/link";

/** Selo vermelho com 茶 + nome. `size` em px do selo. */
export function Brand({ size = 36 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-cream no-underline">
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
        className="flex items-center justify-center rounded bg-cinnabar font-han text-paper"
      >
        茶
      </span>
      <span className="font-display text-2xl font-semibold">Salão Jade</span>
    </Link>
  );
}

/** Padrão de treliça de janela chinesa, decorativo. O pai precisa de `relative overflow-hidden`. */
export function Lattice({ opacity = 0.08 }: { opacity?: number }) {
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full" style={{ opacity }}>
      <defs>
        <pattern id="lattice" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M0 36H72M36 0V72M18 18H54V54H18Z" fill="none" stroke="#c9a45c" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lattice)" />
    </svg>
  );
}
