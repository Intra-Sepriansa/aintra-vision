"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import { FloatingDock } from "@/components/floating-dock";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent bg-white/70 backdrop-blur-2xl transition-all supports-[backdrop-filter]:bg-white/60",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
        <Link href="#beranda" className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
            className="flex items-center gap-3"
          >
            <Image
              src="/intra.png"
              width={40}
              height={40}
              alt="AIntra logo"
              className="rounded-2xl shadow-[0_10px_30px_-15px_rgba(37,99,235,0.45)]"
              priority
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-400">
                AINTRA
              </span>
              <span className="text-sm font-semibold text-neutral-900">
                Vision  Pengolahan Citra Digital
              </span>
            </div>
          </motion.div>
        </Link>
        <div className="ml-auto hidden lg:block">
          <FloatingDock />
        </div>
        <div className="ml-auto block lg:hidden">
          <FloatingDock />
        </div>
      </div>
    </header>
  );
}
