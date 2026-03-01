"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMasterKeyStore } from "../../stores/master-key";
import { useSync } from "../../hooks/useSync";

/**
 * Wraps vault pages. Redirects to lock screen if vault is locked.
 * Starts sync when vault is unlocked.
 */
export function VaultProvider({ children }: { children: React.ReactNode }) {
  const isUnlocked = useMasterKeyStore((s) => s.isUnlocked);
  const resetLockTimer = useMasterKeyStore((s) => s.resetLockTimer);
  const router = useRouter();

  // Start sync
  useSync();

  // Redirect to lock if not unlocked
  useEffect(() => {
    if (!isUnlocked) {
      router.push("/lock");
    }
  }, [isUnlocked, router]);

  // Reset lock timer on any user interaction
  useEffect(() => {
    const handleActivity = () => resetLockTimer();

    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [resetLockTimer]);

  if (!isUnlocked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-fk-blue/30 border-t-fk-blue rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
