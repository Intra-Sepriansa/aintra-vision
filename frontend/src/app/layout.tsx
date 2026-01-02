<<<<<<< HEAD
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plusjakarta",
  display: "swap",
});
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "AIntra Attendance", template: "%s | AIntra Attendance" },
  description: "Sistem absensi kampus berbasis deteksi wajah - Next.js + FastAPI + YOLO + ArcFace.",
  icons: {
    icon: "/aintra.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
    { color: "#ffffff" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} min-h-dvh bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100`}>
        <AppProviders>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-white"
          >
            Lewati ke konten utama
          </a>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="content" className="flex-1 container px-4 py-6">
              {children}
            </main>
            <SiteFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
=======
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

import { AppProviders } from "@/components/app-providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIntra Vision - Pengolahan Citra Digital",
  description:
    "Toolkit 13 operasi pengolahan citra dengan animasi modern, Next.js App Router, Tailwind, dan FastAPI backend.",
  applicationName: "AIntra Vision",
  keywords: [
    "pengolahan citra",
    "image processing",
    "Next.js",
    "FastAPI",
    "CLAHE",
    "Canny",
    "Gamma Correction",
  ],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  metadataBase: new URL("https://aintra.local"),
  openGraph: {
    title: "AIntra Vision",
    description:
      "Deretan 13 operasi pengolahan citra digital, dan backend FastAPI.",
    url: "https://aintra.local",
    siteName: "AIntra Vision",
    images: [
      {
        url: "/aintra.png",
        width: 512,
        height: 512,
        alt: "Logo AIntra",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIntra Vision",
    description:
      "Toolkit pengolahan citra digital dengan 13 operasi, background task, dan progress WebSocket.",
    images: ["/aintra.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body
        className={cn(
          "min-h-screen bg-white text-neutral-900 antialiased",
          plusJakarta.variable,
        )}
      >
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1" id="beranda">
              {children}
            </main>
            <SiteFooter />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
>>>>>>> ee3fa41 (chore: update README and UI)
