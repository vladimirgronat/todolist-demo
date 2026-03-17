"use client";

import { useEffect } from "react";
import { setupDeepLinkListener } from "@/lib/capacitor-auth";

export const CapacitorInit = () => {
  useEffect(() => {
    setupDeepLinkListener();
  }, []);

  return null;
};
