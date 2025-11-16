# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import base64
import os
import time
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from . import img_ops, storage
from .job_manager import job_manager
from .schemas import (
    HealthResponse,
    JobStatusResponse,
    PreviewRequest,
    PreviewResponse,
    ProcessRequest,
    ProcessResponse,
    DownloadResponse,
    UploadResponse,
)
from .security import setup_security

# CORS yang diizinkan (pisahkan dengan koma), contoh: "http://localhost:3000,http://127.0.0.1:3000"
ALLOWED_ORIGINS: List[str] = os.getenv(
    "AINTRA_CORS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
).split(",")

START_TIME = time.monotonic()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # bersihkan file kedaluwarsa saat start
    await asyncio.to_thread(storage.cleanup_expired)
    yield


app = FastAPI(
    title="AIntra Vision API",
    version="1.0.0",
    description="Backend FastAPI untuk AIntra Vision",
    lifespan=lifespan,
)

# header keamanan + CORS
setup_security(app, origins=[origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()])

# Serve seluruh artefak dari root penyimpanan: /media/images, /media/results, /media/previews, dll.
# StaticFiles adalah cara resmi untuk menyajikan berkas statis di FastAPI/Starlette.
app.mount("/media", StaticFiles(directory=storage.STORAGE_ROOT, check_dir=False), name="media")


# ------ util ops schema untuk FE ------
@app.get("/api/ops/registry")
async def ops_registry():
    """
    Provide the full registry of image operations for the frontend.

    Returning an object with the `ops` key keeps the response extensible
    (e.g. we can append metadata later without breaking clients).
    """
    return {"ops": img_ops.list_operations()}


# Back-compat alias
@app.get("/api/operations")
async def list_operations():
    return await ops_registry()


# ------ upload ------
@app.post("/api/upload", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)) -> UploadResponse:
    try:
        stored = await storage.save_upload(file)
    except storage.StorageError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return UploadResponse(
        image_id=stored.image_id,
        filename=stored.filename,
        content_type=stored.content_type,
        size=stored.size,
    )


# ------ preview cepat (resolusi kecil) ------
@app.post("/api/preview", response_model=PreviewResponse)
async def preview_image(payload: PreviewRequest):
    try:
        stored = storage.get_upload(payload.image_id)
        original = await asyncio.to_thread(img_ops.load_image, stored.path)
    except storage.StorageError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        params_validated = img_ops.prepare_operation_params(payload.operation, payload.params)
        canonical_op = img_ops.canonical_operation_id(payload.operation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    preview = await asyncio.to_thread(
        img_ops.generate_preview,
        original,
        canonical_op,
        params_validated,
    )
    metrics = await asyncio.to_thread(img_ops.compute_metrics, original, preview)
    preview_b64 = await asyncio.to_thread(img_ops.encode_png_b64, preview)
    operation_id = canonical_op
    return PreviewResponse(
        image_id=payload.image_id,
        operation=operation_id,
        result_b64=preview_b64,
        metrics=metrics or None,
    )


# ------ submit proses penuh (background melalui job_manager) ------
@app.post("/api/process", response_model=ProcessResponse)
async def process_image(payload: ProcessRequest) -> ProcessResponse:
    try:
        stored = storage.get_upload(payload.image_id)
    except storage.StorageError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    try:
        params_validated = img_ops.prepare_operation_params(payload.operation, payload.params)
        canonical_op = img_ops.canonical_operation_id(payload.operation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    record = await job_manager.submit(stored.path, canonical_op, params_validated)
    # nilai ETA hanya indikatif; FE tetap gunakan polling / WS
    return ProcessResponse(job_id=record.job_id, status=record.status, eta_ms=1200)


# ------ polling status job ------
@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> JobStatusResponse:
    try:
        return await job_manager.get_status(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan") from exc


# ------ unduh hasil final ------
@app.get("/api/download/{job_id}", response_model=DownloadResponse)
async def download_result(job_id: str):
    try:
        path = storage.get_result_path(job_id)
    except storage.StorageError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    data = await asyncio.to_thread(path.read_bytes)
    return DownloadResponse(job_id=job_id, b64=base64.b64encode(data).decode("ascii"))


# ------ progres realtime via WebSocket ------
@app.websocket("/api/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    try:
        queue = await job_manager.subscribe(job_id)
    except KeyError:
        await websocket.send_json({"status": "error", "error": "Job tidak ditemukan"})
        await websocket.close(code=4404)
        return

    try:
        while True:
            update = await queue.get()
            await websocket.send_json(update.model_dump())
    except WebSocketDisconnect:
        pass
    finally:
        await job_manager.unsubscribe(job_id, queue)


# ------ health ------
@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    uptime = time.monotonic() - START_TIME
    jobs = await job_manager.jobs_count()
    return HealthResponse(uptime_seconds=uptime, jobs_in_queue=jobs)
