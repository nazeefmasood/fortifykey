import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "../components/providers/ToastProvider";

const spaceGrotesk = localFont({
  src: [
    { path: "../public/fonts/SpaceGrotesk-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/SpaceGrotesk-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/SpaceGrotesk-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/SpaceGrotesk-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/SpaceGrotesk-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FortifyKey — Secure Password Manager",
  description:
    "A secure, cross-platform password manager with end-to-end encryption.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#628EFB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        cssLayerName: "clerk",
      }}
    >
      <html lang="en">
        <body className={spaceGrotesk.variable}>
          {children}
          <ToastProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
