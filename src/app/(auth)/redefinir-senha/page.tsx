"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { getBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage, resetSchema, type ResetInput } from "@/lib/validation/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  async function onSubmit({ password }: ResetInput) {
    setError(null);
    const { error: err } = await getBrowserClient().auth.updateUser({ password });
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    router.replace("/dashboard?senha=alterada");
    router.refresh();
  }

  return (
    <div>
      <h1 className="type-display text-[32px]">Nova senha</h1>
      <p className="mt-2 text-sm text-mist">Escolha uma senha que você não usa em outros sites.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Input label="Nova senha" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <Input label="Confirmar senha" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </form>
    </div>
  );
}
