"use client";

import { useMemo } from "react";

import { SideBySide } from "@/components/side-by-side";
import { useProcessingStore } from "@/store/use-processing-store";
import { shallow } from "zustand/shallow";

export function ResultsViewer() {
  const {
    original,
    preview,
    result,
    jobId,
    jobStatus,
    progress,
    processingResult,
  } = useProcessingStore(
    (state) => ({
      original: state.original,
      preview: state.preview,
      result: state.result,
      jobId: state.jobId,
      jobStatus: state.jobStatus,
      progress: state.progress,
      processingResult: state.processingResult,
    }),
    shallow,
  );

  const leftB64 = useMemo(() => original ?? null, [original]);
  const rightB64 = useMemo(() => result ?? preview ?? null, [preview, result]);
  const metrics = processingResult?.metrics;

  const hasJob = Boolean(jobId);
  const hasImages = Boolean(leftB64 || rightB64);

  return (
    <section id="hasil" className="mx-auto mt-16 max-w-6xl px-6">
      <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-4 flex flex-col gap-2 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Status:{" "}
            <span className="font-semibold text-neutral-800">
              {jobStatus}
            </span>
          </span>
          <span>
            Progres:{" "}
            <span className="font-semibold text-neutral-800">
              {Math.round(progress)}%
            </span>
            {hasJob && <span className="ml-2 text-neutral-400">(Job ID {jobId})</span>}
          </span>
        </div>

        {hasImages ? (
          <SideBySide leftB64={leftB64 ?? undefined} rightB64={rightB64 ?? undefined} />
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-10 text-center text-sm text-neutral-500">
            Unggah gambar dan jalankan operasi untuk melihat hasil di sini.
          </div>
        )}

        {rightB64 && (
          <a
            download="aintra-result.png"
            href={`data:image/png;base64,${rightB64}`}
            className="btn-gradient mt-4 inline-block text-xs font-semibold text-white"
          >
            Download PNG
          </a>
        )}

        {metrics && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-neutral-600">
                <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{key}</dt>
                <dd className="text-sm font-semibold text-neutral-800">{value.toFixed(3)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
