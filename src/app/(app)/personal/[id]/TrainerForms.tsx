"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { addExercise, addNote, createPlan } from "../actions";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return {
    pending,
    error,
    run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
      start(async () => {
        try {
          const r = await fn();
          setError(r.ok ? null : (r.error ?? "Não foi possível concluir."));
          if (r.ok) after?.();
        } catch {
          setError("Falha de conexão. Tente de novo.");
        }
      });
    },
  };
}

export function NoteForm({ studentId }: { studentId: string }) {
  const [body, setBody] = useState("");
  const [visible, setVisible] = useState(true);
  const r = useRun();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        r.run(() => addNote({ studentId, body, visible }), () => setBody(""));
      }}
    >
      {r.error && <Notice tone="error">{r.error}</Notice>}
      <Textarea label="Nova observação" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[13px] text-mist">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-4 accent-[#ccff00]" />
          Visível para o aluno (ele recebe uma notificação)
        </label>
        <Button type="submit" size="sm" loading={r.pending}>
          Salvar observação
        </Button>
      </div>
    </form>
  );
}

export function NewPlanForm({ studentId, usedLabels }: { studentId: string; usedLabels: string[] }) {
  const free = ["A", "B", "C", "D", "E"].filter((l) => !usedLabels.includes(l));
  const [label, setLabel] = useState(free[0] ?? "A");
  const [name, setName] = useState("");
  const r = useRun();
  return (
    <form
      className="panel grid gap-3 p-5 sm:grid-cols-[110px_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        r.run(() => createPlan({ studentId, label, name }), () => setName(""));
      }}
    >
      <Select label="Treino" value={label} onChange={(e) => setLabel(e.target.value)}>
        {["A", "B", "C", "D", "E"].map((l) => (
          <option key={l} value={l}>
            {l}
            {usedLabels.includes(l) ? " (substitui)" : ""}
          </option>
        ))}
      </Select>
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Peito e tríceps" />
      <Button type="submit" loading={r.pending}>
        Criar treino
      </Button>
      {r.error && <Notice tone="error" className="sm:col-span-3">{r.error}</Notice>}
    </form>
  );
}

export function ExerciseForm({
  planId,
  studentId,
  exercises,
  compact = false,
}: {
  planId: string;
  studentId: string;
  exercises: Array<{ id: string; name: string; group: string }>;
  compact?: boolean;
}) {
  const [added, setAdded] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10-12");
  const [rest, setRest] = useState("60");
  const [load, setLoad] = useState("");
  const r = useRun();
  const groups = [...new Set(exercises.map((e) => e.group))];
  return (
    <form
      className={
        compact
          ? "mt-3 grid grid-cols-2 gap-3 rounded-xl border border-dashed border-line p-4 sm:grid-cols-4 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-4"
          : "mt-4 grid gap-3 rounded-xl border border-dashed border-line p-4 sm:grid-cols-[2fr_80px_100px_100px_100px_auto] sm:items-end"
      }
      onSubmit={(e) => {
        e.preventDefault();
        const name = exercises.find((x) => x.id === exerciseId)?.name ?? "Exercício";
        setAdded(null);
        r.run(
          () => addExercise({ planId, studentId, exerciseId, sets, reps, rest, load }),
          () => {
            setLoad("");
            setExerciseId("");
            setAdded(name);
          },
        );
      }}
    >
      <Select label="Exercício" value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
        <option value="">Escolha…</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {exercises
              .filter((e) => e.group === g)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
      <Input label="Séries" value={sets} onChange={(e) => setSets(e.target.value)} inputMode="numeric" />
      <Input label="Repetições" value={reps} onChange={(e) => setReps(e.target.value)} />
      <Input label="Descanso" value={rest} onChange={(e) => setRest(e.target.value)} inputMode="numeric" suffix="s" />
      <Input label="Carga" value={load} onChange={(e) => setLoad(e.target.value)} inputMode="decimal" suffix="kg" />
      <Button type="submit" size="md" loading={r.pending} disabled={!exerciseId} className={compact ? "col-span-2 sm:col-span-4" : undefined}>
        Adicionar
      </Button>
      {added && !r.error && <Notice tone="success" className={compact ? "col-span-2 sm:col-span-4" : "sm:col-span-6"}>{added} adicionado ao treino.</Notice>}
      {r.error && <Notice tone="error" className={compact ? "col-span-2 sm:col-span-4" : "sm:col-span-6"}>{r.error}</Notice>}
    </form>
  );
}
