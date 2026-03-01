"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "#1a1a2e",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "12px 16px",
          fontFamily: "var(--font-space-grotesk)",
        },
        classNames: {
          success: "text-green-400",
          error: "text-red-400",
          warning: "text-yellow-400",
          info: "text-blue-400",
        },
      }}
      expand={false}
      richColors
      closeButton
    />
  );
}
