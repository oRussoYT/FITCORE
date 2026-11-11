"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Dumbbell, Ruler, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PHOTOS, photo } from "@/components/landing/photos";

const ease = [0.16, 1, 0.3, 1] as const;

/* Linha ilustrativa de evolução (não são dados de ninguém) */
const PTS = [40, 44, 43, 50, 53, 51, 58, 63, 61, 68, 72, 79];
const W = 560;
const H = 170;
const step = W / (PTS.length - 1);
const toY = (v: number) => H - ((v - 35) / 50) * H;
const LINE = PTS.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
const AREA = `${LINE} L${W},${H} L0,${H} Z`;

const HIGHLIGHTS = [
  { icon: Ruler, title: "Medidas que mudaram", text: "Cintura, braço, coxa — comparadas avaliação a avaliação." },
  { icon: Dumbbell, title: "Cada série conta", text: "Cargas e repetições viram o mapa muscular do seu corpo." },
  { icon: Sparkles, title: "IA que não inventa", text: "Relatórios feitos só com o que você registrou." },
];

export function AuthShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % HIGHLIGHTS.length), 3800);
    return () => clearInterval(id);
  }, []);
  const h = HIGHLIGHTS[i]!;
  const Icon = h.icon;

  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Foto de fundo com movimento lento */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1.02 }}
        transition={{ duration: 14, ease: "easeOut" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo(PHOTOS.barbellFloor, 1400)} alt="" className="h-full w-full object-cover object-[40%_center] opacity-60" />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,15,16,0.55)_0%,rgba(13,15,16,0.35)_35%,rgba(13,15,16,0.96)_78%)]" />
      <div className="pointer-events-none absolute -left-32 bottom-10 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(204,255,0,0.16),transparent_65%)]" />

      <div className="relative z-10">
        <Logo />
      </div>

      <div className="relative z-10">
        <h2 className="type-metric text-[clamp(56px,6vw,96px)] leading-[0.86] text-bone">
          {["Seu treino,", "medido de", "verdade."].map((l, k) => (
            <span key={l} className="block overflow-hidden">
              <motion.span
                className={`block ${k === 2 ? "text-lime" : ""}`}
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, ease, delay: 0.1 + k * 0.1 }}
              >
                {l}
              </motion.span>
            </span>
          ))}
        </h2>

        {/* Destaque que alterna */}
        <div className="mt-8 h-[68px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease }}
              className="flex max-w-md items-start gap-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-bone">{h.title}</p>
                <p className="text-[14px] leading-relaxed text-bone/70">{h.text}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Gráfico ilustrativo que se desenha */}
        <div className="relative mt-10">
          <svg viewBox={`0 0 ${W} ${H + 8}`} className="w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="auth-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ccff00" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
              </linearGradient>
              <filter id="auth-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="rgba(236,238,232,0.08)" strokeDasharray="2 6" />
            ))}
            <motion.path d={AREA} fill="url(#auth-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 1.2 }} />
            <motion.path
              d={LINE}
              fill="none"
              stroke="#ccff00"
              strokeWidth={6}
              strokeLinecap="round"
              filter="url(#auth-glow)"
              opacity={0.55}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease, delay: 0.4 }}
            />
            <motion.path
              d={LINE}
              fill="none"
              stroke="#ccff00"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease, delay: 0.4 }}
            />
            {[3, 7].map((k, n) => (
              <motion.circle
                key={k}
                cx={k * step}
                cy={toY(PTS[k]!)}
                r={4}
                fill="#eceee8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1 + n * 0.4, type: "spring", stiffness: 400, damping: 18 }}
              />
            ))}
            <motion.circle
              cx={W}
              cy={toY(PTS.at(-1)!)}
              r={7}
              fill="#ccff00"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ delay: 2.3, duration: 0.6 }}
            />
            <motion.circle
              cx={W}
              cy={toY(PTS.at(-1)!)}
              r={7}
              fill="none"
              stroke="#ccff00"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 3], opacity: [0.8, 0] }}
              transition={{ delay: 2.6, duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }}
              style={{ transformOrigin: `${W}px ${toY(PTS.at(-1)!)}px` }}
            />
          </svg>

          {/* Cartões flutuantes */}
          <motion.div
            className="absolute -top-14 right-2 rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{ opacity: { delay: 2.4, duration: 0.6 }, y: { delay: 2.4, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
          >
            <p className="flex items-center gap-1.5 text-[11.5px] text-bone/60">
              <Ruler className="size-3.5" /> Cintura
            </p>
            <p className="type-metric mt-1 text-[30px] text-lime">−3,0 cm</p>
          </motion.div>
          <motion.div
            className="absolute -top-2 left-[28%] rounded-2xl border border-white/10 bg-ink/70 px-4 py-3 backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, 6, 0] }}
            transition={{ opacity: { delay: 1.6, duration: 0.6 }, y: { delay: 1.6, duration: 6, repeat: Infinity, ease: "easeInOut" } }}
          >
            <p className="flex items-center gap-1.5 text-[11.5px] text-bone/60">
              <Activity className="size-3.5" /> Treinos na semana
            </p>
            <p className="type-metric mt-1 text-[30px] text-bone">
              4<span className="text-bone/40">/4</span>
            </p>
          </motion.div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[12px] text-bone/50">
          <span>semana 1</span>
          <span className="rounded-full border border-amber/40 px-2 py-0.5 text-amber">ilustração</span>
          <span>hoje</span>
        </div>
      </div>
    </aside>
  );
}
