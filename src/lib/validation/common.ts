import { z } from "zod";

/** Aceita "72,5" ou "72.5"; campo vazio vira undefined. */
export function optionalNumber(min: number, max: number, label = "Valor") {
  return z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isNaN(n) ? v : n;
    },
    z
      .number({ invalid_type_error: `${label}: digite apenas números.` })
      .min(min, `${label}: mínimo ${min}.`)
      .max(max, `${label}: máximo ${max}.`)
      .optional(),
  );
}

export function requiredNumber(min: number, max: number, label = "Valor") {
  return z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isNaN(n) ? v : n;
    },
    z
      .number({ required_error: `Informe ${label.toLowerCase()}.`, invalid_type_error: `${label}: digite apenas números.` })
      .min(min, `${label}: mínimo ${min}.`)
      .max(max, `${label}: máximo ${max}.`),
  );
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
