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
    const steps = [
      ["Peça o convite", `O dono da academia convida você na aba “Personal trainers” do painel dele, usando o e-mail ${ctx.email ?? "da sua conta"}.`],
      ["Aceite no Início", "O convite aparece na sua tela inicial. Um toque em “Aceitar” e você entra na equipe."],
      ["Acompanhe seus alunos", "Os alunos vinculados a você aparecem aqui, com frequência, treinos e observações."],
    ];
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="type-metric text-[clamp(44px,7vw,72px)] leading-[0.9]">Área do personal</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-mist">
          Personal trainers entram pela academia onde trabalham. É assim que a gente garante que você só vê alunos que
          realmente acompanha.
        </p>
        <ol className="mt-8 space-y-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-[24px] border border-line bg-surface p-5">
              <span className="type-metric flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-[20px] text-ink">{i + 1}</span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="mt-1 block text-[14px] leading-relaxed text-mist">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[14px] text-mist">
          Você tem a própria academia?{" "}
          <Link href="/academia" className="font-semibold text-lime underline-offset-4 hover:underline">
            Cadastre aqui
          </Link>
          .
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
