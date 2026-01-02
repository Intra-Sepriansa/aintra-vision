"use client";

import { useEffect, useRef, useState } from "react";

interface HistogramViewerProps {
  src?: string | null;
  title: string;
  mode?: "luminance" | "rgb";
}

const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 120;

async function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(event);
    };
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

async function blobToImageData(blob: Blob): Promise<ImageData> {
  if (typeof document === "undefined") {
    throw new Error("Document tidak tersedia");
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const image = await loadImageElement(blob);
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function HistogramViewer({ src, title, mode = "luminance" }: HistogramViewerProps) {
  const resolvedMode = mode ?? "luminance";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;

    const clearCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawLumaHistogram = (values: Uint32Array) => {
      clearCanvas();
      const maxCount = Math.max(...values);
      if (maxCount === 0) {
        setMessage("Histogram kosong");
        return;
      }
      const scaleY = (CANVAS_HEIGHT - 10) / maxCount;
      ctx.fillStyle = "#0f172a";
      for (let i = 0; i < values.length; i += 1) {
        const value = values[i];
        const barHeight = value * scaleY;
        ctx.fillRect(i, CANVAS_HEIGHT - barHeight, 1, barHeight);
      }
      setMessage(null);
    };

    const drawRgbHistogram = (r: Uint32Array, g: Uint32Array, b: Uint32Array) => {
      clearCanvas();
      const maxCount = Math.max(Math.max(...r), Math.max(...g), Math.max(...b));
      if (maxCount === 0) {
        setMessage("Histogram kosong");
        return;
      }
      const scaleY = (CANVAS_HEIGHT - 10) / maxCount;
      const drawLine = (values: Uint32Array, color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let i = 0; i < values.length; i += 1) {
          const v = values[i] * scaleY;
          const x = i + 0.5;
          const y = CANVAS_HEIGHT - v;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      drawLine(r, "rgba(220, 38, 38, 0.9)");
      drawLine(g, "rgba(22, 163, 74, 0.9)");
      drawLine(b, "rgba(37, 99, 235, 0.9)");
      setMessage(null);
    };

    const render = async () => {
      if (!src) {
        clearCanvas();
        setMessage("Tidak ada gambar");
        return;
      }
      try {
        setLoading(true);
        setMessage("Menghitung histogram...");
        const response = await fetch(src, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        const imageData = await blobToImageData(blob);
        const data = imageData.data;
        if (resolvedMode === "rgb") {
          const rHist = new Uint32Array(256);
          const gHist = new Uint32Array(256);
          const bHist = new Uint32Array(256);
          for (let i = 0; i < data.length; i += 4) {
            rHist[data[i]] += 1;
            gHist[data[i + 1]] += 1;
            bHist[data[i + 2]] += 1;
          }
          if (!cancelled) drawRgbHistogram(rHist, gHist, bHist);
        } else {
          const histogram = new Uint32Array(256);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            histogram[y] += 1;
          }
          if (!cancelled) drawLumaHistogram(histogram);
        }
      } catch (error) {
        console.error("Histogram render error", error);
        clearCanvas();
        if (!cancelled) {
          setMessage("Gagal Menghitung histogram...");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    clearCanvas();
    void render();

    return () => {
      cancelled = true;
    };
  }, [src, resolvedMode]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-800">{title}</p>
        {loading && <span className="text-xs text-neutral-400">Memproses</span>}
      </div>
      <canvas ref={canvasRef} className="mt-3 h-32 w-full rounded-lg bg-neutral-50" />
      {message && <p className="mt-2 text-xs text-neutral-400">{message}</p>}
    </div>
  );
}



