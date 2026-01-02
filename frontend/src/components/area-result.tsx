"use client";

import Image from "next/image";
import { Download, Gauge, Loader2 } from "lucide-react";

import { HistogramViewer } from "@/components/histogram-viewer";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";
import { downloadResult } from "@/lib/api";
import { useProcessingStore } from "@/store/use-processing-store";

export function AreaResult() {
  const {
    originalImage,
    result,
    previewImage,
    progress,
    jobStatus,
    processing,
  } = useProcessingStore((state) => ({
    originalImage: state.originalImage,
    result: state.result,
    previewImage: state.previewImage,
    progress: state.progress,
    jobStatus: state.jobStatus,
    processing: state.processing,
  }));

  const hasOriginal = Boolean(originalImage?.previewUrl);
  const hasResult = Boolean(result?.url);

  const originalSrc = hasOriginal ? originalImage?.previewUrl : undefined;
  const resultSrc = hasResult ? result?.url : previewImage ?? originalSrc;

  return (
    <section id="hasil" className="mx-auto mt-16 max-w-6xl px-6">
      <div className="rounded-[32px] border border-neutral-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900">Area Hasil</h3>
            <p className="text-sm text-neutral-500">
              Lihat perbandingan gambar asli di kiri dan hasil pemrosesan di kanan.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-neutral-200/80 bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm">
            <Gauge className="h-4 w-4 text-neutral-400" />
            Status: <span className="font-semibold text-neutral-700">{jobStatus}</span>
            <span aria-hidden className="text-neutral-300">|</span>
            Progress: <span className="font-semibold text-neutral-700">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <figure className="rounded-3xl border border-neutral-200/80 bg-neutral-50 p-4 shadow-inner">
            <figcaption className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Asli
            </figcaption>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white">
              {originalSrc ? (
                <Image
                  src={originalSrc}
                  alt={originalImage?.name ?? "Gambar asli"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="grid h-full w-full place-content-center text-sm text-neutral-400">
                  Belum ada gambar
                </div>
              )}
            </div>
          </figure>

          <figure className="rounded-3xl border border-neutral-200/80 bg-neutral-50 p-4 shadow-inner">
            <figcaption className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Hasil
            </figcaption>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white">
              {resultSrc ? (
                <Image
                  src={resultSrc}
                  alt={hasResult ? "Gambar hasil" : "Pratinjau"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="grid h-full w-full place-content-center text-sm text-neutral-400">
                  Belum ada hasil
                </div>
              )}
            </div>
          </figure>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <HistogramViewer src={originalSrc} title="Histogram Asli (Luma)" mode="luminance" />
          <HistogramViewer src={resultSrc} title="Histogram Hasil (Luma)" mode="luminance" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <HistogramViewer src={originalSrc} title="Histogram Asli (RGB)" mode="rgb" />
          <HistogramViewer src={resultSrc} title="Histogram Hasil (RGB)" mode="rgb" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="gradient"
            disabled={!hasResult || processing}
            onClick={() => result?.jobId && downloadResult(result.jobId)}
          >
            <Download className="mr-2 h-4 w-4" />
            {processing && !hasResult ? "Menunggu hasil" : "Unduh Hasil"}
          </Button>
          {processing && (
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses di backend...
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-neutral-800">Detail Unggahan</h4>
            {originalImage ? (
              <dl className="mt-3 space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Nama</dt>
                  <dd className="max-w-[70%] truncate text-right">{originalImage.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Ukuran</dt>
                  <dd>{formatFileSize(originalImage.size)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">Tipe</dt>
                  <dd>{originalImage.type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-400">ID</dt>
                  <dd>{originalImage.id}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Belum ada gambar diunggah.</p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-neutral-800">Metrik Kualitas</h4>
            {result?.metrics ? (
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                {Object.entries(result.metrics).map(([key, value]) => (
                  <li key={key} className="flex justify-between">
                    <span className="text-neutral-400">{key.toUpperCase()}</span>
                    <span className="font-semibold text-neutral-800">{value.toFixed(4)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                Metrik akan muncul setelah pemrosesan selesai.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

