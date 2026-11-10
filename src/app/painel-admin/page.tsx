import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestActions } from "./RequestActions";
import { SignupsChart } from "./SignupsChart";

type Overview = {
  users_total: number;
  users_7d: number;
  users_30d: number;
  onboarded: number;
  students: number;
  trainers: number;
  gyms: number;
  assessments: number;
  sessions_30d: number;
  pending_requests: number;
  signups_by_day: Array<{ day: string; count: number }>;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  onboarded: boolean;
  is_student: boolean;
  is_trainer: boolean;
  gyms_admin: number;
};

type RequestRow = { id: string; email: string | null; kind: string; status: string; reason: string | null; created_at: string };

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const [ov, users, reqs, audit] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_list_users", { p_search: q?.slice(0, 80) ?? null, p_limit: 50 }),
    supabase.rpc("admin_list_data_requests"),
    supabase.rpc("admin_recent_audit"),
  ]);
  if (ov.error || !ov.data) notFound();

  const o = ov.data as Overview;
  const base = `/${process.env.ADMIN_PATH ?? ""}`;
  const stats: Array<[string, number]> = [
    ["Usuários", o.users_total],
    ["Novos (7 dias)", o.users_7d],
    ["Cadastro concluído", o.onboarded],
    ["Alunos", o.students],
    ["Personal trainers", o.trainers],
    ["Academias", o.gyms],
    ["Avaliações", o.assessments],
    ["Treinos (30 dias)", o.sessions_30d],
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-5 py-10">
      <h1 className="type-display text-[34px]">Visão geral da plataforma</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="panel p-4">
            <p className="type-label">{label}</p>
            <p className="type-metric mt-2 text-[38px]">{value}</p>
          </div>
        ))}
      </section>

      <section className="panel p-5">
        <h2 className="type-label">Cadastros por dia (30 dias)</h2>
        <SignupsChart data={o.signups_by_day} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[17px] font-semibold">
            Pedidos LGPD {o.pending_requests > 0 && <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-[12px] text-amber">{o.pending_requests} pendente(s)</span>}
          </h2>
        </div>
        {(reqs.data as RequestRow[] | null)?.length ? (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {(reqs.data as RequestRow[]).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                <div>
                  <p className="font-medium">
                    {r.kind === "delete" ? "Excluir conta" : "Exportar dados"} · {r.email ?? "usuário removido"}
                  </p>
                  <p className="text-[12.5px] text-fog">
                    {fmtDate(r.created_at)} · {r.status}
                    {r.reason && ` · “${r.reason}”`}
                  </p>
                </div>
                {r.status === "pending" || r.status === "processing" ? <RequestActions id={r.id} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-fog">Nenhum pedido.</p>
        )}
      </section>

      <section>
        <form action={base} className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Usuários</h2>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome ou e-mail"
            className="h-10 w-72 rounded-[var(--radius-control)] border border-line bg-graphite px-3 text-sm"
          />
        </form>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="bg-graphite text-fog">
              <tr>
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Papéis</th>
                <th className="px-4 py-2.5 font-medium">Criado</th>
                <th className="px-4 py-2.5 font-medium">Último acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {((users.data as UserRow[] | null) ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-mist">{u.email}</td>
                  <td className="px-4 py-2.5 text-mist">
                    {[u.is_student && "aluno", u.is_trainer && "personal", u.gyms_admin > 0 && "admin academia", !u.onboarded && "cadastro incompleto"]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-mist">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-2.5 text-mist">{fmtDate(u.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[17px] font-semibold">Registro de acessos ao painel</h2>
        <ul className="mt-3 space-y-1 text-[13px] text-mist">
          {((audit.data as Array<{ action: string; created_at: string }> | null) ?? []).slice(0, 12).map((a, i) => (
            <li key={i}>
              {new Date(a.created_at).toLocaleString("pt-BR")} · {a.action}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
