export type SchemaFieldType = "number" | "integer" | "boolean" | "string";

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
