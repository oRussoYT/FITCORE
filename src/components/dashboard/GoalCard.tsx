import { formatNumber } from "@/lib/domain/metrics";
import type { Goal } from "@/types/db";

function progress(goal: Goal): number | null {
  const { start_value: s, target_value: t, current_value: c } = goal;
  if (s === null || t === null || c === null || Number(t) === Number(s)) return null;
  const p = (Number(c) - Number(s)) / (Number(t) - Number(s));
  return Math.max(0, Math.min(1, p));
}

export function GoalCard({ goal, objective }: { goal: Goal | null; objective: string | null }) {
  const p = goal ? progress(goal) : null;
  return (
    <article className="panel p-5">
      <h3 className="type-label">Meta atual</h3>
      {goal ? (
        <>
          <p className="mt-3 text-[17px] font-semibold leading-snug">{goal.title}</p>
          {p !== null && (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${p * 100}%` }} />
              </div>
              <p className="mt-2 text-[12.5px] text-fog">
                {formatNumber(Number(goal.current_value), 1)} de {formatNumber(Number(goal.target_value), 1)} {goal.unit ?? ""} ·{" "}
                {Math.round(p * 100)}%
              </p>
            </>
          )}
          {goal.due_on && <p className="mt-1 text-[12.5px] text-fog">Prazo: {new Date(`${goal.due_on}T12:00:00`).toLocaleDateString("pt-BR")}</p>}
        </>
      ) : (
        <p className="mt-4 text-[13px] leading-relaxed text-fog">
          Nenhuma meta ativa no momento.
          {objective && (
            <>
              {" "}
              Seu objetivo principal é <span className="text-mist">{objective.toLowerCase()}</span>.
            </>
          )}
        </p>
      )}
    </article>
  );
}
