// src/types/job.ts

/** Status job yang valid dari backend/WebSocket */
export type JobStatus =
  | "idle"
  | "queued"
  | "processing"
  | "running"
  | "completed"
  | "error";

/** Payload status job dari API/WS */
export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress?: number;
  error?: string;
  url?: string;
  metrics?: Record<string, number>;
  [key: string]: unknown;
}

/** Type guard: memastikan string dari WS cocok ke JobStatus */
export function isJobStatus(x: unknown): x is JobStatus {
  return (
    typeof x === "string" &&
    ["idle", "queued", "processing", "running", "completed", "error"].includes(x)
  );
}
