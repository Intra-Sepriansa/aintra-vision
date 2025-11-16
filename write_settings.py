import pathlib

content_parts: list[str] = []

content_parts.append("""
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Play, RefreshCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  downloadResult,
  fetchOperationRegistry,
  mapResultFromStatus,
  openProgressWS,
  pollJob,
  requestPreview,
  requestProcessing,
} from "@/lib/api";
import { cn, generateId } from "@/lib/utils";
import { useProcessingStore } from "@/store/use-processing-store";

const PREVIEW_DEBOUNCE = 250;
""")
content_parts.append("""
export function SettingsPanel() {
  const {
    operations,
    presets,
    selectedOperationId,
    params,
    setRegistry,
    setOperation,
    updateParam,
    resetParams,
    applyPreset,
    setPreview,
    setResult,
    setProcessingResult,
    setJobId,
    setProgress,
    setJobStatus,
    setError,
    pushHistory,
    setProcessing,
    setUpload,
    originalImage,
    original,
    preview,
    result,
    processingResult,
    jobId,
    progress,
    jobStatus,
    error,
    processing,
  } = useProcessingStore((state) => ({
    operations: state.operations,
    presets: state.presets,
    selectedOperationId: state.selectedOperationId,
    params: state.params,
    setRegistry: state.setRegistry,
    setOperation: state.setOperation,
    updateParam: state.updateParam,
    resetParams: state.resetParams,
    applyPreset: state.applyPreset,
    setPreview: state.setPreview,
    setResult: state.setResult,
    setProcessingResult: state.setProcessingResult,
    setJobId: state.setJobId,
    setProgress: state.setProgress,
    setJobStatus: state.setJobStatus,
    setError: state.setError,
    pushHistory: state.pushHistory,
    setProcessing: state.setProcessing,
    setUpload: state.setUpload,
    originalImage: state.originalImage,
    original: state.original,
    preview: state.preview,
    result: state.result,
    processingResult: state.processingResult,
    jobId: state.jobId,
    progress: state.progress,
    jobStatus: state.jobStatus,
    error: state.error,
    processing: state.processing,
  }));

  const [registryLoading, setRegistryLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
""")
content_parts.append("""
  useEffect(() => {
    if (operations.length || registryLoading) return;
    setRegistryLoading(true);
    fetchOperationRegistry()
      .then((entries) => setRegistry(entries))
      .catch((err) => {
        console.error(err);
        toast.error("Gagal memuat registry operasi");
      })
      .finally(() => setRegistryLoading(false));
  }, [operations.length, registryLoading, setRegistry]);

  const selectedOperation = useMemo(() => {
    if (!selectedOperationId) return operations[0];
    return operations.find((op) => op.id === selectedOperationId) ?? operations[0];
  }, [operations, selectedOperationId]);

  useEffect(() => {
    if (!selectedOperation && operations.length) {
      setOperation(operations[0].id);
    }
  }, [operations, selectedOperation, setOperation]);

  const paramsForSelected = selectedOperation
    ? params[selectedOperation.id] ?? {}
    : {};

  const imageId = originalImage?.id;
""")
content_parts.append("""
  const triggerPreview = useCallback(async () => {
    if (!selectedOperation || !imageId) return;
    try {
      setPreviewLoading(true);
      const response = await requestPreview(
        imageId,
        selectedOperation.canonical ?? selectedOperation.id,
        params[selectedOperation.id] ?? {},
      );
      setPreview(response.resultB64);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [imageId, params, selectedOperation, setPreview]);

  const previewKey = useMemo(() => {
    if (!selectedOperation) return "";
    return JSON.stringify(params[selectedOperation.id] ?? {});
  }, [params, selectedOperation]);

  useEffect(() => {
    if (!selectedOperation || !imageId) return;
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    previewTimeoutRef.current = setTimeout(() => {
      triggerPreview();
    }, PREVIEW_DEBOUNCE);
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [imageId, previewKey, selectedOperation, triggerPreview]);
""")
content_parts.append("""
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

  useEffect(() => () => clearChannels(), [clearChannels]);
""")
content_parts.append("""
  const handleProcess = useCallback(async () => {
    if (!selectedOperation || !imageId || !originalImage) {
      toast.error("Unggah gambar terlebih dahulu");
      return;
    }

    try {
      clearChannels();
      setProcessing(true);
      setJobStatus("queued");
      setProgress(5);
      setError(null);

      const response = await requestProcessing(
        imageId,
        selectedOperation.canonical ?? selectedOperation.id,
        params[selectedOperation.id] ?? {},
      );

      setJobId(response.job_id);
      setJobStatus(response.status);
""")
content_parts.append("""
      const finalize = async (statusPayload?: ReturnType<typeof mapResultFromStatus>) => {
        try {
          const b64 = await downloadResult(response.job_id);
          setResult(b64);
          setProcessingResult({
            jobId: response.job_id,
            metrics: statusPayload?.metrics ?? undefined,
            completedAt: Date.now(),
          });
          pushHistory({
            id: generateId("history"),
            operationId: selectedOperation.id,
            params: params[selectedOperation.id] ?? {},
            createdAt: Date.now(),
            imageName: originalImage.name,
            resultB64: b64,
            metrics: statusPayload?.metrics ?? undefined,
          });
        } catch (err) {
          console.error(err);
          toast.error("Gagal mengambil hasil akhir");
        }
      };

      const handleStatus = (
        payload: ReturnType<typeof mapResultFromStatus> | undefined,
        progressValue: number,
        statusValue: string,
      ) => {
        setProgress(progressValue);
        setJobStatus(statusValue as JobStatus);
        if (statusValue === "completed") {
          finalize(payload).finally(() => {
            setProcessing(false);
            clearChannels();
          });
        } else if (statusValue === "error") {
          setProcessing(false);
          clearChannels();
        }
      };
""")
