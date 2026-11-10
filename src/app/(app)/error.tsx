"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="type-display text-[28px]">Não foi possível carregar esta página</h1>
      <p className="mt-3 leading-relaxed text-mist">
        A conexão com o banco de dados falhou ou a resposta veio incompleta. Seus dados não foram alterados.
      </p>
      {error.digest && <p className="mt-2 text-[12px] text-fog">Código: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
