"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PwaInstallBanner = () => {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed (running in standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
      return;
    }

    // iOS Safari detection
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as { standalone?: boolean }).standalone;
    setIsIos(ios);

    // Dismissed previously in this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstallEvent(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
    setInstallEvent(null);
    setIsIos(false);
  };

  if (isStandalone || dismissed) return null;

  // Android / Desktop Chrome — show install button
  if (installEvent) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">Install TodoList</span>
          <span className="truncate text-xs text-gray-400">
            Add to your home screen
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDismiss}
            className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari — show manual instruction
  if (isIos) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-1 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Install TodoList</span>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Tap{" "}
          <span className="inline-block rounded bg-gray-700 px-1 font-mono text-white">
            ⎙
          </span>{" "}
          Share → <strong>Add to Home Screen</strong> in Safari
        </p>
      </div>
    );
  }

  return null;
};
