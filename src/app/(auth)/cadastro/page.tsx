"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { GoogleButton, googleAuthEnabled } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { getBrowserClient } from "@/lib/supabase/client";
import { authErrorMessage, signupSchema, type SignupInput } from "@/lib/validation/auth";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setError(null);
    const { data, error: err } = await getBrowserClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    // Com confirmação de e-mail desativada o Supabase já devolve a sessão.
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div>
        <MailCheck className="size-8 text-lime" aria-hidden />
        <h1 className="type-display mt-5 text-[30px]">Confirme seu e-mail</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mist">
          Enviamos um link para <span className="font-semibold text-bone">{sentTo}</span>. Abra o e-mail e toque no link
          para ativar sua conta. Depois disso você continua o cadastro.
        </p>
        <Link href="/login" className="mt-8 inline-block text-sm font-semibold text-bone underline decoration-lime/60 underline-offset-4">
          Voltar para entrar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="type-display text-[32px]">Criar conta</h1>
      <p className="mt-2 text-sm text-mist">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-bone underline decoration-lime/60 underline-offset-4 hover:decoration-lime">
          Entrar
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <Input label="Nome" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register("password")}
        />
        <Input label="Confirmar senha" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-mist">
          <input type="checkbox" className="mt-1 size-4 accent-[#ccff00]" {...register("terms")} />
          <span>
            Li e aceito a{" "}
            <Link href="/privacidade" target="_blank" className="text-bone underline underline-offset-2">
              política de privacidade
            </Link>
            . Meus dados corporais só serão usados para acompanhar minha evolução.
          </span>
        </label>
        {errors.terms && <p className="text-[12.5px] text-coral">{errors.terms.message}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>

      {googleAuthEnabled && (
        <>
      <div className="my-6 flex items-center gap-3 text-[12px] text-fog">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton next="/onboarding" onError={setError} />
        </>
      )}
    </div>
  );
}
