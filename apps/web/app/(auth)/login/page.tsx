"use client";

import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Chrome, Facebook, Apple, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      router.push("/lock");
    }
  }, [isSignedIn, router]);

  const handleOAuth = async (
    provider: "oauth_google" | "oauth_facebook" | "oauth_apple"
  ) => {
    if (!signInLoaded || !signIn) return;

    setLoadingProvider(provider);
    setError("");

    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: "/login/sso-callback",
        redirectUrlComplete: "/lock",
      });
    } catch (err) {
      console.error("OAuth error:", err);
      setError("Authentication failed. Please try again.");
      setLoadingProvider(null);
    }
  };

  const oauthButtons = [
    {
      provider: "oauth_google" as const,
      label: "Continue with Google",
      icon: Chrome,
      color: "#DB4437",
    },
    {
      provider: "oauth_facebook" as const,
      label: "Continue with Facebook",
      icon: Facebook,
      color: "#4267B2",
    },
    {
      provider: "oauth_apple" as const,
      label: "Continue with Apple",
      icon: Apple,
      color: "#000000",
    },
  ];

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated gradient overlay */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(67,24,255,0.5) 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      {/* Decorative circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col justify-between min-h-[100dvh] px-6 pt-16 pb-10 transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
        }`}
      >
        {/* Top: App branding */}
        <div className="text-center">
          <h1 className="text-white text-[42px] font-[800] tracking-[2px]">
            FortifyKey
          </h1>
          <p className="text-white/80 text-base mt-1">
            Secure. Personal. Collaborate.
          </p>
        </div>

        {/* Center: Auth box */}
        <div className="mx-auto w-full max-w-md">
          <div className="glass rounded-[25px] p-8">
            <h2 className="text-white text-[28px] font-bold">Welcome</h2>
            <p className="text-white/80 text-base mb-8">
              Sign in to continue to your vault
            </p>

            {error && (
              <p className="text-red-300 text-sm mb-4 text-center">{error}</p>
            )}

            <div className="flex flex-col gap-4">
              {oauthButtons.map((btn) => {
                const isLoading = loadingProvider === btn.provider;
                return (
                  <button
                    key={btn.provider}
                    className="flex items-center gap-4 w-full py-4 px-5 rounded-xl text-white font-semibold text-base transition-transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: btn.color }}
                    onClick={() => handleOAuth(btn.provider)}
                    disabled={loadingProvider !== null}
                  >
                    {isLoading ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <btn.icon size={22} />
                    )}
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Terms */}
        <p className="text-center text-white/50 text-sm">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
