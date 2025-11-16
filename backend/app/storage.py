import json
import os
import logging
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import numpy as np
import cv2
from fastapi import HTTPException, UploadFile

MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp"}
TTL_HOURS = int(os.getenv("AINTRA_STORAGE_TTL_HOURS", "72"))

STORAGE_ROOT = Path(os.getenv("AINTRA_STORAGE", "data")).resolve()
UPLOAD_DIR = STORAGE_ROOT / "uploads"
PREVIEW_DIR = STORAGE_ROOT / "previews"
RESULT_DIR = STORAGE_ROOT / "results"
METADATA_SUFFIX = ".json"

for directory in (STORAGE_ROOT, UPLOAD_DIR, PREVIEW_DIR, RESULT_DIR):
    directory.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("aintra.storage")


@dataclass
class StoredImage:
    image_id: str
    path: Path
    filename: str
    content_type: str
    size: int
    created_at: datetime
    url: str


class StorageError(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

FLOAT_RANGE_EPS = 1e-3


def prepare_image_for_save(data: np.ndarray) -> np.ndarray:
    """Normalise any image array into 8-bit BGR format suitable for cv2.imwrite."""
    if data is None:
        raise StorageError(status_code=500, detail="Hasil operasi kosong")

    array = np.asarray(data)
    if array.size == 0:
        raise StorageError(status_code=500, detail="Hasil operasi kosong")

    if array.ndim not in (2, 3):
        raise StorageError(status_code=500, detail="Format citra tidak didukung")

    array = np.nan_to_num(array, nan=0.0, posinf=255.0, neginf=0.0)

    if array.dtype.kind == "f":
        max_val = float(array.max())
        min_val = float(array.min())
        if max_val <= 1.0 + FLOAT_RANGE_EPS and min_val >= -FLOAT_RANGE_EPS:
            array = array * 255.0
        array = np.clip(array, 0.0, 255.0)
    elif array.dtype.kind in ("u", "i"):
        array = np.clip(array, 0, 255)
    else:
        raise StorageError(status_code=500, detail="Tipe data citra tidak didukung")

    array = np.asarray(array, dtype=np.uint8)
    array = np.ascontiguousarray(array)

    if array.ndim == 2:
        return cv2.cvtColor(array, cv2.COLOR_GRAY2BGR)

    if array.ndim == 3:
        channels = array.shape[2]
        if channels == 1:
            gray = array[:, :, 0]
            return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        if channels == 3:
            return array
        if channels == 4:
            return cv2.cvtColor(array, cv2.COLOR_BGRA2BGR)
        raise StorageError(status_code=500, detail="Jumlah kanal citra tidak didukung")

    raise StorageError(status_code=500, detail="Format citra tidak didukung")
def _metadata_path(image_id: str, target_dir: Path) -> Path:
    return target_dir / f"{image_id}{METADATA_SUFFIX}"


def _write_metadata(image_id: str, directory: Path, metadata: dict) -> None:
    metadata_path = _metadata_path(image_id, directory)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_metadata(image_id: str, directory: Path) -> dict:
    metadata_path = _metadata_path(image_id, directory)
    if not metadata_path.exists():
        raise StorageError(status_code=404, detail="Metadata tidak ditemukan")
    return json.loads(metadata_path.read_text())


def _public_url(directory: Path, filename: str) -> str:
    relative = filename
    if directory == UPLOAD_DIR:
        return f"/media/uploads/{relative}"
    if directory == PREVIEW_DIR:
        return f"/media/previews/{relative}"
    if directory == RESULT_DIR:
        return f"/media/results/{relative}"
    return f"/media/{relative}"


async def save_upload(file: UploadFile) -> StoredImage:
    raw = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(raw) == 0:
        raise StorageError(status_code=400, detail="File kosong")
    if len(raw) > MAX_UPLOAD_SIZE:
        raise StorageError(status_code=413, detail="Ukuran file melebihi batas 25MB")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME:
        raise StorageError(status_code=400, detail="Tipe MIME tidak didukung")

    image_array = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if image_array is None:
        raise StorageError(status_code=400, detail="File bukan citra valid")

    extension = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
    }.get(content_type, ".png")

    image_id = uuid.uuid4().hex
    filename = f"{image_id}{extension}"
    path = UPLOAD_DIR / filename

    if not cv2.imwrite(str(path), image_array):
        raise StorageError(status_code=500, detail="Gagal menyimpan file")

    metadata = {
        "image_id": image_id,
        "filename": file.filename or filename,
        "content_type": content_type,
        "size": len(raw),
        "saved_filename": filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_metadata(image_id, UPLOAD_DIR, metadata)

    return StoredImage(
        image_id=image_id,
        path=path,
        filename=file.filename or filename,
        content_type=content_type,
        size=len(raw),
        created_at=datetime.now(timezone.utc),
        url=_public_url(UPLOAD_DIR, filename),
    )


def get_upload(image_id: str) -> StoredImage:
    metadata = _load_metadata(image_id, UPLOAD_DIR)
    saved_filename = metadata["saved_filename"]
    path = UPLOAD_DIR / saved_filename
    if not path.exists():
        raise StorageError(status_code=404, detail="File tidak ditemukan")
    return StoredImage(
        image_id=image_id,
        path=path,
        filename=metadata.get("filename", saved_filename),
        content_type=metadata.get("content_type", "image/png"),
        size=metadata.get("size", path.stat().st_size),
        created_at=datetime.fromisoformat(metadata.get("created_at")),
        url=_public_url(UPLOAD_DIR, saved_filename),
    )


def save_preview(image_id: str, data: np.ndarray, suffix: str = "preview") -> str:
    filename = f"{image_id}_{suffix}.png"
    path = PREVIEW_DIR / filename
    image = prepare_image_for_save(data)
    if not cv2.imwrite(str(path), image):
        raise StorageError(status_code=500, detail="Gagal menyimpan preview")
    metadata = {
        "image_id": image_id,
        "filename": filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_metadata(f"{image_id}_{suffix}", PREVIEW_DIR, metadata)
    return _public_url(PREVIEW_DIR, filename)


def save_result(job_id: str, data: np.ndarray) -> str:
    filename = f"{job_id}.png"
    path = RESULT_DIR / filename
    image = prepare_image_for_save(data)
    start = time.perf_counter()
    if not cv2.imwrite(str(path), image):
        raise StorageError(status_code=500, detail="Gagal menyimpan hasil operasi")
    if not path.exists():
        raise StorageError(status_code=500, detail="File hasil tidak ditemukan setelah penyimpanan")
    size_bytes = path.stat().st_size
    if size_bytes <= 0:
        raise StorageError(status_code=500, detail="File hasil kosong")
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    logger.info("saved result path=%s size_bytes=%d elapsed_ms=%.2f", str(path), size_bytes, elapsed_ms)
    metadata = {
        "job_id": job_id,
        "filename": filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_metadata(job_id, RESULT_DIR, metadata)
    return _public_url(RESULT_DIR, filename)


def get_result_path(job_id: str) -> Path:
    metadata = _load_metadata(job_id, RESULT_DIR)
    filename = metadata.get("filename")
    path = RESULT_DIR / filename
    if not path.exists():
        raise StorageError(status_code=404, detail="Hasil tidak ditemukan")
    return path


def cleanup_expired(now: Optional[datetime] = None) -> int:
    now = now or datetime.now(timezone.utc)
    threshold = now - timedelta(hours=TTL_HOURS)
    removed = 0
    for directory in (UPLOAD_DIR, PREVIEW_DIR, RESULT_DIR):
        for metadata_path in directory.glob(f"*{METADATA_SUFFIX}"):
            try:
                data = json.loads(metadata_path.read_text())
            except json.JSONDecodeError:
                continue
            created_at_str = data.get("created_at")
            if not created_at_str:
                continue
            created_at = datetime.fromisoformat(created_at_str)
            if created_at < threshold:
                stem = metadata_path.stem
                image_path = directory / stem
                if not image_path.suffix:
                    for candidate in directory.glob(f"{stem}.*"):
                        if candidate.suffix != METADATA_SUFFIX:
                            candidate.unlink(missing_ok=True)
                            removed += 1
                else:
                    image_path.unlink(missing_ok=True)
                    removed += 1
                metadata_path.unlink(missing_ok=True)
    return removed















