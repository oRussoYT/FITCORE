import { describe, expect, it } from "vitest";
import { L, fullBodyVisible, orientation, sideFacing, tilt, type Landmark } from "./analysis";

function body(o: { lsx: number; rsx: number; noseX?: number; noseVis?: number; lsy?: number; rsy?: number }): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  lm[L.nose] = { x: o.noseX ?? 0.5, y: 0.12, visibility: o.noseVis ?? 0.95 };
  lm[L.leftEar] = { x: 0.53, y: 0.12, visibility: 0.8 };
  lm[L.rightEar] = { x: 0.47, y: 0.12, visibility: 0.8 };
  lm[L.leftShoulder] = { x: o.lsx, y: o.lsy ?? 0.25, visibility: 0.95 };
  lm[L.rightShoulder] = { x: o.rsx, y: o.rsy ?? 0.25, visibility: 0.95 };
  lm[L.leftHip] = { x: o.lsx > o.rsx ? 0.56 : 0.44, y: 0.55, visibility: 0.95 };
  lm[L.rightHip] = { x: o.lsx > o.rsx ? 0.44 : 0.56, y: 0.55, visibility: 0.95 };
  lm[L.leftAnkle] = { x: 0.55, y: 0.92, visibility: 0.9 };
  lm[L.rightAnkle] = { x: 0.45, y: 0.92, visibility: 0.9 };
  return lm;
}

describe("postura pela câmera", () => {
  it("reconhece corpo inteiro", () => {
    expect(fullBodyVisible(body({ lsx: 0.66, rsx: 0.34 }))).toBe(true);
    const cut = body({ lsx: 0.66, rsx: 0.34 });
    cut[L.leftAnkle] = { x: 0.5, y: 1.05, visibility: 0.2 };
    expect(fullBodyVisible(cut)).toBe(false);
  });
  it("distingue frente, costas e lado", () => {
    expect(orientation(body({ lsx: 0.66, rsx: 0.34 }), 720, 1280)).toBe("front");
    expect(orientation(body({ lsx: 0.34, rsx: 0.66, noseVis: 0.2 }), 720, 1280)).toBe("back");
    expect(orientation(body({ lsx: 0.52, rsx: 0.48 }), 720, 1280)).toBe("side");
  });
  it("sabe para que lado o rosto aponta de perfil", () => {
    expect(sideFacing(body({ lsx: 0.52, rsx: 0.48, noseX: 0.6 }))).toBe("right");
    expect(sideFacing(body({ lsx: 0.52, rsx: 0.48, noseX: 0.4 }))).toBe("left");
  });
  it("mede inclinação dos ombros", () => {
    const t = tilt({ x: 0.62, y: 0.27, visibility: 1 }, { x: 0.38, y: 0.25, visibility: 1 }, 720, 1280);
    expect(t?.lowerSide).toBe("esquerdo");
    expect(t!.degrees).toBeGreaterThan(5);
    expect(tilt({ x: 0.62, y: 0.25, visibility: 1 }, { x: 0.38, y: 0.25, visibility: 1 }, 720, 1280)?.lowerSide).toBeNull();
  });
});
