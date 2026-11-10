"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { CompositionFields, MeasurementFields } from "@/components/assessment/AssessmentFields";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Notice } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { FOOD_RESTRICTIONS, GOAL_HINTS, GOAL_LABELS, LEVEL_HINTS, LEVEL_LABELS } from "@/lib/domain/labels";
import type { ActionResult } from "@/lib/validation/common";
import {
  availabilitySchema,
  firstAssessmentSchema,
  foodSchema,
  ONBOARDING_STEPS,
  personalSchema,
  physicalSchema,
} from "@/lib/validation/onboarding";
import type { ExperienceLevel, PrimaryGoal, Profile } from "@/types/db";
import {
  saveAvailability,
  saveExperience,
  saveFirstAssessment,
  saveFood,
  saveGoal,
  savePersonal,
  savePhysical,
} from "./actions";

type StepProps = { profile: Profile; initialWeight: number | null; onDone: () => void };

function applyServerErrors<T extends FieldValues>(res: ActionResult, setError: UseFormSetError<T>): string | null {
  if (res.ok) return null;
  for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) setError(k as Path<T>, { message: msg });
  return res.error;
}

export function OnboardingFlow({ profile, initialWeight }: { profile: Profile; initialWeight: number | null }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(profile.onboarding_step, ONBOARDING_STEPS.length - 1));
  const [direction, setDirection] = useState(1);

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    if (step === ONBOARDING_STEPS.length - 1) {
      router.replace("/dashboard?bemvindo=1");
      router.refresh();
      return;
    }
    router.refresh();
    go(step + 1);
  }

  const props: StepProps = { profile, initialWeight, onDone: next };
  const current = ONBOARDING_STEPS[step];

  return (
    <div>
      <ol className="flex gap-1.5" aria-label="Progresso do cadastro">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.key} className="flex-1">
            <span className="sr-only">
              Passo {i + 1}: {s.title} {i < step ? "(concluído)" : i === step ? "(atual)" : ""}
            </span>
            <span
              aria-hidden
              className={cn("block h-1 rounded-full transition-colors duration-500", i < step ? "bg-lime" : i === step ? "bg-bone" : "bg-line")}
            />
          </li>
        ))}
      </ol>
      <div className="mt-6 flex items-center justify-between text-[13px] text-fog">
        <span>
          Passo {step + 1} de {ONBOARDING_STEPS.length} · {current?.title}
        </span>
        {step > 0 && (
          <button type="button" onClick={() => go(step - 1)} className="inline-flex items-center gap-1 text-mist hover:text-bone">
            <ArrowLeft className="size-3.5" /> Voltar
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.section
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          {step === 0 && <PersonalStep {...props} />}
          {step === 1 && <GoalStep {...props} />}
          {step === 2 && <ExperienceStep {...props} />}
          {step === 3 && <AvailabilityStep {...props} />}
          {step === 4 && <PhysicalStep {...props} />}
          {step === 5 && <FoodStep {...props} />}
          {step === 6 && <FirstAssessmentStep {...props} />}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function StepTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="type-display text-[30px] sm:text-[36px]">{title}</h1>
      {children && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mist">{children}</p>}
    </div>
  );
}

function PersonalStep({ profile, onDone }: StepProps) {
  const [error, setErr] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: { fullName: profile.full_name ?? "", birthDate: profile.birth_date ?? "", sex: (profile.sex ?? "") as "" | "male" | "female" },
  });
  const onSubmit = form.handleSubmit(async (v) => {
    const res = await savePersonal({ ...v, sex: v.sex ?? "" });
    const msg = applyServerErrors(res, form.setError);
    if (msg) return setErr(msg);
    onDone();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepTitle title="Vamos começar por você">Esses dados ajudam a calcular indicadores como idade e IMC.</StepTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {error && <Notice tone="error" className="sm:col-span-2">{error}</Notice>}
        <Input label="Nome" className="sm:col-span-2" error={form.formState.errors.fullName?.message} {...form.register("fullName")} />
        <Input label="Data de nascimento" type="date" error={form.formState.errors.birthDate?.message} {...form.register("birthDate")} />
        <Select
          label="Sexo biológico"
          hint="Usado apenas em fórmulas que dependem disso. Opcional."
          error={form.formState.errors.sex?.message}
          {...form.register("sex")}
        >
          <option value="">Prefiro não informar</option>
          <option value="female">Feminino</option>
          <option value="male">Masculino</option>
        </Select>
      </div>
      <StepActions loading={form.formState.isSubmitting} />
    </form>
  );
}

function GoalStep({ profile, onDone }: StepProps) {
  const [value, setValue] = useState<PrimaryGoal | null>(profile.primary_goal);
  const [error, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options = (Object.keys(GOAL_LABELS) as PrimaryGoal[]).map((k) => ({ value: k, label: GOAL_LABELS[k], hint: GOAL_HINTS[k] }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveGoal({ primaryGoal: value });
          if (!res.ok) return setErr(res.error);
          onDone();
        });
      }}
    >
      <StepTitle title="Qual é seu objetivo principal?">Ele define o que conta como progresso nos seus relatórios.</StepTitle>
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <ChoiceCards name="Objetivo" options={options} value={value} onChange={setValue} />
      <StepActions loading={pending} disabled={!value} />
    </form>
  );
}

function ExperienceStep({ profile, onDone }: StepProps) {
  const [value, setValue] = useState<ExperienceLevel | null>(profile.experience_level);
  const [error, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options = (Object.keys(LEVEL_LABELS) as ExperienceLevel[]).map((k) => ({ value: k, label: LEVEL_LABELS[k], hint: LEVEL_HINTS[k] }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveExperience({ experienceLevel: value });
          if (!res.ok) return setErr(res.error);
          onDone();
        });
      }}
    >
      <StepTitle title="Há quanto tempo você treina?" />
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <ChoiceCards name="Experiência" options={options} value={value} onChange={setValue} columns={1} />
      <StepActions loading={pending} disabled={!value} />
    </form>
  );
}

function AvailabilityStep({ profile, onDone }: StepProps) {
  const [error, setErr] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { weeklyAvailability: profile.weekly_availability ?? 3, sessionMinutes: profile.session_minutes ?? 60 },
  });
  const days = Number(form.watch("weeklyAvailability")) || 0;
  const onSubmit = form.handleSubmit(async (v) => {
    const msg = applyServerErrors(await saveAvailability(v), form.setError);
    if (msg) return setErr(msg);
    onDone();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepTitle title="Quantos dias por semana você pode treinar?">Seja realista: constância vale mais que intensidade.</StepTitle>
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <div role="radiogroup" aria-label="Dias por semana" className="grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={days === d}
            onClick={() => form.setValue("weeklyAvailability", d, { shouldValidate: true })}
            className={cn(
              "type-metric h-16 rounded-xl border text-[26px] transition-colors",
              days === d ? "border-lime bg-lime text-ink" : "border-line bg-surface text-bone hover:border-line-strong",
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="mt-6 max-w-xs">
        <Input
          label="Tempo disponível por treino"
          inputMode="numeric"
          suffix="min"
          error={form.formState.errors.sessionMinutes?.message}
          {...form.register("sessionMinutes")}
        />
      </div>
      <StepActions loading={form.formState.isSubmitting} />
    </form>
  );
}

function PhysicalStep({ profile, initialWeight, onDone }: StepProps) {
  const [error, setErr] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(physicalSchema),
    defaultValues: {
      heightCm: profile.height_cm ?? ("" as unknown as number),
      weightKg: initialWeight ?? ("" as unknown as number),
      consentHealth: (Boolean(profile.consent_health_data_at) || undefined) as true,
    },
  });
  const onSubmit = form.handleSubmit(async (v) => {
    const msg = applyServerErrors(await savePhysical(v), form.setError);
    if (msg) return setErr(msg);
    onDone();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepTitle title="Seus dados físicos de hoje">
        Esse será o ponto de partida. Todo gráfico de evolução compara com o que você registrar aqui.
      </StepTitle>
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Altura" inputMode="decimal" suffix="cm" error={form.formState.errors.heightCm?.message} {...form.register("heightCm")} />
        <Input label="Peso" inputMode="decimal" suffix="kg" error={form.formState.errors.weightKg?.message} {...form.register("weightKg")} />
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-[13.5px] leading-relaxed text-mist">
        <input type="checkbox" className="mt-1 size-4 accent-[#c8f03c]" {...form.register("consentHealth")} />
        <span>
          <span className="font-semibold text-bone">Autorizo guardar meus dados corporais</span> para acompanhar minha evolução.
          Só eu e o personal vinculado a mim podemos vê-los. Posso pedir a exclusão a qualquer momento.
        </span>
      </label>
      {form.formState.errors.consentHealth && <p className="mt-2 text-[12.5px] text-coral">{form.formState.errors.consentHealth.message}</p>}
      <StepActions loading={form.formState.isSubmitting} />
    </form>
  );
}

function FoodStep({ profile, onDone }: StepProps) {
  const [error, setErr] = useState<string | null>(null);
  const prefs = profile.food_preferences ?? {};
  const form = useForm({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      restrictions: prefs.restrictions ?? [],
      dislikes: prefs.dislikes ?? "",
      mealsPerDay: (prefs.meals_per_day ?? "") as unknown as number,
    },
  });
  const selected = form.watch("restrictions");
  function toggle(v: string) {
    const set = new Set(selected);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    form.setValue("restrictions", [...set]);
  }
  const onSubmit = form.handleSubmit(async (v) => {
    const msg = applyServerErrors(await saveFood(v), form.setError);
    if (msg) return setErr(msg);
    onDone();
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepTitle title="Como você prefere se alimentar?">
        Usado para sugestões gerais. Planos alimentares individualizados devem ser feitos por nutricionista.
      </StepTitle>
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <p className="text-[13px] font-medium text-bone/90">Restrições ou escolhas</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {FOOD_RESTRICTIONS.map((r) => {
          const on = selected.includes(r.value);
          return (
            <button
              key={r.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(r.value)}
              className={cn(
                "h-9 rounded-full border px-4 text-[13.5px] transition-colors",
                on ? "border-lime/70 bg-lime/10 text-bone" : "border-line text-mist hover:border-line-strong hover:text-bone",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_200px]">
        <Textarea label="Alimentos que você não come" placeholder="Ex.: fígado, coentro" error={form.formState.errors.dislikes?.message} {...form.register("dislikes")} />
        <Input label="Refeições por dia" inputMode="numeric" error={form.formState.errors.mealsPerDay?.message} {...form.register("mealsPerDay")} />
      </div>
      <StepActions loading={form.formState.isSubmitting} />
    </form>
  );
}

function FirstAssessmentStep({ onDone }: StepProps) {
  const [error, setErr] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(firstAssessmentSchema),
    defaultValues: { skip: false, measurements: {} as Record<string, number> },
  });
  async function submit(skip: boolean) {
    form.setValue("skip", skip);
    await form.handleSubmit(async (v) => {
      const msg = applyServerErrors(await saveFirstAssessment({ ...v, skip }), form.setError);
      if (msg) return setErr(msg);
      onDone();
    })();
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
      noValidate
    >
      <StepTitle title="Primeira avaliação">
        Com uma fita métrica, meça as regiões abaixo. Quanto mais completo, mais precisa fica a comparação no futuro.
      </StepTitle>
      {error && <Notice tone="error" className="mb-4">{error}</Notice>}
      <div className="space-y-8">
        <MeasurementFields register={form.register} errors={form.formState.errors} />
        <CompositionFields register={form.register} errors={form.formState.errors} />
      </div>
      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => void submit(true)} disabled={form.formState.isSubmitting}>
          Medir depois
        </Button>
        <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
          Concluir cadastro
        </Button>
      </div>
    </form>
  );
}

function StepActions({ loading, disabled }: { loading?: boolean; disabled?: boolean }) {
  return (
    <div className="mt-10 flex justify-end">
      <Button type="submit" size="lg" loading={loading} disabled={disabled}>
        Continuar
      </Button>
    </div>
  );
}
