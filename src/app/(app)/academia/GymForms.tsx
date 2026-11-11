"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Field";
import { assignPlan, createGym, inviteMember, savePlan, setTrainerLink } from "./actions";

function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return {
    pending,
    msg,
    run(fn: () => Promise<{ ok: boolean; error?: string }>, success?: string, after?: () => void) {
      start(async () => {
        try {
          const r = await fn();
          if (r.ok) {
            setMsg(success ? { tone: "success", text: success } : null);
            after?.();
          } else setMsg({ tone: "error", text: r.error ?? "Não foi possível concluir." });
        } catch {
          setMsg({ tone: "error", text: "Falha de conexão. Tente de novo." });
        }
      });
    },
  };
}

export function CreateGymForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const a = useAction();
  return (
    <form
      className="mt-8 max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => createGym({ name }), undefined, () => router.refresh());
      }}
    >
      {a.msg && <Notice tone={a.msg.tone}>{a.msg.text}</Notice>}
      <Input label="Nome da academia" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      <Button type="submit" size="lg" loading={a.pending}>
        Criar academia
      </Button>
    </form>
  );
}

export function InviteForm({ defaultRole = "student" }: { defaultRole?: "student" | "trainer" }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "trainer">(defaultRole);
  const a = useAction();
  return (
    <form
      className="panel grid gap-3 p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => inviteMember({ email, role }), "Convite criado. A pessoa verá o convite ao entrar no FITCORE com esse e-mail.", () => setEmail(""));
      }}
    >
      <Input label="E-mail da pessoa" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@email.com" />
      <Select label="Convidar como" value={role} onChange={(e) => setRole(e.target.value as "student" | "trainer")}>
        <option value="student">Aluno</option>
        <option value="trainer">Personal trainer</option>
      </Select>
      <Button type="submit" loading={a.pending}>
        Convidar
      </Button>
      {a.msg && <Notice tone={a.msg.tone} className="sm:col-span-3">{a.msg.text}</Notice>}
    </form>
  );
}

export function PlanForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState("monthly");
  const a = useAction();
  return (
    <form
      className="panel grid gap-3 p-5 sm:grid-cols-[1fr_140px_170px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        a.run(() => savePlan({ name, price: price.replace(",", "."), interval }), "Plano criado.", () => {
          setName("");
          setPrice("");
        });
      }}
    >
      <Input label="Nome do plano" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Mensal livre" />
      <Input label="Preço" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" suffix="R$" />
      <Select label="Cobrança" value={interval} onChange={(e) => setInterval(e.target.value)}>
        <option value="monthly">Mensal</option>
        <option value="quarterly">Trimestral</option>
        <option value="semiannual">Semestral</option>
        <option value="yearly">Anual</option>
      </Select>
      <Button type="submit" loading={a.pending}>
        Criar plano
      </Button>
      {a.msg && <Notice tone={a.msg.tone} className="sm:col-span-4">{a.msg.text}</Notice>}
    </form>
  );
}

export function PlanSelect({ studentId, current, plans }: { studentId: string; current: string | null; plans: Array<{ id: string; name: string }> }) {
  const a = useAction();
  return (
    <span className="inline-flex flex-col gap-1">
      <select
        aria-label="Plano do aluno"
        defaultValue={current ?? ""}
        disabled={a.pending}
        onChange={(e) => a.run(() => assignPlan(studentId, e.target.value || null))}
        className="h-9 rounded-lg border border-line bg-graphite px-2 text-[13px]"
      >
        <option value="">Sem plano</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {a.msg?.tone === "error" && <span className="text-[12px] text-coral">{a.msg.text}</span>}
    </span>
  );
}

export function TrainerSelect({
  studentId,
  current,
  trainers,
}: {
  studentId: string;
  current: string[];
  trainers: Array<{ id: string; name: string }>;
}) {
  const a = useAction();
  const value = current[0] ?? "";
  return (
    <span className="inline-flex flex-col gap-1">
      <select
        aria-label="Personal do aluno"
        defaultValue={value}
        disabled={a.pending || trainers.length === 0}
        onChange={(e) => {
          const next = e.target.value;
          a.run(async () => {
            if (value) {
              const r = await setTrainerLink(value, studentId, false);
              if (!r.ok) return r;
            }
            return next ? setTrainerLink(next, studentId, true) : { ok: true };
          });
        }}
        className="h-9 rounded-lg border border-line bg-graphite px-2 text-[13px]"
      >
        <option value="">{trainers.length === 0 ? "Nenhum personal" : "Sem personal"}</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {a.msg?.tone === "error" && <span className="text-[12px] text-coral">{a.msg.text}</span>}
    </span>
  );
}
