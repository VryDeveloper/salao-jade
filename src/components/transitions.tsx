import { ViewTransition, type ReactNode } from "react";

// Só navegações marcadas com um tipo animam; voltar do navegador e refresh trocam sem slide
const direction = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/** Conteúdo da página que desliza ao navegar (em cada page.tsx, não no layout, que não troca). */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={direction} exit={direction} default="none">
      {children}
    </ViewTransition>
  );
}

/** Esqueleto que sai rápido quando os dados chegam. */
export function SkeletonOut({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      {children}
    </ViewTransition>
  );
}

/** Conteúdo que sobe ao substituir o esqueleto. */
export function ContentIn({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="content-in" default="none">
      {children}
    </ViewTransition>
  );
}

/** Opção selecionada: o destaque escorre da opção antiga para a nova (um nome por grupo, por página). */
export function SelectedMorph({ name, active, children }: { name: string; active: boolean; children: ReactNode }) {
  if (!active) return children;
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
