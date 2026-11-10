"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { getBrowserClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qr: string; secret: string };

/** Segundo fator obrigatório: cadastra (1ª vez) ou confirma o código do app autenticador. */
export function MfaGate({ hasFactor }: { hasFactor: boolean }) {
  const router = useRouter();
  const [enroll, setEnroll] = useState<Enrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getBrowserClient();
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        return;
      }
      if (hasFactor) return;
      // Remove cadastros incompletos antes de criar um novo.
      for (const f of data?.all ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const res = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `FITCORE admin ${Date.now()}` });
      if (res.error || !res.data) {
        setError("Não foi possível iniciar o cadastro do segundo fator. Recarregue a página.");
        return;
      }
      setEnroll({ factorId: res.data.id, qr: res.data.totp.qr_code, secret: res.data.totp.secret });
      setFactorId(res.data.id);
    })();
  }, [hasFactor]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Digite os 6 números do app autenticador.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await getBrowserClient().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (err) {
      setError("Código inválido ou expirado. Confira o horário do celular e tente o código novo.");
      setCode("");
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <ShieldCheck className="size-8 text-lime" aria-hidden />
      <h1 className="type-display mt-5 text-[30px]">{enroll ? "Ative a verificação em 2 etapas" : "Confirme que é você"}</h1>
      {enroll ? (
        <>
          <p className="mt-3 leading-relaxed text-mist">
            Abra o Google Authenticator (ou similar), toque em adicionar e leia o código abaixo. Depois digite os 6
            números que aparecerem.
          </p>
          <div className="mt-6 inline-block rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR code para o app autenticador" className="size-48" />
          </div>
          <p className="mt-3 break-all text-[12px] text-fog">
            Sem câmera? Digite esta chave no app: <span className="font-mono text-mist">{enroll.secret}</span>
          </p>
        </>
      ) : (
        <p className="mt-3 leading-relaxed text-mist">Digite o código de 6 números do seu app autenticador.</p>
      )}
      <form onSubmit={verify} className="mt-8 space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Input
          label="Código"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
        />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!factorId}>
          Verificar
        </Button>
      </form>
    </main>
  );
}
