export type CoachPlan = { id: string; label: string; name: string; exercises: number };
export type CoachNote = { id: string; body: string; created_at: string };

/** O que o personal deixou para o aluno: treinos ativos e observações. */
export function CoachCard({ plans, notes }: { plans: CoachPlan[]; notes: CoachNote[] }) {
  if (plans.length === 0 && notes.length === 0) return null;
  return (
    <article className="panel p-5">
      <h3 className="type-label">Do seu personal</h3>
      {plans.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[14px]">
              <span className="flex size-6 items-center justify-center rounded-md bg-lime text-[13px] font-bold text-ink">{p.label}</span>
              {p.name}
              <span className="text-[12px] text-fog">{p.exercises} exercício(s)</span>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-lime/60 pl-3 text-[14px] leading-relaxed">
              {n.body}
              <span className="mt-1 block text-[12px] text-fog">{new Date(n.created_at).toLocaleDateString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
