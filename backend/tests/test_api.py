# -*- coding: utf-8 -*-
import time
from typing import Tuple

import cv2
import numpy as np
import pytest


def _make_image_bytes(size: Tuple[int, int] = (128, 128)) -> bytes:
    x = np.tile(np.linspace(0, 255, size[0], dtype=np.uint8), (size[1], 1))
    image = np.dstack([x, 255 - x, np.full_like(x, 120)])
    success, buffer = cv2.imencode(".png", image)
    assert success
    return buffer.tobytes()


@pytest.mark.usefixtures("client")
def test_upload_and_preview_flow(client):
    image_bytes = _make_image_bytes()
    response = client.post(
        "/api/upload",
        files={"file": ("sample.png", image_bytes, "image/png")},
    )
    assert response.status_code == 200
    upload_payload = response.json()
    image_id = upload_payload["image_id"]

    preview_response = client.post(
        "/api/preview",
        json={"image_id": image_id, "operation": "gamma", "params": {"gamma": 1.1}},
    )
    assert preview_response.status_code == 200
    payload = preview_response.json()
    assert payload["preview_url"].startswith("/media/previews/")


@pytest.mark.usefixtures("client")
def test_process_job_lifecycle(client):
    image_bytes = _make_image_bytes()
    upload = client.post(
        "/api/upload",
        files={"file": ("sample.png", image_bytes, "image/png")},
    ).json()

    process = client.post(
        "/api/process",
        json={"image_id": upload["image_id"], "operation": "negative", "params": {}},
    )
    assert process.status_code == 200
    job_id = process.json()["job_id"]

    status = None
    for _ in range(20):
        status_response = client.get(f"/api/jobs/{job_id}")
        assert status_response.status_code == 200
        status = status_response.json()
        if status["status"] == "completed":
            break
        time.sleep(0.2)
    assert status["status"] == "completed"
    assert status["result_url"]
    assert status["result_url"].startswith("/media/results/")

    media_response = client.get(status["result_url"])
    assert media_response.status_code == 200
    assert media_response.headers["content-type"] == "image/png"

    download = client.get(f"/api/download/{job_id}")
    assert download.status_code == 200
    assert download.headers["content-type"] == "image/png"


@pytest.mark.usefixtures("client")
def test_upload_rejects_invalid_format(client):
    response = client.post(
        "/api/upload",
        files={"file": ("sample.txt", b"not-an-image", "text/plain")},
    )
    assert response.status_code == 400

