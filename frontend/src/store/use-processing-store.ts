<<<<<<< HEAD
"use client";

import { create } from "zustand";

import {
  PRESETS,
  type OperationFieldSchema,
  type OperationParams,
  type OperationRegistryEntry,
  type PresetDefinition,
=======
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  DEFAULT_OPERATION,
  OPERATIONS,
  getOperationDefaults,
  type OperationDefinition,
  type OperationId,
  type OperationParamValues,
>>>>>>> ee3fa41 (chore: update README and UI)
} from "@/lib/operations";

export const HISTORY_VISIBLE = 5;
export const HISTORY_LIMIT = 20;

export interface UploadAsset {
  id: string;
  name: string;
  size: number;
  type: string;
<<<<<<< HEAD
  previewUrl: string;
  uploadedAt: number;
}

export interface ProcessingResult {
  jobId: string;
  metrics?: Record<string, number>;
  completedAt?: number;
}

export interface HistoryEntry {
  id: string;
  operationId: string;
  params: OperationParams;
  createdAt: number;
  imageName: string;
  resultB64?: string | null;
  metrics?: Record<string, number>;
}

export type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

type ParamsMap = Record<string, OperationParams>;

=======
  previewUrl: string;
  uploadedAt: number;
}

export interface ProcessingResult {
  jobId: string;
  url: string | null;
  metrics?: Record<string, number>;
  completedAt?: number;
}

export interface HistoryEntry {
  id: string;
  operationId: OperationId;
  params: OperationParamValues;
  createdAt: number;
  imageName: string;
  resultUrl?: string | null;
  metrics?: Record<string, number>;
}

export type JobStatus = "idle" | "queued" | "processing" | "completed" | "error";

>>>>>>> ee3fa41 (chore: update README and UI)
interface ProcessingState {
  operations: OperationRegistryEntry[];
  registry: Record<string, OperationRegistryEntry>;
  presets: PresetDefinition[];

  selectedOperationId: string | null;
  params: ParamsMap;

  originalImage?: UploadAsset;
<<<<<<< HEAD
  original: string | null;
  preview: string | null;
  result: string | null;
  processingResult?: ProcessingResult;
  jobId: string | null;
=======
  referenceImage?: UploadAsset;
  previewImage?: string | null;
  result?: ProcessingResult;
  progress: number;
>>>>>>> ee3fa41 (chore: update README and UI)
  jobStatus: JobStatus;
  progress: number;
  error?: string | null;
<<<<<<< HEAD
  uploading: boolean;
  processing: boolean;
  history: HistoryEntry[];

  setRegistry: (entries: OperationRegistryEntry[]) => void;
  setOperation: (id: string | null) => void;
  updateParam: (operationId: string, paramId: string, value: unknown) => void;
  resetParams: (operationId: string) => void;
  applyPreset: (presetId: string) => void;

  setUpload: (asset?: UploadAsset) => void;
  setOriginal: (b64: string | null) => void;
  setPreview: (b64: string | null) => void;
  setResult: (b64: string | null) => void;
  setProcessingResult: (result?: ProcessingResult) => void;
  setJobId: (jobId: string | null) => void;
  setProgress: (value: number) => void;
  setJobStatus: (status: JobStatus) => void;
  setError: (error?: string | null) => void;
  pushHistory: (entry: HistoryEntry) => void;
  setUploading: (value: boolean) => void;
  setProcessing: (value: boolean) => void;
  resetSession: () => void;
}

type FieldValue = number | string | boolean;

function normaliseEnumCandidate(schema: OperationFieldSchema, value: FieldValue): FieldValue {
  if (!schema.enum || schema.enum.length === 0) {
    return value;
  }
  if (schema.enum.includes(value)) {
    return value;
  }
  if (schema.default !== undefined) {
    return schema.default as FieldValue;
  }
  const fallback = schema.enum[0];
  return fallback as FieldValue;
}

function clampWithStep(value: number, schema: OperationFieldSchema): number {
  const minimum = typeof schema.minimum === "number" ? schema.minimum : undefined;
  const maximum = typeof schema.maximum === "number" ? schema.maximum : undefined;
  if (typeof minimum === "number") {
    value = Math.max(minimum, value);
  }
  if (typeof maximum === "number") {
    value = Math.min(maximum, value);
  }
  const step = typeof schema.step === "number" && schema.step > 0 ? schema.step : undefined;
  if (!step) {
    return value;
  }
  const base =
    typeof schema.default === "number"
      ? Number(schema.default)
      : typeof minimum === "number"
      ? minimum
      : 0;
  const steps = Math.round((value - base) / step);
  const aligned = base + steps * step;
  // guard against floating point residue
  return Number(aligned.toFixed(6));
}

function sanitizeValue(
  entry: OperationRegistryEntry | undefined,
  paramId: string,
  value: unknown,
): FieldValue {
  const field = entry?.schema?.properties?.[paramId];
  if (!field) {
    return value as FieldValue;
  }

  if (field.type === "boolean") {
    if (typeof value === "boolean") {
      return normaliseEnumCandidate(field, value);
    }
    if (typeof value === "number") {
      return normaliseEnumCandidate(field, value !== 0);
    }
    if (typeof value === "string") {
      const lowered = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(lowered)) {
        return normaliseEnumCandidate(field, true);
      }
      if (["false", "0", "no", "off"].includes(lowered)) {
        return normaliseEnumCandidate(field, false);
      }
    }
    const fallback = field.default ?? false;
    return normaliseEnumCandidate(field, Boolean(fallback));
  }

  if (field.type === "integer") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed);
      return normaliseEnumCandidate(field, clampWithStep(rounded, field));
    }
    const fallback =
      typeof field.default === "number" ? Math.round(Number(field.default)) : 0;
    return normaliseEnumCandidate(field, clampWithStep(fallback, field));
  }

  if (field.type === "number") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return normaliseEnumCandidate(field, clampWithStep(parsed, field));
    }
    const fallback =
      typeof field.default === "number" ? Number(field.default) : field.minimum ?? 0;
    return normaliseEnumCandidate(field, clampWithStep(fallback, field));
  }

  // string (default)
  const text = String(value ?? field.default ?? "");
  return normaliseEnumCandidate(field, text);
}

function sanitizeParams(
  entry: OperationRegistryEntry,
  source: OperationParams | undefined,
): OperationParams {
  const result: OperationParams = {};
  Object.entries(entry.schema?.properties ?? {}).forEach(([key, schema]) => {
    const raw =
      (source && source[key] !== undefined ? source[key] : entry.defaults?.[key]) ??
      schema.default;
    if (raw === undefined || raw === null) return;
    result[key] = sanitizeValue(entry, key, raw);
  });
  if (source) {
    Object.entries(source).forEach(([key, raw]) => {
      if (raw === undefined || raw === null) return;
      result[key] = sanitizeValue(entry, key, raw);
    });
  }
  return result;
}

function revokePreviewUrl(asset?: UploadAsset) {
  if (!asset?.previewUrl) return;
  if (typeof window === "undefined") return;
  if (asset.previewUrl.startsWith("blob:")) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

const initialState: Omit<
  ProcessingState,
  | "setRegistry"
  | "setOperation"
  | "updateParam"
=======
  history: HistoryEntry[];
  uploading: boolean;
  processing: boolean;
  setOperation: (id: OperationId) => void;
  updateParam: (
    operationId: OperationId,
    paramId: string,
    value: number | boolean | string | [number, number],
  ) => void;
  resetParams: (operationId: OperationId) => void;
  setUpload: (asset?: UploadAsset) => void;
  setReference: (asset?: UploadAsset) => void;
  setPreviewImage: (url?: string | null) => void;
  setResult: (result?: ProcessingResult) => void;
  setProgress: (value: number) => void;
  setJobStatus: (status: JobStatus) => void;
  setError: (error?: string | null) => void;
  pushHistory: (entry: HistoryEntry) => void;
  setUploading: (value: boolean) => void;
  setProcessing: (value: boolean) => void;
  resetSession: () => void;
}

const operationalDefaults = getOperationDefaults();

type ProcessingStateCore = Omit<
  ProcessingState,
  | "setOperation"
  | "updateParam"
>>>>>>> ee3fa41 (chore: update README and UI)
  | "resetParams"
  | "applyPreset"
  | "setUpload"
<<<<<<< HEAD
  | "setOriginal"
  | "setPreview"
=======
  | "setReference"
  | "setPreviewImage"
>>>>>>> ee3fa41 (chore: update README and UI)
  | "setResult"
  | "setProcessingResult"
  | "setJobId"
  | "setProgress"
  | "setJobStatus"
  | "setError"
<<<<<<< HEAD
  | "pushHistory"
  | "setUploading"
  | "setProcessing"
  | "resetSession"
> = {
  operations: [],
  registry: {},
  presets: PRESETS,
  selectedOperationId: null,
  params: {},
  originalImage: undefined,
  original: null,
  preview: null,
  result: null,
  processingResult: undefined,
  jobId: null,
=======
  | "pushHistory"
  | "setUploading"
  | "setProcessing"
  | "resetSession"
>;

const initialState: ProcessingStateCore = {
  operations: OPERATIONS,
  selectedOperationId: DEFAULT_OPERATION.id,
  params: operationalDefaults,
  originalImage: undefined,
  referenceImage: undefined,
  previewImage: undefined,
  result: undefined,
  progress: 0,
>>>>>>> ee3fa41 (chore: update README and UI)
  jobStatus: "idle",
  progress: 0,
  error: null,
<<<<<<< HEAD
  uploading: false,
  processing: false,
  history: [],
};

export const useProcessingStore = create<ProcessingState>((set, get) => ({
  ...initialState,
  setRegistry: (entries) => {
    const canonicalEntries = entries.filter((entry) => entry.id === entry.canonical);
    const registryMap = Object.fromEntries(
      canonicalEntries.map((entry) => [entry.canonical, entry]),
    );

    const nextParams: ParamsMap = { ...get().params };
    canonicalEntries.forEach((entry) => {
      nextParams[entry.canonical] = sanitizeParams(
        entry,
        get().params[entry.canonical],
      );
    });

    const currentSelection = get().selectedOperationId;
    const nextSelection =
      (currentSelection && registryMap[currentSelection] ? currentSelection : null) ??
      canonicalEntries[0]?.canonical ??
      null;

    set({
      operations: canonicalEntries,
      registry: registryMap,
      params: nextParams,
      selectedOperationId: nextSelection,
    });
  },
  setOperation: (id) => {
    if (!id) {
      set({ selectedOperationId: null });
      return;
    }
    if (get().registry[id]) {
      set({ selectedOperationId: id });
    }
  },
  updateParam: (operationId, paramId, value) => {
    const entry = get().registry[operationId];
    if (!entry) return;
    set((state) => ({
      params: {
        ...state.params,
        [operationId]: {
          ...sanitizeParams(entry, state.params[operationId]),
          [paramId]: sanitizeValue(entry, paramId, value),
        },
      },
    }));
  },
  resetParams: (operationId) => {
    const entry = get().registry[operationId];
    if (!entry) return;
    set((state) => ({
      params: {
        ...state.params,
        [operationId]: sanitizeParams(entry, undefined),
      },
    }));
  },
  applyPreset: (presetId) => {
    const preset = get().presets.find((item) => item.id === presetId);
    if (!preset) return;
    const registry = get().registry;
    const currentParams = { ...get().params };
    Object.entries(preset.operations).forEach(([operationId, overrides]) => {
      const entry = registry[operationId];
      if (!entry) return;
      currentParams[operationId] = sanitizeParams(entry, overrides);
    });
    set({ params: currentParams });
  },
  setUpload: (asset) => {
    revokePreviewUrl(get().originalImage);
    if (!asset) {
      set({
        originalImage: undefined,
        original: null,
        preview: null,
        result: null,
        processingResult: undefined,
        jobId: null,
        progress: 0,
        jobStatus: "idle",
        error: null,
      });
      return;
    }
    set({
      originalImage: asset,
      original: null,
      preview: null,
      result: null,
      processingResult: undefined,
      jobId: null,
      progress: 0,
      jobStatus: "queued",
      error: null,
    });
  },
  setOriginal: (b64) => set({ original: b64 }),
  setPreview: (b64) => set({ preview: b64 }),
  setResult: (b64) => set({ result: b64 }),
  setProcessingResult: (processingResult) =>
    set({
      processingResult,
      jobStatus: processingResult ? "completed" : get().jobStatus,
    }),
  setJobId: (jobId) => set({ jobId }),
  setProgress: (value) => set({ progress: value }),
  setJobStatus: (status) => set({ jobStatus: status }),
  setError: (error) => set({ error }),
  pushHistory: (entry) =>
    set((state) => ({
      history: [entry, ...state.history].slice(0, 20),
    })),
  setUploading: (value) => set({ uploading: value }),
  setProcessing: (value) => set({ processing: value }),
  resetSession: () => {
    const state = get();
    set({
      ...initialState,
      operations: state.operations,
      registry: state.registry,
      presets: state.presets,
      params: state.params,
      selectedOperationId: state.selectedOperationId,
      history: state.history,
    });
  },
}));
=======
  history: [],
  uploading: false,
  processing: false,
};

type PersistedState = Partial<ProcessingStateCore> & {
  params?: Record<OperationId, OperationParamValues>;
  selectedOperationId?: OperationId;
  history?: HistoryEntry[];
};

export const useProcessingStore = create<ProcessingState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setOperation: (id) => set({ selectedOperationId: id }),
      updateParam: (operationId, paramId, value) =>
        set((state) => ({
          params: {
            ...state.params,
            [operationId]: {
              ...state.params[operationId],
              [paramId]: value,
            },
          },
        })),
      resetParams: (operationId) =>
        set((state) => ({
          params: {
            ...state.params,
            [operationId]: { ...operationalDefaults[operationId] },
          },
        })),
      setUpload: (asset) => {
        const previous = get().originalImage;
        if (previous?.previewUrl && previous.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previous.previewUrl);
        }
        set({
          originalImage: asset,
          previewImage: undefined,
          result: undefined,
          progress: 0,
          jobStatus: asset ? "queued" : "idle",
          error: null,
        });
      },
      setReference: (asset) => {
        const previous = get().referenceImage;
        if (previous?.previewUrl && previous.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previous.previewUrl);
        }
        set({ referenceImage: asset });
      },
      setPreviewImage: (url) => set({ previewImage: url ?? undefined }),
      setResult: (result) =>
        set({
          result,
          jobStatus: result ? "completed" : get().jobStatus,
        }),
      setProgress: (value) => set({ progress: value }),
      setJobStatus: (status) => set({ jobStatus: status }),
      setError: (error) => set({ error }),
      pushHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
        })),
      setUploading: (value) => set({ uploading: value }),
      setProcessing: (value) => set({ processing: value }),
      resetSession: () => {
        const previous = get().originalImage;
        if (previous?.previewUrl && previous.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previous.previewUrl);
        }
        const reference = get().referenceImage;
        if (reference?.previewUrl && reference.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(reference.previewUrl);
        }
        set({
          ...initialState,
          history: get().history,
          params: get().params,
          selectedOperationId: get().selectedOperationId,
        });
      },
    }),
    {
      name: "aintra-processing-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        history: state.history,
        params: state.params,
        selectedOperationId: state.selectedOperationId,
      }),
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        const cast = (persisted ?? {}) as PersistedState | undefined;
        const history = (cast?.history ?? []).slice(0, HISTORY_LIMIT);
        return {
          ...initialState,
          ...(cast ?? {}),
          history,
          operations: OPERATIONS,
        };
      },
    },
  ),
);


>>>>>>> ee3fa41 (chore: update README and UI)
