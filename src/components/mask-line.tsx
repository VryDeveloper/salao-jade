import type { CSSProperties, ReactNode } from "react";

/**
 * Uma linha que sobe de trás da própria base, como tipo sendo assentado. Só CSS: o texto está no HTML
 * desde o primeiro quadro, e sem animação (ou com movimento reduzido) ele simplesmente já está lá.
 */
export function MaskLine({ children, delay = 120 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="line-mask">
      <span className="line-rise" style={{ animationDelay: `${delay}ms` } as CSSProperties}>
        {children}
      </span>
    </span>
  );
}
