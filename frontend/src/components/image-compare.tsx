"use client";

import Image from "next/image";
import { MoveHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const COMPARE_STYLE_ID = "image-compare-dynamic-styles";

function ensureCompareStyles() {
  if (typeof window === "undefined") return;
  if (document.getElementById(COMPARE_STYLE_ID)) return;

  const styleElement = document.createElement("style");
  styleElement.id = COMPARE_STYLE_ID;

  const rules: string[] = [];
  for (let i = 0; i <= 100; i += 1) {
    const reverse = 100 - i;
    rules.push(`.compare-before-${i}{clip-path:inset(0 ${reverse}% 0 0);}`);
    rules.push(`.compare-position-${i}{left:${i}%;}`);
  }

  styleElement.textContent = rules.join("");
  document.head.appendChild(styleElement);
}

interface ImageCompareProps {
  before?: string | null;
  after?: string | null;
  altBefore?: string;
  altAfter?: string;
}

export function ImageCompare({ before, after, altBefore, altAfter }: ImageCompareProps) {
  const [value, setValue] = useState(50);

  const beforeSrc = useMemo(() => before ?? "/placeholder.png", [before]);
  const afterSrc = useMemo(() => after ?? beforeSrc, [after, beforeSrc]);
  useEffect(() => {
    ensureCompareStyles();
  }, []);

  const clampedValue = Math.min(Math.max(Math.round(value), 0), 100);
  const dynamicBeforeClass = `compare-before-${clampedValue}`;
  const dynamicPositionClass = `compare-position-${clampedValue}`;

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100">
      <div className="absolute inset-0">
        <Image
          src={afterSrc}
          alt={altAfter ?? "Gambar hasil"}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div
        className={`absolute inset-0 ${dynamicBeforeClass}`}
      >
        <Image
          src={beforeSrc}
          alt={altBefore ?? "Gambar asli"}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="pointer-events-none absolute left-6 top-6 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
        Asli
      </div>
      <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-neutral-900/90 px-3 py-1 text-xs font-medium text-white shadow-sm">
        Hasil
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full w-full">
          <div
            className={`absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/80 shadow-[0_0_20px_rgba(0,0,0,0.15)] ${dynamicPositionClass}`}
          />
          <div
            className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-neutral-900 text-white shadow-lg ${dynamicPositionClass}`}
          >
            <MoveHorizontal className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </div>
      <input
        type="range"
        aria-label="Bandingkan gambar"
        min={0}
        max={100}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className="absolute inset-x-0 bottom-6 mx-auto h-1 w-40 cursor-ew-resize appearance-none rounded-full bg-white/60 accent-neutral-900"
      />
    </div>
  );
}
