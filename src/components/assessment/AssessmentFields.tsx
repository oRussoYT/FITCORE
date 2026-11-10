"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/Field";
import { BODY_FAT_METHODS } from "@/lib/domain/labels";
import { MEASUREMENT_FIELDS } from "@/lib/validation/assessment";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
};

function errorAt(errors: FieldErrors<any>, path: string): string | undefined {
  const parts = path.split(".");
  let cur: any = errors;
  for (const p of parts) cur = cur?.[p];
  return typeof cur?.message === "string" ? cur.message : undefined;
}

/** Circunferências corporais, todas opcionais. */
export function MeasurementFields({ register, errors }: Props) {
  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">Circunferências</legend>
      <p className="mt-1 text-[13px] text-mist">Fita métrica, em centímetros. Preencha só o que você mediu.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MEASUREMENT_FIELDS.map((f) => (
          <Input
            key={f.site}
            label={f.label}
            inputMode="decimal"
            suffix="cm"
            error={errorAt(errors, `measurements.${f.site}`)}
            {...register(`measurements.${f.site}`)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Composição corporal: só aceita valores com método de medição. */
export function CompositionFields({ register, errors }: Props) {
  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">Composição corporal</legend>
      <p className="mt-1 text-[13px] leading-relaxed text-mist">
        Opcional. Informe apenas se foi medida por um método adequado — não estimamos esses valores por foto ou por
        palpite.
      </p>
      <datalist id="bf-methods">
        {BODY_FAT_METHODS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Gordura corporal" inputMode="decimal" suffix="%" error={errorAt(errors, "bodyFatPct")} {...register("bodyFatPct")} />
        <Input
          label="Como foi medida"
          list="bf-methods"
          placeholder="Ex.: Bioimpedância"
          error={errorAt(errors, "bodyFatMethod")}
          {...register("bodyFatMethod")}
        />
        <Input label="Massa muscular" inputMode="decimal" suffix="kg" error={errorAt(errors, "muscleMassKg")} {...register("muscleMassKg")} />
        <Input
          label="Como foi medida"
          list="bf-methods"
          placeholder="Ex.: DEXA"
          error={errorAt(errors, "muscleMassMethod")}
          {...register("muscleMassMethod")}
        />
      </div>
    </fieldset>
  );
}
