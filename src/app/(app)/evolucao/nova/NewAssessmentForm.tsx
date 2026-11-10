"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CompositionFields, MeasurementFields } from "@/components/assessment/AssessmentFields";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { assessmentSchema } from "@/lib/validation/assessment";
import { createAssessment } from "../actions";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewAssessmentForm({ defaultHeight }: { defaultHeight: number | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      assessedOn: today(),
      source: "self" as const,
      weightKg: "",
      heightCm: defaultHeight ?? "",
      notes: "",
      measurements: {},
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const res = await createAssessment(values);
    if (!res.ok) {
      for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) form.setError(k as never, { message: msg });
      setError(res.error);
      return;
    }
    router.push("/evolucao?salva=1");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-10">
      {error && <Notice tone="error">{error}</Notice>}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-[15px] font-semibold">Dados gerais</legend>
        <Input label="Data da avaliação" type="date" max={today()} error={errors.assessedOn?.message} {...form.register("assessedOn")} />
        <Select label="Quem mediu" error={errors.source?.message} {...form.register("source")}>
          <option value="self">Eu mesmo</option>
          <option value="professional">Profissional (personal, nutricionista)</option>
          <option value="import">Importada de outro sistema</option>
        </Select>
        <Input label="Peso" inputMode="decimal" suffix="kg" error={errors.weightKg?.message} {...form.register("weightKg")} />
        <Input label="Altura" inputMode="decimal" suffix="cm" error={errors.heightCm?.message} {...form.register("heightCm")} />
      </fieldset>
      <MeasurementFields register={form.register} errors={errors} />
      <CompositionFields register={form.register} errors={errors} />
      <Textarea label="Observações" placeholder="Como você está se sentindo, mudanças na rotina, etc." error={errors.notes?.message} {...form.register("notes")} />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Salvar avaliação
        </Button>
      </div>
    </form>
  );
}
