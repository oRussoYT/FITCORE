"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Field";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain/labels";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/db";
import { setAvatar, updateProfile } from "./actions";

/** Recorta no centro e reduz para 512×512 (remove localização e outros metadados). */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 512, 512);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("falha"))), "image/jpeg", 0.88));
}

export function AvatarPicker({ userId, url, initials }: { userId: string; url: string | null; initials: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Escolha uma imagem.");
    setBusy(true);
    setError(null);
    try {
      const blob = await squareJpeg(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const up = await getBrowserClient().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const r = await setAvatar(path);
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative size-28 overflow-hidden rounded-[32px] border-2 border-line bg-raised ring-lime/0 transition hover:ring-4 hover:ring-lime/30"
        aria-label="Trocar foto de perfil"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[34px] font-bold" style={{ fontStretch: "112%" }}>
            {initials}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      <span className="text-[12px] text-fog">{busy ? "Enviando…" : "Toque para trocar"}</span>
      {error && <span className="text-[12px] text-coral">{error}</span>}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [v, setV] = useState({
    fullName: profile.full_name ?? "",
    heightCm: profile.height_cm != null ? String(profile.height_cm) : "",
    primaryGoal: profile.primary_goal ?? "health",
    experienceLevel: profile.experience_level ?? "beginner",
    weeklyAvailability: profile.weekly_availability != null ? String(profile.weekly_availability) : "",
    sessionMinutes: profile.session_minutes != null ? String(profile.session_minutes) : "",
  });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProfile(v);
          setMsg(r.ok ? { tone: "success", text: "Dados salvos." } : { tone: "error", text: r.error });
        });
      }}
    >
      {msg && <Notice tone={msg.tone} className="sm:col-span-2">{msg.text}</Notice>}
      <Input label="Nome" className="sm:col-span-2" value={v.fullName} onChange={set("fullName")} />
      <Select label="Objetivo principal" value={v.primaryGoal} onChange={set("primaryGoal")}>
        {Object.entries(GOAL_LABELS).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </Select>
      <Select label="Nível" value={v.experienceLevel} onChange={set("experienceLevel")}>
        {Object.entries(LEVEL_LABELS).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </Select>
      <Input label="Altura" inputMode="decimal" suffix="cm" value={v.heightCm} onChange={set("heightCm")} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Dias/semana" inputMode="numeric" value={v.weeklyAvailability} onChange={set("weeklyAvailability")} />
        <Input label="Min/treino" inputMode="numeric" value={v.sessionMinutes} onChange={set("sessionMinutes")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
