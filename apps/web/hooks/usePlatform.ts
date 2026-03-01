"use client";

import { useState, useEffect } from "react";
import type { Platform } from "@fortifykey/shared";

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("web");

  useEffect(() => {
    if ((window as unknown as Record<string, unknown>).__ELECTRON__) {
      setPlatform("desktop");
    } else if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as Record<string, unknown>).standalone === true ||
      window.innerWidth < 768
    ) {
      setPlatform("pwa");
    } else {
      setPlatform("web");
    }
  }, []);

  return platform;
}
