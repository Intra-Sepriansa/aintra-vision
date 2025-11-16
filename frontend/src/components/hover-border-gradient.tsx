"use client";

import { cn } from "@/lib/utils";

interface HoverBorderGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function HoverBorderGradient({ children, className, ...props }: HoverBorderGradientProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-neutral-200/70 bg-white",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 border border-transparent" />
      <div className="absolute inset-0 -z-10 scale-[1.02] bg-[linear-gradient(120deg,_rgba(37,99,235,0.35),_rgba(124,58,237,0.35),_rgba(30,64,175,0.3))] opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
      <div className="absolute inset-[1px] rounded-[inherit] border border-neutral-100/70" />
      <div className="relative h-full w-full rounded-[inherit] bg-white/95">
        {children}
      </div>
    </div>
  );
}
