
"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RegistryLoader } from "@/components/registry-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useProcessingStore } from "@/store/use-processing-store";
import { shallow } from "zustand/shallow";

const EDGE_GUTTER = 48;

export function OperationsCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { operations, selectedOperationId, setOperation, history } = useProcessingStore(
    (state) => ({
      operations: state.operations,
      selectedOperationId: state.selectedOperationId,
      setOperation: state.setOperation,
      history: state.history,
    }),
    shallow,
  );

  const recentHistory = useMemo(() => history[0], [history]);
  const totalOperations = operations.length;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth - EDGE_GUTTER;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < maxScroll);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => update());
      observer.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [totalOperations]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      event.preventDefault();
      const behavior: ScrollBehavior = event.ctrlKey ? "auto" : "smooth";
      element.scrollBy({ left: event.deltaY, behavior });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, [totalOperations]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const offset = Math.round(el.clientWidth * 0.9) * direction;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  if (!totalOperations) {
    return (
      <section id="operasi" className="mx-auto mt-16 max-w-6xl px-6">
        <RegistryLoader />
        <div className="rounded-[32px] border border-neutral-200/70 bg-white/80 p-10 text-center shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)]">
          <p className="text-sm text-neutral-500">Memuat daftar operasi pengolahan citra…</p>
        </div>
      </section>
    );
  }

  return (
    <section id="operasi" className="relative mx-auto mt-16 max-w-6xl px-6">
      <RegistryLoader />
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-400">
            Galeri Operasi
          </p>
          <h2 className="text-2xl font-semibold text-neutral-900">
            {totalOperations} Operasi Pengolahan Siap Produksi
          </h2>
        </div>

        {recentHistory && (
          <div className="text-xs text-neutral-500">
            Terakhir: {recentHistory.operationId} Â· {formatRelativeTime(recentHistory.createdAt)}
          </div>
        )}
      </div>

      <div className="relative mt-8 overflow-hidden rounded-[32px] border border-neutral-200/80 bg-white/80 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur edge-fade">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/60" />

        <button
          type="button"
          aria-label="Gulir kiri"
          onClick={() => scrollBy(-1)}
          disabled={!canScrollLeft}
          className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg ring-1 ring-black/5 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Gulir kanan"
          onClick={() => scrollBy(1)}
          disabled={!canScrollRight}
          className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg ring-1 ring-black/5 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth scroll-px-8 px-4 py-2"
        >

          {operations.map((operation) => {
            const selected = operation.id === selectedOperationId;
            const parameterCount = Object.keys(operation.schema?.properties ?? {}).length;
            const initial = operation.label.charAt(0).toUpperCase() || "#";

            return (
              <motion.button
                type="button"
                key={operation.id}
                onClick={() => setOperation(operation.id)}
                className={cn(
                  "snap-center min-w-[300px] shrink-0 rounded-[28px] border border-neutral-200/70 bg-white/90 p-6 text-left shadow-sm transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
                  selected
                    ? "border-transparent shadow-xl ring-2 ring-neutral-900/70"
                    : "hover:-translate-y-1 hover:shadow-lg",
                )}
                whileHover={{ y: -2, boxShadow: "0 10px 30px rgba(15,23,42,0.12)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-inner",
                        selected ? "bg-neutral-900" : "bg-neutral-800",
                      )}
                    >
                      <span className="text-sm font-semibold">{initial}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{operation.label}</p>
                      <p className="text-xs text-neutral-500">{operation.category}</p>
                    </div>
                  </div>
                  <Badge className="bg-neutral-100 text-neutral-500">
                    {parameterCount} parameter
                  </Badge>
                </div>

                {operation.description && (
                  <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                    {operation.description}
                  </p>
                )}

                {operation.recommended && (
                  <p className="mt-4 rounded-2xl bg-neutral-100/80 px-3 py-2 text-xs text-neutral-500">
                    {operation.recommended}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <Button asChild variant={selected ? "gradient" : "secondary"} size="sm">
                    <span>{selected ? "Terpilih" : "Pilih Operasi"}</span>
                  </Button>
                  <span className="text-xs text-neutral-400">ID: {operation.id}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
