import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

const SECTIONS: Array<[string, string]> = [
  ["comparacao", "Comparação"],
  ["evolucao_medidas", "Evolução das medidas"],
  ["observacoes_visuais", "O que aparece nas fotos"],
  ["postura", "Postura"],
  ["pontos_positivos", "Pontos positivos"],
  ["pontos_de_atencao", "Pontos de atenção"],
  ["metas_recomendadas", "Metas sugeridas"],
  ["sugestoes_treino", "Sugestões de treino"],
  ["recomendacoes_alimentacao", "Alimentação (orientação geral)"],
  ["sugestoes", "Sugestões"],
  ["proximos_passos", "Próximos passos"],
  ["limitacoes", "Limitações desta análise"],
];

/** Mostra um relatório gerado pela IA (texto já salvo no banco). */
export function ReportView({
  content,
  createdAt,
  highlight,
  kind,
}: {
  content: Record<string, unknown>;
  createdAt: string;
  highlight?: boolean;
  kind: "photo" | "assessment";
}) {
  const resumo = typeof content.resumo === "string" ? content.resumo : null;
  const motivacional = typeof content.motivacional === "string" ? content.motivacional : null;
  return (
    <article className={cn("rounded-2xl border p-5", highlight ? "border-lime/40 bg-lime/[0.04]" : "border-line")}>
      <header className="flex items-center gap-2 text-[12.5px] text-fog">
        <Sparkles className="size-4 text-lime" />
        {kind === "photo" ? "Análise visual" : "Relatório de evolução"} · {new Date(createdAt).toLocaleString("pt-BR")}
      </header>
      {resumo && <p className="mt-3 text-[16px] leading-relaxed">{resumo}</p>}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {SECTIONS.map(([key, label]) => {
          const v = content[key];
          if (v == null || (Array.isArray(v) && v.length === 0) || v === "") return null;
          return (
            <div key={key}>
              <h4 className="text-[13px] font-semibold text-mist">{label}</h4>
              {Array.isArray(v) ? (
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
                  {v.map((item, i) => (
                    <li key={i}>{String(item)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[14px] leading-relaxed">{String(v)}</p>
              )}
            </div>
          );
        })}
      </div>
      {motivacional && <p className="mt-5 border-t border-line pt-4 text-[15px] font-medium text-lime">{motivacional}</p>}
      <p className="mt-4 text-[11.5px] text-fog">
        Gerado por inteligência artificial. Não substitui avaliação de profissional de educação física, nutricionista ou médico.
      </p>
    </article>
  );
}
