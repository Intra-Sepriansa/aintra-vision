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
