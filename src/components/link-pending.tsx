"use client";

import { useLinkStatus } from "next/link";

/** Barra fina no pé do link enquanto a navegação carrega. O pai precisa de `relative overflow-hidden`. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity duration-150 ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="block size-full animate-shimmer bg-gold" />
    </span>
  );
}
