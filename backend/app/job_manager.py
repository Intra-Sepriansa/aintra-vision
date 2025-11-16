# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Set

from . import img_ops, storage
from .schemas import JobStatus, JobStatusResponse


@dataclass
class JobRecord:
    job_id: str
    image_path: Path
    operation: str
    params: Dict[str, Any]
    status: JobStatus = "queued"
    progress: int = 0
    result_url: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None
    started_at: float = field(default_factory=lambda: asyncio.get_event_loop().time())
    finished_at: Optional[float] = None


class JobManager:
    def __init__(self) -> None:
        self._jobs: Dict[str, JobRecord] = {}
        self._subscribers: Dict[str, Set[asyncio.Queue[JobStatusResponse]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def submit(self, image_path: Path, operation: str, params: Dict[str, Any]) -> JobRecord:
        job_id = uuid.uuid4().hex
        record = JobRecord(job_id=job_id, image_path=image_path, operation=operation, params=params)
        async with self._lock:
            self._jobs[job_id] = record
        asyncio.create_task(self._process_job(record))
        return record

    async def subscribe(self, job_id: str) -> asyncio.Queue[JobStatusResponse]:
        queue: asyncio.Queue[JobStatusResponse] = asyncio.Queue()
        async with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                raise KeyError(job_id)
            await queue.put(self._to_response(record))
            self._subscribers[job_id].add(queue)
        return queue

    async def unsubscribe(self, job_id: str, queue: asyncio.Queue[JobStatusResponse]) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(job_id)
            if subscribers and queue in subscribers:
                subscribers.remove(queue)

    async def get_status(self, job_id: str) -> JobStatusResponse:
        async with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                raise KeyError(job_id)
            return self._to_response(record)

    async def jobs_count(self) -> int:
        async with self._lock:
            return len(self._jobs)

    async def _process_job(self, record: JobRecord) -> None:
        try:
            await self._update(record.job_id, status="processing", progress=20)
            original = await asyncio.to_thread(img_ops.load_image, record.image_path)
            processed = await asyncio.to_thread(img_ops.apply_operation, original, record.operation, record.params)
            result_url = await asyncio.to_thread(storage.save_result, record.job_id, processed)
            metrics = await asyncio.to_thread(img_ops.compute_metrics, original, processed)
            await self._update(
                record.job_id,
                status="completed",
                progress=100,
                result_url=result_url,
                metrics=metrics,
            )
        except Exception as exc:  # noqa: BLE001
            await self._update(record.job_id, status="error", progress=100, error=str(exc))

    async def _update(
        self,
        job_id: str,
        *,
        status: Optional[JobStatus] = None,
        progress: Optional[int] = None,
        result_url: Optional[str] = None,
        metrics: Optional[Dict[str, float]] = None,
        error: Optional[str] = None,
    ) -> None:
        async with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return
            if status:
                record.status = status
            if progress is not None:
                record.progress = int(progress)
            if result_url is not None:
                record.result_url = result_url
            if metrics is not None:
                record.metrics = metrics
            if error is not None:
                record.error = error
            if status in {"completed", "error"}:
                record.finished_at = asyncio.get_event_loop().time()
            response = self._to_response(record)
            subscribers = list(self._subscribers.get(job_id, set()))
        for queue in subscribers:
            await queue.put(response)

    @staticmethod
    def _to_response(record: JobRecord) -> JobStatusResponse:
        return JobStatusResponse(
            job_id=record.job_id,
            status=record.status,
            progress=record.progress,
            result_url=record.result_url,
            metrics=record.metrics,
            error=record.error,
        )


job_manager = JobManager()
