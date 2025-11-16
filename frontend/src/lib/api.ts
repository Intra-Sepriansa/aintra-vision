"use client";

import { toast } from "sonner";

import type { OperationParams, OperationRegistryEntry } from "@/lib/operations";
import type { JobStatus, ProcessingResult } from "@/store/use-processing-store";

const DEFAULT_API_BASE = "http://localhost:8000";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
  }
  return process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Permintaan gagal diproses");
  }
  return response.json() as Promise<T>;
}

export interface UploadResponse {
  image_id: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface PreviewResponse {
  imageId: string;
  operation: string;
  resultB64: string;
  metrics?: Record<string, number>;
}

export interface ProcessResponse {
  job_id: string;
  status: JobStatus;
  eta_ms?: number;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  result_url?: string | null;
  metrics?: Record<string, number>;
  error?: string | null;
}

export interface DownloadResponse {
  jobId?: string;
  job_id?: string;
  b64: string;
}

export async function getOpsRegistry(): Promise<OperationRegistryEntry[]> {
  const response = await fetch(`${getBaseUrl()}/api/ops/registry`, {
    cache: "no-store",
  });
  const payload = await handleResponse<{ ops?: OperationRegistryEntry[] }>(response);
  if (!payload?.ops || !Array.isArray(payload.ops)) {
    throw new Error("Invalid registry payload");
  }
  return payload.ops;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getBaseUrl()}/api/upload`, {
    method: "POST",
    body: formData,
  });

  return handleResponse<UploadResponse>(response);
}

export async function requestPreview(
  imageId: string,
  operation: string,
  params: OperationParams,
): Promise<PreviewResponse> {
  const response = await fetch(`${getBaseUrl()}/api/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_id: imageId, operation, params }),
  });

  return handleResponse<PreviewResponse>(response);
}

export async function requestProcessing(
  imageId: string,
  operation: string,
  params: OperationParams,
): Promise<ProcessResponse> {
  const response = await fetch(`${getBaseUrl()}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_id: imageId, operation, params }),
  });

  return handleResponse<ProcessResponse>(response);
}

export async function pollJob(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${getBaseUrl()}/api/jobs/${jobId}`);
  return handleResponse<JobStatusResponse>(response);
}

export function openProgressWS(jobId: string): WebSocket | null {
  try {
    const baseUrl = getBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, "ws");
    return new WebSocket(`${wsUrl}/api/progress/${jobId}`);
  } catch (error) {
    console.error("Failed to create websocket", error);
    toast.error("Tidak dapat tersambung ke progress WebSocket");
    return null;
  }
}

export async function downloadResult(jobId: string): Promise<string> {
  const response = await fetch(`${getBaseUrl()}/api/download/${jobId}`);
  const data = await handleResponse<DownloadResponse>(response);
  return data.b64;
}

export function mapResultFromStatus(
  status: JobStatusResponse,
): ProcessingResult | undefined {
  if (status.status !== "completed") {
    return undefined;
  }
  return {
    jobId: status.job_id,
    metrics: status.metrics,
    completedAt: Date.now(),
  } satisfies ProcessingResult;
}
