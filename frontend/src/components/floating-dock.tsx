"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  Home,
  Sparkles,
  SlidersHorizontal,
  Images,
  Clock3,
  LifeBuoy,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { id: "beranda", label: "Beranda", href: "#beranda", icon: Home },
  { id: "operasi", label: "Operasi", href: "#operasi", icon: Sparkles },
  { id: "pengaturan", label: "Pengaturan", href: "#pengaturan", icon: SlidersHorizontal },
  { id: "hasil", label: "Hasil", href: "#hasil", icon: Images },
  { id: "riwayat", label: "Riwayat", href: "#riwayat", icon: Clock3 },
  { id: "bantuan", label: "Bantuan", href: "#bantuan", icon: LifeBuoy },
] as const;

export function FloatingDock({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="relative flex items-center gap-2 rounded-[32px] border border-neutral-200/70 bg-white/70 px-4 py-2 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.4)] backdrop-blur-lg">
        <motion.div
          layout
          className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-r from-neutral-100 via-white to-neutral-100 opacity-70"
        />
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setActiveId(item.id)}
                  onFocus={() => setActiveId(item.id)}
                  className="relative flex"
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-2xl text-neutral-500 transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200",
                      isActive
                        ? "bg-neutral-900 text-white shadow-[0_10px_30px_-15px_rgba(15,23,42,0.65)]"
                        : "hover:bg-neutral-100/80 hover:text-neutral-900",
                    )}
                  >
                    <span className="sr-only">{item.label}</span>
                    <Icon className="h-5 w-5" />
                  </Link>
                </motion.span>
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
