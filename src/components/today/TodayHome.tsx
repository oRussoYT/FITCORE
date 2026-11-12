"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Droplet, Dumbbell, Flame, Moon, Play, Plus, Scale, ScanFace, Video, X } from "lucide-react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { addWater, logWeight, undoWater } from "@/app/(app)/dashboard/actions";
import { startSession } from "@/app/(app)/treinos/actions";
import { cn } from "@/lib/cn";
import type { Pending } from "@/lib/domain/today";
import type { NotificationRow } from "@/types/db";

export type TodayProps = {
  name: string;
  avatarUrl: string | null;
  notifications: { items: NotificationRow[]; unread: number };
  weekStreak: number;
  daysWithoutTraining: number | null;
  pending: Pending[];
  plan: { id: string; label: string; name: string; exercises: number; sets: number } | null;
  openSessionId: string | null;
  water: Array<{ id: string; amount_ml: number; logged_at: string }>;
  waterGoal: number;
  weight: { kg: number; at: string; delta: number | null } | null;
  weekSessions: number;
  weekTarget: number | null;
};

const ease = [0.16, 1, 0.3, 1] as const;
const fade = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: 0.06 * i, ease } });

function greeting(h: number) {
  if (h < 5) return "Boa noite";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const liters = (ml: number) => (ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function TodayHome(p: TodayProps) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  // Água: soma só o "hoje" do fuso da pessoa, com atualização instantânea.
  const [water, setWater] = useState(p.water);
  useEffect(() => setWater(p.water), [p.water]);
  const todayMl = useMemo(() => (now ? water.filter((w) => isToday(w.logged_at)).reduce((s, w) => s + w.amount_ml, 0) : 0), [water, now]);
  const lastWater = water.find((w) => isToday(w.logged_at));

  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<{ text: string; undoId?: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  function drink(ml: number) {
    const tempId = `tmp-${Date.now()}`;
    setWater((w) => [{ id: tempId, amount_ml: ml, logged_at: new Date().toISOString() }, ...w]);
    start(async () => {
      const r = await addWater(ml);
      if (!r.ok || !r.data) {
        setWater((w) => w.filter((x) => x.id !== tempId));
        return setToast({ text: r.ok ? "Erro ao registrar." : r.error });
      }
      const id = r.data.id;
      setWater((w) => w.map((x) => (x.id === tempId ? { ...x, id } : x)));
      setToast({ text: `+${ml} ml de água`, undoId: id });
    });
  }

  function undo(id: string) {
    setWater((w) => w.filter((x) => x.id !== id));
    setToast(null);
    start(async () => {
      await undoWater(id);
      router.refresh();
    });
  }

  function go() {
    if (p.openSessionId) return router.push(`/treinos/sessao/${p.openSessionId}`);
    if (!p.plan) return router.push("/treinos");
    start(async () => {
      const r = await startSession(p.plan!.id);
      if (r.ok && r.data) router.push(`/treinos/sessao/${r.data.id}`);
      else setToast({ text: r.ok ? "Não foi possível abrir o treino." : r.error });
    });
  }

  const firstName = p.name.split(" ")[0] ?? p.name;
  const initials = p.name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
  const dateLabel = now?.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "") ?? "";
  const weekday = now?.toLocaleDateString("pt-BR", { weekday: "long" }) ?? "Hoje";
  const waterPct = Math.min(1, todayMl / p.waterGoal);

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
      {/* Cabeçalho do dia */}
      <motion.section {...fade(0)} className="relative overflow-hidden lg:order-1 rounded-[30px] border border-line bg-[linear-gradient(150deg,#1b2023,#111416_60%)] p-5 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.22),transparent_65%)]" />
        <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-10 right-4 size-48 text-lime/[0.07]">
          <path d="M140 46A72 72 0 1 0 172 100" fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
          <circle cx="172" cy="100" r="20" fill="currentColor" />
        </svg>
        <div className="relative flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-semibold capitalize tracking-wide text-mist">{dateLabel}</p>
          <div className="flex items-center gap-2">
            <NotificationBell items={p.notifications.items} unread={p.notifications.unread} />
            <Link href="/perfil" aria-label="Meu perfil" className="block">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt="" className="size-10 rounded-full border-2 border-lime object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-full bg-lime text-[14px] font-bold text-ink">{initials}</span>
              )}
            </Link>
          </div>
        </div>
        <h1 className="type-display relative mt-4 text-[30px] leading-tight sm:text-[38px]">
          {now ? greeting(now.getHours()) : "Olá"}, {firstName}
        </h1>
        <p className="relative mt-1 text-[14px] text-mist">Seu treino, sua água e sua evolução num só lugar.</p>
        <div className="relative mt-5 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3">
            <Flame className={cn("size-5 shrink-0", p.weekStreak > 0 ? "text-amber" : "text-fog")} />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">
                {p.weekStreak} {p.weekStreak === 1 ? "semana" : "semanas"}
              </span>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-fog">em sequência</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-3.5 py-3">
            <Moon className="size-5 shrink-0 text-ice" />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">
                {p.daysWithoutTraining === null ? "—" : p.daysWithoutTraining === 0 ? "Treinou hoje" : `${p.daysWithoutTraining} ${p.daysWithoutTraining === 1 ? "dia" : "dias"}`}
              </span>
              <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-fog">
                {p.daysWithoutTraining === 0 ? "boa!" : p.daysWithoutTraining === null ? "nenhum treino ainda" : "sem treinar"}
              </span>
            </span>
          </div>
        </div>
      </motion.section>

      {/* Pendências */}
      {p.pending.length > 0 && (
        <motion.section {...fade(1)} className="lg:order-3 lg:col-span-2">
          <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-mist">
            A preencher <span className="size-1.5 rounded-full bg-lime" />
          </h2>
          <ul className="space-y-2">
            {p.pending.map((it) => (
              <li key={it.key}>
                <Link href={it.href} className="group flex items-center gap-3 rounded-2xl border border-lime/25 bg-lime/[0.06] px-4 py-3.5 transition-colors active:bg-lime/10">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime/15 text-lime">
                    <Plus className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{it.title}</span>
                    <span className="block text-[12.5px] text-mist">{it.detail}</span>
                  </span>
                  <ChevronRight className="size-5 text-lime transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Treino de hoje */}
      <motion.section {...fade(2)} className="lg:order-2 lg:flex lg:flex-col">
        <h2 className="mb-2.5 px-1 text-[12px] font-bold uppercase tracking-[0.12em] text-mist">Treino de hoje</h2>
        <button
          type="button"
          onClick={go}
          disabled={pending}
          className="group relative block w-full overflow-hidden rounded-[28px] bg-lime p-5 lg:flex lg:flex-1 lg:flex-col lg:justify-between text-left text-ink shadow-[0_24px_60px_-24px_rgba(204,255,0,0.75)] transition-transform active:scale-[0.985] sm:p-6"
        >
          <Dumbbell aria-hidden className="pointer-events-none absolute -right-6 -top-4 size-40 rotate-[-25deg] text-ink/[0.08]" strokeWidth={1.5} />
          <span className="relative flex flex-wrap gap-2">
            <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-lime">{weekday.split("-")[0]}</span>
            {p.plan && <span className="rounded-full border border-ink/25 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">{p.plan.exercises} exercícios</span>}
          </span>
          <span className="relative mt-4 flex items-end justify-between gap-4">
            <span className="min-w-0">
              <span className="type-display block truncate text-[30px] leading-none sm:text-[36px]">
                {p.openSessionId ? "Continuar treino" : p.plan ? p.plan.name : "Monte seu treino"}
              </span>
              <span className="mt-2 block text-[13px] font-medium text-ink/70">
                {p.plan ? `Treino ${p.plan.label} · ${p.plan.exercises} exercícios · ${p.plan.sets} séries` : "A IA monta um treino para você em segundos"}
              </span>
            </span>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-lime transition-transform duration-300 group-hover:scale-110">
              {pending ? <span className="size-5 animate-spin rounded-full border-2 border-lime border-t-transparent" /> : <Play className="ml-0.5 size-6 fill-lime" />}
            </span>
          </span>
        </button>
      </motion.section>

      {/* Indicadores rápidos */}
      <motion.section {...fade(3)} className="grid grid-cols-2 gap-3 lg:order-4 lg:col-span-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-line bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist">
            <Droplet className="size-3.5 fill-ice text-ice" /> Hidratação
          </p>
          <p className="mt-3">
            <span className="type-metric text-[34px] leading-none">{liters(todayMl)} L</span>
            <span className="ml-1 text-[12px] text-fog">de {liters(p.waterGoal)} L</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
            <motion.div className="h-full rounded-full bg-ice" initial={{ width: 0 }} animate={{ width: `${waterPct * 100}%` }} transition={{ duration: 0.8, ease }} />
          </div>
          <button type="button" onClick={() => drink(250)} className="mt-3 flex h-9 w-full items-center justify-center gap-1 rounded-full bg-ice/15 text-[13px] font-bold text-ice active:scale-95">
            <Plus className="size-4" /> 250 ml
          </button>
          <p className="mt-2 truncate text-[11px] text-fog">
            {lastWater ? `Último: ${new Date(lastWater.logged_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Nenhum registro hoje"}
          </p>
        </div>

        <button type="button" onClick={() => setSheet(true)} className="rounded-[24px] border border-line bg-surface p-4 text-left">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist">
            <Scale className="size-3.5 text-lime" /> Peso
          </p>
          {p.weight ? (
            <>
              <p className="mt-3 flex items-end gap-2">
                <span className="type-metric text-[34px] leading-none">{p.weight.kg.toLocaleString("pt-BR")}</span>
                <span className="pb-0.5 text-[12px] text-fog">kg</span>
              </p>
              {p.weight.delta !== null && p.weight.delta !== 0 && (
                <p className={cn("mt-2 flex items-center gap-1 text-[13px] font-bold", p.weight.delta < 0 ? "text-lime" : "text-amber")}>
                  {p.weight.delta < 0 ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                  {p.weight.delta > 0 ? "+" : ""}
                  {p.weight.delta.toLocaleString("pt-BR")} kg
                </p>
              )}
              <p className="mt-2 text-[11px] text-fog">Última pesagem · {new Date(p.weight.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-mist">Toque para registrar seu peso</p>
          )}
        </button>

        <Link href="/treinos" className="rounded-[24px] border border-line bg-surface p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist">
            <Dumbbell className="size-3.5 text-lime" /> Esta semana
          </p>
          <p className="mt-3">
            <span className="type-metric text-[34px] leading-none">{p.weekSessions}</span>
            <span className="ml-1 text-[12px] text-fog">{p.weekTarget ? `de ${p.weekTarget} treinos` : "treinos"}</span>
          </p>
          {p.weekTarget ? (
            <div className="mt-3 flex gap-1">
              {Array.from({ length: p.weekTarget }).map((_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < p.weekSessions ? "bg-lime" : "bg-raised")} />
              ))}
            </div>
          ) : null}
        </Link>

        <Link href="/evolucao/ao-vivo" className="relative overflow-hidden rounded-[24px] border border-lime/30 bg-[linear-gradient(160deg,rgba(204,255,0,0.14),transparent_70%)] p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-lime">
            <ScanFace className="size-3.5" /> Avaliação IA
          </p>
          <p className="mt-3 text-[15px] font-semibold leading-snug">Análise da postura pela câmera, ao vivo</p>
          <p className="mt-2 flex items-center gap-1 text-[12.5px] font-bold text-lime">
            Abrir <ArrowUpRight className="size-4" />
          </p>
        </Link>
      </motion.section>

      {/* Botão de registro rápido */}
      <motion.button
        type="button"
        onClick={() => setSheet(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.4 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-lime pl-5 pr-6 text-[15px] font-bold text-ink shadow-[0_14px_40px_-10px_rgba(204,255,0,0.85)] lg:bottom-8 lg:right-8"
      >
        <Plus className="size-5" strokeWidth={3} /> Registro rápido
      </motion.button>

      <QuickSheet
        open={sheet}
        onClose={() => setSheet(false)}
        todayMl={todayMl}
        goal={p.waterGoal}
        onDrink={drink}
        onTrain={() => {
          setSheet(false);
          go();
        }}
        hasPlan={Boolean(p.plan || p.openSessionId)}
        lastWeight={p.weight?.kg ?? null}
        onWeight={(kg) =>
          new Promise<string | null>((resolve) =>
            start(async () => {
              const r = await logWeight(kg);
              if (r.ok) {
                setToast({ text: `Peso de ${kg.toLocaleString("pt-BR")} kg salvo` });
                setSheet(false);
                router.refresh();
              }
              resolve(r.ok ? null : r.error);
            }),
          )
        }
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed inset-x-4 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-line bg-raised px-4 py-3 text-[14px] shadow-2xl lg:bottom-28"
            role="status"
          >
            <span>{toast.text}</span>
            {toast.undoId && (
              <button type="button" onClick={() => undo(toast.undoId!)} className="font-bold text-lime">
                Desfazer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickSheet({
  open,
  onClose,
  todayMl,
  goal,
  onDrink,
  onTrain,
  hasPlan,
  lastWeight,
  onWeight,
}: {
  open: boolean;
  onClose: () => void;
  todayMl: number;
  goal: number;
  onDrink: (ml: number) => void;
  onTrain: () => void;
  hasPlan: boolean;
  lastWeight: number | null;
  onWeight: (kg: number) => Promise<string | null>;
}) {
  const [kg, setKg] = useState(lastWeight ? String(lastWeight).replace(".", ",") : "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function saveWeight() {
    const v = Number(kg.replace(",", "."));
    if (!v) return setErr("Digite seu peso, ex.: 72,5");
    setSaving(true);
    setErr(await onWeight(v));
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Registro rápido"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[32px] border border-line bg-graphite px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-line-strong" />
            <div className="mt-4 flex items-center justify-between">
              <h2 className="type-display text-[24px]">Registro rápido</h2>
              <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full bg-raised">
                <X className="size-4" />
              </button>
            </div>

            <section className="mt-5 rounded-[22px] bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-semibold">
                  <Droplet className="size-4 fill-ice text-ice" /> Água
                </p>
                <p className="text-[13px] text-mist">
                  {liters(todayMl)} de {liters(goal)} L hoje
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[250, 500, 750].map((ml) => (
                  <motion.button
                    key={ml}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onDrink(ml)}
                    className="h-12 rounded-2xl bg-ice/15 text-[15px] font-bold text-ice"
                  >
                    +{ml} ml
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="mt-3 rounded-[22px] bg-surface p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Scale className="size-4 text-lime" /> Peso de hoje
              </p>
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <input
                    inputMode="decimal"
                    value={kg}
                    onChange={(e) => setKg(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 6))}
                    placeholder="72,5"
                    aria-label="Peso em quilos"
                    className="h-12 w-full rounded-2xl border border-line bg-graphite px-4 pr-10 text-[17px] font-semibold focus:border-lime/60 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-fog">kg</span>
                </div>
                <button type="button" onClick={saveWeight} disabled={saving} className="h-12 rounded-2xl bg-lime px-5 font-bold text-ink disabled:opacity-50">
                  {saving ? "…" : "Salvar"}
                </button>
              </div>
              {err && <p className="mt-2 text-[13px] text-coral">{err}</p>}
            </section>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={onTrain} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-lime font-bold text-ink">
                <Play className="size-4 fill-ink" /> {hasPlan ? "Treinar agora" : "Montar treino"}
              </button>
              <Link href="/evolucao/ao-vivo" onClick={onClose} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-semibold">
                <Video className="size-4 text-lime" /> Avaliação IA
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
