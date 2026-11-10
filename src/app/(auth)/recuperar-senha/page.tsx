"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { getBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage, recoverSchema, type RecoverInput } from "@/lib/validation/auth";

export default function RecoverPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoverInput>({ resolver: zodResolver(recoverSchema) });

  async function onSubmit({ email }: RecoverInput) {
    setError(null);
    const { error: err } = await getBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    setSent(true);
  }

  return (
    <div>
      <h1 className="type-display text-[32px]">Recuperar senha</h1>
      <p className="mt-2 text-sm leading-relaxed text-mist">Enviaremos um link para você criar uma nova senha.</p>
      {sent ? (
        <Notice tone="success" className="mt-8" title="Verifique seu e-mail">
          Se existir uma conta com esse endereço, o link chega em instantes. Confira também a caixa de spam.
        </Notice>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          {error && <Notice tone="error">{error}</Notice>}
          <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Enviar link
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-8 inline-block text-sm text-mist hover:text-bone">
        Voltar para entrar
      </Link>
    </div>
  );
}
