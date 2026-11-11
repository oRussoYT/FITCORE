/**
 * Leitura da postura a partir dos pontos do corpo detectados pela câmera (MediaPipe Pose).
 * Funções puras: recebem pontos normalizados (0–1) e o tamanho do vídeo.
 */

export type Landmark = { x: number; y: number; z?: number; visibility?: number };

export const L = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 31], [28, 32], [0, 11], [0, 12],
];

export type Orientation = "front" | "back" | "side" | "unknown";

const vis = (p?: Landmark) => p?.visibility ?? 0;

/** Corpo inteiro no quadro: ombros, quadris e tornozelos visíveis e dentro da imagem. */
export function fullBodyVisible(lm: Landmark[]): boolean {
  const req = [L.leftShoulder, L.rightShoulder, L.leftHip, L.rightHip, L.leftAnkle, L.rightAnkle];
  if (!req.every((i) => vis(lm[i]) > 0.5)) return false;
  const ys = req.map((i) => lm[i]!.y);
  const headY = lm[L.nose]?.y ?? Math.min(...ys);
  return headY > 0.01 && Math.max(...ys) < 0.99;
}

/** Frente, costas ou lado, comparando largura dos ombros com a altura do tronco. */
export function orientation(lm: Landmark[], width: number, height: number): Orientation {
  const ls = lm[L.leftShoulder];
  const rs = lm[L.rightShoulder];
  const lh = lm[L.leftHip];
  const rh = lm[L.rightHip];
  if (!ls || !rs || !lh || !rh) return "unknown";
  const shoulderW = Math.abs(ls.x - rs.x) * width;
  const torsoH = Math.abs((lh.y + rh.y) / 2 - (ls.y + rs.y) / 2) * height;
  if (torsoH < 10) return "unknown";
  const ratio = shoulderW / torsoH;
  if (ratio < 0.35) return "side";
  if (ratio < 0.45) return "unknown";
  // Na imagem da câmera (sem espelhar), quem está de frente tem o ombro esquerdo à direita da imagem.
  const facing = ls.x > rs.x;
  const faceVisible = vis(lm[L.nose]) > 0.6 && (vis(lm[L.leftEar]) > 0.3 || vis(lm[L.rightEar]) > 0.3);
  if (facing && faceVisible) return "front";
  if (!facing) return "back";
  return "unknown";
}

/** De lado: para qual lado da imagem o rosto aponta (para distinguir as duas laterais). */
export function sideFacing(lm: Landmark[]): "left" | "right" | null {
  const nose = lm[L.nose];
  const ls = lm[L.leftShoulder];
  const rs = lm[L.rightShoulder];
  if (!nose || !ls || !rs || vis(nose) < 0.4) return null;
  const mid = (ls.x + rs.x) / 2;
  return nose.x > mid ? "right" : "left";
}

export type Tilt = { degrees: number; lowerSide: "esquerdo" | "direito" | null };

/** Inclinação entre dois pontos simétricos (graus). Lado "esquerdo/direito" do próprio aluno. */
export function tilt(left: Landmark | undefined, right: Landmark | undefined, width: number, height: number): Tilt | null {
  if (!left || !right || vis(left) < 0.5 || vis(right) < 0.5) return null;
  const dx = (left.x - right.x) * width;
  const dy = (left.y - right.y) * height;
  const deg = Math.abs((Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI);
  if (deg < 1) return { degrees: deg, lowerSide: null };
  return { degrees: deg, lowerSide: left.y > right.y ? "esquerdo" : "direito" };
}

export function describeTilt(name: string, t: Tilt | null): string | null {
  if (!t) return null;
  if (t.lowerSide === null || t.degrees < 1.5) return `${name} alinhados`;
  return `${name}: lado ${t.lowerSide} ${t.degrees.toFixed(1).replace(".", ",")}° mais baixo`;
}

/** Média móvel simples para estabilizar leituras ao vivo. */
export class Smoother {
  private values: number[] = [];
  constructor(private size = 12) {}
  push(v: number) {
    this.values.push(v);
    if (this.values.length > this.size) this.values.shift();
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }
  reset() {
    this.values = [];
  }
}
