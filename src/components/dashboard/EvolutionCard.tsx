import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatSigned } from "@/lib/domain/metrics";
import type { EvolutionSummary } from "@/lib/domain/dashboard";

export function EvolutionCard({ data }: { data: EvolutionSummary }) {
  const better = data.changes.filter((c) => c.verdict === "better").length;
  const worse = data.changes.filter((c) => c.verdict === "worse").length;

  return (
    <article className="panel p-5">
      <header className="flex items-start justify-between gap-3">
        <h3 className="type-label">Evolução geral</h3>
        <Link href="/evolucao" className="text-[12.5px] text-mist hover:text-bone">
          Ver histórico
        </Link>
      </header>

      {data.assessments < 2 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-fog">
          {data.assessments === 0
            ? "Nenhuma avaliação registrada ainda."
            : "Você tem uma avaliação. A comparação aparece a partir da segunda — o ideal é repetir a cada 4 semanas."}
        </p>
      ) : (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-bone/90">
            Em <span className="font-semibold">{data.days} dias</span> e {data.assessments} avaliações
            {data.weight.diff !== null && (
              <>
                , seu peso variou <span className="font-semibold tabular-nums">{formatSigned(data.weight.diff, 1, " kg")}</span>
              </>
            )}
            {data.changes.length > 0 && (
              <>
                . {better} de {data.changes.length} medidas andaram na direção do seu objetivo
                {worse > 0 && `, ${worse} no sentido oposto`}
              </>
            )}
            .
          </p>
          {data.changes.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {data.changes.map((c) => (
                <li key={c.site} className="flex items-baseline justify-between gap-2 border-b border-line/70 pb-2 text-[13px]">
                  <span className="text-mist">{c.label}</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      c.verdict === "better" ? "text-lime" : c.verdict === "worse" ? "text-amber" : "text-mist",
                    )}
                  >
                    {formatSigned(c.diff, 1, " cm")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
