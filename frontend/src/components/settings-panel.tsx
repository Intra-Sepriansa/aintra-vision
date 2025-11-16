"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { Download, Play, RefreshCcw, Sparkles } from "lucide-react";
import { shallow } from "zustand/shallow";

import { RegistryLoader } from "@/components/registry-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  downloadResult,
  mapResultFromStatus,
  openProgressWS,
  pollJob,
  requestPreview,
  requestProcessing,
  type JobStatusResponse,
} from "@/lib/api";
import type { OperationFieldSchema, OperationParams } from "@/lib/operations";
import { generateId } from "@/lib/utils";
import {
  type HistoryEntry,
  type JobStatus,
  useProcessingStore,
} from "@/store/use-processing-store";

const PREVIEW_DEBOUNCE_MS = 300;

type FieldValue = number | string | boolean | undefined;

function toTitle(paramId: string): string {
  return paramId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface ParameterControlProps {
  paramId: string;
  schema: OperationFieldSchema;
  value: FieldValue;
  onChange: (value: number | string | boolean) => void;
}

function ParameterControl({ paramId, schema, value, onChange }: ParameterControlProps) {
  const label = schema.description ? toTitle(paramId) : toTitle(paramId);
  const description = schema.description;

  if (schema.enum && schema.enum.length > 0) {
    const options = schema.enum;
    const current =
      value ?? schema.default ?? options[0] ?? (schema.type === "number" ? 0 : "");
    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
      const raw = event.target.value;
      if (schema.type === "number" || schema.type === "integer") {
        onChange(Number(raw));
      } else if (schema.type === "boolean") {
        onChange(raw === "true");
      } else {
        onChange(raw);
      }
    };
    return (
      <div className="space-y-2">
        <Label htmlFor={`${paramId}-select`} className="text-xs font-semibold text-neutral-600">
          {label}
        </Label>
        <select
          id={`${paramId}-select`}
          value={String(current)}
          onChange={handleChange}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
          {options.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
        {description && <p className="text-xs text-neutral-400">{description}</p>}
      </div>
    );
  }

  if (schema.type === "boolean") {
    const checked = typeof value === "boolean" ? value : Boolean(schema.default);
    return (
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/70 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-700">{label}</p>
          {description && <p className="mt-1 text-xs text-neutral-400">{description}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange as (val: boolean) => void} />
      </div>
    );
  }

  if (
    (schema.type === "number" || schema.type === "integer") &&
    typeof schema.minimum === "number" &&
    typeof schema.maximum === "number"
  ) {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof schema.default === "number"
        ? schema.default
        : schema.minimum;
    const step =
      typeof schema.step === "number"
        ? schema.step
        : schema.type === "integer"
        ? 1
        : 0.1;
    const unitLabel = schema.unit ? ` ${schema.unit}` : "";
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-neutral-600">{label}</Label>
          <span className="text-xs font-semibold text-neutral-700">
            {numericValue}
            {unitLabel}
          </span>
        </div>
        <Slider
          value={[numericValue]}
          min={schema.minimum}
          max={schema.maximum}
          step={step}
          onValueChange={(vals) => onChange(vals[0] ?? numericValue)}
        />
        <div className="flex justify-between text-xs text-neutral-500">
          <span>{schema.minimum}</span>
          <span>{schema.maximum}</span>
        </div>
        <Input
          type="number"
          value={numericValue}
          min={schema.minimum}
          max={schema.maximum}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {description && <p className="text-xs text-neutral-400">{description}</p>}
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    const numericValue =
      typeof value === "number"
        ? value
        : typeof schema.default === "number"
        ? schema.default
        : 0;
    const step =
      typeof schema.step === "number"
        ? schema.step
        : schema.type === "integer"
        ? 1
        : 0.1;
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-neutral-600">{label}</Label>
        <Input
          type="number"
          value={numericValue}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {description && <p className="text-xs text-neutral-400">{description}</p>}
      </div>
    );
  }

  const stringValue = typeof value === "string" ? value : String(schema.default ?? "");
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-neutral-600">{label}</Label>
      <Input
        type="text"
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      />
      {description && <p className="text-xs text-neutral-400">{description}</p>}
    </div>
  );
}

interface LivePreviewEffectProps {
  imageId?: string;
  operationId?: string | null;
  params: OperationParams;
  enabled: boolean;
  onStart?: () => void;
  onSuccess: (b64: string, metrics?: Record<string, number>) => void;
  onError: (error: unknown) => void;
}

function LivePreviewEffect({
  imageId,
  operationId,
  params,
  enabled,
  onStart,
  onSuccess,
  onError,
}: LivePreviewEffectProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paramsKey = useMemo(() => JSON.stringify(params ?? {}), [params]);

  useEffect(() => {
    if (!enabled || !imageId || !operationId) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setTimeout(async () => {
      try {
        onStart?.();
        const response = await requestPreview(imageId, operationId, params ?? {});
        onSuccess(response.resultB64, response.metrics);
      } catch (error) {
        onError(error);
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, imageId, operationId, paramsKey, onStart, onSuccess, onError]);

  return null;
}

export function SettingsPanel() {
  const {
    operations,
    presets,
    selectedOperationId,
    params,
    updateParam,
    resetParams,
    applyPreset,
    originalImage,
    setPreview,
    setResult,
    setProcessingResult,
    setJobId,
    setProgress,
    setJobStatus,
    setError,
    pushHistory,
    setProcessing,
    processing,
    jobStatus,
    jobId,
    progress,
    error,
    processingResult,
    preview,
    result,
  } = useProcessingStore(
    (state) => ({
      operations: state.operations,
      presets: state.presets,
      selectedOperationId: state.selectedOperationId,
      params: state.params,
      updateParam: state.updateParam,
      resetParams: state.resetParams,
      applyPreset: state.applyPreset,
      originalImage: state.originalImage,
      setPreview: state.setPreview,
      setResult: state.setResult,
      setProcessingResult: state.setProcessingResult,
      setJobId: state.setJobId,
      setProgress: state.setProgress,
      setJobStatus: state.setJobStatus,
      setError: state.setError,
      pushHistory: state.pushHistory,
      setProcessing: state.setProcessing,
      processing: state.processing,
      jobStatus: state.jobStatus,
      jobId: state.jobId,
      progress: state.progress,
      error: state.error,
      processingResult: state.processingResult,
      preview: state.preview,
      result: state.result,
    }),
    shallow,
  );

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMetrics, setPreviewMetrics] = useState<Record<string, number> | undefined>();

  const selectedOperation = useMemo(
    () => operations.find((operation) => operation.id === selectedOperationId) ?? null,
    [operations, selectedOperationId],
  );

  const selectedParams = useMemo<OperationParams>(() => {
    if (!selectedOperation) return {};
    return params[selectedOperation.id] ?? {};
  }, [params, selectedOperation]);

  const canPreview = Boolean(originalImage?.id && selectedOperation && !processing);
  const canProcess = Boolean(originalImage?.id && selectedOperation && !processing);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearChannels = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => clearChannels, [clearChannels]);

  const handlePreviewSuccess = useCallback(
    (b64: string, metrics?: Record<string, number>) => {
      setPreview(b64);
      setPreviewMetrics(metrics);
      setPreviewLoading(false);
      setJobStatus("idle");
      setProgress(0);
    },
    [setPreview, setJobStatus, setProgress],
  );

  const handlePreviewError = useCallback(
    (err: unknown) => {
      console.error(err);
      setPreviewLoading(false);
      toast.error("Gagal menghasilkan pratinjau", {
        description: err instanceof Error ? err.message : undefined,
      });
      setJobStatus("idle");
      setProgress(0);
    },
    [setJobStatus, setProgress],
  );

  const handleManualPreview = useCallback(async () => {
    if (!canPreview || !originalImage?.id || !selectedOperation) {
      toast.error("Unggah gambar dan pilih operasi terlebih dahulu");
      return;
    }
    try {
      setPreviewLoading(true);
      const response = await requestPreview(
        originalImage.id,
        selectedOperation.id,
        selectedParams,
      );
      handlePreviewSuccess(response.resultB64, response.metrics);
      toast.success("Pratinjau diperbarui");
    } catch (err) {
      handlePreviewError(err);
    }
  }, [
    canPreview,
    originalImage?.id,
    selectedOperation,
    selectedParams,
    handlePreviewError,
    handlePreviewSuccess,
  ]);

  const handleStatus = useCallback(
    async (status: JobStatusResponse, context: { imageName: string; params: OperationParams; operationId: string }) => {
      setProgress(status.progress ?? 0);
      setJobStatus(status.status as JobStatus);

      if (status.error) {
        setProcessing(false);
        setError(status.error);
        clearChannels();
        setJobId(null);
        toast.error("Pemrosesan gagal", { description: status.error });
        return;
      }

      if (status.status === "completed") {
        setProcessing(false);
        clearChannels();
        setProgress(100);
        try {
          const b64 = await downloadResult(status.job_id);
          setResult(b64);
          const mapped = mapResultFromStatus(status);
          if (mapped) {
            setProcessingResult(mapped);
          }
          const entry: HistoryEntry = {
            id: generateId("history"),
            operationId: context.operationId,
            params: context.params,
            createdAt: Date.now(),
            imageName: context.imageName,
            resultB64: b64,
            metrics: mapped?.metrics,
          };
          pushHistory(entry);
          toast.success("Pemrosesan selesai", {
            description: context.operationId,
          });
        } catch (err) {
          console.error(err);
          toast.error("Gagal mengambil hasil akhir");
        } finally {
          setJobId(null);
        }
      }
    },
    [
      clearChannels,
      pushHistory,
      setError,
      setJobId,
      setJobStatus,
      setProcessing,
      setProcessingResult,
      setProgress,
      setResult,
    ],
  );

  const startTracking = useCallback(
    (jobId: string, context: { imageName: string; params: OperationParams; operationId: string }) => {
      clearChannels();
      setJobId(jobId);
      const websocket = openProgressWS(jobId);
      if (websocket) {
        wsRef.current = websocket;
        websocket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as JobStatusResponse;
            handleStatus(payload, context);
          } catch (err) {
            console.error("WebSocket parse error", err);
          }
        };
        websocket.onerror = (event) => {
          console.warn("WebSocket error", event);
        };
        websocket.onclose = () => {
          wsRef.current = null;
        };
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = await pollJob(jobId);
          handleStatus(status, context);
          if (status.status === "completed" || status.status === "error") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 2000);
    },
    [clearChannels, handleStatus, setJobId],
  );

  const handleProcess = useCallback(async () => {
    if (!canProcess || !originalImage?.id || !selectedOperation) {
      toast.error("Unggah gambar dan pilih operasi terlebih dahulu");
      return;
    }
    try {
      setProcessing(true);
      setError(null);
      setPreviewMetrics(undefined);
      setProgress(5);
      setJobStatus("queued");
      const paramsSnapshot = { ...selectedParams };
      const response = await requestProcessing(
        originalImage.id,
        selectedOperation.id,
        paramsSnapshot,
      );
      setJobStatus(response.status);
      startTracking(response.job_id, {
        imageName: originalImage.name,
        params: paramsSnapshot,
        operationId: selectedOperation.id,
      });
      toast.success("Job dikirim ke backend", {
        description: `Job ID ${response.job_id}`,
      });
    } catch (err) {
      setProcessing(false);
      console.error(err);
      toast.error("Gagal memulai pemrosesan", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [
    canProcess,
    originalImage?.id,
    originalImage?.name,
    selectedOperation,
    selectedParams,
    setError,
    setJobStatus,
    setProcessing,
    setProgress,
    startTracking,
  ]);

  const handleDownloadLatest = useCallback(() => {
    if (!processingResult?.jobId || !result) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${result}`;
    link.download = `aintra-${processingResult.jobId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processingResult?.jobId, result]);

  return (
    <section id="pengaturan" className="mx-auto mt-16 max-w-6xl px-6">
      <RegistryLoader />
      <LivePreviewEffect
        imageId={originalImage?.id}
        operationId={selectedOperation?.id}
        params={selectedParams}
        enabled={canPreview}
        onStart={() => {
          setPreviewLoading(true);
          setJobStatus("processing");
        }}
        onSuccess={handlePreviewSuccess}
        onError={handlePreviewError}
      />

      <div className="rounded-[32px] border border-neutral-200/80 bg-white/90 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-neutral-900">Pengaturan Operasi</h3>
            <p className="text-sm text-neutral-500">
              Pilih operasi, sesuaikan parameter, dan jalankan preview atau proses penuh.
            </p>
          </div>
          {selectedOperation && (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-500 shadow-sm">
              <div className="font-semibold text-neutral-800">{selectedOperation.label}</div>
              <div className="mt-1 capitalize text-neutral-400">
                Kategori — {selectedOperation.category}
              </div>
              {selectedOperation.recommended && (
                <p className="mt-2 text-neutral-500">{selectedOperation.recommended}</p>
              )}
            </div>
          )}
        </div>

        {presets.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="xs"
                onClick={() => {
                  applyPreset(preset.id);
                  toast.success("Preset diterapkan", { description: preset.label });
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {!selectedOperation && (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
            Daftar operasi belum tersedia atau belum terpilih. Pastikan backend berjalan di
            <code className="mx-1 rounded bg-neutral-100 px-2 py-1">NEXT_PUBLIC_API_BASE</code>
            dan ulangi.
          </div>
        )}

        {selectedOperation && (
          <div className="mt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {Object.entries(selectedOperation.schema?.properties ?? {}).map(([paramId, field]) => (
                <div
                  key={paramId}
                  className="rounded-2xl border border-neutral-200 bg-white/80 p-5 shadow-sm"
                >
                  <ParameterControl
                    paramId={paramId}
                    schema={field}
                    value={selectedParams[paramId]}
                    onChange={(val) => updateParam(selectedOperation.id, paramId, val)}
                  />
                </div>
              ))}
              {Object.keys(selectedOperation.schema?.properties ?? {}).length === 0 && (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
                  Operasi ini tidak memiliki parameter yang dapat diubah.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectedOperation && resetParams(selectedOperation.id)}
                disabled={!selectedOperation || processing}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset Parameter
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualPreview}
                disabled={!canPreview}
              >
                <Sparkles className="mr-2 h-4 w-4" />{" "}
                {previewLoading ? "Memuat pratinjau…" : "Pratinjau"}
              </Button>
              <Button variant="gradient" size="sm" onClick={handleProcess} disabled={!canProcess}>
                <Play className="mr-2 h-4 w-4" /> Jalankan Proses
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLatest}
                disabled={!processingResult?.jobId || !result}
              >
                <Download className="mr-2 h-4 w-4" /> Unduh Hasil Terakhir
              </Button>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-800">Progres Pemrosesan</p>
                  <p className="text-xs text-neutral-500">Status: {jobStatus}</p>
                </div>
                <div className="text-xs text-neutral-500">
                  {processing ? "Sedang berjalan" : "Tidak ada proses aktif"}
                </div>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                />
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-500">
                  {error}
                </p>
              )}
              {!error && (
                <p className="mt-2 text-xs text-neutral-500">
                  {processing
                    ? `Pengolahan ${Math.round(progress)}%`
                    : result
                    ? "Pemrosesan terakhir selesai"
                    : preview
                    ? "Pratinjau siap dibandingkan"
                    : "Belum ada hasil yang diproses"}
                </p>
              )}
              {(processingResult?.metrics || previewMetrics) && (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  {Object.entries(processingResult?.metrics ?? previewMetrics ?? {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-neutral-600"
                      >
                        <dt className="text-[10px] uppercase tracking-wide text-neutral-400">
                          {key}
                        </dt>
                        <dd className="text-sm font-semibold text-neutral-800">
                          {value.toFixed(3)}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
