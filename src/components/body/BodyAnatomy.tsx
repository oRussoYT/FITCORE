"use client";

/**
 * Ilustração anatômica (frente e costas) fornecida para o FITCORE, em cinza neutro.
 * Por cima dela, regiões clicáveis por grupo muscular são tingidas de vermelho
 * conforme o estímulo REAL registrado (modo "multiply" preserva o sombreamento).
 * Coordenadas no sistema da imagem original (1536 × 1024).
 */

type Pt = [number, number];
type Region = { group: string; pts: Pt[] };

const FRONT_CENTER = 505;
const BACK_CENTER = 1030;

const mirror = (pts: Pt[], center: number): Pt[] => pts.map(([x, y]) => [2 * center - x, y] as Pt);

function both(group: string, pts: Pt[], center: number): Region[] {
  return [
    { group, pts },
    { group, pts: mirror(pts, center) },
  ];
}

const FRONT: Region[] = [
  ...both("shoulders", [[392, 98], [430, 108], [428, 140], [405, 190], [380, 214], [356, 196], [356, 140], [370, 110]], FRONT_CENTER),
  { group: "chest", pts: [[430, 128], [505, 118], [580, 128], [602, 168], [588, 210], [548, 222], [505, 212], [462, 222], [422, 210], [408, 168]] },
  ...both("biceps", [[352, 196], [382, 200], [398, 232], [392, 282], [372, 304], [340, 300], [322, 262], [330, 222]], FRONT_CENTER),
  ...both("forearms", [[322, 300], [366, 304], [370, 340], [352, 392], [328, 406], [306, 392], [304, 342]], FRONT_CENTER),
  { group: "abs", pts: [[440, 220], [505, 214], [570, 220], [588, 262], [580, 312], [560, 346], [505, 360], [450, 346], [430, 312], [422, 262]] },
  ...both("quads", [[408, 378], [452, 352], [496, 404], [500, 470], [490, 560], [470, 620], [432, 626], [404, 584], [394, 500], [396, 420]], FRONT_CENTER),
  ...both("calves", [[398, 664], [446, 660], [472, 720], [470, 800], [452, 868], [420, 880], [396, 820], [386, 740]], FRONT_CENTER),
];

const BACK: Region[] = [
  { group: "traps", pts: [[1030, 28], [1070, 70], [1110, 98], [1078, 150], [1030, 262], [982, 150], [950, 98], [990, 70]] },
  ...both("shoulders", [[898, 92], [950, 98], [948, 140], [930, 182], [892, 196], [868, 170], [872, 120]], BACK_CENTER),
  { group: "back", pts: [[948, 120], [1030, 200], [1112, 120], [1138, 180], [1132, 268], [1110, 330], [1030, 342], [950, 330], [928, 268], [922, 180]] },
  ...both("triceps", [[866, 168], [912, 172], [928, 220], [918, 282], [892, 304], [858, 296], [846, 248], [850, 200]], BACK_CENTER),
  ...both("forearms", [[846, 296], [892, 304], [890, 350], [872, 400], [840, 412], [824, 384], [826, 334]], BACK_CENTER),
  { group: "glutes", pts: [[958, 352], [1030, 344], [1102, 352], [1118, 402], [1100, 456], [1060, 470], [1030, 452], [1000, 470], [960, 456], [942, 402]] },
  ...both("hamstrings", [[936, 466], [1024, 470], [1028, 540], [1018, 610], [1000, 652], [958, 652], [934, 600], [928, 530]], BACK_CENTER),
  ...both("calves", [[914, 652], [1004, 652], [1016, 720], [1012, 800], [986, 870], [940, 872], [912, 810], [902, 730]], BACK_CENTER),
];

const REGIONS = [...FRONT, ...BACK];

const toPath = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x},${y}`).join(" L")} Z`;

export type BodyAnatomyProps = {
  /** 0 a 1: quanto estímulo o grupo recebeu em relação ao mais treinado */
  intensityFor: (group: string) => number;
  selected: string | null;
  onSelect: (group: string | null) => void;
  labelFor: (group: string) => string;
};

export function BodyAnatomy({ intensityFor, selected, onSelect, labelFor }: BodyAnatomyProps) {
  return (
    <svg viewBox="285 0 966 1024" className="h-full w-full" role="group" aria-label="Corpo visto de frente e de costas">
      <defs>
        <filter id="soft-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="sel-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <image href="/body/anatomia.webp" x={0} y={0} width={1536} height={1024} />

      {/* Tingimento por estímulo: vermelho multiplicado sobre o cinza preserva a textura do músculo */}
      <g style={{ mixBlendMode: "multiply" }} filter="url(#soft-edge)" pointerEvents="none">
        {REGIONS.map((r, i) => {
          const t = intensityFor(r.group);
          if (t <= 0) return null;
          return <path key={i} d={toPath(r.pts)} fill="#ff2e3a" opacity={0.35 + 0.65 * t} />;
        })}
      </g>

      {/* Contorno do grupo selecionado */}
      <g pointerEvents="none" filter="url(#sel-glow)">
        {REGIONS.filter((r) => r.group === selected).map((r, i) => (
          <path key={i} d={toPath(r.pts)} fill="none" stroke="#ccff00" strokeWidth={5} strokeLinejoin="round" opacity={0.9} />
        ))}
      </g>

      {/* Áreas clicáveis (invisíveis) */}
      <g>
        {REGIONS.map((r, i) => {
          const isSel = selected === r.group;
          return (
            <path
              key={i}
              d={toPath(r.pts)}
              fill="transparent"
              className="cursor-pointer focus:outline-none"
              tabIndex={0}
              role="button"
              aria-pressed={isSel}
              aria-label={labelFor(r.group)}
              onClick={() => onSelect(isSel ? null : r.group)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onSelect(isSel ? null : r.group);
                }
              }}
            />
          );
        })}
      </g>

      <text x={FRONT_CENTER} y={1012} textAnchor="middle" fill="#6f7773" fontSize={22}>
        Frente
      </text>
      <text x={BACK_CENTER} y={1012} textAnchor="middle" fill="#6f7773" fontSize={22}>
        Costas
      </text>
    </svg>
  );
}
