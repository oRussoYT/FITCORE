import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Profile, Student } from "@/types/db";

export type Membership = { gym_id: string; role: MemberRole; status: "active" | "inactive" };

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  profile: Profile;
  student: Student | null;
  memberships: Membership[];
  isTrainer: boolean;
  isAdmin: boolean;
};

/**
 * Carrega (uma vez por requisição) quem está logado e seus papéis.
 * Redireciona para o login se não houver sessão válida.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, studentRes, membershipRes, trainerRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("students").select("id, user_id, gym_id, status").eq("user_id", user.id).maybeSingle(),
    supabase.from("gym_members").select("gym_id, role, status").eq("user_id", user.id),
    supabase.from("trainers").select("id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileRes.error) throw new Error(`Falha ao carregar perfil: ${profileRes.error.message}`);
  if (!profileRes.data) {
    // Perfil é criado por gatilho no cadastro; se faltar, o banco não recebeu as migrações.
    throw new Error("Perfil não encontrado. Verifique se as migrações do banco foram aplicadas.");
  }

  const memberships = (membershipRes.data ?? []) as Membership[];
  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    profile: profileRes.data as Profile,
    student: (studentRes.data as Student | null) ?? null,
    memberships,
    isTrainer: Boolean(trainerRes.data),
    isAdmin: memberships.some((m) => m.role === "admin" && m.status === "active"),
  };
});

/** Garante que o usuário tem cadastro de aluno (criado no onboarding). */
export async function ensureStudent(ctx: AuthContext): Promise<Student> {
  if (ctx.student) return ctx.student;
  const { data, error } = await ctx.supabase
    .from("students")
    .insert({ user_id: ctx.userId })
    .select("id, user_id, gym_id, status")
    .single();
  if (error) {
    // Corrida entre duas abas: busca o que já existe.
    const existing = await ctx.supabase.from("students").select("id, user_id, gym_id, status").eq("user_id", ctx.userId).single();
    if (existing.data) return existing.data as Student;
    throw new Error(`Não foi possível criar o cadastro de aluno: ${error.message}`);
  }
  ctx.student = data as Student;
  return ctx.student;
}
