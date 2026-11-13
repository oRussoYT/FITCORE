import { NextResponse } from "next/server";
import { aiConfigured, callAI, consentMatches, parseJsonBlock, providerInfo, type AiImage } from "@/lib/ai/provider";
import { PHOTO_SYSTEM } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const POSE = { front: "frente", back: "costas", left: "lateral esquerda", right: "lateral direita" } as Record<string, string>;
const DAILY_LIMIT = 5;

/** Análise visual das fotos mais recentes do aluno (e comparação com a data anterior). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

  const [{ data: student }, { data: profile }, { data: consent }] = await Promise.all([
    supabase.from("students").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("consent_photos_at").eq("id", user.id).maybeSingle(),
    supabase.from("consent_records").select("granted, version").eq("user_id", user.id).eq("consent_type", "ai_analysis").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!student) return NextResponse.json({ error: "Complete seu cadastro primeiro." }, { status: 400 });
  if (!profile?.consent_photos_at || !consent?.granted || !consentMatches(consent.version)) {
    return NextResponse.json(
      { error: `Autorize o envio das fotos para a IA (${providerInfo().name}) na página de fotos antes de continuar.` },
      { status: 403 },
    );
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "A análise por IA ainda não foi ativada pelo administrador do sistema." }, { status: 503 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("body_analysis_reports")
    .select("id", { count: "exact", head: true })
    .eq("student_id", student.id)
    .eq("kind", "photo")
    .gte("created_at", today.toISOString());
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: `Limite de ${DAILY_LIMIT} análises por dia atingido.` }, { status: 429 });

  const { data: photos } = await supabase
    .from("body_photos")
    .select("id, storage_path, pose, taken_at")
    .eq("student_id", student.id)
    .order("taken_at", { ascending: false })
    .limit(24);
  const list = (photos ?? []) as Array<{ id: string; storage_path: string; pose: string; taken_at: string }>;
  if (list.length === 0) return NextResponse.json({ error: "Envie pelo menos uma foto." }, { status: 400 });

  const dayOf = (iso: string) => iso.slice(0, 10);
  const dates = [...new Set(list.map((p) => dayOf(p.taken_at)))];
  const latest = list.filter((p) => dayOf(p.taken_at) === dates[0]).slice(0, 4);
  const previous = dates[1] ? list.filter((p) => dayOf(p.taken_at) === dates[1]).slice(0, 4) : [];
  const chosen = [...previous, ...latest];

  const images: AiImage[] = [];
  for (const p of chosen) {
    const { data: blob, error } = await supabase.storage.from("body-photos").download(p.storage_path);
    if (error || !blob) continue;
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const type = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
    images.push({ mediaType: type, base64, label: `Foto de ${new Date(p.taken_at).toLocaleDateString("pt-BR")} — ${POSE[p.pose] ?? p.pose}` });
  }
  if (images.length === 0) return NextResponse.json({ error: "Não foi possível ler as fotos." }, { status: 500 });

  const ai = await callAI({
    system: PHOTO_SYSTEM,
    text: previous.length
      ? `Compare as fotos de ${new Date(dates[1]!).toLocaleDateString("pt-BR")} com as de ${new Date(dates[0]!).toLocaleDateString("pt-BR")}.`
      : "Há fotos de uma única data. Faça a análise visual inicial (sem comparação).",
    images,
  });
  if (!ai.ok) return NextResponse.json({ error: ai.error }, { status: ai.status });

  const content = parseJsonBlock<Record<string, unknown>>(ai.text) ?? { resumo: ai.text };
  const { data: report, error } = await supabase
    .from("body_analysis_reports")
    .insert({
      student_id: student.id,
      kind: "photo",
      provider: ai.provider,
      model: ai.model,
      content,
      input_snapshot: { photo_ids: chosen.map((p) => p.id), dates: dates.slice(0, 2) },
    })
    .select("id, content, created_at")
    .single();
  if (error) return NextResponse.json({ error: "A análise foi feita, mas não pôde ser salva." }, { status: 500 });

  await supabase.from("notifications").insert({
    user_id: user.id,
    kind: "report_ready",
    title: "Sua análise por foto está pronta",
    link: "/evolucao/fotos",
  });
  return NextResponse.json({ report });
}
