"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { createSession, deleteSession, dummyPasswordHash, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRateLimited, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, signupSchema } from "@/lib/validation";

export type AuthState =
  | {
      errors?: Partial<Record<string, string[]>>;
      message?: string;
      /** Devolvidos para o formulário não perder o que foi digitado (nunca a senha) */
      values?: Record<string, string>;
    }
  | undefined;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = { name: field(formData, "name"), email: field(formData, "email"), phone: field(formData, "phone") };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { name, email, phone, password } = parsed.data;
  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, phone, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { errors: { email: ["Já existe uma conta com este e-mail"] }, values };
    }
    throw err;
  }

  await createSession(userId);
  redirect("/agenda");
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = { email: field(formData, "email") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { email, password } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limitKey = `login:${ip}:${email}`;
  if (isRateLimited(limitKey)) {
    return { message: "Muitas tentativas. Tente novamente em 15 minutos.", values };
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, role: true } });
  // Verifica mesmo sem usuário para a resposta não revelar quais e-mails existem pelo tempo
  const ok = await verifyPassword(user?.passwordHash ?? (await dummyPasswordHash()), password);
  if (!user || !ok) return { message: "E-mail ou senha inválidos.", values };

  resetRateLimit(limitKey);
  await createSession(user.id, { persistent: formData.get("remember") === "on" });
  redirect(user.role === "ADMIN" ? "/admin" : "/agenda");
}

export async function logout() {
  await deleteSession();
  redirect("/entrar");
}
