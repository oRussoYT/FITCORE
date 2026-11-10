import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.");

export const passwordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
  .regex(/[0-9]/, "Inclua pelo menos um número.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar os termos para continuar." }) }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não coincidem." });

export const recoverSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não coincidem." });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RecoverInput = z.infer<typeof recoverSchema>;
export type ResetInput = z.infer<typeof resetSchema>;

/** Traduz mensagens do Supabase Auth para português claro. */
export function authErrorMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com este e-mail.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (m.includes("same password") || m.includes("different from the old")) return "A nova senha precisa ser diferente da anterior.";
  if (m.includes("weak") || m.includes("password should")) return "Senha fraca. Use letras, números e pelo menos 8 caracteres.";
  if (m.includes("provider is not enabled")) return "Login com Google ainda não foi ativado no Supabase.";
  if (m.includes("fetch") || m.includes("network")) return "Sem conexão com o servidor. Verifique sua internet.";
  return "Não foi possível concluir. Tente novamente.";
}
