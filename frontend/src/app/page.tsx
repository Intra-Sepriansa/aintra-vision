<<<<<<< HEAD
﻿"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { HeroBento } from "@/components/hero-bento";
import { FileUploadCard } from "@/components/file-upload-card";
import { SettingsPanel } from "@/components/settings-panel";
import { HistoryTimeline } from "@/components/history-timeline";
import { SupportSection } from "@/components/support-section";
import { OperationsCarousel } from "@/components/operations-carousel";
import { ResultsViewer } from "@/components/results-viewer";

export default function HomePage() {
  return (
    <div className="space-y-16 pb-24">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(37,99,235,0.15),_transparent_70%)]" />
        <div className="absolute -right-40 top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.18),_transparent_70%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 px-6 py-16 lg:flex-row lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 flex-1 space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
              AIntra Vision
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              13 Operasi Pengolahan Citra Digital & Backend FastAPI.
            </h1>
            <p className="max-w-xl text-base text-neutral-600">
              Bangun pipeline pengolahan citra modern. Unggah gambar, jelajahi operasi dari gamma hingga Canny, sesuaikan parameter dengan panel interaktif, dan pantau progres realtime melalui WebSocket.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="gradient" size="lg" asChild>
                <a href="#operasi">Jelajahi Operasi</a>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href="#pengaturan">Atur Parameter</a>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative flex-1"
          >
            <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] border border-neutral-200/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)]">
              <Image
                src="/aintra.png"
                alt="AIntra preview"
                width={420}
                height={420}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
                Next.js + FastAPI
              </div>
              <div className="absolute bottom-4 right-4 rounded-full bg-neutral-900/90 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                Progress Realtime
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <HeroBento />

      <section className="mx-auto max-w-6xl px-6">
        <FileUploadCard />
      </section>


      <OperationsCarousel />

      <ResultsViewer />

      <SettingsPanel />

      <HistoryTimeline />

      <SupportSection />
    </div>
  );
}


=======
﻿"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { HeroBento } from "@/components/hero-bento";
import { FileUploadCard } from "@/components/file-upload-card";
import { SettingsPanel } from "@/components/settings-panel";
import { HistoryTimeline } from "@/components/history-timeline";
import { SupportSection } from "@/components/support-section";
import { OperationsCarousel } from "@/components/operations-carousel";
import { AreaResult } from "@/components/area-result";

const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: "easeOut" },
  viewport: { once: true, margin: "-80px" },
};

export default function HomePage() {
  return (
    <div className="space-y-16 pb-24">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(37,99,235,0.15),_transparent_70%)]" />
        <div className="absolute -right-40 top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.18),_transparent_70%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 px-6 py-16 lg:flex-row lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 flex-1 space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
              AIntra Vision
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
              Operasi Pengolahan Citra Digital
            </h1>
            <p className="max-w-xl text-base text-neutral-600">
              Bangun pipeline pengolahan citra modern. Unggah gambar, jelajahi operasi dari gamma hingga Canny, sesuaikan parameter dengan panel interaktif, dan pantau progres realtime melalui WebSocket.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="gradient" size="lg" asChild>
                <a href="#operasi">Jelajahi Operasi</a>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href="#pengaturan">Atur Parameter</a>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative flex-1"
          >
            <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[32px] border border-neutral-200/70 bg-white/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)]">
              <Image
                src="/aintra.png"
                alt="AIntra preview"
                width={420}
                height={420}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
                Next.js + FastAPI
              </div>
              <div className="absolute bottom-4 right-4 rounded-full bg-neutral-900/90 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                Progress Realtime
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.div {...sectionReveal}>
        <HeroBento />
      </motion.div>

      <motion.section {...sectionReveal} className="mx-auto max-w-6xl px-6">
        <FileUploadCard />
      </motion.section>

      <motion.div {...sectionReveal}>
        <OperationsCarousel />
      </motion.div>

      <motion.div {...sectionReveal}>
        <AreaResult />
      </motion.div>

      <motion.div {...sectionReveal}>
        <SettingsPanel />
      </motion.div>

      <motion.div {...sectionReveal}>
        <HistoryTimeline />
      </motion.div>

      <motion.div {...sectionReveal}>
        <SupportSection />
      </motion.div>
    </div>
  );
}


>>>>>>> ee3fa41 (chore: update README and UI)
