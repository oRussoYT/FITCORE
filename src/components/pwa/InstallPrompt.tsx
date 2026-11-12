"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "fitcore.install.dismissed";

/** Convite para instalar o FITCORE na tela de início (Android: botão; iPhone: passo a passo). */
export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [event, setEvent] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      const at = Number(localStorage.getItem(KEY) ?? 0);
      if (Date.now() - at < 14 * 86400000) return;
    } catch {
      /* ignora */
    }
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (ios) setMode("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BIPEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignora */
    }
    setMode(null);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setMode(null);
    setEvent(null);
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="relative flex items-start gap-4 rounded-[24px] border border-lime/30 bg-surface p-4 sm:p-5"
          aria-label="Instalar o aplicativo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Tenha o FITCORE como app</p>
            {mode === "android" ? (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-mist">Abre em tela cheia, direto da tela de início, sem loja.</p>
                <button type="button" onClick={install} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-lime px-5 text-[14px] font-bold text-ink">
                  <Download className="size-4" /> Instalar app
                </button>
              </>
            ) : (
              <ol className="mt-2 space-y-1.5 text-[13px] text-mist">
                <li className="flex items-center gap-2">
                  1. Toque em <Share className="size-4 text-ice" /> <span className="font-semibold text-bone">Compartilhar</span>
                </li>
                <li className="flex items-center gap-2">
                  2. Escolha <SquarePlus className="size-4 text-bone" /> <span className="font-semibold text-bone">Adicionar à Tela de Início</span>
                </li>
              </ol>
            )}
          </div>
          <button type="button" onClick={dismiss} aria-label="Agora não" className="flex size-8 shrink-0 items-center justify-center rounded-full text-fog hover:bg-raised">
            <X className="size-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
