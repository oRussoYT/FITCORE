import "server-only";

/**
 * Integração com IA — roda só no servidor. As chaves ficam em variáveis de ambiente da Vercel:
 *   AI_PROVIDER=gemini | anthropic | openai   (opcional; sem ele, usa a primeira chave encontrada,
 *                                              começando pelo Gemini, que tem plano gratuito)
 *   GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY
 *   GEMINI_MODEL (opcional, padrão gemini-flash-latest) / AI_MODEL (Anthropic/OpenAI, opcional)
 */

export type ProviderId = "gemini" | "anthropic" | "openai";

export function activeProvider(): ProviderId {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (p === "gemini" || p === "anthropic" || p === "openai") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "gemini";
}

/** Nome do serviço e aviso de privacidade mostrados ao aluno antes de autorizar o envio de fotos. */
export function providerInfo(id: ProviderId = activeProvider()) {
  if (id === "gemini")
    return {
      id,
      name: "Google Gemini",
      privacy: "No plano gratuito do Google, o conteúdo enviado pode ser usado pelo Google para melhorar os produtos dele.",
    };
  if (id === "openai") return { id, name: "OpenAI", privacy: "Usado só para gerar o relatório." };
  return { id, name: "Anthropic (Claude)", privacy: "Usado só para gerar o relatório." };
}

/** Versão registrada no consentimento: liga a autorização ao serviço de IA que o aluno aceitou. */
export const consentVersion = (id: ProviderId = activeProvider()) => `ia:${id}`;

/** O consentimento salvo vale para o serviço atual? (Os antigos, sem serviço, eram da Anthropic.) */
export function consentMatches(version: string | null | undefined, id: ProviderId = activeProvider()) {
  if (!version) return false;
  if (version.startsWith("ia:")) return version === `ia:${id}`;
  return id === "anthropic";
}

export type AiImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string; label: string };
export type AiRequest = { system: string; text: string; images?: AiImage[]; maxTokens?: number };
export type AiResult = { ok: true; text: string; provider: string; model: string } | { ok: false; error: string; status: number };

/** Traduz o erro do serviço de IA para uma mensagem clara (sem expor detalhes técnicos ao aluno). */
export function aiErrorMessage(status: number, body: string): string {
  const b = body.toLowerCase();
  if (status === 401 || b.includes("api_key_invalid")) return "Chave da IA inválida. O administrador precisa conferir a chave na Vercel.";
  if (b.includes("credit balance") || b.includes("insufficient_quota") || b.includes("billing"))
    return "A IA está temporariamente sem créditos. Avise o administrador do FITCORE — assim que for recarregada, volta a funcionar.";
  if (status === 429 || b.includes("resource_exhausted"))
    return "O limite gratuito da IA foi atingido por agora. Espere alguns minutos (ou até amanhã) e tente de novo.";
  if (status === 529 || b.includes("overloaded")) return "O serviço de IA está sobrecarregado agora. Tente novamente em alguns minutos.";
  if (status === 413 || b.includes("too large") || b.includes("image exceeds")) return "As fotos ficaram grandes demais para a análise. Tente fotos menores.";
  if (b.includes("model") && (status === 404 || b.includes("not_found"))) return "O modelo de IA configurado não existe. O administrador precisa conferir o AI_MODEL na Vercel.";
  return "O serviço de IA não conseguiu concluir a análise agora. Tente novamente em instantes.";
}

export function aiConfigured(): boolean {
  const p = activeProvider();
  if (p === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (p === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function callAI(req: AiRequest): Promise<AiResult> {
  const provider = activeProvider();
  try {
    if (provider === "gemini") return await callGemini(req);
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

async function callGemini(req: AiRequest): Promise<AiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "A IA ainda não foi configurada (falta GEMINI_API_KEY na Vercel).", status: 503 };
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts: unknown[] = [];
  for (const img of req.images ?? []) {
    parts.push({ text: img.label });
    parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
  }
  parts.push({ text: req.text });

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { maxOutputTokens: Math.max(req.maxTokens ?? 1800, 8192), responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[ai] gemini", res.status, body.slice(0, 500));
    if (res.status === 400 && body.includes("API_KEY_INVALID")) return { ok: false, error: aiErrorMessage(401, body), status: 502 };
    if (res.status === 403) return { ok: false, error: "A chave do Gemini não tem permissão. Gere uma nova no Google AI Studio.", status: 502 };
    return { ok: false, error: aiErrorMessage(res.status, body), status: 502 };
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };
  const cand = json.candidates?.[0];
  if (json.promptFeedback?.blockReason || cand?.finishReason === "SAFETY" || cand?.finishReason === "PROHIBITED_CONTENT") {
    console.error("[ai] gemini bloqueou", json.promptFeedback?.blockReason ?? cand?.finishReason);
    return { ok: false, error: "A IA não aceitou analisar este conteúdo. Tente outra foto, com roupa de treino e boa luz.", status: 422 };
  }
  const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  if (!text) {
    console.error("[ai] gemini vazio", cand?.finishReason);
    return { ok: false, error: "A IA não devolveu resposta. Tente novamente.", status: 502 };
  }
  return { ok: true, text, provider: "gemini", model };
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
