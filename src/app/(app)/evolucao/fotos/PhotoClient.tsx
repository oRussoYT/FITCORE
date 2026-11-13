"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { getBrowserClient } from "@/lib/supabase/client";
import { registerPhoto, setPhotoConsent } from "./actions";

const POSES = [
  ["front", "Frente"],
  ["back", "Costas"],
  ["left", "Lateral esquerda"],
  ["right", "Lateral direita"],
] as const;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Reduz a foto para no máximo 1600 px (envio mais rápido) e remove metadados como localização. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha"))), "image/jpeg", 0.85));
}

export function ConsentPanel({ photos, ai, provider, privacy }: { photos: boolean; ai: boolean; provider: string; privacy: string }) {
  const router = useRouter();
  const [p, setP] = useState(photos);
  const [a, setA] = useState(ai);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-lime" />
        <h2 className="text-[15px] font-semibold">Suas autorizações</h2>
      </div>
      <div className="mt-4 space-y-3 text-[14px] leading-relaxed">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-[#ccff00]" checked={p} onChange={(e) => setP(e.target.checked)} />
          <span>
            <b>Guardar minhas fotos corporais</b> em área privada. Só eu e o personal vinculado a mim podemos vê-las — nem a
            academia. Posso apagá-las quando quiser.
          </span>
        </label>
        <label className={cn("flex items-start gap-3", !p && "opacity-50")}>
          <input type="checkbox" className="mt-1 size-4 accent-[#ccff00]" checked={a && p} disabled={!p} onChange={(e) => setA(e.target.checked)} />
          <span>
            <b>Enviar as fotos para análise da IA</b> (serviço: {provider}. {privacy}) A IA descreve postura e
            mudanças visíveis; não estima gordura, massa muscular nem faz diagnóstico.
          </span>
        </label>
      </div>
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      <Button
        className="mt-4"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await setPhotoConsent({ photos: p, ai: a && p });
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
      >
        Salvar autorizações
      </Button>
    </section>
  );
}

export function Uploader({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [takenOn, setTakenOn] = useState(today());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(pose: string, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg({ tone: "error", text: "Envie uma imagem (JPG, PNG ou WEBP)." });
    setBusy(pose);
    setMsg(null);
    try {
      const blob = await shrink(file);
      const path = `${studentId}/${crypto.randomUUID()}.jpg`;
      const { error } = await getBrowserClient().storage.from("body-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const r = await registerPhoto({ path, pose, takenOn });
      if (!r.ok) throw new Error(r.error);
      setMsg({ tone: "success", text: "Foto enviada." });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold">Enviar fotos</h2>
          <p className="mt-1 max-w-lg text-[13px] text-mist">
            Mesmo lugar, mesma luz e mesma distância a cada vez. Roupa justa ou de banho, corpo inteiro no quadro.
          </p>
        </div>
        <div className="w-44">
          <Input label="Data das fotos" type="date" value={takenOn} max={today()} onChange={(e) => setTakenOn(e.target.value)} />
        </div>
      </div>
      {msg && <Notice tone={msg.tone} className="mt-4">{msg.text}</Notice>}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {POSES.map(([pose, label]) => (
          <div key={pose}>
            <input
              ref={(el) => {
                inputs.current[pose] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void upload(pose, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => inputs.current[pose]?.click()}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-mist transition-colors hover:border-lime hover:text-bone disabled:opacity-50"
            >
              <Camera className="size-6" />
              <span className="text-[13px] font-medium">{busy === pose ? "Enviando…" : label}</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export type PhotoReport = { id: string; created_at: string; content: Record<string, unknown> };

export function AnalyzeButton({ enabled, reason }: { enabled: boolean; reason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        size="lg"
        loading={busy}
        disabled={!enabled}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/ai/fotos", { method: "POST" });
            const json = (await res.json()) as { error?: string };
            if (!res.ok) setError(json.error ?? "Não foi possível analisar.");
            else router.refresh();
          } catch {
            setError("Falha de conexão. Tente de novo.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles className="size-4" /> {busy ? "Analisando suas fotos…" : "Analisar com IA"}
      </Button>
      {!enabled && reason && <p className="mt-2 text-[13px] text-fog">{reason}</p>}
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </div>
  );
}

/** Compara duas fotos arrastando a divisória (antes ⟷ depois). */
export function BeforeAfter({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md select-none overflow-hidden rounded-2xl bg-graphite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={`Depois: ${afterLabel}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`Antes: ${beforeLabel}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-lime shadow-[0_0_12px_rgba(204,255,0,0.8)]" style={{ left: `${pos}%` }} />
      <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[12px]">{beforeLabel}</span>
      <span className="absolute right-3 top-3 rounded-full bg-lime px-2.5 py-1 text-[12px] font-semibold text-ink">{afterLabel}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Arraste para comparar antes e depois"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
