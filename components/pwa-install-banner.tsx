"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallEvent: BeforeInstallPromptEvent | null;
  }
}

export const PwaInstallBanner = () => {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);

  useEffect(() => {
    // Don't show if already installed in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as { standalone?: boolean }).standalone;
    setIsIos(ios);

    // Check for event captured before React hydrated
    if (window.__pwaInstallEvent) {
      setHasNativePrompt(true);
    }

    // Also listen in case it fires after mount
    const handler = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallEvent = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    setVisible(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    const event = window.__pwaInstallEvent;
    if (event) {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") {
        window.__pwaInstallEvent = null;
        setVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
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
