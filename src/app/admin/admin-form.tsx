"use client";

import { useActionState, type ReactNode } from "react";
import { FormAlert } from "@/components/field";

type AdminAction = (prev: string | undefined, formData: FormData) => Promise<string | undefined>;

/** Formulário do painel: mostra a recusa da action (ex.: "há reservas nesse dia") logo abaixo. */
export function AdminForm({
  action,
  children,
  className = "",
}: {
  action: AdminAction;
  children: ReactNode;
  className?: string;
}) {
  const [error, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} aria-busy={pending} className={`flex flex-col gap-3 ${className}`}>
      {children}
      <FormAlert message={error} />
    </form>
  );
}
