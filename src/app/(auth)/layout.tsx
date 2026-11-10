import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Lado da marca: uma "leitura" de evolução, não uma imagem genérica */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-graphite lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="relative z-10 max-w-md">
          <p className="type-display text-[44px] text-bone">{brand.tagline}</p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-mist">
            Avaliações, treinos e alimentação no mesmo lugar. A IA explica sua evolução usando apenas o que você
            registrou.
          </p>
        </div>
        <ProgressTrace />
      </aside>
      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Ilustração: linha de medidas ao longo de semanas, com marcações de avaliação. */
function ProgressTrace() {
  const pts = [62, 60, 61, 57, 55, 56, 52, 49, 50, 46, 44, 41];
  const w = 520;
  const h = 150;
  const step = w / (pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${((v - 35) / 30) * h}`).join(" ");
  return (
    <div className="relative" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full">
        {pts.map((_, i) => (
          <line key={i} x1={i * step} x2={i * step} y1={0} y2={h} stroke="#22272b" strokeWidth="1" />
        ))}
        <path d={d} fill="none" stroke="#3a4146" strokeWidth="2" />
        <path d={d} fill="none" stroke="#c8f03c" strokeWidth="2" strokeDasharray="4 7" opacity="0.55" />
        {[0, 4, 8, 11].map((i) => (
          <circle key={i} cx={i * step} cy={(((pts[i] ?? 0) - 35) / 30) * h} r={i === 11 ? 5 : 3.5} fill={i === 11 ? "#c8f03c" : "#eceee8"} />
        ))}
        <text x={0} y={h + 24} fill="#6f7773" fontSize="12">
          semana 1
        </text>
        <text x={w} y={h + 24} fill="#6f7773" fontSize="12" textAnchor="end">
          hoje
        </text>
      </svg>
      <p className="mt-3 text-[12px] text-fog">Ilustração. Seus gráficos usam somente dados registrados por você.</p>
    </div>
  );
}
