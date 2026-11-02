import { describe, expect, it } from "vitest";
import { z } from "zod";
import { loginSchema, passwordStrength, signupSchema } from "./validation";

const valid = {
  name: "Marina Souza",
  email: "  Marina@Email.com ",
  phone: "",
  password: "chaverde123",
  confirm: "chaverde123",
  terms: "on",
};

describe("signupSchema", () => {
  it("normaliza e-mail e trata telefone vazio como ausente", () => {
    const data = signupSchema.parse(valid);
    expect(data.email).toBe("marina@email.com");
    expect(data.phone).toBeUndefined();
  });

  it("aponta o erro no campo certo", () => {
    const result = signupSchema.safeParse({ ...valid, confirm: "outra", terms: undefined });
    const errors = z.flattenError(result.error!).fieldErrors;
    expect(errors.confirm).toEqual(["As senhas não conferem"]);
    expect(errors.terms).toEqual(["Aceite os termos para continuar"]);
  });

  it("recusa senha curta e e-mail inválido", () => {
    const errors = z.flattenError(signupSchema.safeParse({ ...valid, email: "x@", password: "123", confirm: "123" }).error!).fieldErrors;
    expect(errors.email).toBeDefined();
    expect(errors.password).toEqual(["Use pelo menos 8 caracteres"]);
  });
});

describe("loginSchema", () => {
  it("exige senha", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("passwordStrength", () => {
  it.each([
    ["curta", 0],
    ["soletras", 1],
    ["letras123", 2],
    ["letras123!", 3],
  ])("%s → %i", (pw, score) => {
    expect(passwordStrength(pw)).toBe(score);
  });
});
