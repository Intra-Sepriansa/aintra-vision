"use client";

import { motion } from "framer-motion";
import { ImageDown, Layers, ShieldCheck } from "lucide-react";

import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

export function HeroBento() {
  return (
    <section className="mx-auto mt-10 max-w-6xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <BentoGrid className="gap-6">
          <BentoGridItem
            className="md:col-span-2 bg-gradient-to-br from-white via-white to-neutral-100"
            title={
              <span className="text-lg font-semibold text-neutral-900">
                Magic UI  Aceternity Layout
              </span>
            }
            description="Floating dock, hover border gradient, compare slider, dan Bento grid terintegrasi dalam ekosistem Tailwind v4."
            header={
              <motion.div
                className="h-40 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_60%)]"
                animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
              />
            }
            icon={<Layers className="h-5 w-5 text-neutral-400" />}
          />
          <BentoGridItem
            className="flex flex-col justify-between bg-white"
            title={
              <span className="text-lg font-semibold text-neutral-900">
                Next.js + FastAPI
              </span>
            }
            description="App Router, Tailwind v4, shadcn/ui, background task FastAPI, dan WebSocket progress."
            header={
              <motion.div
                className="h-32 rounded-3xl border border-dashed border-neutral-200"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 6 }}
              />
            }
            icon={<ImageDown className="h-5 w-5 text-neutral-400" />}
          />
          <BentoGridItem
            className="md:col-span-3 bg-white"
            title={
              <span className="text-lg font-semibold text-neutral-900">
                Keamanan & Observabilitas Terstruktur
              </span>
            }
            description="Validasi MIME, batas ukuran, audit log, metrik SSIM/PSNR, dan health endpoint siap produksi."
            header={
              <motion.div
                className="h-24 rounded-3xl bg-gradient-to-r from-blue-50 via-white to-purple-50"
                animate={{ scale: [1, 1.02, 1], rotate: [0, 1.5, 0] }}
                transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
              />
            }
            icon={<ShieldCheck className="h-5 w-5 text-neutral-400" />}
          />
        </BentoGrid>
      </motion.div>
    </section>
  );
}
