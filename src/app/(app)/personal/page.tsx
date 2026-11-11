import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { getAuthContext } from "@/lib/db/context";
import { getMyTrainer, loadRoster } from "@/lib/db/trainer";
import { GOAL_LABELS } from "@/lib/domain/labels";
import type { PrimaryGoal } from "@/types/db";

export const metadata: Metadata = { title: "Meus alunos" };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—");

export default async function TrainerHome() {
  const ctx = await getAuthContext();
  const trainer = await getMyTrainer(ctx);
  if (!trainer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="type-display text-[34px]">Painel do personal</h1>
        <p className="mt-3 leading-relaxed text-mist">
          Este painel aparece para personal trainers convidados por uma academia. Peça ao administrador da sua academia para
          te convidar pelo seu e-mail de login.
        </p>
      </div>
    );
  }
  const roster = await loadRoster(ctx, trainer.id);
  const low = roster.filter((r) => r.lowFrequency).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="type-display text-[32px] sm:text-[38px]">Meus alunos</h1>
      <p className="mt-2 text-mist">
        {roster.length} aluno(s) vinculado(s){low > 0 && <span className="text-amber"> · {low} com frequência baixa</span>}
      </p>
      {roster.length === 0 ? (
        <EmptyState className="mt-8" title="Nenhum aluno vinculado">
          O administrador da academia vincula alunos a você na aba Alunos do painel da academia.
        </EmptyState>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {roster.map((r) => (
            <li key={r.id}>
              <Link href={`/personal/${r.id}`} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {r.name}
                    {r.lowFrequency && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[11.5px] font-medium text-amber">frequência baixa</span>}
                    {r.status !== "active" && <span className="text-[12px] text-fog">(inativo)</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-fog">
                    {r.goal ? GOAL_LABELS[r.goal as PrimaryGoal] : "Objetivo não informado"} · {r.thisWeek} treino(s) nesta semana
                    {r.target ? ` de ${r.target}` : ""} · último treino {fmt(r.lastSession)} · última avaliação {fmt(r.lastAssessment)}
                  </p>
                </div>
                <ChevronRight className="size-4 text-fog" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
