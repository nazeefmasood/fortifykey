"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import {
  deriveKey,
  generateVaultKey,
  encryptVaultKey,
  decryptVaultKey,
  generateSalt,
  toBase64,
  fromBase64,
} from "@fortifykey/shared";
import { useMasterKeyStore } from "../../../stores/master-key";
import { useActivityLog } from "../../../stores/activity-log";

export default function LockPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const setVaultKey = useMasterKeyStore((s) => s.setVaultKey);
  const isUnlocked = useMasterKeyStore((s) => s.isUnlocked);
  const { log } = useActivityLog();

  // If already unlocked, go to dashboard
  useEffect(() => {
    if (isUnlocked) {
      router.push("/dashboard");
    }
  }, [isUnlocked, router]);

  // Check if user needs master password setup
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/master-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify", password: "check" }),
        });

        if (res.status === 404) {
          setNeedsSetup(true);
        } else {
          setNeedsSetup(false);
        }
      } catch {
        setNeedsSetup(false);
      } finally {
        setChecking(false);
      }
    }

    checkSetup();
  }, []);

  const handleSetup = async () => {
    if (!masterPassword.trim()) {
      setError("Please enter a master password");
      return;
    }
    if (masterPassword.length < 8) {
      setError("Master password must be at least 8 characters");
      return;
    }
    if (masterPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Tell server to store the hash
      const setupRes = await fetch("/api/master-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", password: masterPassword, hint }),
      });

      if (!setupRes.ok) {
        const data = await setupRes.json();
        setError(data.error || "Setup failed");
        setLoading(false);
        return;
      }

      // 2. Derive encryption key from master password
      const salt = generateSalt();
      const masterKey = await deriveKey(masterPassword, salt, 600_000);

      // 3. Generate a random vault key
      const vaultKey = await generateVaultKey();

      // 4. Encrypt the vault key with the master key
      const encryptedVaultKey = await encryptVaultKey(vaultKey, masterKey);

      // 5. Store the encrypted vault key and salt on the server
      const putRes = await fetch("/api/master-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encrypted_vault_key: encryptedVaultKey,
          key_salt: toBase64(salt),
        }),
      });

      if (!putRes.ok) {
        setError("Failed to save encryption keys");
        setLoading(false);
        return;
      }

      // 6. Store vault key in memory
      setVaultKey(vaultKey);

      // 7. Log the setup
      log("vault_unlocked", "Vault created and unlocked");

      // 8. Notify Electron main process
      if (typeof window !== "undefined" && window.fortifykeyDesktop) {
        await window.fortifykeyDesktop.vault.notifyUnlocked();
      }

      // 9. Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Setup error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!masterPassword.trim()) {
      setError("Please enter your master password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Verify master password with server
      const res = await fetch("/api/master-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", password: masterPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Incorrect master password");
        setLoading(false);
        return;
      }

      // 2. Derive master key from password + stored salt
      const salt = fromBase64(data.key_salt);
      const masterKey = await deriveKey(
        masterPassword,
        salt,
        data.key_iterations
      );

      // 3. Decrypt the vault key
      const vaultKey = await decryptVaultKey(data.encrypted_vault_key, masterKey);

      // 4. Store vault key in memory
      setVaultKey(vaultKey);

      // 5. Log the unlock
      log("vault_unlocked", "Vault unlocked with master password");

      // 6. Notify Electron main process
      if (typeof window !== "undefined" && window.fortifykeyDesktop) {
        await window.fortifykeyDesktop.vault.notifyUnlocked();
      }

      // 7. Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Unlock error:", err);
      setError("Failed to unlock vault. Check your master password.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="w-full min-h-[100dvh] bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-fk-text-muted" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-white flex flex-col px-6 pt-8">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Avatar */}
        <div className="w-[120px] h-[120px] rounded-full bg-black flex items-center justify-center overflow-hidden">
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Lock size={40} className="text-white" />
          )}
        </div>

        <div className="text-center">
          <p className="text-xl font-light uppercase leading-10 tracking-wide">
            {needsSetup ? "Set Up Your Vault" : "Welcome Back!"}
          </p>
          <p className="text-[32px] font-bold leading-10">
            {user?.firstName || "FortifyKey"}
          </p>
        </div>

        <p className="text-fk-text-muted text-base text-center">
          {needsSetup
            ? "Create a master password to encrypt your vault"
            : "Enter your master password to unlock"}
        </p>
      </div>

      {/* Bottom section */}
      <div className="pb-8 pt-4 max-w-md mx-auto w-full">
        {/* Master password input */}
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !needsSetup) void handleUnlock();
            }}
            placeholder="Master Password"
            className="w-full px-5 py-5 pr-12 border border-fk-text-muted rounded-[10px] text-base outline-none focus:border-black transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-fk-text-muted"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Confirm password (setup only) */}
        {needsSetup && (
          <>
            <div className="relative mb-3">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Master Password"
                className="w-full px-5 py-5 pr-12 border border-fk-text-muted rounded-[10px] text-base outline-none focus:border-black transition-colors"
              />
            </div>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Password hint (optional)"
              className="w-full px-5 py-5 border border-gray-300 rounded-[10px] text-base outline-none focus:border-black transition-colors mb-3"
            />
          </>
        )}

        {error && (
          <p className="text-strength-weak text-sm mb-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={() => void (needsSetup ? handleSetup() : handleUnlock())}
          disabled={loading}
          className="w-full py-4 bg-black text-white font-bold rounded-full text-base transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={20} className="animate-spin" />}
          {needsSetup ? "Create Vault" : "Unlock Vault"}
        </button>
      </div>
    </div>
  );
}
