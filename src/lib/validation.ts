import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido"));

const signupFields = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80, "Use até 80 caracteres"),
  email,
  phone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo")
    .transform((v) => v || undefined),
  password: z.string().min(8, "Use pelo menos 8 caracteres").max(128, "Use até 128 caracteres"),
  confirm: z.string(),
  terms: z.literal("on", "Aceite os termos para continuar"),
});

export const signupSchema = signupFields.refine((d) => d.password === d.confirm, {
  path: ["confirm"],
  message: "As senhas não conferem",
  // Sem isso o Zod pula a checagem quando outro campo (ex.: termos) falhou
  when: (payload) => signupFields.pick({ password: true, confirm: true }).safeParse(payload.value).success,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha").max(128),
});

/** 0–3: tamanho mínimo, letras e números, símbolo ou 12+ caracteres. */
export function passwordStrength(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (/[a-z]/i.test(password) && /\d/.test(password)) score++;
  if (/[^a-z0-9]/i.test(password) || password.length >= 12) score++;
  return score;
}
