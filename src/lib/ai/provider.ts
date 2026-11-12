import "server-only";

/**
 * Integração com IA — roda só no servidor. As chaves ficam em variáveis de ambiente da Vercel:
 *   AI_PROVIDER=anthropic | openai   (padrão: anthropic)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 *   AI_MODEL (opcional)
 */

export type AiImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string; label: string };
export type AiRequest = { system: string; text: string; images?: AiImage[]; maxTokens?: number };
export type AiResult = { ok: true; text: string; provider: string; model: string } | { ok: false; error: string; status: number };

/** Traduz o erro do serviço de IA para uma mensagem clara (sem expor detalhes técnicos ao aluno). */
export function aiErrorMessage(status: number, body: string): string {
  const b = body.toLowerCase();
  if (status === 401) return "Chave da IA inválida. O administrador precisa conferir a chave na Vercel.";
  if (b.includes("credit balance") || b.includes("insufficient_quota") || b.includes("billing"))
    return "A IA está temporariamente sem créditos. Avise o administrador do FITCORE — assim que for recarregada, volta a funcionar.";
  if (status === 429) return "Muitas análises ao mesmo tempo. Espere um minuto e tente de novo.";
  if (status === 529 || b.includes("overloaded")) return "O serviço de IA está sobrecarregado agora. Tente novamente em alguns minutos.";
  if (status === 413 || b.includes("too large") || b.includes("image exceeds")) return "As fotos ficaram grandes demais para a análise. Tente fotos menores.";
  if (b.includes("model") && (status === 404 || b.includes("not_found"))) return "O modelo de IA configurado não existe. O administrador precisa conferir o AI_MODEL na Vercel.";
  return "O serviço de IA não conseguiu concluir a análise agora. Tente novamente em instantes.";
}

export function aiConfigured(): boolean {
  const p = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  return p === "openai" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function callAI(req: AiRequest): Promise<AiResult> {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  try {
    if (provider === "openai") return await callOpenAI(req);
    return await callAnthropic(req);
  } catch (e) {
    console.error("[ai]", e);
    return { ok: false, error: "O serviço de IA não respondeu. Tente novamente em instantes.", status: 502 };
  }
}

async function callAnthropic(req: AiRequest): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "A IA ainda não foi configurada (falta ANTHROPIC_API_KEY na Vercel).", status: 503 };
  const model = process.env.AI_MODEL || "claude-sonnet-5-5";
  const content: unknown[] = [];
  for (const img of req.images ?? []) {
    content.push({ type: "text", text: img.label });
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
  }
  content.push({ type: "text", text: req.text });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: req.maxTokens ?? 1800, system: req.system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[ai] anthropic", res.status, body.slice(0, 500));
    return { ok: false, error: aiErrorMessage(res.status, body), status: 502 };
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  return { ok: true, text, provider: "anthropic", model };
}

async function callOpenAI(req: AiRequest): Promise<AiResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "A IA ainda não foi configurada (falta OPENAI_API_KEY na Vercel).", status: 503 };
  const model = process.env.AI_MODEL || "gpt-4o";
  const content: unknown[] = [];
  for (const img of req.images ?? []) {
    content.push({ type: "text", text: img.label });
    content.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
  }
  content.push({ type: "text", text: req.text });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 1800,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[ai] openai", res.status, body.slice(0, 500));
    return { ok: false, error: aiErrorMessage(res.status, body), status: 502 };
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return { ok: true, text: json.choices?.[0]?.message?.content ?? "", provider: "openai", model };
}

/** Extrai o primeiro objeto JSON da resposta da IA. */
export function parseJsonBlock<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
