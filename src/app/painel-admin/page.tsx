import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { AdminNav, ADMIN_TABS, Counter, Item, Stagger } from "./AdminMotion";
import { GymCard, type AdminGym } from "./GymCard";
import { RequestActions } from "./RequestActions";
import { ReviewModeration } from "./ReviewModeration";
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
type ReviewRow = { id: string; email: string | null; rating: number; body: string; display_name: string; status: string; created_at: string };

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

const AUDIT: Record<string, string> = {
  overview: "Abriu a visão geral",
  list_users: "Consultou usuários",
  list_gyms: "Consultou academias",
  list_data_requests: "Consultou pedidos LGPD",
  set_data_request_status: "Atualizou pedido LGPD",
  view_audit: "Abriu o registro",
  suspend_gym: "Suspendeu academia",
  reactivate_gym: "Reativou academia",
  view_gym_members: "Viu equipe de academia",
  set_member_status: "Alterou membro de academia",
  list_reviews: "Consultou avaliações",
  moderate_review: "Moderou avaliação",
};

const REQ_STATUS: Record<string, [string, string]> = {
  pending: ["Pendente", "bg-amber/15 text-amber"],
  processing: ["Em andamento", "bg-ice/15 text-ice"],
  done: ["Concluído", "bg-lime/15 text-lime"],
  rejected: ["Recusado", "bg-raised text-fog"],
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ q?: string; aba?: string; filtro?: string }> }) {
  const { q, aba, filtro } = await searchParams;
  const tab = ADMIN_TABS.some((t) => t.key === aba) ? aba! : "visao";
  const search = q?.slice(0, 80) || null;
  const supabase = await createClient();

  const [ov, reviews, gyms] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_list_reviews"),
    supabase.rpc("admin_list_gyms", { p_search: tab === "academias" ? search : null }),
  ]);
  if (ov.error || !ov.data) notFound();
  const o = ov.data as Overview;
  const reviewRows = (reviews.data as ReviewRow[] | null) ?? [];
  const gymRows = (gyms.data as AdminGym[] | null) ?? [];
  const pendingReviews = reviewRows.filter((r) => r.status === "pending").length;
  const suspendedGyms = gymRows.filter((g) => g.suspended_at).length;
  const base = `/${process.env.ADMIN_PATH ?? ""}`;
  const link = (t: string, extra = "") => `${base}?aba=${t}${extra}`;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[230px_1fr] lg:gap-10 lg:px-10 lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <AdminNav base={base} active={tab} badges={{ avaliacoes: pendingReviews, lgpd: o.pending_requests, academias: suspendedGyms }} />
      </aside>

      <main className="mt-6 min-w-0 lg:mt-0">
        {tab === "visao" && (
          <OverviewTab o={o} gyms={gymRows} pendingReviews={pendingReviews} suspendedGyms={suspendedGyms} link={link} />
        )}
        {tab === "academias" && <Gyms gyms={gymRows} base={base} q={search} />}
        {tab === "usuarios" && <UsersTab base={base} q={search} />}
        {tab === "avaliacoes" && <ReviewsTab rows={reviewRows} filter={filtro} link={link} />}
        {tab === "lgpd" && <RequestsTab />}
        {tab === "registro" && <AuditTab />}
      </main>
    </div>
  );
}

function Heading({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="type-metric text-[clamp(44px,6vw,76px)] leading-[0.9]">{title}</h1>
        {sub && <p className="mt-3 text-[15px] text-mist">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function SearchBox({ base, tab, q, placeholder }: { base: string; tab: string; q: string | null; placeholder: string }) {
  return (
    <form action={base} className="relative">
      <input type="hidden" name="aba" value={tab} />
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fog" />
      <input
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="h-11 w-72 rounded-full border border-line bg-graphite pl-10 pr-4 text-[14px] focus:border-lime/60 focus:outline-none"
      />
    </form>
  );
}

function OverviewTab({
  o,
  gyms,
  pendingReviews,
  suspendedGyms,
  link,
}: {
  o: Overview;
  gyms: AdminGym[];
  pendingReviews: number;
  suspendedGyms: number;
  link: (t: string, extra?: string) => string;
}) {
  const incomplete = Math.max(o.users_total - o.onboarded, 0);
  const tiles: Array<[string, number, string?]> = [
    ["Novos em 7 dias", o.users_7d],
    ["Alunos", o.students],
    ["Personal trainers", o.trainers],
    ["Academias", o.gyms],
    ["Avaliações físicas", o.assessments],
    ["Treinos (30 dias)", o.sessions_30d],
  ];
  const alerts = [
    o.pending_requests > 0 && { n: o.pending_requests, t: "pedido(s) LGPD aguardando", href: link("lgpd") },
    pendingReviews > 0 && { n: pendingReviews, t: "avaliação(ões) para moderar", href: link("avaliacoes", "&filtro=pending") },
    suspendedGyms > 0 && { n: suspendedGyms, t: "academia(s) suspensa(s)", href: link("academias") },
    incomplete > 0 && { n: incomplete, t: "pessoa(s) com cadastro incompleto", href: link("usuarios") },
  ].filter(Boolean) as Array<{ n: number; t: string; href: string }>;
  const top = [...gyms].filter((g) => !g.suspended_at).sort((a, b) => b.sessions_30d - a.sessions_30d).slice(0, 5);
  const maxS = Math.max(1, ...top.map((g) => g.sessions_30d));
  const onboardPct = o.users_total ? Math.round((o.onboarded / o.users_total) * 100) : 0;

  return (
    <>
      <Heading title="Torre de controle" sub={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} />

      <Stagger className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Item className="relative overflow-hidden rounded-[28px] bg-lime p-6 text-ink sm:col-span-2 xl:row-span-2">
          <p className="text-[14px] font-semibold">Pessoas na plataforma</p>
          <Counter value={o.users_total} className="type-metric mt-2 block text-[clamp(84px,11vw,150px)] leading-[0.85]" />
          <div className="mt-6">
            <div className="flex justify-between text-[13px] font-semibold">
              <span>Cadastro concluído</span>
              <span>{onboardPct}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/15">
              <div className="h-full rounded-full bg-ink" style={{ width: `${onboardPct}%` }} />
            </div>
            <p className="mt-3 text-[13px] text-ink/70">+{o.users_30d} nos últimos 30 dias</p>
          </div>
        </Item>
        {tiles.map(([label, value]) => (
          <Item key={label} className="rounded-[28px] border border-line bg-surface p-5">
            <p className="text-[13px] text-mist">{label}</p>
            <Counter value={value} className="type-metric mt-2 block text-[48px] leading-none" />
          </Item>
        ))}
      </Stagger>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-[28px] border border-line bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Cadastros por dia</h2>
            <span className="text-[12.5px] text-fog">últimos 30 dias</span>
          </div>
          <SignupsChart data={o.signups_by_day} />
        </section>

        <section className="rounded-[28px] border border-line bg-surface p-6">
          <h2 className="font-semibold">Precisa da sua atenção</h2>
          {alerts.length === 0 ? (
            <p className="mt-6 flex items-center gap-2 text-mist">
              <CheckCircle2 className="size-5 text-lime" /> Tudo em dia.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {alerts.map((a) => (
                <li key={a.t}>
                  <Link href={a.href} className="group flex items-center gap-3 rounded-2xl bg-graphite px-4 py-3 transition-colors hover:bg-raised">
                    <AlertTriangle className="size-4 shrink-0 text-amber" />
                    <span className="flex-1 text-[14px]">
                      <span className="font-bold">{a.n}</span> {a.t}
                    </span>
                    <ArrowUpRight className="size-4 text-fog transition-transform group-hover:rotate-45 group-hover:text-lime" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Academias mais ativas</h2>
          <Link href={link("academias")} className="text-[13px] font-semibold text-lime">
            Ver todas
          </Link>
        </div>
        {top.length === 0 ? (
          <p className="mt-4 text-[14px] text-fog">Nenhuma academia cadastrada ainda.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {top.map((g) => (
              <li key={g.id}>
                <div className="flex justify-between text-[14px]">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-mist">
                    {g.sessions_30d} treinos · {g.students} alunos
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-graphite">
                  <div className="h-full rounded-full bg-lime" style={{ width: `${Math.max(4, (g.sessions_30d / maxS) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Gyms({ gyms, base, q }: { gyms: AdminGym[]; base: string; q: string | null }) {
  const active = gyms.filter((g) => !g.suspended_at).length;
  return (
    <>
      <Heading title="Academias" sub={`${active} ativa(s) · ${gyms.length - active} suspensa(s)`}>
        <SearchBox base={base} tab="academias" q={q} placeholder="Buscar academia ou e-mail do dono" />
      </Heading>
      {gyms.length === 0 ? (
        <p className="mt-10 text-mist">{q ? "Nenhuma academia encontrada." : "Nenhuma academia cadastrada ainda."}</p>
      ) : (
        <Stagger className="mt-8 space-y-3">
          {gyms.map((g) => (
            <Item key={g.id}>
              <GymCard gym={g} />
            </Item>
          ))}
        </Stagger>
      )}
    </>
  );
}

async function UsersTab({ base, q }: { base: string; q: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_users", { p_search: q, p_limit: 100 });
  const users = (data as UserRow[] | null) ?? [];
  const pill = (t: string, cls: string) => (
    <span key={t} className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold", cls)}>
      {t}
    </span>
  );
  return (
    <>
      <Heading title="Usuários" sub={`${users.length} mostrado(s)`}>
        <SearchBox base={base} tab="usuarios" q={q} placeholder="Buscar por nome ou e-mail" />
      </Heading>
      <Stagger className="mt-8 grid gap-3 md:grid-cols-2">
        {users.map((u) => (
          <Item key={u.id} className="flex items-center gap-4 rounded-[24px] border border-line bg-surface p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-raised font-semibold text-lime">
              {(u.full_name ?? u.email).slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{u.full_name ?? "Sem nome"}</span>
              <span className="block truncate text-[12.5px] text-fog">{u.email}</span>
              <span className="mt-1.5 flex flex-wrap gap-1">
                {u.is_student && pill("aluno", "bg-raised text-mist")}
                {u.is_trainer && pill("personal", "bg-ice/15 text-ice")}
                {u.gyms_admin > 0 && pill("dono de academia", "bg-lime/15 text-lime")}
                {!u.onboarded && pill("cadastro incompleto", "bg-amber/15 text-amber")}
              </span>
            </span>
            <span className="hidden text-right text-[11.5px] text-fog sm:block">
              criado {fmtDate(u.created_at)}
              <br />
              último acesso {fmtDate(u.last_sign_in_at)}
            </span>
          </Item>
        ))}
      </Stagger>
    </>
  );
}

function ReviewsTab({ rows, filter, link }: { rows: ReviewRow[]; filter?: string; link: (t: string, extra?: string) => string }) {
  const filters: Array<[string, string]> = [
    ["all", "Todas"],
    ["pending", "Pendentes"],
    ["approved", "Publicadas"],
    ["rejected", "Recusadas"],
  ];
  const f = filters.some(([k]) => k === filter) ? filter! : "all";
  const shown = f === "all" ? rows : rows.filter((r) => r.status === f);
  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1).replace(".", ",") : "—";
  return (
    <>
      <Heading title="Avaliações" sub={`Nota média ${avg} · ${rows.length} recebida(s)`} />
      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map(([k, l]) => (
          <Link
            key={k}
            href={link("avaliacoes", `&filtro=${k}`)}
            className={cn("rounded-full border px-4 py-1.5 text-[13px]", k === f ? "border-lime bg-lime font-semibold text-ink" : "border-line text-mist hover:text-bone")}
          >
            {l}
          </Link>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-10 text-mist">Nada por aqui.</p>
      ) : (
        <Stagger className="mt-6 grid gap-3 lg:grid-cols-2">
          {shown.map((r) => (
            <Item key={r.id} className="flex flex-col rounded-[24px] border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[17px] tracking-wider text-lime">
                  {"★".repeat(r.rating)}
                  <span className="text-line-strong">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                    r.status === "approved" ? "bg-lime/15 text-lime" : r.status === "rejected" ? "bg-raised text-fog" : "bg-amber/15 text-amber",
                  )}
                >
                  {r.status === "approved" ? "Publicada" : r.status === "rejected" ? "Recusada" : "Pendente"}
                </span>
              </div>
              <p className="mt-3 flex-1 leading-relaxed">{r.body}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12.5px] text-fog">
                  {r.display_name} · {r.email ?? "usuário removido"} · {fmtDate(r.created_at)}
                </p>
                <ReviewModeration id={r.id} status={r.status} />
              </div>
            </Item>
          ))}
        </Stagger>
      )}
    </>
  );
}

async function RequestsTab() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_data_requests");
  const rows = (data as RequestRow[] | null) ?? [];
  return (
    <>
      <Heading title="Pedidos LGPD" sub="Pedidos de exportação e exclusão de dados feitos pelos usuários." />
      {rows.length === 0 ? (
        <p className="mt-10 text-mist">Nenhum pedido.</p>
      ) : (
        <Stagger className="mt-8 space-y-3">
          {rows.map((r) => {
            const [label, cls] = REQ_STATUS[r.status] ?? [r.status, "bg-raised text-fog"];
            return (
              <Item key={r.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-line bg-surface p-5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {r.kind === "delete" ? "Excluir conta" : "Exportar dados"}
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px]", cls)}>{label}</span>
                  </p>
                  <p className="mt-1 text-[13px] text-fog">
                    {r.email ?? "usuário removido"} · {fmtDate(r.created_at)}
                    {r.reason && ` · “${r.reason}”`}
                  </p>
                </div>
                {r.status === "pending" || r.status === "processing" ? <RequestActions id={r.id} /> : null}
              </Item>
            );
          })}
        </Stagger>
      )}
    </>
  );
}

async function AuditTab() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_recent_audit");
  const rows = (data as Array<{ action: string; created_at: string }> | null) ?? [];
  return (
    <>
      <Heading title="Registro" sub="Cada ação neste painel fica gravada. Últimas 50." />
      <ol className="relative mt-8 space-y-1 border-l border-line pl-6">
        {rows.map((a, i) => (
          <li key={i} className="relative py-2">
            <span className={cn("absolute -left-[29px] top-3.5 size-2.5 rounded-full", i === 0 ? "bg-lime shadow-[0_0_12px_#ccff00]" : "bg-line-strong")} />
            <p className="text-[14px]">{AUDIT[a.action] ?? a.action}</p>
            <p className="text-[12px] text-fog">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
