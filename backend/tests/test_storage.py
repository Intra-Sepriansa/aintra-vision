# -*- coding: utf-8 -*-
import numpy as np
import pytest

from app import storage


def test_prepare_image_for_save_float_gray():
    data = np.linspace(0, 1, 16, dtype=np.float32).reshape(4, 4)
    prepared = storage.prepare_image_for_save(data)
    assert prepared.dtype == np.uint8
    assert prepared.shape == (4, 4, 3)
    assert prepared.max() <= 255
    assert prepared.min() >= 0


def test_prepare_image_for_save_uint16_to_uint8():
    data = np.array([[0, 1024], [4096, 65535]], dtype=np.uint16)
    prepared = storage.prepare_image_for_save(data)
    assert prepared.dtype == np.uint8
    assert prepared.shape == (2, 2, 3)
    assert prepared.max() == 255


def test_save_result_raises_when_imwrite_fails(monkeypatch, tmp_path):
    monkeypatch.setattr(storage, "RESULT_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    called = {}

    def _fake_imwrite(path, image):  # noqa: ANN001
        called["attempt"] = (path, image.shape)
        return False

    monkeypatch.setattr(storage.cv2, "imwrite", _fake_imwrite)

    with pytest.raises(storage.StorageError) as exc:
        storage.save_result("job123", np.ones((8, 8), dtype=np.float32))
    assert exc.value.status_code == 500
    assert "Gagal" in exc.value.detail



def test_save_result_creates_png(monkeypatch, tmp_path):
    monkeypatch.setattr(storage, "RESULT_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    data = np.random.rand(10, 10, 3).astype(np.float32)
    url = storage.save_result("job999", data)

    expected_path = tmp_path / "job999.png"
    assert expected_path.exists()
    assert expected_path.stat().st_size > 0
    assert url == "/media/results/job999.png"

