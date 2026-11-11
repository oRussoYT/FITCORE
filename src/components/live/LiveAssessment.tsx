"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, PhoneOff, RefreshCw, Sparkles, Video } from "lucide-react";
import { registerPhoto } from "@/app/(app)/evolucao/fotos/actions";
import { LogoMark } from "@/components/brand/Logo";
import { getBrowserClient } from "@/lib/supabase/client";
import { CONNECTIONS, L, Smoother, describeTilt, fullBodyVisible, orientation, sideFacing, tilt, type Landmark } from "@/lib/pose/analysis";

type Pose = "front" | "right" | "back" | "left";
type Step = { pose: Pose; title: string; say: string; want: "front" | "back" | "side" };

const STEPS: Step[] = [
  { pose: "front", want: "front", title: "De frente", say: "Vamos começar. Fique de frente para a câmera, braços relaxados ao lado do corpo, com o corpo inteiro aparecendo." },
  { pose: "right", want: "side", title: "Lateral", say: "Ótimo. Agora vire de lado, mantendo a postura natural." },
  { pose: "back", want: "back", title: "De costas", say: "Perfeito. Agora fique de costas para a câmera." },
  { pose: "left", want: "side", title: "Outra lateral", say: "Última. Vire para o outro lado." },
];

const MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const HOLD_MS = 1800;

type Detector = { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Landmark[][] }; close: () => void };

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LiveAssessment({ studentId, canAnalyze }: { studentId: string; canAnalyze: boolean }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<Detector | null>(null);
  const raf = useRef<number | null>(null);
  const holdSince = useRef<number | null>(null);
  const firstSide = useRef<"left" | "right" | null>(null);
  const capturing = useRef(false);
  const shoulder = useRef(new Smoother());
  const hip = useRef(new Smoother());
  const lastReadings = useRef("");

  const [phase, setPhase] = useState<"lobby" | "connecting" | "call" | "analyzing" | "done" | "error">("lobby");
  const [stepIdx, setStepIdx] = useState(0);
  const [hint, setHint] = useState("Preparando…");
  const [ready, setReady] = useState(0); // 0–1 progresso de estabilidade
  const [readings, setReadings] = useState<string[]>([]);
  const [shots, setShots] = useState<Array<{ pose: Pose; url: string }>>([]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;

  const speak = useCallback((text: string) => {
    if (!voiceRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith("pt"));
    if (v) u.voice = v;
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }, []);

  const stopAll = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    detector.current?.close();
    detector.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => stopAll, [stopAll]);
  useEffect(() => {
    if (phase !== "call" && phase !== "analyzing") return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function openCamera(mode: "user" | "environment") {
    stream.current?.getTracks().forEach((t) => t.stop());
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    stream.current = s;
    if (video.current) {
      video.current.srcObject = s;
      await video.current.play();
    }
  }

  async function start() {
    setPhase("connecting");
    setError(null);
    try {
      await openCamera(facing);
      const vision = await import("@mediapipe/tasks-vision");
      const files = await vision.FilesetResolver.forVisionTasks(WASM);
      detector.current = (await vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      })) as unknown as Detector;
      setPhase("call");
      setStepIdx(0);
      speak(`Olá! Sou o coach do FITCORE. ${STEPS[0]!.say}`);
      loop();
    } catch (e) {
      console.error(e);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Permita o acesso à câmera no navegador para fazer a avaliação."
          : "Não foi possível iniciar a câmera ou o detector de postura neste aparelho.",
      );
      setPhase("error");
      stopAll();
    }
  }

  async function capture(step: Step) {
    const v = video.current;
    if (!v) return;
    capturing.current = true;
    speak("Segura assim. Três, dois, um.");
    await new Promise((r) => setTimeout(r, 2600));
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.88));
    if (!blob) {
      capturing.current = false;
      return;
    }
    setShots((s) => [...s, { pose: step.pose, url: URL.createObjectURL(blob) }]);
    const path = `${studentId}/${crypto.randomUUID()}.jpg`;
    const up = await getBrowserClient().storage.from("body-photos").upload(path, blob, { contentType: "image/jpeg" });
    if (!up.error) await registerPhoto({ path, pose: step.pose, takenOn: today() });
    else setError("Uma foto não pôde ser salva. Vamos continuar.");

    holdSince.current = null;
    setReady(0);
    capturing.current = false;
    setStepIdx((i) => {
      const next = i + 1;
      if (next >= STEPS.length) {
        void finish();
        return i;
      }
      speak(STEPS[next]!.say);
      return next;
    });
  }

  const stepRef = useRef(stepIdx);
  stepRef.current = stepIdx;

  function loop() {
    const v = video.current;
    const c = canvas.current;
    const d = detector.current;
    if (!v || !c || !d) return;
    const tick = () => {
      if (!detector.current) return;
      if (v.readyState >= 2) {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        let lm: Landmark[] | undefined;
        try {
          lm = d.detectForVideo(v, performance.now()).landmarks[0];
        } catch {
          lm = undefined;
        }
        const step = STEPS[stepRef.current]!;
        if (!lm) {
          setHint("Não estou te vendo. Afaste-se até o corpo inteiro aparecer.");
          holdSince.current = null;
          setReady(0);
        } else {
          // Esqueleto
          ctx.lineWidth = Math.max(3, w / 220);
          ctx.strokeStyle = "rgba(204,255,0,0.9)";
          ctx.shadowColor = "rgba(204,255,0,0.8)";
          ctx.shadowBlur = 12;
          for (const [a, b] of CONNECTIONS) {
            const p = lm[a];
            const q = lm[b];
            if (!p || !q || (p.visibility ?? 0) < 0.4 || (q.visibility ?? 0) < 0.4) continue;
            ctx.beginPath();
            ctx.moveTo(p.x * w, p.y * h);
            ctx.lineTo(q.x * w, q.y * h);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#eceee8";
          for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
            const p = lm[i];
            if (!p || (p.visibility ?? 0) < 0.4) continue;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, Math.max(4, w / 160), 0, Math.PI * 2);
            ctx.fill();
          }
          // Linhas de nível de ombros e quadril
          for (const [a, b] of [[L.leftShoulder, L.rightShoulder], [L.leftHip, L.rightHip]] as const) {
            const p = lm[a];
            const q = lm[b];
            if (!p || !q) continue;
            ctx.setLineDash([10, 10]);
            ctx.strokeStyle = "rgba(236,238,232,0.5)";
            ctx.beginPath();
            ctx.moveTo(0, ((p.y + q.y) / 2) * h);
            ctx.lineTo(w, ((p.y + q.y) / 2) * h);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          const full = fullBodyVisible(lm);
          const o = orientation(lm, w, h);
          if (o === "front" || o === "back") {
            const st = tilt(lm[L.leftShoulder], lm[L.rightShoulder], w, h);
            const ht = tilt(lm[L.leftHip], lm[L.rightHip], w, h);
            const sd = st ? shoulder.current.push(st.degrees) : null;
            const hd = ht ? hip.current.push(ht.degrees) : null;
            const next = [
              describeTilt("Ombros", st && sd !== null ? { ...st, degrees: sd } : null),
              describeTilt("Quadril", ht && hd !== null ? { ...ht, degrees: hd } : null),
            ].filter(Boolean) as string[];
            if (next.join("|") !== lastReadings.current) {
              lastReadings.current = next.join("|");
              setReadings(next);
            }
          }

          let ok = full && o === step.want;
          if (ok && step.want === "side") {
            const sf = sideFacing(lm);
            if (step.pose === "right") {
              if (sf) firstSide.current = sf;
            } else if (firstSide.current && sf === firstSide.current) {
              ok = false;
              setHint("Agora vire para o outro lado.");
            }
          }
          if (!full) setHint("Afaste-se um pouco: preciso ver da cabeça aos pés.");
          else if (!ok && o !== step.want) setHint(step.want === "side" ? "Fique de lado para a câmera." : step.want === "back" ? "Vire de costas para a câmera." : "Fique de frente para a câmera.");
          else if (ok) setHint("Perfeito, fique parado…");

          if (ok && !capturing.current) {
            holdSince.current ??= performance.now();
            const p = Math.min(1, (performance.now() - holdSince.current) / HOLD_MS);
            setReady(p);
            if (p >= 1) void capture(step);
          } else if (!capturing.current) {
            holdSince.current = null;
            setReady(0);
          }
        }
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  async function finish() {
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    setPhase("analyzing");
    if (!canAnalyze) {
      speak("Fotos salvas. Para a análise da inteligência artificial, autorize o envio na página de fotos.");
      setPhase("done");
      return;
    }
    speak("Pronto! Estou analisando suas fotos. Isso leva alguns segundos.");
    try {
      const res = await fetch("/api/ai/fotos", { method: "POST" });
      const json = (await res.json()) as { error?: string; report?: { content: Record<string, unknown> } };
      if (!res.ok || !json.report) {
        setError(json.error ?? "Não foi possível analisar agora.");
        speak("Não consegui concluir a análise agora. Suas fotos ficaram salvas.");
      } else {
        setReport(json.report.content);
        const resumo = typeof json.report.content.resumo === "string" ? json.report.content.resumo : "Sua análise está pronta.";
        speak(resumo);
      }
    } catch {
      setError("Falha de conexão durante a análise.");
    }
    setPhase("done");
    detector.current?.close();
    detector.current = null;
  }

  function hangUp() {
    stopAll();
    router.push("/evolucao/fotos");
    router.refresh();
  }

  const step = STEPS[stepIdx]!;
  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const mirror = facing === "user";

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black text-bone">
      {/* Vídeo e esqueleto */}
      <video ref={video} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${mirror ? "-scale-x-100" : ""} ${phase === "call" ? "" : "opacity-30"}`} />
      <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55),transparent_22%,transparent_65%,rgba(0,0,0,0.8))]" />

      {/* Topo estilo chamada */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <span className="relative">
            <LogoMark className="size-10" />
            {phase === "call" && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-black bg-lime" />}
          </span>
          <div>
            <p className="text-[15px] font-semibold">FITCORE Coach</p>
            <p className="flex items-center gap-1.5 text-[12px] text-bone/70">
              {phase === "call" || phase === "analyzing" ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-coral" /> ao vivo · {mm}
                </>
              ) : (
                "avaliação por vídeo"
              )}
            </p>
          </div>
        </div>
        {phase === "call" && (
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s.pose} className={`h-1.5 w-7 rounded-full ${i < stepIdx ? "bg-lime" : i === stepIdx ? "bg-bone" : "bg-white/25"}`} />
            ))}
          </div>
        )}
      </header>

      {/* Conteúdo central por fase */}
      <AnimatePresence mode="wait">
        {phase === "lobby" || phase === "error" ? (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-lime/15 ring-8 ring-lime/5">
                <Video className="size-10 text-lime" />
              </div>
              <h1 className="type-display mt-6 text-[30px]">Avaliação ao vivo</h1>
              <p className="mt-3 leading-relaxed text-bone/75">
                Apoie o celular na altura da cintura, a uns 2,5 metros de distância, num lugar iluminado. O coach vai te guiar por
                voz: frente, lado, costas e o outro lado. As fotos são tiradas sozinhas.
              </p>
              <p className="mt-3 text-[13px] text-bone/50">A leitura do corpo acontece no seu aparelho. Só as 4 fotos finais vão para sua pasta privada.</p>
              {error && <p className="mt-4 rounded-xl bg-coral/15 px-4 py-3 text-[14px] text-coral">{error}</p>}
              <button type="button" onClick={start} className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-lime px-8 text-[17px] font-bold text-ink">
                <Video className="size-5" /> Iniciar chamada
              </button>
            </div>
          </motion.div>
        ) : phase === "connecting" ? (
          <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 className="size-10 animate-spin text-lime" />
            <p className="text-bone/80">Conectando com o coach…</p>
          </motion.div>
        ) : phase === "analyzing" ? (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="flex size-24 items-center justify-center rounded-full bg-lime text-ink">
              <Sparkles className="size-10" />
            </motion.div>
            <p className="text-[18px] font-semibold">Analisando suas fotos…</p>
          </motion.div>
        ) : phase === "done" ? (
          <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 overflow-y-auto bg-ink/90 p-6 pt-24 backdrop-blur">
            <div className="mx-auto max-w-lg">
              <div className="grid grid-cols-4 gap-2">
                {shots.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.pose} src={s.url} alt={s.pose} className="aspect-[3/4] w-full rounded-xl object-cover" />
                ))}
              </div>
              {report ? (
                <div className="mt-6 rounded-3xl border border-lime/30 bg-lime/[0.06] p-5">
                  <p className="flex items-center gap-2 text-[13px] text-lime">
                    <Sparkles className="size-4" /> Análise do coach
                  </p>
                  {typeof report.resumo === "string" && <p className="mt-3 text-[17px] leading-relaxed">{report.resumo}</p>}
                  {(["postura", "observacoes_visuais", "sugestoes"] as const).map((k) =>
                    Array.isArray(report[k]) && (report[k] as unknown[]).length ? (
                      <ul key={k} className="mt-4 list-disc space-y-1 pl-5 text-[14.5px] text-bone/85">
                        {(report[k] as unknown[]).slice(0, 4).map((x, i) => (
                          <li key={i}>{String(x)}</li>
                        ))}
                      </ul>
                    ) : null,
                  )}
                  <p className="mt-4 text-[11.5px] text-bone/50">Gerado por IA. Não estima gordura nem massa muscular e não substitui avaliação profissional.</p>
                </div>
              ) : (
                <p className="mt-6 rounded-2xl bg-surface p-4 text-[14px] text-bone/80">{error ?? "Fotos salvas na sua evolução."}</p>
              )}
              <button type="button" onClick={hangUp} className="mt-6 h-14 w-full rounded-2xl bg-lime text-[17px] font-bold text-ink">
                Ver minha evolução
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Durante a chamada */}
      {phase === "call" && (
        <>
          <div className="absolute inset-x-0 top-24 flex flex-col items-center gap-2 px-4">
            <AnimatePresence mode="wait">
              <motion.p key={step.title} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-bone px-4 py-1.5 text-[17px] font-bold text-ink">
                {step.title}
              </motion.p>
            </AnimatePresence>
            {readings.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {readings.map((r) => (
                  <span key={r} className="rounded-full bg-black/55 px-3 py-1 text-[12.5px] backdrop-blur">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 p-6 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="w-full max-w-md text-center">
              <p className="text-[16px] font-medium drop-shadow">{hint}</p>
              <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-lime transition-[width] duration-150" style={{ width: `${ready * 100}%` }} />
              </div>
            </div>
            {shots.length > 0 && (
              <div className="flex gap-2">
                {shots.map((s) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.pose} src={s.url} alt="" className="h-14 w-10 rounded-lg border-2 border-lime object-cover" />
                ))}
              </div>
            )}
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setVoiceOn((v) => !v)} aria-label={voiceOn ? "Silenciar coach" : "Ativar voz do coach"} className="flex size-14 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                {voiceOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
              </button>
              <button type="button" onClick={hangUp} aria-label="Encerrar" className="flex size-16 items-center justify-center rounded-full bg-coral text-white shadow-[0_10px_30px_-5px_rgba(255,122,102,0.7)]">
                <PhoneOff className="size-7" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = facing === "user" ? "environment" : "user";
                  setFacing(next);
                  try {
                    await openCamera(next);
                  } catch {
                    setError("Não foi possível trocar de câmera.");
                  }
                }}
                aria-label="Trocar câmera"
                className="flex size-14 items-center justify-center rounded-full bg-white/15 backdrop-blur"
              >
                <RefreshCw className="size-6" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
