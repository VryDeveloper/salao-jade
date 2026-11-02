"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, primaryButton } from "@/components/field";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} noValidate className="flex w-full max-w-[400px] animate-rise flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Bem-vindo de volta</span>
        <h1 className="font-display text-[52px] leading-none font-semibold">Entrar</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Acesse sua conta para ver os horários livres e gerenciar suas reservas.
        </p>
      </div>

      <FormAlert message={state?.message} />

      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@email.com"
        defaultValue={state?.values?.email}
        error={state?.errors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={state?.errors?.password}
      />

      <label className="flex min-h-11 items-center gap-2.5 text-sm text-label">
        <input type="checkbox" name="remember" defaultChecked className="size-[18px] accent-cinnabar" />
        Manter conectado
      </label>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <div className="h-px bg-line" />
      <p className="text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-gold hover:text-[#e2c27f]">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
