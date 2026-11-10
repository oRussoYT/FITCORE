"use client";

/**
 * Figura anatômica própria do FITCORE (frente e costas lado a lado).
 * Desenho original: metade esquerda definida por pontos e espelhada,
 * com curvas suavizadas (Catmull-Rom → Bézier).
 */

type Pt = [number, number];

function smooth(points: Pt[], closed = true): string {
  const n = points.length;
  if (n < 3) return "";
  const p = (i: number): Pt => points[(i + n) % n] as Pt;
  let d = `M${p(0)[0]},${p(0)[1]}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = closed || i > 0 ? p(i - 1) : p(i);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = closed || i < n - 2 ? p(i + 2) : p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return closed ? `${d} Z` : d;
}

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [100 - x, y] as Pt).reverse();

/** Contorno do corpo (metade esquerda, de cima para baixo e de volta ao centro). */
const HALF_OUTLINE: Pt[] = [
  [50, 26], [45, 27.5], [37, 31], [30, 34.5], [26.5, 41], [25, 50], [24, 61], [22.5, 73], [20.5, 86],
  [18.5, 99], [16.5, 106], [15, 113], [18, 116], [21, 110], [23.5, 101], [27, 88], [30, 76], [32, 66],
  [33.5, 75], [34.5, 88], [33.8, 99], [33.5, 110], [34.5, 128], [36, 148], [37.8, 164], [37, 176],
  [37.5, 192], [39, 205], [37.5, 212], [45.5, 213], [45.3, 204], [46, 190], [46.2, 176], [46.5, 166],
  [48, 146], [49.5, 126], [50, 122],
];

const OUTLINE = smooth([...HALF_OUTLINE, ...mirror(HALF_OUTLINE).slice(1, -1)]);

type Muscle = { group: string; pts: Pt[] };

const FRONT_LEFT: Muscle[] = [
  { group: "shoulders", pts: [[37, 31.5], [31, 34], [27, 40], [26, 48], [29, 50], [33, 44], [37.5, 37]] },
  { group: "chest", pts: [[38.5, 34], [49, 33], [49.2, 45], [44, 48.5], [37.5, 46], [35, 41]] },
  { group: "biceps", pts: [[27.5, 50.5], [32, 47.5], [33.2, 57], [31.2, 69], [27.2, 70], [25.6, 60]] },
  { group: "forearms", pts: [[24.4, 74.5], [29.6, 75], [28.2, 87], [23.6, 101], [20.2, 99], [21.8, 86]] },
  { group: "abs", pts: [[44.2, 50.5], [49.2, 50], [49.2, 96], [45.4, 94], [43.2, 74]] },
  { group: "abs", pts: [[36.6, 57], [42.2, 52.5], [42.6, 78], [38.2, 93], [35.2, 79]] },
  { group: "quads", pts: [[35.4, 111], [43.6, 113], [47.2, 136], [45.4, 161], [39.2, 164], [35.8, 146]] },
  { group: "calves", pts: [[38.4, 175], [43.2, 174], [44.6, 188], [41.8, 201], [38.8, 191]] },
];

const BACK_LEFT: Muscle[] = [
  { group: "traps", pts: [[50, 22.5], [45, 27.5], [37.2, 31.5], [43, 37], [49.5, 56]] },
  { group: "shoulders", pts: [[36.5, 32], [30.8, 34.4], [26.8, 40.5], [26, 48], [29.5, 49], [34, 41]] },
  { group: "back", pts: [[39.6, 38.5], [48.8, 58], [49.2, 90], [42.2, 93], [36.2, 73], [34.6, 52]] },
  { group: "triceps", pts: [[26.2, 49], [31.6, 47.5], [33, 61], [30.6, 72], [25.4, 69], [24.6, 59]] },
  { group: "forearms", pts: [[24.4, 74.5], [29.6, 75], [28.2, 87], [23.6, 101], [20.2, 99], [21.8, 86]] },
  { group: "glutes", pts: [[36.6, 99], [49.2, 100.5], [49.4, 119], [42.6, 124.5], [35.2, 116]] },
  { group: "hamstrings", pts: [[35.4, 125], [46.2, 126], [46.8, 148], [43.6, 166], [38.4, 164], [35.6, 145]] },
  { group: "calves", pts: [[37.4, 170], [45.2, 170.5], [46.2, 186], [42.4, 199], [37.6, 188]] },
];

function withMirror(list: Muscle[]): Array<{ group: string; d: string }> {
  return list.flatMap((m) => [
    { group: m.group, d: smooth(m.pts) },
    { group: m.group, d: smooth(mirror(m.pts)) },
  ]);
}

const FRONT = withMirror(FRONT_LEFT);
const BACK = withMirror(BACK_LEFT);

/** Linhas de definição (decorativas, sem interação). */
const FRONT_LINES = [
  "M44.5,61 L55.5,61", "M44.2,71 L55.8,71", "M44.4,81 L55.6,81", "M50,50 L50,95",
  "M38,42 Q43.5,46 49,44", "M62,42 Q56.5,46 51,44",
];
const BACK_LINES = ["M50,30 L50,96", "M41,62 Q45,66 49,64", "M59,62 Q55,66 51,64"];

export type BodyFigureProps = {
  colorFor: (group: string) => string;
  selected: string | null;
  onSelect: (group: string | null) => void;
  labelFor: (group: string) => string;
};

function Figure({
  muscles,
  lines,
  offsetX,
  caption,
  colorFor,
  selected,
  onSelect,
  labelFor,
}: BodyFigureProps & { muscles: Array<{ group: string; d: string }>; lines: string[]; offsetX: number; caption: string }) {
  return (
    <g transform={`translate(${offsetX},0)`}>
      <ellipse cx={50} cy={13.5} rx={7.6} ry={9.6} fill="#262b2f" stroke="#3a4146" strokeWidth={0.5} />
      <path d="M46.5,21 L53.5,21 L54.5,28 L45.5,28 Z" fill="#262b2f" />
      <path d={OUTLINE} fill="#1d2124" stroke="#3a4146" strokeWidth={0.6} />
      {muscles.map((m, i) => {
        const isSel = selected === m.group;
        return (
          <path
            key={`${m.group}-${i}`}
            d={m.d}
            fill={colorFor(m.group)}
            stroke={isSel ? "#c8f03c" : "#14171a"}
            strokeWidth={isSel ? 1.1 : 0.5}
            className="cursor-pointer transition-[fill,stroke] duration-300 hover:brightness-125 focus:outline-none"
            tabIndex={0}
            role="button"
            aria-pressed={isSel}
            aria-label={labelFor(m.group)}
            onClick={() => onSelect(isSel ? null : m.group)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(isSel ? null : m.group);
              }
            }}
          />
        );
      })}
      {lines.map((d) => (
        <path key={d} d={d} fill="none" stroke="#14171a" strokeWidth={0.5} strokeLinecap="round" pointerEvents="none" opacity={0.7} />
      ))}
      <text x={50} y={224} textAnchor="middle" fill="#6f7773" fontSize={6.5}>
        {caption}
      </text>
    </g>
  );
}

export function BodyFigure(props: BodyFigureProps) {
  return (
    <svg viewBox="0 0 210 228" className="h-full w-full" role="group" aria-label="Corpo visto de frente e de costas">
      <Figure {...props} muscles={FRONT} lines={FRONT_LINES} offsetX={0} caption="Frente" />
      <Figure {...props} muscles={BACK} lines={BACK_LINES} offsetX={110} caption="Costas" />
    </svg>
  );
}
