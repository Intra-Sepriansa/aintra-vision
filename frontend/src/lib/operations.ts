<<<<<<< HEAD
﻿export type SchemaFieldType = "number" | "integer" | "boolean" | "string";

export interface OperationFieldSchema {
  type: SchemaFieldType;
  default?: number | string | boolean;
  minimum?: number;
  maximum?: number;
  step?: number;
  enum?: Array<number | string | boolean>;
  description?: string;
  unit?: string;
}

export interface OperationSchema {
  type: "object";
  properties: Record<string, OperationFieldSchema>;
  required?: string[];
}

export interface OperationRegistryEntry {
  id: string;
  canonical: string;
  label: string;
  category: string;
  description?: string;
  recommended?: string;
  defaults: Record<string, number | string | boolean | null | undefined>;
  schema: OperationSchema;
}

export type OperationParams = Record<string, number | string | boolean>;

export interface PresetDefinition {
  id: string;
  label: string;
  description: string;
  operations: Record<string, OperationParams>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: "document",
    label: "Preset Dokumen",
    description: "Optimalkan teks dan struktur kontras untuk dokumen atau catatan.",
    operations: {
      hist_eq_clahe: { mode: "clahe_lab", clip_limit: 2.5, tile_grid: 8 },
      gamma: { gamma: 0.9 },
      contrast_stretch: { p_low: 1.0, p_high: 99.0 },
      edges: { mode: "canny", t1: 80, t2: 160, aperture: 3, l2grad: false },
    },
  },
  {
    id: "detail-max",
    label: "Detail Maksimum",
    description: "Penajaman agresif + deteksi tepi untuk analisis tekstur.",
    operations: {
      sharpen: { method: "unsharp", alpha: 1.2 },
      edges: { mode: "canny", t1: 60, t2: 180, aperture: 3, l2grad: true },
      contrast_stretch: { p_low: 2.0, p_high: 98.0 },
    },
  },
  {
    id: "night-photo",
    label: "Foto Malam",
    description: "Kurangi noise, tingkatkan pencahayaan, dan jaga saturasi.",
    operations: {
      nlmeans: { h_luma: 12.0, h_color: 10.0, template: 7, search: 21 },
      gamma: { gamma: 0.8 },
      hsv_adjust: { delta_h: 0, scale_s: 0.9, scale_v: 1.2 },
      contrast_stretch: { p_low: 1.0, p_high: 97.0 },
      white_balance: { strength: 0.8 },
    },
  },
];
=======
import type { LucideIcon } from "lucide-react";
import {
  Circle,
  FunctionSquare,
  Gauge,
  BarChartBig,
  Waves,
  Ruler,
  Sparkles,
  Scan,
  Boxes,
  Move3d,
  Contrast,
  Binary,
  Palette,
  Shapes,
} from "lucide-react";

export type OperationId =
  | "negative"
  | "log"
  | "gamma"
  | "histogram"
  | "histogram-match"
  | "gaussian"
  | "median"
  | "bilateral"
  | "sharpen"
  | "edge"
  | "morphology"
  | "geometry"
  | "active_contour"
  | "features"
  | "hsv-threshold"
  | "kmeans-color"
  | "threshold-global"
  | "threshold-adaptive";

export type OperationCategory =
  | "Enhancement"
  | "Filtering"
  | "Edge & Detail"
  | "Geometry"
  | "Segmentation"
  | "Analysis";

export type OperationParamType =
  | "slider"
  | "number"
  | "select"
  | "switch"
  | "range";

export interface OperationParamDefinition {
  id: string;
  label: string;
  type: OperationParamType;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | boolean | string | [number, number];
  description?: string;
  options?: { label: string; value: string | number }[];
  visibleIf?: (values: OperationParamValues) => boolean;
}

export interface OperationDefinition {
  id: OperationId;
  name: string;
  shortDescription: string;
  category: OperationCategory;
  icon: LucideIcon;
  tags: string[];
  parameters: OperationParamDefinition[];
  recommended?: string;
}

export type OperationParamValues = Record<
  string,
  number | boolean | string | [number, number]
>;

export const OPERATIONS: OperationDefinition[] = [
  {
    id: "negative",
    name: "Negatif Citra",
    shortDescription:
      "Membalik intensitas piksel untuk menonjolkan struktur dan teks.",
    category: "Enhancement",
    icon: Circle,
    tags: ["kontras", "dasar"],
    parameters: [
      {
        id: "preserveAlpha",
        label: "Pertahankan Alfa",
        type: "switch",
        defaultValue: true,
        description: "Tidak membalik kanal transparansi untuk PNG/WEBP.",
      },
    ],
    recommended: "Gunakan untuk menonjolkan fitur pada dokumen negatif film.",
  },
  {
    id: "log",
    name: "Log Transform",
    shortDescription: "Ekspansi jangkauan intensitas untuk area gelap & terang.",
    category: "Enhancement",
    icon: FunctionSquare,
    tags: ["kontras", "tonal"],
    parameters: [
      {
        id: "gain",
        label: "Gain",
        type: "slider",
        min: 0.1,
        max: 5,
        step: 0.1,
        defaultValue: 1.0,
        description: "Kontrol intensitas transform logarithmic.",
      },
      {
        id: "base",
        label: "Basis Log",
        type: "select",
        defaultValue: "e",
        options: [
          { label: "Natural (e)", value: "e" },
          { label: "Basis 10", value: "10" },
          { label: "Basis 2", value: "2" },
        ],
      },
    ],
  },
  {
    id: "gamma",
    name: "Gamma Correction",
    shortDescription: "Koreksi gamma adaptif untuk kontrol pencahayaan.",
    category: "Enhancement",
    icon: Gauge,
    tags: ["tonal", "kontras"],
    parameters: [
      {
        id: "gamma",
        label: "Gamma",
        type: "slider",
        min: 0.2,
        max: 3,
        step: 0.05,
        defaultValue: 1.2,
      },
      {
        id: "gain",
        label: "Gain",
        type: "slider",
        min: 0.5,
        max: 2,
        step: 0.05,
        defaultValue: 1,
      },
    ],
  },
  {
    id: "histogram",
    name: "Histogram Equalization & CLAHE",
    shortDescription: "Distribusi ulang histogram global atau lokal.",
    category: "Enhancement",
    icon: BarChartBig,
    tags: ["kontras", "lokal"],
    parameters: [
      {
        id: "method",
        label: "Metode",
        type: "select",
        defaultValue: "clahe",
        options: [
          { label: "CLAHE", value: "clahe" },
          { label: "Equalization Global", value: "global" },
        ],
      },
      {
        id: "clipLimit",
        label: "Clip Limit",
        type: "slider",
        min: 1,
        max: 8,
        step: 0.5,
        defaultValue: 2.5,
        description: "Pembatas amplifikasi kontras pada CLAHE.",
      },
      {
        id: "tileGrid",
        label: "Grid Tiles",
        type: "slider",
        min: 2,
        max: 16,
        step: 1,
        defaultValue: 8,
        description: "Jumlah blok pembagi kanal pada CLAHE.",
      },
    ],
    recommended: "Cocok untuk foto dengan pencahayaan tidak merata.",
  },
  {
    id: "histogram-match",
    name: "Histogram Matching",
    shortDescription:
      "Sesuaikan distribusi intensitas terhadap gambar target referensi.",
    category: "Enhancement",
    icon: BarChartBig,
    tags: ["histogram", "matching"],
    parameters: [
      {
        id: "mode",
        label: "Mode Pencocokan",
        type: "select",
        defaultValue: "rgb",
        options: [
          { label: "RGB Kanal", value: "rgb" },
          { label: "Luminance (LAB)", value: "luminance" },
          { label: "Grayscale", value: "grayscale" },
        ],
        description: "Tentukan ruang warna yang dipakai untuk penyesuaian histogram.",
      },
      {
        id: "preserveAlpha",
        label: "Pertahankan Alfa",
        type: "switch",
        defaultValue: true,
        description: "Jangan ubah kanal transparansi saat output PNG/WEBP.",
      },
    ],
    recommended: "Unggah gambar target dengan kontras ideal sebagai referensi.",
  },
  {
    id: "gaussian",
    name: "Gaussian Blur",
    shortDescription: "Pengaburan lembut untuk mereduksi noise gaussian.",
    category: "Filtering",
    icon: Waves,
    tags: ["denoise", "blur"],
    parameters: [
      {
        id: "kernel",
        label: "Kernel",
        type: "slider",
        min: 3,
        max: 21,
        step: 2,
        defaultValue: 5,
      },
      {
        id: "sigma",
        label: "Sigma",
        type: "slider",
        min: 0.1,
        max: 3,
        step: 0.1,
        defaultValue: 1.0,
      },
    ],
  },
  {
    id: "median",
    name: "Median Filter",
    shortDescription: "Filter median untuk noise impuls (salt & pepper).",
    category: "Filtering",
    icon: Ruler,
    tags: ["denoise", "impulse"],
    parameters: [
      {
        id: "kernel",
        label: "Kernel",
        type: "slider",
        min: 3,
        max: 15,
        step: 2,
        defaultValue: 3,
      },
    ],
  },
  {
    id: "bilateral",
    name: "Bilateral Filter",
    shortDescription: "Pelunakan tepi sadar warna tanpa blur detail.",
    category: "Filtering",
    icon: Waves,
    tags: ["denoise", "edge-preserving"],
    parameters: [
      {
        id: "diameter",
        label: "Diameter",
        type: "slider",
        min: 3,
        max: 15,
        step: 2,
        defaultValue: 9,
      },
      {
        id: "sigmaColor",
        label: "Sigma Warna",
        type: "slider",
        min: 10,
        max: 200,
        step: 5,
        defaultValue: 75,
      },
      {
        id: "sigmaSpace",
        label: "Sigma Spasial",
        type: "slider",
        min: 10,
        max: 200,
        step: 5,
        defaultValue: 75,
      },
    ],
  },
  {
    id: "sharpen",
    name: "Penajaman Laplacian",
    shortDescription: "Penegasan detail via Laplacian & unsharp masking.",
    category: "Edge & Detail",
    icon: Sparkles,
    tags: ["tajam", "detail"],
    parameters: [
      {
        id: "method",
        label: "Metode",
        type: "select",
        defaultValue: "unsharp",
        options: [
          { label: "Unsharp Mask", value: "unsharp" },
          { label: "Laplacian", value: "laplacian" },
        ],
      },
      {
        id: "amount",
        label: "Kuat Tajam",
        type: "slider",
        min: 0.2,
        max: 2,
        step: 0.05,
        defaultValue: 0.8,
      },
      {
        id: "radius",
        label: "Radius",
        type: "slider",
        min: 1,
        max: 10,
        step: 0.5,
        defaultValue: 2,
      },
    ],
  },
  {
    id: "edge",
    name: "Deteksi Tepi",
    shortDescription: "Sobel dan Canny untuk struktur kontur presisi.",
    category: "Edge & Detail",
    icon: Scan,
    tags: ["tepi", "deteksi"],
    parameters: [
      {
        id: "method",
        label: "Metode",
        type: "select",
        defaultValue: "canny",
        options: [
          { label: "Canny", value: "canny" },
          { label: "Sobel", value: "sobel" },
          { label: "Prewitt", value: "prewitt" },
        ],
      },
      {
        id: "threshold1",
        label: "Ambang Rendah",
        type: "slider",
        min: 0,
        max: 255,
        step: 5,
        defaultValue: 50,
      },
      {
        id: "threshold2",
        label: "Ambang Tinggi",
        type: "slider",
        min: 0,
        max: 255,
        step: 5,
        defaultValue: 150,
      },
    ],
  },
  {
    id: "morphology",
    name: "Operasi Morfologi",
    shortDescription: "Bersihkan noise dan struktur dengan kernel fleksibel.",
    category: "Edge & Detail",
    icon: Boxes,
    tags: ["struktur", "biner"],
    parameters: [
      {
        id: "operation",
        label: "Operasi",
        type: "select",
        defaultValue: "open",
        options: [
          { label: "Opening", value: "open" },
          { label: "Closing", value: "close" },
          { label: "Erosi", value: "erode" },
          { label: "Dilasi", value: "dilate" },
        ],
      },
      {
        id: "kernel",
        label: "Ukuran Kernel",
        type: "slider",
        min: 3,
        max: 15,
        step: 2,
        defaultValue: 5,
      },
      {
        id: "iterations",
        label: "Iterasi",
        type: "slider",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
      },
    ],
  },
  {
    id: "geometry",
    name: "Transformasi Geometri",
    shortDescription: "Rotasi, skala, translasi, dan crop adaptif.",
    category: "Geometry",
    icon: Move3d,
    tags: ["transform", "augment"],
    parameters: [
      {
        id: "rotate",
        label: "Rotasi ()",
        type: "slider",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 0,
      },
      {
        id: "scale",
        label: "Skala",
        type: "slider",
        min: 0.2,
        max: 2.5,
        step: 0.05,
        defaultValue: 1,
      },
      {
        id: "translate",
        label: "Translasi",
        type: "range",
        min: -200,
        max: 200,
        step: 1,
        defaultValue: [0, 0],
        description: "Geser sumbu X dan Y dalam piksel.",
      },
      {
        id: "crop",
        label: "Crop (%)",
        type: "slider",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 0,
      },
    ],
  },
  {
    id: "active_contour",
    name: "Active Contour (Snakes)",
    shortDescription: "Kontur aktif untuk mengikuti tepi/objek secara halus.",
    category: "Segmentation",
    icon: Scan,
    tags: ["segmentasi", "kontur", "snakes"],
    parameters: [
      {
        id: "init",
        label: "Inisialisasi",
        type: "select",
        options: [
          { label: "Circle", value: "circle" },
          { label: "Rectangle", value: "rect" },
        ],
        defaultValue: "circle",
      },
      {
        id: "radius_factor",
        label: "Radius Factor",
        type: "slider",
        min: 0.1,
        max: 0.9,
        step: 0.05,
        defaultValue: 0.4,
      },
      {
        id: "alpha",
        label: "Alpha (tension)",
        type: "slider",
        min: 0.01,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.2,
      },
      {
        id: "beta",
        label: "Beta (smoothness)",
        type: "slider",
        min: 0.0,
        max: 1.0,
        step: 0.01,
        defaultValue: 0.2,
      },
      {
        id: "gamma",
        label: "Gamma (step)",
        type: "slider",
        min: 0.001,
        max: 0.1,
        step: 0.001,
        defaultValue: 0.01,
      },
      {
        id: "max_iter",
        label: "Iterasi Maks",
        type: "slider",
        min: 50,
        max: 2000,
        step: 50,
        defaultValue: 250,
      },
      {
        id: "output",
        label: "Output",
        type: "select",
        options: [
          { label: "Mask", value: "mask" },
          { label: "Overlay", value: "overlay" },
          { label: "Contour Only", value: "contour" },
        ],
        defaultValue: "overlay",
      },
    ],
    recommended:
      "Mulai dengan init=circle, radius_factor≈0.4–0.5; kecilkan gamma jika kontur berosilasi.",
  },
  {
    id: "features",
    name: "Ekstraksi Ciri (Features)",
    shortDescription: "Bentuk/Ukuran/Geometri, Tekstur (GLCM/LBP/HOG), Warna.",
    category: "Analysis",
    icon: Sparkles,
    tags: ["fitur", "analisis", "feature"],
    parameters: [
      {
        id: "category",
        label: "Kategori",
        type: "select",
        defaultValue: "shape",
        options: [
          { label: "Shape — Kontur & Centroid", value: "shape" },
          { label: "Size — Bounding Box", value: "size" },
          { label: "Geometry — Hull/Ellipse", value: "geometry" },
          { label: "Texture (GLCM)", value: "texture_glcm" },
          { label: "Texture (LBP)", value: "texture_lbp" },
          { label: "Texture (HOG)", value: "texture_hog" },
          { label: "Color Histogram", value: "color_hist" },
          { label: "Color Statistics", value: "color_stats" },
          { label: "Color K-Means", value: "color_kmeans" },
        ],
      },
      {
        id: "glcmDistance",
        label: "GLCM Distance",
        type: "slider",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
        visibleIf: (values) => String(values.category) === "texture_glcm",
      },
      {
        id: "lbpRadius",
        label: "LBP Radius",
        type: "slider",
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 1,
        visibleIf: (values) => String(values.category) === "texture_lbp",
      },
      {
        id: "hogSample",
        label: "HOG Sample",
        type: "select",
        defaultValue: 10,
        options: [
          { label: "10", value: 10 },
          { label: "50", value: 50 },
          { label: "100", value: 100 },
        ],
        visibleIf: (values) => String(values.category) === "texture_hog",
      },
      {
        id: "kmeansK",
        label: "K (Dominant Colors)",
        type: "slider",
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 3,
        visibleIf: (values) => String(values.category) === "color_kmeans",
      },
    ],
    recommended:
      "Mulai dengan kategori Shape untuk kontur dasar, lalu jelajahi mode tekstur & warna sesuai keperluan analisis.",
  },
  {
    id: "hsv-threshold",
    name: "HSV Threshold",
    shortDescription: "Segmentasi berbasis rentang warna pada ruang HSV.",
    category: "Segmentation",
    icon: Palette,
    tags: ["hsv", "threshold", "warna"],
    parameters: [
      {
        id: "hmin",
        label: "H min (0-179)",
        type: "slider",
        min: 0,
        max: 179,
        step: 1,
        defaultValue: 20,
      },
      {
        id: "hmax",
        label: "H max (0-179)",
        type: "slider",
        min: 0,
        max: 179,
        step: 1,
        defaultValue: 35,
      },
      {
        id: "smin",
        label: "S min (0-255)",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 80,
      },
      {
        id: "smax",
        label: "S max (0-255)",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 255,
      },
      {
        id: "vmin",
        label: "V min (0-255)",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 80,
      },
      {
        id: "vmax",
        label: "V max (0-255)",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 255,
      },
      {
        id: "output",
        label: "Output",
        type: "select",
        options: [
          { label: "Overlay", value: "overlay" },
          { label: "Mask", value: "mask" },
        ],
        defaultValue: "overlay",
      },
    ],
    recommended:
      "Jika warna melewati batas 0/179 (misal merah), atur Hmin > Hmax (wrap-around otomatis aktif).",
  },
  {
    id: "kmeans-color",
    name: "K-Means Color",
    shortDescription: "Klasterisasi warna untuk memisahkan area dominan.",
    category: "Segmentation",
    icon: Shapes,
    tags: ["kmeans", "cluster", "warna"],
    parameters: [
      {
        id: "K",
        label: "Jumlah Klaster",
        type: "slider",
        min: 2,
        max: 8,
        step: 1,
        defaultValue: 3,
      },
      {
        id: "attempts",
        label: "Attempts",
        type: "slider",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 3,
      },
      {
        id: "max_iter",
        label: "Iterasi Maks",
        type: "slider",
        min: 5,
        max: 50,
        step: 1,
        defaultValue: 10,
      },
      {
        id: "mask_index",
        label: "Mask Index (opsional)",
        type: "number",
        min: 0,
        max: 7,
        step: 1,
        defaultValue: 0,
        description: "Jika diisi, tampilkan overlay/mask khusus klaster ini.",
      },
      {
        id: "output",
        label: "Output",
        type: "select",
        options: [
          { label: "Segmentasi (Recolor)", value: "seg" },
          { label: "Overlay", value: "overlay" },
          { label: "Mask (butuh mask_index)", value: "mask" },
        ],
        defaultValue: "seg",
      },
    ],
    recommended: "Mulai dengan K=3; tingkatkan attempts bila hasil klaster tidak stabil.",
  },
  {
    id: "threshold-global",
    name: "Threshold Global",
    shortDescription: "Segmentasi sederhana dengan ambang global tetap.",
    category: "Segmentation",
    icon: Contrast,
    tags: ["segmentasi", "biner"],
    parameters: [
      {
        id: "threshold",
        label: "Ambang",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 128,
      },
      {
        id: "maxValue",
        label: "Nilai Maks",
        type: "slider",
        min: 0,
        max: 255,
        step: 1,
        defaultValue: 255,
      },
    ],
  },
  {
    id: "threshold-adaptive",
    name: "Adaptive Threshold & Otsu",
    shortDescription: "Segmentasi adaptif dengan opsi Otsu otomatis.",
    category: "Segmentation",
    icon: Binary,
    tags: ["segmentasi", "otomatis"],
    parameters: [
      {
        id: "mode",
        label: "Mode",
        type: "select",
        defaultValue: "adaptive_gaussian",
        options: [
          { label: "Adaptive Gaussian", value: "adaptive_gaussian" },
          { label: "Adaptive Mean", value: "adaptive_mean" },
          { label: "Otsu", value: "otsu" },
        ],
      },
      {
        id: "blockSize",
        label: "Ukuran Blok",
        type: "slider",
        min: 3,
        max: 35,
        step: 2,
        defaultValue: 11,
      },
      {
        id: "constant",
        label: "Konstanta",
        type: "slider",
        min: -20,
        max: 20,
        step: 1,
        defaultValue: 2,
      },
      {
        id: "preblur",
        label: "Pre-blur",
        type: "select",
        defaultValue: "none",
        options: [
          { label: "Tanpa", value: "none" },
          { label: "Gaussian", value: "gaussian" },
          { label: "Median", value: "median" },
        ],
      },
    ],
  },
];

export const DEFAULT_OPERATION = OPERATIONS[0];

export function getOperationDefaults(): Record<
  OperationId,
  OperationParamValues
> {
  return OPERATIONS.reduce((acc, operation) => {
    acc[operation.id] = operation.parameters.reduce<OperationParamValues>(
      (paramAcc, param) => {
        paramAcc[param.id] = param.defaultValue;
        return paramAcc;
      },
      {},
    );
    return acc;
  }, {} as Record<OperationId, OperationParamValues>);
}
>>>>>>> ee3fa41 (chore: update README and UI)
