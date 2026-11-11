"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Ruler, Sparkles, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PHOTOS, photo } from "@/components/landing/photos";

const ease = [0.16, 1, 0.3, 1] as const;
const DURATION = 4200;

const HIGHLIGHTS: Array<{ icon: LucideIcon; title: string; text: string; photo: string }> = [
  { icon: Sparkles, title: "IA que não inventa", text: "Relatórios feitos só com o que você registrou.", photo: PHOTOS.barbellFloor },
  { icon: Ruler, title: "Medidas que mudaram", text: "Cintura, braço, coxa — comparadas avaliação a avaliação.", photo: PHOTOS.womanRack },
  { icon: Dumbbell, title: "Cada série conta", text: "Cargas e repetições viram o mapa muscular do seu corpo.", photo: PHOTOS.mono },
];

export function AuthShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % HIGHLIGHTS.length), DURATION);
    return () => clearInterval(id);
  }, [i]);
  const h = HIGHLIGHTS[i]!;
  const Icon = h.icon;

  return (
    <aside className="relative hidden overflow-hidden bg-ink lg:block">
      {/* Fotos que trocam junto com a mensagem */}
      <AnimatePresence initial={false}>
        <motion.div
          key={h.photo}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.2 }, scale: { duration: DURATION / 1000 + 1.2, ease: "easeOut" } }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo(h.photo, 1400)} alt="" className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,15,16,0.6),rgba(13,15,16,0.15)_60%,rgba(13,15,16,0.6)),linear-gradient(180deg,rgba(13,15,16,0.25),rgba(13,15,16,0.1)_40%,rgba(13,15,16,0.92))]" />

      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <Link href="/" aria-label="FITCORE AI — página inicial" className="w-fit">
          <Logo />
        </Link>

        <div>
          <h2 className="type-metric text-[clamp(56px,5.6vw,92px)] leading-[0.88] text-bone">
            {["Seu treino,", "medido de"].map((l, k) => (
              <span key={l} className="block overflow-hidden">
                <motion.span className="block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, ease, delay: 0.1 + k * 0.1 }}>
                  {l}
                </motion.span>
              </span>
            ))}
            <span className="block overflow-hidden">
              <motion.span className="block text-lime" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, ease, delay: 0.3 }}>
                verdade.
              </motion.span>
            </span>
          </h2>

          {/* Mensagem em destaque, em vidro, com barra de progresso */}
          <div className="mt-10 max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink/45 p-6 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.5, ease }}
                className="flex items-start gap-4"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-ink shadow-[0_0_30px_-4px_rgba(204,255,0,0.7)]">
                  <Icon className="size-6" />
                </span>
                <div>
                  <p className="text-[20px] font-semibold text-bone">{h.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-bone/75">{h.text}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex gap-2">
              {HIGHLIGHTS.map((x, n) => (
                <button key={x.title} type="button" onClick={() => setI(n)} aria-label={x.title} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                  {n === i && (
                    <motion.span
                      key={`bar-${i}`}
                      className="absolute inset-y-0 left-0 bg-lime"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: DURATION / 1000, ease: "linear" }}
                    />
                  )}
                  {n < i && <span className="absolute inset-0 bg-bone/50" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
