import type { ReactNode } from "react";

/** Tela cheia centralizada para erro, 404 e afins. */
export function Notice({ han, title, children }: { han: string; title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="flex size-28 items-center justify-center rounded-full border border-gold font-han text-5xl text-gold"
      >
        {han}
      </div>
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
      {children}
    </main>
  );
}
