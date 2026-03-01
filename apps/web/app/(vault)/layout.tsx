"use client";

import { usePlatform } from "../../hooks/usePlatform";
import { WebShell } from "../../components/shells/WebShell";
import { DesktopShell } from "../../components/shells/DesktopShell";
import { PwaShell } from "../../components/shells/PwaShell";
import { VaultProvider } from "../../components/providers/VaultProvider";

const shells = {
  web: WebShell,
  desktop: DesktopShell,
  pwa: PwaShell,
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  const Shell = shells[platform];

  return (
    <VaultProvider>
      <Shell>{children}</Shell>
    </VaultProvider>
  );
}
