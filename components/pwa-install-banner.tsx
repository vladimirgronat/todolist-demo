"use client";

import { useSyncExternalStore, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallEvent: BeforeInstallPromptEvent | null;
  }
}

function subscribePwaPrompt(notify: () => void) {
  const handler = (e: Event) => {
    e.preventDefault();
    window.__pwaInstallEvent = e as BeforeInstallPromptEvent;
    notify();
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

export const PwaInstallBanner = () => {
  const hasNativePrompt = useSyncExternalStore(
    subscribePwaPrompt,
    () => !!window.__pwaInstallEvent,
    () => false,
  );

  const isStandalone = useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(display-mode: standalone)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );

  const isIos = useSyncExternalStore(
    () => () => {},
    () =>
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as { standalone?: boolean }).standalone,
    () => false,
  );

  const sessionDismissed = useSyncExternalStore(
    () => () => {},
    () => !!sessionStorage.getItem("pwa-banner-dismissed"),
    () => false,
  );

  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const visible = !isStandalone && !sessionDismissed && !dismissed && !installed;

  const handleInstall = async () => {
    const event = window.__pwaInstallEvent;
    if (event) {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") {
        window.__pwaInstallEvent = null;
        setInstalled(true);
      }
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setDismissed(true);
  };

  if (!visible) return null;

  // iOS Safari
  if (isIos) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-1 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Install TodoList</span>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-white" aria-label="Dismiss">✕</button>
        </div>
        <p className="text-xs text-gray-400">
          Tap <span className="inline-block rounded bg-gray-700 px-1 font-mono text-white">⎙</span> Share →{" "}
          <strong>Add to Home Screen</strong> in Safari
        </p>
      </div>
    );
  }

  // Android Chrome — native prompt available
  if (hasNativePrompt) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold">Install TodoList</span>
          <span className="truncate text-xs text-gray-400">Add to your home screen</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={handleDismiss} className="rounded px-2 py-1 text-xs text-gray-400 hover:text-white">Not now</button>
          <button onClick={handleInstall} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold hover:bg-blue-500">Install</button>
        </div>
      </div>
    );
  }

  // Android Chrome — no native prompt yet (manual fallback)
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-1 rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Install TodoList</span>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-white" aria-label="Dismiss">✕</button>
      </div>
      <p className="text-xs text-gray-400">
        Tap <strong>⋮</strong> menu in Chrome →{" "}
        <strong>Add to Home screen</strong>
      </p>
    </div>
  );
};
