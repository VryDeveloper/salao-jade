"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormAlert, primaryButton } from "@/components/field";
import { MaskLine } from "@/components/mask-line";
import { passwordStrength } from "@/lib/validation";
import { signup } from "../actions";

const STRENGTH_LABEL = ["muito curta", "fraca", "média", "forte"];

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);
  const errors = state?.errors;

  return (
    // O React limpa o form depois da action; o medidor precisa acompanhar
    <form
      action={action}
      onReset={() => setPassword("")}
      noValidate
      className="flex w-full max-w-[460px] animate-rise flex-col gap-5"
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Primeira visita</span>
        <h1 className="font-display text-[52px] leading-none font-semibold">
          <MaskLine>Criar conta</MaskLine>
        </h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Leva menos de um minuto. Depois é só escolher a experiência e o horário.
        </p>
      </div>

      <FormAlert message={state?.message} />

      <Field
        label="Nome completo"
        name="name"
        autoComplete="name"
        placeholder="Como devemos te chamar"
        defaultValue={state?.values?.name}
        error={errors?.name}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          defaultValue={state?.values?.email}
          error={errors?.email}
        />
        <Field
          label="Telefone (opcional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          defaultValue={state?.values?.phone}
          error={errors?.phone}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          onChange={(e) => setPassword(e.target.value)}
          error={errors?.password}
        />
        <Field
          label="Confirmar senha"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          error={errors?.confirm}
        />
      </div>

      <div className="flex items-center gap-1.5" aria-live="polite">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-sm transition-colors duration-300 ${strength >= level ? "bg-gold" : "bg-[#3a2f27]"}`}
          />
        ))}
        <span className="ml-2 text-xs text-muted">Força da senha: {STRENGTH_LABEL[strength]}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-2.5 text-sm leading-normal text-label">
          <input
            type="checkbox"
            name="terms"
            aria-invalid={errors?.terms ? true : undefined}
            aria-describedby={errors?.terms ? "terms-error" : undefined}
            className="mt-0.5 size-[18px] shrink-0 accent-cinnabar"
          />
          Li e aceito os termos de uso e a política de privacidade.
        </label>
        {errors?.terms && (
          <p id="terms-error" className="text-[13px] text-danger">
            {errors.terms[0]}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" transitionTypes={["nav-back"]} className="font-semibold text-gold hover:text-[#e2c27f]">
          Entrar
        </Link>
      </p>
    </form>
  );
}
