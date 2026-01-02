<<<<<<< HEAD
import cv2
import numpy as np

from app import img_ops
from app.services.image_ops import CANONICAL_OPERATIONS

CANONICAL_OPERATION_NAMES = list(CANONICAL_OPERATIONS.keys())


def _sample_image() -> np.ndarray:
    x = np.tile(np.linspace(0, 255, 64, dtype=np.uint8), (64, 1))
    y = x.T
    r = x
    g = y
    b = 255 - x
    return np.dstack([b, g, r])


def _assert_image(image: np.ndarray) -> None:
    assert image.dtype == np.uint8
    assert image.ndim in (2, 3)


def test_apply_operation_shapes():
    image = _sample_image()
params_map = {
    "gamma": {"gamma": 1.2},
    "log": {"gain": 1.5},
    "hist_eq_clahe": {"mode": "clahe_lab", "clip_limit": 2.0, "tile_grid": 8},
    "geo": {"rotate_deg": 12, "tx": 5, "ty": -3},
    "thresh_global": {"thresh": 120},
    "thresh_adapt_otsu": {"method": "adaptive_mean", "block_size": 11, "C": 2},
    "hsv_adjust": {"delta_h": 12, "scale_s": 1.1, "scale_v": 1.05},
    "contrast_stretch": {"p_low": 5.0, "p_high": 95.0},
}
    for name in CANONICAL_OPERATION_NAMES:
        params = params_map.get(name, {})
        result = img_ops.apply_operation(image, name, params)
        _assert_image(result)
        assert result.shape[:2] == image.shape[:2]


def test_negative_preserves_alpha():
    alpha = np.full((32, 32, 1), 180, dtype=np.uint8)
    rgb = np.full((32, 32, 3), 100, dtype=np.uint8)
    image = np.concatenate([rgb, alpha], axis=2)
    result = img_ops.apply_operation(image, "negative", {"mode": "rgb", "blend": 1.0})
    assert np.array_equal(result[:, :, 3], alpha[:, :, 0])


def test_log_operation_increases_mean():
    image = _sample_image()
    before_mean = float(image.mean())
    result = img_ops.apply_operation(image, "log", {"gain": 2})
    after_mean = float(result.mean())
    assert after_mean > before_mean


def test_hist_eq_clahe_improves_contrast():
    image = np.full((64, 64, 3), 120, dtype=np.uint8)
    cv2.rectangle(image, (8, 8), (56, 56), (200, 200, 200), -1)
    result = img_ops.apply_operation(image, "hist_eq_clahe", {"mode": "clahe_lab"})
    assert float(result.std()) > float(image.std())


def test_threshold_global_binary_output():
    image = _sample_image()
    result = img_ops.apply_operation(image, "thresh_global", {"thresh": 127})
    unique = np.unique(result)
    assert set(unique).issubset({0, 255})


def test_geometry_translation_effect():
    image = _sample_image()
    translated = img_ops.apply_operation(image, "geo", {"tx": 10, "ty": 5})
    assert not np.array_equal(image, translated)


def test_compute_metrics_values():
    image = _sample_image()
    blurred = cv2.GaussianBlur(image, (5, 5), 1.0)
    metrics = img_ops.compute_metrics(image, blurred)
    assert "ssim" in metrics and "psnr" in metrics
    assert 0 <= metrics["ssim"] <= 1
    assert metrics["psnr"] > 10


def test_nlmeans_runs():
    image = _sample_image()
    result = img_ops.apply_operation(
        image,
        "nlmeans",
        {"h_luma": 8.0, "h_color": 6.0, "template": 7, "search": 21},
    )
    _assert_image(result)
    assert result.shape == image.shape


def test_white_balance_grayworld_balances_channels():
    image = _sample_image().astype(np.uint8)
    result = img_ops.apply_operation(image, "white_balance", {})
    b, g, r = cv2.split(result.astype(np.float32))
    assert abs(b.mean() - g.mean()) < 10
    assert abs(r.mean() - g.mean()) < 10


def test_hsv_adjust_runs():
    image = _sample_image()
    result = img_ops.apply_operation(image, "hsv_adjust", {"delta_h": 20, "scale_s": 1.2})
    _assert_image(result)
    assert result.shape == image.shape
=======
import numpy as np
import cv2

from app import img_ops
from app.schemas import OperationEnum


def _sample_image() -> np.ndarray:
    x = np.tile(np.linspace(0, 255, 64, dtype=np.uint8), (64, 1))
    y = x.T
    r = x
    g = y
    b = 255 - x
    return np.dstack([b, g, r])


def _assert_image(image: np.ndarray) -> None:
    assert image.dtype == np.uint8
    assert image.ndim in (2, 3)


def test_apply_operation_shapes():
    image = _sample_image()
    for operation in OperationEnum:
        params = {
            OperationEnum.GAMMA: {"gamma": 1.2},
            OperationEnum.LOG: {"gain": 1.5},
            OperationEnum.HISTOGRAM: {"method": "clahe"},
            OperationEnum.GEOMETRY: {"rotate": 12, "translate": [5, -3]},
            OperationEnum.THRESHOLD_GLOBAL: {"threshold": 120},
            OperationEnum.THRESHOLD_ADAPTIVE: {"mode": "adaptive_mean"},
        }.get(operation, {})
        result = img_ops.apply_operation(image, operation, params)
        _assert_image(result)
        assert result.shape[:2] == image.shape[:2]


def test_negative_preserves_alpha():
    alpha = np.full((32, 32, 1), 180, dtype=np.uint8)
    rgb = np.full((32, 32, 3), 100, dtype=np.uint8)
    image = np.concatenate([rgb, alpha], axis=2)
    result = img_ops.apply_operation(image, OperationEnum.NEGATIVE, {"preserveAlpha": True})
    assert np.array_equal(result[:, :, 3], alpha[:, :, 0])


def test_log_operation_increases_mean():
    image = _sample_image()
    before_mean = float(image.mean())
    result = img_ops.apply_operation(image, OperationEnum.LOG, {"gain": 2})
    after_mean = float(result.mean())
    assert after_mean > before_mean


def test_histogram_operation_clahe_improves_contrast():
    image = np.full((64, 64, 3), 120, dtype=np.uint8)
    cv2.rectangle(image, (8, 8), (56, 56), (200, 200, 200), -1)
    result = img_ops.apply_operation(image, OperationEnum.HISTOGRAM, {"method": "clahe"})
    assert float(result.std()) > float(image.std())


def test_threshold_global_binary_output():
    image = _sample_image()
    result = img_ops.apply_operation(image, OperationEnum.THRESHOLD_GLOBAL, {"threshold": 127})
    unique = np.unique(result)
    assert set(unique).issubset({0, 255})


def test_geometry_translation_effect():
    image = _sample_image()
    translated = img_ops.apply_operation(image, OperationEnum.GEOMETRY, {"translate": [10, 5]})
    assert not np.array_equal(image, translated)


def test_compute_metrics_values():
    image = _sample_image()
    blurred = cv2.GaussianBlur(image, (5, 5), 1.0)
    metrics = img_ops.compute_metrics(image, blurred)
    assert "ssim" in metrics and "psnr" in metrics
    assert 0 <= metrics["ssim"] <= 1
    assert metrics["psnr"] > 10
>>>>>>> ee3fa41 (chore: update README and UI)
