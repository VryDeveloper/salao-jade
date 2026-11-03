"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition, type ComponentProps } from "react";

// A última escolha pedida, mesmo com a navegação ainda em curso. Sem isso, um clique rápido usa o href
// montado para a página anterior e desfaz o passo que acabou de ser dado.
let intent: { params: URLSearchParams; at: number } | null = null;
const INTENT_TTL_MS = 5000; // navegação que nunca terminou não deve contaminar cliques de outra visita

/**
 * Link da agenda que troca um parâmetro da URL (exp, dur ou dia) mantendo os demais.
 * O `href` vindo do servidor continua valendo para abrir em nova aba e sem JavaScript.
 */
export function ParamLink({
  param,
  value,
  children,
  className,
  ...props
}: { param: string; value: string } & ComponentProps<typeof Link>) {
  const router = useRouter();
  const current = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Quando a URL alcança a escolha pedida, não há mais nada pendente
  useEffect(() => {
    if (intent && intent.params.toString() === current.toString()) intent = null;
  }, [current]);

  return (
    <Link
      {...props}
      className={className}
      aria-busy={pending || undefined}
      onClick={(e) => {
        // Ctrl/Cmd/Shift-clique e botão do meio: deixa o navegador abrir o href normalmente
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        const base = intent && Date.now() - intent.at < INTENT_TTL_MS ? intent.params : current;
        const next = new URLSearchParams(base);
        next.set(param, value);
        intent = { params: next, at: Date.now() };
        startTransition(() => router.push(`/agenda?${next}`, { scroll: false }));
      }}
    >
      {/* Barra fina no pé do card enquanto a escolha carrega; o pai precisa de `relative overflow-hidden` */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-150 ${
          pending ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="block size-full animate-shimmer bg-gold" />
      </span>
      {children}
    </Link>
  );
}
