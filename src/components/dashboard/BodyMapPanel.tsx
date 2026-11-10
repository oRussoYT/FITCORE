"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BodyFigure } from "@/components/body/BodyFigure";
import { cn } from "@/lib/cn";
import { formatNumber, formatSigned } from "@/lib/domain/metrics";
import type { MeasurementChange } from "@/lib/domain/dashboard";
import type { MeasurementSite, MuscleGroup } from "@/types/db";

/** Qual medida de fita ajuda a observar cada grupo. */
const GROUP_TO_SITE: Partial<Record<string, MeasurementSite[]>> = {
  chest: ["chest"],
  biceps: ["arm"],
  triceps: ["arm"],
  forearms: ["forearm"],
  abs: ["waist", "abdomen"],
  quads: ["thigh"],
  hamstrings: ["thigh"],
  glutes: ["hip"],
  calves: ["calf"],
};

function heat(t: number) {
  // Sem estímulo: grafite. Mais séries: vermelho-músculo.
  if (t <= 0) return "#33393d";
  const a = [92, 52, 54];
  const b = [255, 77, 72];
  const mix = a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * t));
  return `rgb(${mix.join(",")})`;
}

export function BodyMapPanel({
  groups,
  stimulus,
  changes,
  setsLast30,
}: {
  groups: MuscleGroup[];
  stimulus: Record<string, number>;
  changes: MeasurementChange[];
  setsLast30: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = useMemo(() => Math.max(0, ...Object.values(stimulus)), [stimulus]);
  const selectedGroup = groups.find((g) => g.slug === selected) ?? null;
  const ranking = useMemo(
    () => [...groups].sort((a, b) => (stimulus[b.slug] ?? 0) - (stimulus[a.slug] ?? 0) || a.sort_order - b.sort_order),
    [groups, stimulus],
  );

  function intensity(slug: string) {
    return max > 0 ? (stimulus[slug] ?? 0) / max : 0;
  }

  return (
    <section aria-labelledby="bodymap-title" className="panel relative overflow-hidden p-5 lg:sticky lg:top-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,77,72,0.07),transparent)]" />
      <header className="relative flex items-start justify-between gap-3">
        <div>
          <h2 id="bodymap-title" className="text-[17px] font-semibold">
            Mapa de estímulo
          </h2>
          <p className="mt-1 text-[12.5px] text-fog">Séries treinadas por grupo nos últimos 30 dias</p>
        </div>
</header>

      <div className="relative mx-auto mt-4 aspect-[210/228] w-full max-w-[380px]">
        <BodyFigure
          colorFor={(g) => heat(intensity(g))}
          selected={selected}
          onSelect={setSelected}
          labelFor={(g) => `${groups.find((x) => x.slug === g)?.name ?? g}: ${formatNumber(stimulus[g] ?? 0, 1)} séries`}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-fog" aria-hidden>
        <span>menos</span>
        <span className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,#5c3436,#ff4d48)]" />
        <span>mais séries</span>
      </div>

      <AnimatePresence mode="wait">
        {selectedGroup ? (
          <motion.div
            key={selectedGroup.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-5 rounded-xl border border-line bg-graphite/60 p-4"
          >
            <p className="text-[15px] font-semibold">{selectedGroup.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-fog">Estímulo (30 dias)</dt>
                <dd className="type-metric mt-1 text-[26px] text-[#ff6b66]">{formatNumber(stimulus[selectedGroup.slug] ?? 0, 1)}</dd>
                <dd className="text-[11.5px] text-fog">séries</dd>
              </div>
              <div>
                <dt className="text-fog">Medida observada</dt>
                <MeasuredFor slug={selectedGroup.slug} changes={changes} />
              </div>
            </dl>
            <p className="mt-3 text-[11.5px] leading-relaxed text-fog">
              Estímulo mostra o treino feito — não comprova crescimento. A medida de fita é o que efetivamente foi
              observado no corpo.
            </p>
          </motion.div>
        ) : (
          <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
            {setsLast30 === 0 ? (
              <p className="text-[13px] leading-relaxed text-fog">
                Nenhuma série registrada nos últimos 30 dias. Ao concluir treinos, cada grupo muscular ganha cor
                conforme o volume treinado.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {ranking.slice(0, 6).map((g) => (
                  <li key={g.slug}>
                    <button
                      type="button"
                      onClick={() => setSelected(g.slug)}
                      className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left text-[13px] hover:bg-raised/60"
                    >
                      <span className="w-28 shrink-0 truncate text-mist">{g.name}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                        <span className="block h-full rounded-full bg-[#ff4d48]" style={{ width: `${intensity(g.slug) * 100}%` }} />
                      </span>
                      <span className="w-8 text-right tabular-nums text-bone">{formatNumber(stimulus[g.slug] ?? 0, 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MeasuredFor({ slug, changes }: { slug: string; changes: MeasurementChange[] }) {
  const sites = GROUP_TO_SITE[slug] ?? [];
  const found = changes.filter((c) => sites.includes(c.site));
  if (sites.length === 0) return <dd className="mt-1 text-[12.5px] text-fog">Sem medida de fita para esta região.</dd>;
  if (found.length === 0) return <dd className="mt-1 text-[12.5px] text-fog">Precisa de 2 avaliações com essa medida.</dd>;
  return (
    <>
      {found.map((c) => (
        <dd key={c.site} className="mt-1">
          <span className={cn("type-metric text-[26px]", c.verdict === "better" ? "text-lime" : c.verdict === "worse" ? "text-amber" : "text-bone")}>
            {formatSigned(c.diff, 1)}
          </span>
          <span className="ml-1 text-[11.5px] text-fog">cm · {c.label.toLowerCase()}</span>
        </dd>
      ))}
    </>
  );
}
