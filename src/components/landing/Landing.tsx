"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Quote, Star } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";
import { AnatomyShowcase } from "./AnatomyShowcase";
import { Cursor } from "./Cursor";
import { Marquee } from "./Marquee";
import { PHOTOS, photo } from "./photos";

export type PublicReview = { id: string; rating: number; body: string; display_name: string; created_at: string };

const ease = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Foto com zoom suave ao passar o mouse. */
function Shot({ id, alt, w, className }: { id: string; alt: string; w: number; className?: string }) {
  return (
    <div className={`group relative overflow-hidden ${className ?? ""}`} data-cursor>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo(id, w)}
        srcSet={`${photo(id, Math.round(w / 2))} ${Math.round(w / 2)}w, ${photo(id, w)} ${w}w`}
        sizes="(max-width: 768px) 100vw, 50vw"
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
      />
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = false as boolean;
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = String(to);
      return;
    }
    const c = animate(0, to, { duration: 1.4, ease, onUpdate: (v) => (el.textContent = String(Math.round(v))) });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref}>0</span>;
}

function Nav({ loggedIn }: { loggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-5 sm:px-6">
      <div
        className={`mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full px-3 pl-5 transition-all duration-500 ${
          scrolled ? "bg-ink/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <Link href="/" aria-label={brand.name}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[14px] font-semibold sm:gap-2">
          <a href="#mapa" className="hidden rounded-full px-4 py-2 hover:bg-white/10 md:inline">
            O mapa
          </a>
          <a href="#avaliacoes" className="hidden rounded-full px-4 py-2 hover:bg-white/10 md:inline">
            Avaliações
          </a>
          <a href="#academias" className="hidden rounded-full px-4 py-2 hover:bg-white/10 md:inline">
            Academias
          </a>
          {loggedIn ? (
            <Link href="/dashboard" className="rounded-full bg-lime px-5 py-2.5 text-ink">
              Meu painel
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 hover:bg-white/10">
                Entrar
              </Link>
              <Link href="/cadastro" className="rounded-full bg-lime px-5 py-2.5 text-ink">
                Começar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = false as boolean;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.3]);
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const lines = ["Mede.", "Treina.", "Evolui."];

  return (
    <section ref={ref} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink">
      <motion.div style={reduce ? undefined : { scale, y }} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo(PHOTOS.hero, 2000)} alt="Homem treinando bíceps com halter na academia" className="h-full w-full object-cover object-[60%_30%]" />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,15,16,0.35)_0%,rgba(13,15,16,0.1)_40%,rgba(13,15,16,0.92)_100%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-5 pb-10 sm:px-10 sm:pb-14">
        <h1 className="type-metric text-[clamp(76px,15vw,240px)] leading-[0.84] text-bone">
          {lines.map((l, i) => (
            <span key={l} className="block overflow-hidden">
              <motion.span
                className={`block ${i === 1 ? "text-lime" : ""}`}
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease, delay: 0.15 + i * 0.12 }}
              >
                {l}
              </motion.span>
            </span>
          ))}
        </h1>
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 0.7 }}
            className="max-w-md text-[17px] leading-relaxed text-bone/85"
          >
            O personal trainer digital que mostra o que mudou no seu corpo — com base no que você mediu, não em achismo.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease, delay: 0.85 }}>
            <Link
              href={loggedIn ? "/dashboard" : "/cadastro"}
              className="group inline-flex h-16 items-center gap-3 rounded-full bg-lime pl-8 pr-2.5 text-[17px] font-bold text-ink transition-transform hover:scale-[1.03]"
            >
              {loggedIn ? "Ir para meu painel" : "Começar grátis"}
              <span className="flex size-11 items-center justify-center rounded-full bg-ink text-lime transition-transform duration-500 group-hover:rotate-45">
                <ArrowUpRight className="size-5" />
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BodySection() {
  const stats: Array<[number, string]> = [
    [12, "grupos musculares mapeados"],
    [8, "medidas corporais acompanhadas"],
    [0, "números inventados"],
  ];
  return (
    <section id="mapa" className="relative overflow-hidden bg-lime text-ink">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Reveal>
            <h2 className="type-metric text-[clamp(64px,10vw,150px)] leading-[0.86]">
              Seu corpo,
              <br />
              em dados.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-8 max-w-lg text-[18px] font-medium leading-relaxed text-ink/80">
              Cada série que você registra pinta o músculo trabalhado. Cada avaliação mostra o que de fato mudou na fita
              métrica. Treino feito e resultado medido aparecem lado a lado — sem confundir um com o outro.
            </p>
          </Reveal>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {stats.map(([n, label], i) => (
              <Reveal key={label} delay={0.15 + i * 0.08}>
                <p className="type-metric text-[64px]">
                  <CountUp to={n} />
                </p>
                <p className="text-[13px] font-semibold leading-snug text-ink/70">{label}</p>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal delay={0.1}>
          <div className="rounded-[36px] bg-ink p-5 text-bone shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] sm:p-8">
            <AnatomyShowcase compact />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const GALLERY = [
  { id: PHOTOS.barbellFloor, title: "Força", text: "Carga e repetições de cada série, guardadas para sempre." },
  { id: PHOTOS.womanRack, title: "Técnica", text: "Execução, descanso e observações em cada exercício." },
  { id: PHOTOS.ropes, title: "Constância", text: "Frequência semanal com meta e histórico de 8 semanas." },
  { id: PHOTOS.tape, title: "Medidas", text: "Cintura, braço, coxa e mais — comparados avaliação a avaliação." },
  { id: PHOTOS.mealPrep, title: "Alimentação", text: "Refeições, macros e água. Planos individuais só com nutricionista." },
  { id: PHOTOS.group, title: "Juntos", text: "Personal e academia acompanhando de perto, com permissão." },
];

function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const reduce = false as boolean;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-62%"]);

  return (
    <section ref={ref} className="relative h-[320vh] bg-ink">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-8 flex w-full max-w-[1400px] items-end justify-between px-5 sm:px-10">
          <h2 className="type-display text-[clamp(36px,5vw,72px)]">Tudo o que conta.</h2>
          <p className="hidden max-w-xs text-[14px] text-mist md:block">Role para ver cada parte do acompanhamento.</p>
        </div>
        <motion.div style={reduce ? undefined : { x }} className="flex w-max gap-5 px-5 sm:gap-8 sm:px-10">
          {GALLERY.map((g, i) => (
            <article key={g.title} className="relative h-[62svh] w-[78vw] shrink-0 overflow-hidden rounded-[32px] sm:w-[44vw] lg:w-[34vw]">
              <Shot id={g.id} alt={g.title} w={1100} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(13,15,16,0.88))]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="text-[13px] font-semibold text-lime">0{i + 1}</p>
                <h3 className="type-metric mt-1 text-[clamp(44px,5vw,72px)]">{g.title}</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-bone/85">{g.text}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { id: PHOTOS.tape, t: "Meça", d: "Peso, circunferências e composição corporal com o método de medição anotado. Fotos opcionais e privadas." },
    { id: PHOTOS.womanLifting, t: "Treine", d: "Siga o treino do seu personal, registre carga e repetições, use o cronômetro de descanso." },
    { id: PHOTOS.coachPlan, t: "Entenda", d: "A IA compara suas avaliações e explica a evolução em português claro — só com o que existe." },
  ];
  return (
    <section className="bg-bone text-ink">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-10 sm:py-36">
        <Reveal>
          <h2 className="type-metric max-w-4xl text-[clamp(56px,8vw,130px)] leading-[0.88]">Três passos. Zero achismo.</h2>
        </Reveal>
        <ol className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 0.1}>
              <li>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                  <Shot id={s.id} alt={s.t} w={900} className="h-full w-full" />
                  <span className="type-metric pointer-events-none absolute left-5 top-4 text-[72px] text-lime drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                    {i + 1}
                  </span>
                </div>
                <h3 className="type-display mt-6 text-[36px]">{s.t}</h3>
                <p className="mt-2 max-w-sm leading-relaxed text-ink/70">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Reviews({ reviews, loggedIn }: { reviews: PublicReview[]; loggedIn: boolean }) {
  return (
    <section id="avaliacoes" className="bg-bone pb-28 text-ink sm:pb-36">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-ink/15 pt-20">
          <Reveal>
            <h2 className="type-metric text-[clamp(56px,8vw,120px)] leading-[0.88]">Quem usa, conta.</h2>
          </Reveal>
          {reviews.length > 0 && (
            <p className="text-[15px] font-semibold">
              {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5 ·{" "}
              {reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"}
            </p>
          )}
        </div>

        {reviews.length === 0 ? (
          <Reveal delay={0.1}>
            <div className="mt-12 grid items-stretch overflow-hidden rounded-[32px] bg-ink text-bone md:grid-cols-2">
              <Shot id={PHOTOS.coachSpot} alt="Personal acompanhando aluna no levantamento" w={1100} className="h-72 md:h-auto" />
              <div className="p-8 sm:p-12">
                <Quote className="size-10 text-lime" aria-hidden />
                <p className="type-display mt-6 text-[clamp(28px,3vw,40px)]">As primeiras avaliações podem ser suas.</p>
                <p className="mt-4 leading-relaxed text-mist">
                  Aqui só aparecem opiniões reais de quem usa o FITCORE, publicadas depois de revisadas. Use por algumas
                  semanas e conte como foi.
                </p>
                <Link
                  href={loggedIn ? "/avaliar" : "/cadastro"}
                  className="mt-8 inline-flex h-12 items-center rounded-full bg-lime px-6 font-bold text-ink transition-transform hover:scale-[1.03]"
                >
                  {loggedIn ? "Avaliar agora" : "Criar conta"}
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <div className="mt-12 columns-1 gap-6 md:columns-2 lg:columns-3">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={(i % 3) * 0.08} className="mb-6 break-inside-avoid">
                <figure className={`rounded-[28px] p-7 ${i % 4 === 0 ? "bg-lime" : "bg-white"}`}>
                  <div className="flex gap-0.5" aria-label={`${r.rating} de 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`size-4 ${n <= r.rating ? "fill-ink text-ink" : "text-ink/20"}`} />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-[18px] font-medium leading-snug">“{r.body}”</blockquote>
                  <figcaption className="mt-5 text-[14px] font-bold">
                    {r.display_name}
                    <span className="ml-2 font-normal text-ink/50">
                      {new Date(r.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Nutrition() {
  return (
    <section className="bg-ink">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-2">
        <Reveal>
          <div className="grid grid-cols-2 gap-4">
            <Shot id={PHOTOS.mealPrep} alt="Marmitas saudáveis com arroz, legumes e lentilhas" w={800} className="aspect-[3/4] rounded-[28px]" />
            <Shot id={PHOTOS.vegBoard} alt="Ingredientes frescos sobre tábua" w={800} className="mt-12 aspect-[3/4] rounded-[28px]" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="type-metric text-[clamp(56px,7vw,110px)] leading-[0.88]">
            Prato <span className="text-lime">também</span> conta.
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-mist">
            Registre refeições, proteínas, carboidratos, gorduras e água. A IA ajuda a organizar e sugerir trocas — e deixa
            claro que plano individualizado é com nutricionista habilitado.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Gyms({ loggedIn }: { loggedIn: boolean }) {
  const go = (path: string) => (loggedIn ? path : `/cadastro?next=${path}`);
  const cards = [
    ["Aluno", "Painel com evolução real, treino guiado e histórico que não se perde.", go("/dashboard"), "Começar a treinar"],
    ["Personal", "Vê só os alunos vinculados, cria treinos, acompanha frequência e deixa observações.", go("/personal"), "Área do personal"],
    ["Academia", "Alunos ativos, frequência, planos e receita — com permissões aplicadas no banco de dados.", go("/academia"), "Cadastrar minha academia"],
  ];
  return (
    <section id="academias" className="relative overflow-hidden bg-ink">
      <div className="absolute inset-0">
        <Shot id={PHOTOS.gymFloor} alt="" w={2000} className="h-full w-full opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,15,16,0.95),rgba(13,15,16,0.6))]" />
      </div>
      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-10 sm:py-36">
        <Reveal>
          <h2 className="type-metric max-w-4xl text-[clamp(56px,8vw,130px)] leading-[0.88]">Feito para a academia inteira.</h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map(([t, d, href, cta], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <Link
                href={href!}
                className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-ink/60 p-8 backdrop-blur transition-colors duration-300 hover:border-lime hover:bg-lime hover:text-ink"
                data-cursor
              >
                <h3 className="type-display text-[34px]">{t}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-mist transition-colors group-hover:text-ink/80">{d}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-semibold">
                  {cta}
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-lime text-ink">
      <div className="mx-auto max-w-[1400px] px-5 py-28 text-center sm:px-10 sm:py-40">
        <Reveal>
          <p className="type-metric text-[clamp(80px,17vw,280px)] leading-[0.82]">Bora medir?</p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href={loggedIn ? "/dashboard" : "/cadastro"}
            className="group mt-12 inline-flex h-16 items-center gap-3 rounded-full bg-ink pl-8 pr-2.5 text-[17px] font-bold text-bone transition-transform hover:scale-[1.04]"
          >
            {loggedIn ? "Abrir meu painel" : "Criar conta grátis"}
            <span className="flex size-11 items-center justify-center rounded-full bg-lime text-ink transition-transform duration-500 group-hover:rotate-45">
              <ArrowUpRight className="size-5" />
            </span>
          </Link>
        </Reveal>
      </div>
      <div className="flex gap-3 overflow-hidden px-3 pb-3">
        {[PHOTOS.mono, PHOTOS.dumbbells, PHOTOS.womanRack, PHOTOS.coachSpot, PHOTOS.barbellFloor].map((id) => (
          <Shot key={id} id={id} alt="" w={600} className="aspect-[4/3] min-w-[40vw] flex-1 rounded-[20px] sm:min-w-0" />
        ))}
      </div>
    </section>
  );
}

export function Landing({ loggedIn, reviews }: { loggedIn: boolean; reviews: PublicReview[] }) {
  return (
    <div className="overflow-x-clip bg-ink text-bone">
      <Cursor />
      <Nav loggedIn={loggedIn} />
      <Hero loggedIn={loggedIn} />
      <Marquee items={["Avaliação física", "Treino", "Alimentação", "IA de evolução", "Metas"]} />
      <BodySection />
      <Gallery />
      <HowItWorks />
      <Reviews reviews={reviews} loggedIn={loggedIn} />
      <Nutrition />
      <Gyms loggedIn={loggedIn} />
      <FinalCta loggedIn={loggedIn} />
      <footer className="bg-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[13px] text-fog sm:px-10">
          <Logo />
          <div className="flex flex-wrap gap-6">
            <Link href="/privacidade" className="hover:text-bone">
              Privacidade
            </Link>
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-bone">
              Contato
            </a>
            <span>Fotos: Unsplash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
