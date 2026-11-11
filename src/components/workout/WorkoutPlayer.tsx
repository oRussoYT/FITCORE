"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, FastForward, Minus, Pause, Play, Plus, Undo2, X } from "lucide-react";
import { BodyAnatomy } from "@/components/body/BodyAnatomy";
import { abandonSession, finishSession, logSet, undoSet } from "@/app/(app)/treinos/actions";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/domain/metrics";
import { youtubeEmbed, youtubeId } from "@/lib/media";

export type PlayerExercise = {
  workoutExerciseId: string;
  exerciseId: string;
  name: string;
  instructions: string | null;
  mediaUrl: string | null;
  mediaCredit?: string | null;
  primaryMuscle: string;
  secondaryMuscles: string[];
  sets: number;
  reps: string;
  restSeconds: number;
  targetLoad: number | null;
  lastLoad: number | null;
};

type Done = { logId: string; exerciseIdx: number; reps: number; load: number | null };

const BACK_GROUPS = new Set(["back", "traps", "triceps", "glutes", "hamstrings"]);
const ease = [0.16, 1, 0.3, 1] as const;

function parseTarget(reps: string): { kind: "reps"; value: number } | { kind: "time"; value: number } {
  const t = reps.trim().toLowerCase();
  const time = t.match(/^(\d+)\s*(s|seg|segundos?)$/);
  if (time) return { kind: "time", value: Number(time[1]) };
  const min = t.match(/^(\d+)\s*min/);
  if (min) return { kind: "time", value: Number(min[1]) * 60 };
  const n = t.match(/\d+/);
  return { kind: "reps", value: n ? Number(n[0]) : 10 };
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* sem som disponível */
  }
}

function mmss(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
}

export function WorkoutPlayer({
  sessionId,
  planLabel,
  planName,
  startedAt,
  exercises,
  initialDone,
}: {
  sessionId: string;
  planLabel: string;
  planName: string;
  startedAt: string;
  exercises: PlayerExercise[];
  initialDone: Done[];
}) {
  const router = useRouter();
  const [done, setDone] = useState<Done[]>(initialDone);
  const firstOpen = useMemo(() => {
    const i = exercises.findIndex((e, idx) => initialDone.filter((d) => d.exerciseIdx === idx).length < e.sets);
    return i < 0 ? exercises.length : i;
  }, [exercises, initialDone]);
  const [idx, setIdx] = useState(firstOpen);
  const [phase, setPhase] = useState<"work" | "rest" | "summary">(firstOpen >= exercises.length ? "summary" : "work");
  const [paused, setPaused] = useState(false);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [showHow, setShowHow] = useState(false);
  const [view, setView] = useState<"video" | "muscles">("video");
  const [confirmExit, setConfirmExit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const ex = exercises[idx];
  const target = ex ? parseTarget(ex.reps) : { kind: "reps" as const, value: 10 };
  const setsDone = done.filter((d) => d.exerciseIdx === idx).length;
  const [reps, setReps] = useState(target.value);
  const [load, setLoad] = useState<number | null>(ex?.lastLoad ?? ex?.targetLoad ?? null);
  const [restLeft, setRestLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(target.kind === "time" ? target.value : 0);
  const restTotal = useRef(0);

  // Reinicia os contadores ao trocar de exercício
  useEffect(() => {
    if (!ex) return;
    const t = parseTarget(ex.reps);
    setReps(t.value);
    setTimeLeft(t.kind === "time" ? t.value : 0);
    const prev = [...done].reverse().find((d) => d.exerciseIdx === idx);
    setLoad(prev?.load ?? ex.lastLoad ?? ex.targetLoad ?? null);
    setShowHow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Relógio único (1 s)
  const pauseStart = useRef<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (paused) return;
      if (phase === "rest") setRestLeft((r) => r - 1);
      if (phase === "work" && target.kind === "time") setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, phase, target.kind]);

  const nextAfterSet = useCallback(
    (newDone: Done[]) => {
      const cur = exercises[idx];
      if (!cur) return;
      const count = newDone.filter((d) => d.exerciseIdx === idx).length;
      const finishedExercise = count >= cur.sets;
      const nextIdx = finishedExercise ? exercises.findIndex((e, i) => i > idx && newDone.filter((d) => d.exerciseIdx === i).length < e.sets) : idx;
      if (finishedExercise && nextIdx < 0) {
        setPhase("summary");
        return;
      }
      if (cur.restSeconds > 0) {
        restTotal.current = cur.restSeconds;
        setRestLeft(cur.restSeconds);
        setPhase("rest");
      }
      if (finishedExercise) setIdx(nextIdx);
      else {
        const t = parseTarget(cur.reps);
        if (t.kind === "time") setTimeLeft(t.value);
      }
    },
    [exercises, idx],
  );

  const completeSet = useCallback(
    async (repsValue: number) => {
      if (!ex || busy) return;
      setBusy(true);
      setError(null);
      const r = await logSet({ sessionId, workoutExerciseId: ex.workoutExerciseId, exerciseId: ex.exerciseId, setNumber: setsDone + 1, reps: repsValue, load });
      setBusy(false);
      if (!r.ok || !r.data) {
        setError(r.ok ? "Erro ao salvar." : r.error);
        return;
      }
      const newDone = [...done, { logId: r.data.id, exerciseIdx: idx, reps: repsValue, load }];
      setDone(newDone);
      nextAfterSet(newDone);
    },
    [ex, busy, sessionId, setsDone, load, done, idx, nextAfterSet],
  );

  // Fim do descanso / do tempo do exercício
  useEffect(() => {
    if (phase === "rest" && restLeft <= 0) {
      beep();
      setPhase("work");
    }
  }, [phase, restLeft]);
  useEffect(() => {
    if (phase === "work" && target.kind === "time" && timeLeft <= 0 && ex) {
      beep();
      void completeSet(target.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function togglePause() {
    if (paused) {
      if (pauseStart.current) setPausedTotal((p) => p + (Date.now() - pauseStart.current!) / 1000);
      pauseStart.current = null;
      setPaused(false);
    } else {
      pauseStart.current = Date.now();
      setPaused(true);
    }
  }

  function skipExercise() {
    const next = exercises.findIndex((e, i) => i > idx && done.filter((d) => d.exerciseIdx === i).length < e.sets);
    if (next < 0) setPhase("summary");
    else {
      setIdx(next);
      setPhase("work");
    }
  }

  async function undoLast() {
    const last = done.at(-1);
    if (!last || busy) return;
    setBusy(true);
    const r = await undoSet(last.logId);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(done.slice(0, -1));
    setIdx(last.exerciseIdx);
    setPhase("work");
  }

  async function finish() {
    setBusy(true);
    const r = await finishSession(sessionId, pausedTotal);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace("/treinos?concluido=1");
    router.refresh();
  }

  async function exit() {
    setBusy(true);
    await abandonSession(sessionId);
    router.replace("/treinos");
    router.refresh();
  }

  const elapsed = Math.max(0, (now - new Date(startedAt).getTime()) / 1000 - pausedTotal - (pauseStart.current ? (now - pauseStart.current) / 1000 : 0));
  const volume = done.reduce((s, d) => s + d.reps * (d.load ?? 0), 0);
  const stimulus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of done) {
      const e = exercises[d.exerciseIdx];
      if (!e) continue;
      m[e.primaryMuscle] = (m[e.primaryMuscle] ?? 0) + 1;
      for (const s of e.secondaryMuscles) m[s] = (m[s] ?? 0) + 0.5;
    }
    return m;
  }, [done, exercises]);
  const maxStim = Math.max(1, ...Object.values(stimulus));
  const nextEx = phase === "rest" ? exercises[idx] : null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink">
      {/* Topo */}
      <header className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] sm:px-6">
        <button type="button" onClick={() => setConfirmExit(true)} aria-label="Sair do treino" className="flex size-10 items-center justify-center rounded-full bg-raised text-mist hover:text-bone">
          <X className="size-5" />
        </button>
        <div className="text-center">
          <p className="text-[13px] tabular-nums text-mist">{phase === "summary" ? "Concluído" : `${Math.min(idx + 1, exercises.length)}/${exercises.length}`}</p>
          <p className="text-[12px] tabular-nums text-fog">{mmss(elapsed)}</p>
        </div>
        <button
          type="button"
          onClick={togglePause}
          disabled={phase === "summary"}
          aria-label={paused ? "Continuar" : "Pausar"}
          className="flex size-10 items-center justify-center rounded-full bg-raised text-mist hover:text-bone disabled:opacity-30"
        >
          {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
        </button>
      </header>

      <div className="mt-3 flex justify-center">
        <span className="rounded-lg bg-bone px-4 py-1.5 text-[17px] font-bold text-ink">
          Treino {planLabel} · {planName}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="relative mx-auto flex w-full max-w-xl flex-1 flex-col overflow-hidden px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === "summary" ? (
            <motion.div key="summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="flex flex-1 flex-col items-center justify-center py-6 text-center">
              <div className="h-[34vh] w-full max-w-sm">
                <BodyAnatomy intensityFor={(g) => (stimulus[g] ?? 0) / maxStim} selected={null} onSelect={() => {}} labelFor={(g) => g} />
              </div>
              <h2 className="type-metric mt-4 text-[56px] text-lime">Treino feito!</h2>
              <dl className="mt-4 grid w-full grid-cols-3 gap-3">
                {[
                  ["Duração", mmss(elapsed)],
                  ["Séries", String(done.length)],
                  ["Volume", `${formatNumber(volume, 0)} kg`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-surface p-3">
                    <dt className="text-[12px] text-fog">{k}</dt>
                    <dd className="type-metric mt-1 text-[26px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          ) : phase === "rest" ? (
            <motion.div key="rest" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-[15px] text-mist">Descanso</p>
              <p className="type-metric mt-2 text-[120px] leading-none tabular-nums">{mmss(restLeft)}</p>
              <div className="mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-raised">
                <div className="h-full bg-lime transition-[width] duration-1000 ease-linear" style={{ width: `${(restLeft / Math.max(1, restTotal.current)) * 100}%` }} />
              </div>
              {nextEx && (
                <p className="mt-8 text-[14px] text-mist">
                  A seguir: <span className="font-semibold text-bone">{nextEx.name}</span> · série {Math.min(done.filter((d) => d.exerciseIdx === idx).length + 1, nextEx.sets)} de {nextEx.sets}
                </p>
              )}
            </motion.div>
          ) : ex ? (
            <motion.div key={`ex-${idx}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4, ease }} className="flex flex-1 flex-col">
              {ex.mediaUrl && (
                <div role="tablist" aria-label="Como fazer" className="mx-auto mt-3 flex rounded-full bg-raised p-1">
                  {(["video", "muscles"] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      type="button"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={cn("h-8 rounded-full px-4 text-[13px] font-semibold", view === v ? "bg-bone text-ink" : "text-mist")}
                    >
                      {v === "video" ? "Como fazer" : "Músculos"}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex min-h-0 flex-1 items-center justify-center py-4">
                {ex.mediaUrl && view === "video" ? (
                  youtubeId(ex.mediaUrl) ? (
                    <figure className="w-full">
                      <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-2xl bg-black">
                        <iframe
                          key={ex.mediaUrl}
                          src={youtubeEmbed(youtubeId(ex.mediaUrl)!, { autoplay: !paused })}
                          title={`Como fazer: ${ex.name}`}
                          allow="autoplay; encrypted-media; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="absolute inset-0 h-full w-full"
                        />
                      </div>
                      {ex.mediaCredit && <figcaption className="mt-2 text-center text-[11.5px] text-fog">Vídeo: {ex.mediaCredit} · YouTube</figcaption>}
                    </figure>
                  ) : /\.(mp4|webm|mov)(\?|$)/i.test(ex.mediaUrl) ? (
                    <video src={ex.mediaUrl} autoPlay loop muted playsInline className="max-h-full w-full rounded-2xl object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ex.mediaUrl} alt={`Como fazer: ${ex.name}`} className="max-h-full w-full rounded-2xl object-contain" />
                  )
                ) : (
                  <div className="h-full max-h-[46vh] aspect-[410/1024]">
                    <BodyAnatomy
                      view={BACK_GROUPS.has(ex.primaryMuscle) ? "back" : "front"}
                      pulse={!paused}
                      intensityFor={(g) => (g === ex.primaryMuscle ? 1 : ex.secondaryMuscles.includes(g) ? 0.45 : 0)}
                      selected={null}
                      onSelect={() => {}}
                      labelFor={(g) => g}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {paused && phase !== "summary" && (
          <button type="button" onClick={togglePause} className="absolute inset-0 z-10 flex items-center justify-center bg-ink/70 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-lime px-6 py-3 font-bold text-ink">
              <Play className="size-5" /> Continuar
            </span>
          </button>
        )}
      </div>

      {/* Painel inferior */}
      <footer className="mx-auto w-full max-w-xl px-4 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-6">
        {error && <p className="mb-2 text-center text-[13px] text-coral">{error}</p>}
        {phase === "summary" ? (
          <button type="button" onClick={finish} disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lime text-[17px] font-bold text-ink disabled:opacity-60">
            <Check className="size-5" /> {busy ? "Salvando…" : "Salvar treino"}
          </button>
        ) : phase === "rest" ? (
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => { setRestLeft((r) => Math.max(0, r - 15)); restTotal.current = Math.max(1, restTotal.current); }} className="h-12 rounded-full bg-raised px-5 font-semibold text-mist">
              −15
            </button>
            <button type="button" onClick={() => { setRestLeft((r) => r + 15); restTotal.current += 15; }} className="h-12 rounded-full bg-raised px-5 font-semibold text-mist">
              +15
            </button>
            <button type="button" onClick={() => setPhase("work")} className="flex h-12 items-center gap-2 rounded-full bg-bone px-6 font-semibold text-ink">
              Pular <FastForward className="size-4" />
            </button>
          </div>
        ) : ex ? (
          <div className="text-center">
            <h2 className="text-[22px] font-bold">{ex.name}</h2>
            {ex.instructions && (
              <button type="button" onClick={() => setShowHow((v) => !v)} className="mx-auto mt-1 flex max-w-full items-start gap-1 text-[14px] text-mist">
                <span className={cn("text-left", !showHow && "truncate")}>{ex.instructions}</span>
                <ChevronDown className={cn("mt-0.5 size-4 shrink-0 transition-transform", showHow && "rotate-180")} />
              </button>
            )}
            <div className="mt-3 flex items-center justify-center gap-1.5" aria-label={`Série ${setsDone + 1} de ${ex.sets}`}>
              {Array.from({ length: ex.sets }).map((_, i) => (
                <span key={i} className={cn("h-1.5 w-8 rounded-full", i < setsDone ? "bg-lime" : i === setsDone ? "bg-bone" : "bg-raised")} />
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] text-fog">
              Série {setsDone + 1} de {ex.sets}
              {ex.lastLoad != null && ` · última vez ${formatNumber(ex.lastLoad, 1)} kg`}
            </p>

            {target.kind === "time" ? (
              <>
                <div className="mt-3 flex items-center justify-center gap-6">
                  <button type="button" onClick={() => setTimeLeft((t) => Math.max(1, t - 15))} className="h-11 rounded-full bg-raised px-4 font-semibold text-mist">
                    −15
                  </button>
                  <span className="type-metric w-28 text-[52px] tabular-nums">{mmss(timeLeft)}</span>
                  <button type="button" onClick={() => setTimeLeft((t) => t + 15)} className="h-11 rounded-full bg-raised px-4 font-semibold text-mist">
                    +15
                  </button>
                </div>
                <div className="mx-auto mt-3 h-1.5 max-w-sm overflow-hidden rounded-full bg-raised">
                  <div className="h-full bg-bone transition-[width] duration-1000 ease-linear" style={{ width: `${(1 - timeLeft / Math.max(1, target.value)) * 100}%` }} />
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-5">
                <button type="button" onClick={() => setReps((r) => Math.max(0, r - 1))} aria-label="Menos uma repetição" className="flex size-12 items-center justify-center rounded-full bg-raised text-bone">
                  <Minus className="size-5" />
                </button>
                <p className="w-32">
                  <span className="type-metric text-[56px] tabular-nums">{reps}</span>
                  <span className="ml-1.5 text-[16px] text-mist">reps</span>
                </p>
                <button type="button" onClick={() => setReps((r) => Math.min(500, r + 1))} aria-label="Mais uma repetição" className="flex size-12 items-center justify-center rounded-full bg-raised text-bone">
                  <Plus className="size-5" />
                </button>
              </div>
            )}

            <div className="mt-3 flex items-center justify-center gap-3 text-[14px]">
              <span className="text-fog">Carga</span>
              <button type="button" onClick={() => setLoad((l) => Math.max(0, (l ?? 0) - 2.5))} className="flex size-8 items-center justify-center rounded-full bg-raised" aria-label="Diminuir carga">
                <Minus className="size-4" />
              </button>
              <span className="w-20 font-semibold tabular-nums">{load == null ? "sem carga" : `${formatNumber(load, 1)} kg`}</span>
              <button type="button" onClick={() => setLoad((l) => (l ?? 0) + 2.5)} className="flex size-8 items-center justify-center rounded-full bg-raised" aria-label="Aumentar carga">
                <Plus className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={skipExercise} className="flex h-14 items-center gap-1.5 rounded-2xl bg-raised px-5 font-semibold text-mist">
                Pular <FastForward className="size-4" />
              </button>
              {done.length > 0 && (
                <button type="button" onClick={undoLast} aria-label="Desfazer última série" className="flex size-14 items-center justify-center rounded-2xl bg-raised text-mist">
                  <Undo2 className="size-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void completeSet(target.kind === "time" ? Math.max(0, target.value - Math.max(0, timeLeft)) : reps)}
                disabled={busy || paused}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime text-[17px] font-bold text-ink disabled:opacity-60"
              >
                {busy ? "Salvando…" : "Feito"} <Check className="size-5" />
              </button>
            </div>
          </div>
        ) : null}
      </footer>

      {/* Confirmação de saída */}
      <AnimatePresence>
        {confirmExit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-end justify-center bg-ink/80 p-4 backdrop-blur sm:items-center">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-full max-w-sm rounded-3xl bg-surface p-6">
              <p className="text-[18px] font-semibold">Sair do treino?</p>
              <p className="mt-2 text-[14px] leading-relaxed text-mist">
                {done.length > 0 ? `As ${done.length} séries feitas ficam salvas. Você também pode concluir o treino agora.` : "Nenhuma série foi registrada; o treino será descartado."}
              </p>
              <div className="mt-6 grid gap-2">
                {done.length > 0 && (
                  <button type="button" onClick={() => { setConfirmExit(false); setPhase("summary"); }} className="h-12 rounded-xl bg-lime font-bold text-ink">
                    Concluir com o que fiz
                  </button>
                )}
                <button type="button" onClick={exit} disabled={busy} className="h-12 rounded-xl bg-raised font-semibold text-coral">
                  Sair sem concluir
                </button>
                <button type="button" onClick={() => setConfirmExit(false)} className="h-12 rounded-xl font-semibold text-mist">
                  Continuar treinando
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
