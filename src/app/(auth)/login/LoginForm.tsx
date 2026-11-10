"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleButton, googleAuthEnabled } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { getBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage, loginSchema, type LoginInput } from "@/lib/validation/auth";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(params.get("erro") ? "O link expirou ou é inválido. Entre novamente." : null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setError(null);
    const { error: err } = await getBrowserClient().auth.signInWithPassword(values);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div>
      <h1 className="type-display text-[32px]">Entrar</h1>
      <p className="mt-2 text-sm text-mist">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-bone underline decoration-lime/60 underline-offset-4 hover:decoration-lime">
          Criar conta
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Senha" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <div className="flex justify-end">
          <Link href="/recuperar-senha" className="text-[13px] text-mist hover:text-bone">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Entrar
        </Button>
      </form>

      {googleAuthEnabled && (
        <>
      <div className="my-6 flex items-center gap-3 text-[12px] text-fog">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton next={next} onError={setError} />
        </>
      )}
    </div>
  );
}
