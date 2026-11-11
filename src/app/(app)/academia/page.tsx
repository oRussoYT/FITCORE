import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/Feedback";
import { cn } from "@/lib/cn";
import { getAuthContext } from "@/lib/db/context";
import { getAdminGym, loadGym } from "@/lib/db/gym";
import { formatBRL, gymOverview, lowFrequency } from "@/lib/domain/gym";
import { registerPayment, revokeInvite, setStudentStatus, togglePlan } from "./actions";
import { AttendanceChart } from "./AttendanceChart";
import { CreateGymForm, InviteForm, PlanForm, PlanSelect, TrainerSelect } from "./GymForms";

export const metadata: Metadata = { title: "Academia" };

const TABS = [
  ["visao", "Visão geral"],
  ["alunos", "Alunos"],
  ["equipe", "Personal trainers"],
  ["planos", "Planos e mensalidades"],
  ["registro", "Registro de ações"],
] as const;

const INTERVAL = { monthly: "mensal", quarterly: "trimestral", semiannual: "semestral", yearly: "anual" } as Record<string, string>;

export default async function GymPage({ searchParams }: { searchParams: Promise<{ aba?: string; dias?: string }> }) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  const gym = await getAdminGym(ctx);

  if (!gym) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="type-display text-[34px]">Painel da academia</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-mist">
          Cadastre sua academia para convidar alunos e personal trainers, acompanhar frequência, planos e mensalidades.
          Quem cria a academia vira o administrador dela.
        </p>
        <CreateGymForm />
      </div>
    );
  }

  if (gym.suspended_at) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-[13px] text-fog">Painel da academia</p>
        <h1 className="type-display mt-1 text-[34px]">{gym.name}</h1>
        <div className="mt-8 rounded-[28px] border border-coral/40 bg-coral/10 p-6">
          <p className="text-[17px] font-semibold text-coral">Academia suspensa</p>
          <p className="mt-2 leading-relaxed text-mist">
            A gestão desta academia foi pausada pela equipe do FITCORE em {new Date(gym.suspended_at).toLocaleDateString("pt-BR")}.
            {gym.suspended_reason && <> Motivo: “{gym.suspended_reason}”.</>} Os alunos continuam com acesso aos próprios dados.
            Fale com o suporte para reativar.
          </p>
        </div>
      </div>
    );
  }

  const tab = TABS.some(([k]) => k === params.aba) ? params.aba! : "visao";
  const days = [7, 30, 90].includes(Number(params.dias)) ? Number(params.dias) : 30;
  const data = await loadGym(ctx, gym.id, days);
  const o = gymOverview({ students: data.students, sessions: data.sessions, subscriptions: data.subscriptions, payments: data.payments, plans: data.plans, days });
  const low = lowFrequency(data.students, data.sessions);
  const nameOfStudent = new Map(data.students.map((s) => [s.id, s.name]));
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <p className="text-[13px] text-fog">Painel da academia</p>
      <h1 className="type-display mt-1 text-[32px] sm:text-[38px]">{gym.name}</h1>

      <nav aria-label="Seções da academia" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={`/academia?aba=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap px-3 pb-3 pt-1 text-[14px] font-medium",
              tab === k ? "text-bone after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-lime" : "text-mist hover:text-bone",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "visao" && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-fog">Período:</span>
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/academia?aba=visao&dias=${d}`}
                className={cn("rounded-full border px-3 py-1", d === days ? "border-lime bg-lime text-ink" : "border-line text-mist hover:text-bone")}
              >
                {d} dias
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["Total de alunos", o.total],
                ["Alunos ativos", o.active],
                [`Novos (${days} dias)`, o.newInPeriod],
                ["Inativos", o.inactive],
                ["Treinos hoje", o.todayCount],
                ["Treinos (7 dias)", o.weekCount],
                ["Receita do mês", formatBRL(o.revenueMonthCents)],
                ["Retenção", pct(o.retention)],
              ] as Array<[string, string | number]>
            ).map(([label, value]) => (
              <div key={label} className="panel p-4">
                <p className="type-label">{label}</p>
                <p className="type-metric mt-2 text-[34px]">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <section className="panel p-5">
              <h2 className="type-label">Frequência diária ({days} dias)</h2>
              {o.byDay.some((d) => d.count > 0) ? (
                <AttendanceChart data={o.byDay} />
              ) : (
                <p className="mt-4 text-[13px] text-fog">Nenhum treino concluído pelos alunos no período.</p>
              )}
            </section>
            <section className="panel space-y-5 p-5">
              <div>
                <h2 className="type-label">Taxa de cancelamento ({days} dias)</h2>
                <p className="type-metric mt-2 text-[34px]">{pct(o.cancelRate)}</p>
              </div>
              <div>
                <h2 className="type-label">Planos mais vendidos</h2>
                {o.topPlans.length ? (
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {o.topPlans.map((p) => (
                      <li key={p.name} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="tabular-nums text-mist">{p.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13px] text-fog">Nenhuma assinatura ativa.</p>
                )}
              </div>
            </section>
          </div>
          <section className="panel p-5">
            <h2 className="text-[15px] font-semibold">Baixa frequência (menos de 2 treinos em 14 dias)</h2>
            {low.length === 0 ? (
              <p className="mt-2 text-[13px] text-fog">Nenhum aluno ativo abaixo do mínimo.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {low.map((l) => (
                  <li key={l.id} className="rounded-full border border-amber/40 px-3 py-1 text-[13px] text-amber">
                    {nameOfStudent.get(l.id)} · {l.sessions}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "alunos" && (
        <div className="mt-8 space-y-6">
          <InviteForm defaultRole="student" />
          <PendingInvites invites={data.invites} />
          {data.students.length === 0 ? (
            <EmptyState title="Nenhum aluno ainda">Convide pelo e-mail. O aluno aparece aqui depois de aceitar o convite.</EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[820px] text-left text-[14px]">
                <thead className="bg-graphite text-[13px] text-fog">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Aluno</th>
                    <th className="px-4 py-2.5 font-medium">Personal</th>
                    <th className="px-4 py-2.5 font-medium">Plano</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-[12px] text-fog">desde {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <TrainerSelect studentId={s.id} current={s.trainerIds} trainers={data.trainers} />
                      </td>
                      <td className="px-4 py-3">
                        <PlanSelect studentId={s.id} current={s.subscription?.status !== "canceled" ? (s.subscription?.gym_plan_id ?? null) : null} plans={data.plans.filter((p) => p.is_active)} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={s.status === "active" ? "text-lime" : "text-fog"}>{s.status === "active" ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionButton
                          size="sm"
                          variant={s.status === "active" ? "ghost" : "secondary"}
                          confirm={s.status === "active" ? "Desativar?" : undefined}
                          action={setStudentStatus.bind(null, s.id, s.status === "active" ? "inactive" : "active")}
                        >
                          {s.status === "active" ? "Desativar" : "Reativar"}
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "equipe" && (
        <div className="mt-8 space-y-6">
          <InviteForm defaultRole="trainer" />
          <PendingInvites invites={data.invites.filter((i) => i.role === "trainer")} />
          {data.trainers.length === 0 ? (
            <EmptyState title="Nenhum personal trainer ainda">Convide pelo e-mail; depois vincule alunos a ele na aba Alunos.</EmptyState>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {data.trainers.map((t) => (
                <li key={t.id} className="panel p-5">
                  <p className="text-[16px] font-semibold">{t.name}</p>
                  <p className="mt-1 text-[13px] text-fog">{t.studentIds.length} aluno(s) vinculado(s)</p>
                  {t.studentIds.length > 0 && (
                    <p className="mt-3 text-[13px] text-mist">{t.studentIds.map((id) => nameOfStudent.get(id)).filter(Boolean).join(", ")}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "planos" && (
        <div className="mt-8 space-y-8">
          <PlanForm />
          {data.plans.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-3">
              {data.plans.map((p) => (
                <li key={p.id} className={cn("panel p-5", !p.is_active && "opacity-60")}>
                  <p className="text-[16px] font-semibold">{p.name}</p>
                  <p className="type-metric mt-2 text-[30px]">{formatBRL(p.price_cents)}</p>
                  <p className="text-[13px] text-fog">cobrança {INTERVAL[p.billing_interval] ?? p.billing_interval}</p>
                  <div className="mt-4">
                    <ActionButton size="sm" variant="ghost" action={togglePlan.bind(null, p.id, !p.is_active)}>
                      {p.is_active ? "Desativar plano" : "Reativar plano"}
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <section>
            <h2 className="text-[17px] font-semibold">Mensalidades</h2>
            {data.students.filter((s) => s.subscription && s.subscription.status !== "canceled").length === 0 ? (
              <p className="mt-3 text-fog">Nenhum aluno com plano ativo. Atribua planos na aba Alunos.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                {data.students
                  .filter((s) => s.subscription && s.subscription.status !== "canceled")
                  .map((s) => {
                    const sub = s.subscription!;
                    const last = data.payments.find((p) => p.subscription_id === sub.id && p.status === "paid");
                    return (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[14px]">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[12.5px] text-fog">
                            {data.plans.find((p) => p.id === sub.gym_plan_id)?.name ?? "Plano"} ·{" "}
                            {last?.paid_at ? `último pagamento em ${new Date(last.paid_at).toLocaleDateString("pt-BR")}` : "nenhum pagamento registrado"}
                          </p>
                        </div>
                        <ActionButton size="sm" variant="secondary" action={registerPayment.bind(null, sub.id)}>
                          Registrar pagamento de hoje
                        </ActionButton>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "registro" && <AuditList gymId={gym.id} />}
    </div>
  );
}

function PendingInvites({ invites }: { invites: Array<{ id: string; email: string; role: string; created_at: string }> }) {
  if (invites.length === 0) return null;
  return (
    <section>
      <h2 className="text-[14px] font-semibold text-mist">Convites aguardando resposta</h2>
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
            <span>
              {i.email} <span className="text-fog">· {i.role === "trainer" ? "personal" : "aluno"}</span>
            </span>
            <ActionButton size="sm" variant="ghost" action={revokeInvite.bind(null, i.id)}>
              Cancelar convite
            </ActionButton>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ACTION_LABEL: Record<string, string> = { insert: "Criou", update: "Alterou", delete: "Removeu" };
const TABLE_LABEL: Record<string, string> = {
  gym_members: "membro",
  students: "aluno",
  trainers: "personal",
  trainer_students: "vínculo personal-aluno",
  gym_plans: "plano",
  subscriptions: "assinatura",
  subscription_payments: "pagamento",
  gym_invites: "convite",
};

async function AuditList({ gymId }: { gymId: string }) {
  const ctx = await getAuthContext();
  const { data } = await ctx.supabase.from("audit_logs").select("id, action, table_name, created_at").eq("gym_id", gymId).order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as Array<{ id: number; action: string; table_name: string; created_at: string }>;
  return rows.length === 0 ? (
    <p className="mt-8 text-fog">Nenhuma ação registrada.</p>
  ) : (
    <ul className="mt-8 divide-y divide-line rounded-2xl border border-line text-[14px]">
      {rows.map((r) => (
        <li key={r.id} className="flex justify-between gap-4 px-4 py-2.5">
          <span>
            {ACTION_LABEL[r.action] ?? r.action} {TABLE_LABEL[r.table_name] ?? r.table_name}
          </span>
          <span className="text-fog">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
        </li>
      ))}
    </ul>
  );
}
