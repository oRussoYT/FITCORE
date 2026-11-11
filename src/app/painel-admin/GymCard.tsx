"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Pause, Play, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { loadGymMembers, setGymSuspended, setMemberStatus, type AdminMember } from "./actions";

export type AdminGym = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_email: string | null;
  students: number;
  trainers: number;
  staff: number;
  sessions_30d: number;
  plans: number;
  suspended_at: string | null;
  suspended_reason: string | null;
};

const ROLE = { admin: "Dono / administrador", trainer: "Personal", student: "Aluno" } as Record<string, string>;
const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function GymCard({ gym }: { gym: AdminGym }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const suspended = Boolean(gym.suspended_at);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !members) {
      start(async () => {
        const r = await loadGymMembers(gym.id);
        if (r.ok) setMembers(r.data);
        else setError(r.error);
      });
    }
  }

  function suspend(on: boolean) {
    setError(null);
    start(async () => {
      const r = await setGymSuspended(gym.id, on, reason);
      if (!r.ok) return setError(r.error);
      setAsking(false);
      setReason("");
    });
  }

  function member(m: AdminMember, active: boolean) {
    start(async () => {
      const r = await setMemberStatus(m.id, active);
      if (!r.ok) return setError(r.error);
      setMembers((list) => list?.map((x) => (x.id === m.id ? { ...x, status: active ? "active" : "inactive" } : x)) ?? null);
    });
  }

  const stats: Array<[string, number]> = [
    ["Alunos", gym.students],
    ["Personais", gym.trainers],
    ["Treinos 30d", gym.sessions_30d],
    ["Planos", gym.plans],
  ];

  return (
    <motion.article
      layout
      className={cn(
        "overflow-hidden rounded-[28px] border bg-surface transition-colors",
        suspended ? "border-coral/40" : "border-line hover:border-line-strong",
      )}
    >
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-5 p-5 text-left sm:p-6">
        <span
          className={cn(
            "type-metric flex size-14 shrink-0 items-center justify-center rounded-2xl text-[26px]",
            suspended ? "bg-coral/15 text-coral" : "bg-lime text-ink",
          )}
        >
          {gym.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[17px] font-semibold">{gym.name}</span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", suspended ? "bg-coral/15 text-coral" : "bg-lime/15 text-lime")}>
              {suspended ? "Suspensa" : "Ativa"}
            </span>
          </span>
          <span className="mt-1 block truncate text-[13px] text-fog">
            {gym.owner_email ?? "dono removido"} · desde {fmt(gym.created_at)}
          </span>
        </span>
        <span className="hidden gap-6 md:flex">
          {stats.map(([l, v]) => (
            <span key={l} className="text-center">
              <span className="type-metric block text-[26px] leading-none">{v}</span>
              <span className="mt-1 block text-[11.5px] text-fog">{l}</span>
            </span>
          ))}
        </span>
        <ChevronDown className={cn("size-5 text-mist transition-transform duration-300", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-t border-line p-5 sm:p-6">
              <div className="grid grid-cols-4 gap-3 md:hidden">
                {stats.map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-graphite p-3 text-center">
                    <p className="type-metric text-[22px]">{v}</p>
                    <p className="text-[11px] text-fog">{l}</p>
                  </div>
                ))}
              </div>

              {suspended && (
                <p className="mb-5 rounded-2xl bg-coral/10 px-4 py-3 text-[13.5px] text-coral">
                  Suspensa em {fmt(gym.suspended_at!)}
                  {gym.suspended_reason && <> — “{gym.suspended_reason}”</>}. O dono não consegue gerenciar alunos, planos nem convites.
                </p>
              )}

              <h3 className="mt-4 text-[14px] font-semibold text-mist md:mt-0">Equipe e membros</h3>
              {!members && pending && <p className="mt-3 text-[13px] text-fog">Carregando…</p>}
              {members && members.length === 0 && <p className="mt-3 text-[13px] text-fog">Nenhum membro.</p>}
              {members && members.length > 0 && (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                  {members.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13.5px]">
                      <span className="min-w-0">
                        <span className={cn("block font-medium", m.status !== "active" && "text-fog line-through")}>{m.full_name ?? m.email ?? "—"}</span>
                        <span className="block text-[12px] text-fog">
                          {ROLE[m.role] ?? m.role} · {m.email}
                        </span>
                      </span>
                      {m.role !== "admin" &&
                        (m.status === "active" ? (
                          <Button size="sm" variant="ghost" disabled={pending} onClick={() => member(m, false)}>
                            <UserX className="size-4" /> Desativar
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={pending} onClick={() => member(m, true)}>
                            <UserCheck className="size-4" /> Reativar
                          </Button>
                        ))}
                    </li>
                  ))}
                </ul>
              )}

              {error && <p className="mt-4 text-[13px] text-coral">{error}</p>}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {suspended ? (
                  <Button size="md" loading={pending} onClick={() => suspend(false)}>
                    <Play className="size-4" /> Reativar academia
                  </Button>
                ) : asking ? (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 300))}
                      placeholder="Motivo (o dono vai ver)"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-graphite px-3 text-[14px] focus:border-coral/60 focus:outline-none"
                    />
                    <Button size="md" variant="ghost" onClick={() => setAsking(false)} disabled={pending}>
                      Cancelar
                    </Button>
                    <Button size="md" variant="danger" loading={pending} onClick={() => suspend(true)}>
                      Confirmar suspensão
                    </Button>
                  </div>
                ) : (
                  <Button size="md" variant="danger" onClick={() => setAsking(true)}>
                    <Pause className="size-4" /> Suspender academia
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
