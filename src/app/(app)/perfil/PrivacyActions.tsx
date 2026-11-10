"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { deleteBodyData, requestAccountDeletion } from "./actions";

export function PrivacyActions({ deletionRequestedAt }: { deletionRequestedAt: string | null }) {
  const [mode, setMode] = useState<"none" | "body" | "account">("none");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="text-[14px] font-semibold text-coral">Exclusão de dados</h3>
      {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}

      {mode === "none" && (
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="danger" size="sm" onClick={() => setMode("body")}>
            Apagar meus dados corporais
          </Button>
          {deletionRequestedAt ? (
            <span className="text-[13px] text-fog">
              Exclusão da conta solicitada em {new Date(deletionRequestedAt).toLocaleDateString("pt-BR")}.
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setMode("account")}>
              Solicitar exclusão da conta
            </Button>
          )}
        </div>
      )}

      {mode === "body" && (
        <div className="mt-3 space-y-3">
          <p className="text-[13.5px] leading-relaxed text-mist">
            Remove todas as avaliações, medidas, relatórios e fotografias. Não dá para desfazer. Digite APAGAR para confirmar.
          </p>
          <Input label="Confirmação" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteBodyData(text);
                  setMsg(res.ok ? { tone: "success", text: "Dados corporais apagados." } : { tone: "error", text: res.error });
                  if (res.ok) setMode("none");
                })
              }
            >
              Apagar definitivamente
            </Button>
          </div>
        </div>
      )}

      {mode === "account" && (
        <div className="mt-3 space-y-3">
          <p className="text-[13.5px] leading-relaxed text-mist">
            Registramos o pedido e a conta inteira é excluída em até 15 dias, conforme a LGPD. Se quiser, diga o motivo.
          </p>
          <Input label="Motivo (opcional)" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await requestAccountDeletion(text);
                  setMsg(res.ok ? { tone: "success", text: "Pedido de exclusão registrado." } : { tone: "error", text: res.error });
                  if (res.ok) setMode("none");
                })
              }
            >
              Enviar pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
