"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { AnatomyShowcase } from "./AnatomyShowcase";
import { Cursor } from "./Cursor";
import { Marquee } from "./Marquee";

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

function KineticWord({ children, from, progress }: { children: string; from: number; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const reduce = useReducedMotion();
  const x = useTransform(progress, [0, 1], [`${from}%`, `${-from}%`]);
  return (
    <motion.span style={reduce ? undefined : { x }} className="block whitespace-nowrap will-change-transform">
      {children}
    </motion.span>
  );
}

export function Landing({ loggedIn }: { loggedIn: boolean }) {
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const bodyY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const reduce = useReducedMotion();

  return (
    <div className="overflow-x-clip bg-ink text-bone">
      <Cursor />

      {/* Navegação */}
      <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-10">
          <Link href="/" aria-label={brand.name}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-6 text-[14px] font-semibold">
            <a href="#como-funciona" className="hidden sm:inline hover:text-lime">
              Como funciona
            </a>
            <a href="#academias" className="hidden sm:inline hover:text-lime">
              Academias
            </a>
            {loggedIn ? (
              <Link href="/dashboard" className="rounded-full bg-bone px-4 py-2 text-ink">
                Abrir painel
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-lime">
                  Entrar
                </Link>
                <Link href="/cadastro" className="rounded-full bg-bone px-4 py-2 text-ink">
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section ref={hero} className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-10 pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[18%] size-[70vmax] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(200,240,60,0.13),transparent_60%)]"
        />
        <motion.div style={reduce ? undefined : { y: bodyY }} className="pointer-events-auto absolute inset-x-0 top-24 mx-auto w-[min(92vw,720px)] opacity-90">
          <AnatomyShowcase />
        </motion.div>

        <h1 className="type-metric relative z-10 select-none text-[clamp(72px,17vw,280px)] leading-[0.82] text-bone mix-blend-difference">
          <KineticWord from={-6} progress={scrollYProgress}>
            Mede.
          </KineticWord>
          <KineticWord from={10} progress={scrollYProgress}>
            <span className="text-lime">Treina.</span>
          </KineticWord>
          <KineticWord from={-14} progress={scrollYProgress}>
            Evolui.
          </KineticWord>
        </h1>

        <div className="relative z-10 mx-auto mt-10 flex w-full max-w-[1500px] flex-col gap-6 px-5 sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.4 }}
            className="max-w-md text-[17px] leading-relaxed text-mist"
          >
            O personal trainer digital que mostra o que mudou no seu corpo — com base no que você mediu, não em
            achismo.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.55 }}>
            <Link
              href={loggedIn ? "/dashboard" : "/cadastro"}
              className="group inline-flex h-16 items-center gap-3 rounded-full bg-lime pl-8 pr-3 text-[17px] font-bold text-ink transition-transform hover:scale-[1.03]"
            >
              {loggedIn ? "Ir para meu painel" : "Começar agora"}
              <span className="flex size-11 items-center justify-center rounded-full bg-ink text-lime transition-transform group-hover:rotate-45">
                <ArrowUpRight className="size-5" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      <Marquee items={["Avaliação física", "Treino", "Alimentação", "IA de evolução", "Metas"]} />

      {/* Como funciona — é uma sequência real, por isso é numerada */}
      <section id="como-funciona" className="mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-40">
        <Reveal>
          <h2 className="type-display max-w-4xl text-[clamp(40px,6vw,88px)]">Três passos. Nenhum número inventado.</h2>
        </Reveal>
        <ol className="mt-20 grid gap-px overflow-hidden rounded-[28px] border border-line bg-line md:grid-cols-3">
          {[
            ["Meça", "Peso, circunferências e composição corporal — com o método de medição registrado. Fotos são opcionais e privadas."],
            ["Treine", "Execute os treinos do seu personal, registre carga e repetições. Cada série alimenta o mapa muscular."],
            ["Entenda", "A IA compara suas avaliações e explica a evolução em português claro, só com dados que existem."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.1} className="bg-ink">
              <li className="group flex h-full min-h-[340px] flex-col justify-between p-8 transition-colors hover:bg-graphite sm:p-10" data-cursor>
                <span className="type-metric text-[88px] text-line-strong transition-colors group-hover:text-lime">{i + 1}</span>
                <div>
                  <h3 className="type-display text-[40px]">{t}</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-mist">{d}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Estímulo x evolução */}
      <section className="border-y border-line bg-graphite">
        <div className="mx-auto grid max-w-[1500px] items-center gap-16 px-5 py-28 sm:px-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="type-display text-[clamp(36px,5vw,72px)]">Treinar não é o mesmo que crescer.</h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-mist">
              O mapa mostra onde você colocou esforço. A fita métrica mostra o que mudou. O FITCORE separa os dois —
              e nunca chama frequência de treino de ganho muscular.
            </p>
            <dl className="mt-10 grid max-w-md grid-cols-2 gap-8">
              <div>
                <dt className="text-[13px] text-fog">Estímulo</dt>
                <dd className="mt-1 font-semibold">Séries por grupo muscular</dd>
              </div>
              <div>
                <dt className="text-[13px] text-fog">Evolução observada</dt>
                <dd className="mt-1 font-semibold">Medidas que mudaram</dd>
              </div>
            </dl>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="panel p-6">
              <p className="text-[13px] text-fog">Exemplo de relatório</p>
              <p className="mt-4 text-[clamp(20px,2vw,26px)] leading-snug">
                “Nos últimos 60 dias, seu peso passou de 78 kg para 75,5 kg. Sua cintura diminuiu 3 cm e seu braço
                aumentou 0,5 cm.”
              </p>
              <p className="mt-6 text-[12.5px] text-fog">Texto ilustrativo. Nos relatórios reais, todo número vem das suas avaliações.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Academias */}
      <section id="academias" className="mx-auto max-w-[1500px] px-5 py-28 sm:px-10 sm:py-40">
        <Reveal>
          <h2 className="type-display max-w-5xl text-[clamp(40px,6vw,88px)]">
            Para alunos, personal trainers e academias.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            ["Aluno", "Painel com evolução real, treino guiado e histórico que não se perde."],
            ["Personal", "Vê só os alunos vinculados, cria treinos, acompanha frequência e deixa observações."],
            ["Academia", "Alunos ativos, frequência, planos e receita — com permissões de verdade no banco de dados."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <div className="group h-full rounded-[28px] border border-line p-8 transition-colors hover:border-lime/60" data-cursor>
                <h3 className="type-display text-[32px] transition-colors group-hover:text-lime">{t}</h3>
                <p className="mt-4 leading-relaxed text-mist">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Marquee items={["Seus dados são seus", "Fotos privadas", "LGPD", "Permissões no banco"]} reverse />

      {/* CTA final */}
      <section className="relative overflow-hidden px-5 py-32 text-center sm:py-48">
        <Reveal>
          <p className="type-metric text-[clamp(64px,14vw,220px)] leading-[0.85]">
            Bora <span className="text-lime">medir?</span>
          </p>
          <Link
            href={loggedIn ? "/dashboard" : "/cadastro"}
            className="mt-12 inline-flex h-16 items-center rounded-full bg-bone px-10 text-[17px] font-bold text-ink transition-transform hover:scale-[1.04]"
          >
            {loggedIn ? "Abrir meu painel" : "Criar conta grátis"}
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] text-fog sm:px-10">
          <Logo />
          <div className="flex gap-6">
            <Link href="/privacidade" className="hover:text-bone">
              Privacidade
            </Link>
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-bone">
              Contato
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
