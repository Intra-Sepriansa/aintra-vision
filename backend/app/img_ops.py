<<<<<<< HEAD
from __future__ import annotations

from app.services.image_ops import (
    apply_operation,
    canonical_operation_id,
    compute_metrics,
    decode_image,
    encode_png,
    encode_png_b64,
    generate_preview,
    get_operation_defaults,
    list_operations,
    load_image,
    prepare_operation_params,
)

__all__ = [
    "apply_operation",
    "compute_metrics",
    "decode_image",
    "encode_png",
    "encode_png_b64",
    "generate_preview",
    "get_operation_defaults",
    "list_operations",
    "load_image",
    "canonical_operation_id",
    "prepare_operation_params",
]
=======
from __future__ import annotations

import math
import threading
from pathlib import Path
from typing import Dict, Optional

import cv2
import numpy as np
from skimage import exposure
from skimage.segmentation import active_contour
from skimage.feature import graycomatrix, graycoprops, hog, local_binary_pattern
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

from .schemas import OperationEnum


_metrics_local = threading.local()


def _reset_operation_metrics() -> None:
    _metrics_local.value = {}


def push_operation_metrics(data: Dict[str, float | int]) -> None:
    """Store numeric metrics that will be merged into the response payload."""
    store = getattr(_metrics_local, "value", None)
    if store is None:
        store = {}
        _metrics_local.value = store
    for key, value in data.items():
        if isinstance(value, (int, float, np.integer, np.floating)):
            store[key] = float(value)
        else:
            store[key] = value


def consume_operation_metrics() -> Dict[str, float]:
    store = getattr(_metrics_local, "value", None)
    if not store:
        _metrics_local.value = {}
        return {}
    metrics = dict(store)
    _metrics_local.value = {}
    return metrics


def load_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Gagal memuat citra")
    return image


def split_alpha(image: np.ndarray) -> tuple[np.ndarray, Optional[np.ndarray]]:
    if image.ndim == 3 and image.shape[2] == 4:
        return image[:, :, :3], image[:, :, 3]
    return image, None


def merge_alpha(image: np.ndarray, alpha: Optional[np.ndarray]) -> np.ndarray:
    if alpha is None:
        return image
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    return np.dstack([image, alpha])


def as_gray(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def to_uint8(image: np.ndarray) -> np.ndarray:
    return np.clip(image, 0, 255).astype(np.uint8)


def _merge_with_alpha(image: np.ndarray, alpha: Optional[np.ndarray]) -> np.ndarray:
    if alpha is None:
        return image
    if image.shape[:2] != alpha.shape[:2]:
        return image
    return merge_alpha(image, alpha)


def _draw_text_block(
    image: np.ndarray,
    lines: list[str],
    origin: tuple[int, int] = (10, 24),
    line_height: int = 22,
    color: tuple[int, int, int] = (20, 20, 20),
    bg_color: Optional[tuple[int, int, int]] = (255, 255, 255),
) -> np.ndarray:
    """Render multiple lines of text with optional background for readability."""
    out = image.copy()
    x, y = origin
    if bg_color is not None and lines:
        text_height = line_height * len(lines) + 8
        x_end = min(out.shape[1] - 1, x + 320)
        y_start = max(0, y - line_height)
        y_end = min(out.shape[0] - 1, y - line_height + text_height)
        cv2.rectangle(out, (max(0, x - 8), y_start), (x_end, y_end), bg_color, -1)
        cv2.rectangle(out, (max(0, x - 8), y_start), (x_end, y_end), (200, 200, 200), 1)
    for idx, line in enumerate(lines):
        cy = y + idx * line_height
        cv2.putText(out, line, (x, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)
    return out


def negative_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    preserve_alpha = bool(params.get("preserveAlpha", True))
    rgb, alpha = split_alpha(image)
    inverted = cv2.bitwise_not(rgb)
    if preserve_alpha:
        return merge_alpha(inverted, alpha)
    return cv2.bitwise_not(image)


def log_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    gain = float(params.get("gain", 1.0))
    base = str(params.get("base", "e"))
    rgb, alpha = split_alpha(image)
    normalized = rgb.astype(np.float32) / 255.0
    if base == "10":
        logged = gain * np.log10(1 + normalized)
    elif base == "2":
        logged = gain * np.log2(1 + normalized)
    else:
        logged = gain * np.log1p(normalized)
    logged = cv2.normalize(logged, None, 0, 255, cv2.NORM_MINMAX)
    return merge_alpha(to_uint8(logged), alpha)


def gamma_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    gamma = max(0.01, float(params.get("gamma", 1.0)))
    gain = float(params.get("gain", 1.0))
    rgb, alpha = split_alpha(image)
    inv_gamma = 1.0 / gamma
    table = np.array([(gain * ((i / 255.0) ** inv_gamma) * 255) for i in range(256)]).clip(0, 255).astype("uint8")
    corrected = cv2.LUT(rgb, table)
    return merge_alpha(corrected, alpha)


def histogram_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    method = params.get("method", "clahe")
    clip_limit = float(params.get("clipLimit", 2.5))
    tile_grid = int(params.get("tileGrid", 8))
    rgb, alpha = split_alpha(image)

    if method == "global":
        if rgb.ndim == 2:
            equalized = cv2.equalizeHist(rgb)
        else:
            yuv = cv2.cvtColor(rgb, cv2.COLOR_BGR2YCrCb)
            yuv[:, :, 0] = cv2.equalizeHist(yuv[:, :, 0])
            equalized = cv2.cvtColor(yuv, cv2.COLOR_YCrCb2BGR)
    else:
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid, tile_grid))
        if rgb.ndim == 2:
            equalized = clahe.apply(rgb)
        else:
            lab = cv2.cvtColor(rgb, cv2.COLOR_BGR2LAB)
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            equalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return merge_alpha(equalized, alpha)


def histogram_match_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    if target is None:
        raise ValueError("Gambar target diperlukan untuk spesifikasi histogram")

    mode = str(params.get("mode", "rgb"))
    preserve_alpha = bool(params.get("preserveAlpha", True))

    rgb, alpha = split_alpha(image)
    reference, _ = split_alpha(target)

    if rgb.ndim == 2 or reference.ndim == 2 or mode == "grayscale":
        source_gray = as_gray(rgb if rgb.ndim == 3 else rgb)
        target_gray = as_gray(reference if reference.ndim == 3 else reference)
        matched = exposure.match_histograms(source_gray, target_gray, channel_axis=None)
        matched = to_uint8(matched)
        matched_bgr = cv2.cvtColor(matched, cv2.COLOR_GRAY2BGR)
        return merge_alpha(matched_bgr, alpha if preserve_alpha else None)

    if mode == "luminance":
        source_lab = cv2.cvtColor(rgb, cv2.COLOR_BGR2LAB)
        target_lab = cv2.cvtColor(reference, cv2.COLOR_BGR2LAB)
        matched_l = exposure.match_histograms(
            source_lab[:, :, 0],
            target_lab[:, :, 0],
            channel_axis=None,
        )
        source_lab[:, :, 0] = np.clip(matched_l, 0, 255)
        matched_bgr = cv2.cvtColor(source_lab, cv2.COLOR_LAB2BGR)
        return merge_alpha(to_uint8(matched_bgr), alpha if preserve_alpha else None)

    matched_rgb = exposure.match_histograms(rgb, reference, channel_axis=-1)
    matched_rgb = to_uint8(matched_rgb)
    return merge_alpha(matched_rgb, alpha if preserve_alpha else None)


def gaussian_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    kernel = int(params.get("kernel", 5))
    if kernel % 2 == 0:
        kernel += 1
    sigma = float(params.get("sigma", 1.0))
    return cv2.GaussianBlur(image, (kernel, kernel), sigma)


def median_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    kernel = int(params.get("kernel", 3))
    if kernel % 2 == 0:
        kernel += 1
    rgb, alpha = split_alpha(image)
    denoised = cv2.medianBlur(rgb, kernel)
    return merge_alpha(denoised, alpha)


def bilateral_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    diameter = int(params.get("diameter", 9))
    sigma_color = float(params.get("sigmaColor", 75))
    sigma_space = float(params.get("sigmaSpace", 75))
    filtered = cv2.bilateralFilter(image, diameter, sigma_color, sigma_space)
    return filtered


def sharpen_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    method = params.get("method", "unsharp")
    amount = float(params.get("amount", 1.0))
    radius = float(params.get("radius", 1.0))
    rgb, alpha = split_alpha(image)

    if method == "laplacian":
        lap = cv2.Laplacian(rgb, cv2.CV_16S, ksize=max(1, int(radius)))
        sharp = cv2.convertScaleAbs(rgb - amount * lap)
    else:
        blurred = cv2.GaussianBlur(rgb, (0, 0), radius)
        sharp = cv2.addWeighted(rgb, 1 + amount, blurred, -amount, 0)
    return merge_alpha(to_uint8(sharp), alpha)


def edge_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    # --- method == "prewitt" ---
    if str(params.get("method", "")).lower() == "prewitt":
        g = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
        kx = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], np.float32)
        ky = np.array([[1, 1, 1], [0, 0, 0], [-1, -1, -1]], np.float32)
        gx = cv2.filter2D(g, cv2.CV_32F, kx)
        gy = cv2.filter2D(g, cv2.CV_32F, ky)
        mag = cv2.magnitude(gx, gy)
        out = cv2.convertScaleAbs(mag)
        return cv2.cvtColor(out, cv2.COLOR_GRAY2BGR)

    method = params.get("method", "canny")
    t1 = float(params.get("threshold1", 50))
    t2 = float(params.get("threshold2", 150))
    gray = as_gray(image)

    if method == "sobel":
        grad_x = cv2.Sobel(gray, cv2.CV_16S, 1, 0)
        grad_y = cv2.Sobel(gray, cv2.CV_16S, 0, 1)
        abs_grad_x = cv2.convertScaleAbs(grad_x)
        abs_grad_y = cv2.convertScaleAbs(grad_y)
        sobel = cv2.addWeighted(abs_grad_x, 0.5, abs_grad_y, 0.5, 0)
        return cv2.cvtColor(sobel, cv2.COLOR_GRAY2BGR)
    edges = cv2.Canny(gray, t1, t2)
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)


def morphology_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    operation = params.get("operation", "open")
    kernel_size = int(params.get("kernel", 5))
    iterations = int(params.get("iterations", 1))
    kernel_size = kernel_size + 1 if kernel_size % 2 == 0 else kernel_size
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    gray = as_gray(image)

    if operation == "close":
        transformed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=iterations)
    elif operation == "erode":
        transformed = cv2.erode(gray, kernel, iterations=iterations)
    elif operation == "dilate":
        transformed = cv2.dilate(gray, kernel, iterations=iterations)
    else:
        transformed = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel, iterations=iterations)
    return cv2.cvtColor(transformed, cv2.COLOR_GRAY2BGR)


def geometry_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    rotate_deg = float(params.get("rotate", 0))
    scale = float(params.get("scale", 1.0))
    translate = params.get("translate", [0, 0])
    if isinstance(translate, list) and len(translate) == 2:
        tx, ty = float(translate[0]), float(translate[1])
    else:
        tx = ty = 0.0
    crop = float(params.get("crop", 0))

    h, w = image.shape[:2]
    center = (w / 2, h / 2)
    matrix = cv2.getRotationMatrix2D(center, rotate_deg, scale)
    matrix[0, 2] += tx
    matrix[1, 2] += ty
    transformed = cv2.warpAffine(image, matrix, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    if crop > 0:
        crop = np.clip(crop, 0, 40)
        x = int((crop / 100) * w)
        y = int((crop / 100) * h)
        transformed = transformed[y : h - y or h, x : w - x or w]
        transformed = cv2.resize(transformed, (w, h), interpolation=cv2.INTER_LINEAR)
    return transformed


def threshold_global_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    threshold = float(params.get("threshold", 128))
    max_value = float(params.get("maxValue", 255))
    gray = as_gray(image)
    _, binary = cv2.threshold(gray, threshold, max_value, cv2.THRESH_BINARY)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def adaptive_threshold_operation(
    image: np.ndarray,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    mode = params.get("mode", "adaptive_gaussian")
    block_size = int(params.get("blockSize", 11))
    if block_size % 2 == 0:
        block_size += 1
    constant = int(params.get("constant", 2))
    preblur = params.get("preblur", "none")

    gray = as_gray(image)
    if preblur == "gaussian":
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
    elif preblur == "median":
        gray = cv2.medianBlur(gray, 3)

    if mode == "otsu":
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        adaptive_method = cv2.ADAPTIVE_THRESH_GAUSSIAN_C if mode == "adaptive_gaussian" else cv2.ADAPTIVE_THRESH_MEAN_C
        binary = cv2.adaptiveThreshold(gray, 255, adaptive_method, cv2.THRESH_BINARY, block_size, constant)
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def threshold_operations(
    image: np.ndarray,
    operation: OperationEnum,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    if operation == OperationEnum.THRESHOLD_GLOBAL:
        return threshold_global_operation(image, params, target)
    return adaptive_threshold_operation(image, params, target)


# ---------- utils (idempotent: definisikan hanya jika belum ada) ----------
def _to_gray(img):
    import cv2, numpy as np

    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img


def _snake_init_circle(h, w, radius_factor: float = 0.4, n: int = 200):
    import numpy as np

    R = float(radius_factor) * min(h, w) / 2.0
    t = np.linspace(0, 2 * np.pi, n)
    r = h / 2 + R * np.sin(t)
    c = w / 2 + R * np.cos(t)
    return np.vstack([r, c]).T


def _snake_init_rect(h, w, margin: float = 0.2, n: int = 100):
    import numpy as np

    r = np.r_[
        np.full(n, margin * h),
        np.linspace(margin * h, (1 - margin) * h, n),
        np.full(n, (1 - margin) * h),
        np.linspace((1 - margin) * h, margin * h, n),
    ]
    c = np.r_[
        np.linspace(margin * w, (1 - margin) * w, n),
        np.full(n, (1 - margin) * w),
        np.linspace((1 - margin) * w, margin * w, n),
        np.full(n, margin * w),
    ]
    return np.vstack([r, c]).T


def _snake_to_mask(shape_rc, snake):
    import cv2, numpy as np

    h, w = shape_rc
    mask = np.zeros((h, w), dtype=np.uint8)
    # note: snake points are (row, col); cv2 expects (x,y)=(col,row)
    pts = snake.astype(np.int32)[:, ::-1].reshape(-1, 1, 2)
    cv2.fillPoly(mask, [pts], 255)
    return mask, pts


def _render_snake_output(img_bgr, mask, pts, mode: str = "overlay"):
    import cv2, numpy as np

    if mode == "mask":
        return cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    if mode == "contour":
        out = img_bgr.copy()
        cv2.polylines(out, [pts], True, (0, 255, 0), 2)
        return out
    # overlay hijau transparan
    color = np.zeros_like(img_bgr)
    color[:, :, 1] = 255
    return np.where(mask[..., None] == 255, cv2.addWeighted(img_bgr, 0.6, color, 0.4, 0), img_bgr)


# ---------- operasi utama ----------
def active_contour_operation(img_bgr, params, target=None):
    import numpy as np

    I = _to_gray(img_bgr).astype(np.float32)
    # normalisasi [0..1]
    I = (I - I.min()) / max(1e-6, (I.max() - I.min()))
    h, w = I.shape

    init_mode = str(params.get("init", "circle"))
    radius_factor = float(params.get("radius_factor", 0.4))
    snake0 = _snake_init_circle(h, w, radius_factor) if init_mode == "circle" else _snake_init_rect(h, w)

    alpha = float(params.get("alpha", 0.2))
    beta = float(params.get("beta", 0.2))
    gamma = float(params.get("gamma", 0.01))
    max_iter = int(params.get("max_iter", 250))

    snake = active_contour(
        image=I,
        snake=snake0,
        alpha=alpha,
        beta=beta,
        gamma=gamma,
        max_num_iter=max_iter,
    )

    mask, pts = _snake_to_mask((h, w), snake)
    mode = str(params.get("output", "overlay"))  # mask | overlay | contour
    return _render_snake_output(img_bgr, mask, pts, mode)


def hsv_threshold_operation(image, params, target=None):
    """
    Param:
      hmin,hmax in [0..179]; smin,smax,vmin,vmax in [0..255]
      output: mask|overlay  (default overlay)
    """
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    def clamp(v, lo, hi):
        try:
            v = float(v)
        except Exception:
            v = lo
        return int(max(lo, min(v, hi)))

    hmin = clamp(params.get("hmin", 20), 0, 179)
    hmax = clamp(params.get("hmax", 35), 0, 179)
    smin = clamp(params.get("smin", 80), 0, 255)
    smax = clamp(params.get("smax", 255), 0, 255)
    vmin = clamp(params.get("vmin", 80), 0, 255)
    vmax = clamp(params.get("vmax", 255), 0, 255)
    mode = str(params.get("output", "overlay"))

    lower = np.array([hmin, smin, vmin], np.uint8)
    upper = np.array([hmax, smax, vmax], np.uint8)
    if hmin <= hmax:
        mask = cv2.inRange(hsv, lower, upper)
    else:
        m1 = cv2.inRange(hsv, np.array([0, smin, vmin], np.uint8), upper)
        m2 = cv2.inRange(hsv, lower, np.array([179, smax, vmax], np.uint8))
        mask = cv2.bitwise_or(m1, m2)

    if mode == "mask":
        return cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    color = np.zeros_like(image)
    color[:, :, 1] = 255
    return np.where(mask[..., None] == 255, cv2.addWeighted(image, 0.6, color, 0.4, 0), image)


def kmeans_color_operation(image, params, target=None):
    """
    Param:
      K: jumlah klaster (default 3)
      attempts: percobaan inisialisasi (default 3)
      max_iter: iterasi kmeans (default 10)
      mask_index: optional, jika diberikan -> kembalikan overlay/mask untuk klaster tersebut
      output: overlay|mask|seg (default seg)
    """
    K = int(params.get("K", 3))
    attempts = int(params.get("attempts", 3))
    max_iter = int(params.get("max_iter", 10))
    output = str(params.get("output", "seg"))
    Z = image.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, max_iter, 1.0)
    _ret, labels, centers = cv2.kmeans(Z, K, None, criteria, attempts, cv2.KMEANS_PP_CENTERS)
    centers = centers.astype(np.uint8)
    seg = centers[labels.flatten()].reshape(image.shape)

    if "mask_index" in params:
        idx = max(0, min(int(params.get("mask_index", 0)), max(0, K - 1)))
        mask = (labels.reshape(image.shape[:2]) == idx).astype(np.uint8) * 255
        if output == "mask":
            return cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
        return np.where(mask[..., None] == 255, seg, image)

    if output == "overlay":
        return cv2.addWeighted(image, 0.4, seg, 0.6, 0)
    return seg


def features_operation(image: np.ndarray, params: Dict, target: Optional[np.ndarray] = None) -> np.ndarray:
    """Ekstraksi ciri multikategori; setiap cabang mengisi metrics untuk panel UI."""
    rgb, alpha = split_alpha(image)
    category = str(params.get("category", "shape")).lower()
    if category == "shape":
        return _merge_with_alpha(_features_shape(rgb), alpha)
    if category == "size":
        return _merge_with_alpha(_features_size(rgb), alpha)
    if category == "geometry":
        return _merge_with_alpha(_features_geometry(rgb), alpha)
    if category == "texture_glcm":
        return _merge_with_alpha(_features_glcm(rgb, params), alpha)
    if category == "texture_lbp":
        return _merge_with_alpha(_features_lbp(rgb, params), alpha)
    if category == "texture_hog":
        return _merge_with_alpha(_features_hog(rgb, params), alpha)
    if category == "color_hist":
        return _features_color_hist(rgb)
    if category == "color_stats":
        return _merge_with_alpha(_features_color_stats(rgb), alpha)
    if category == "color_kmeans":
        return _features_color_kmeans(rgb, params)
    raise ValueError("Kategori fitur tidak dikenal")


def _features_shape(rgb: np.ndarray) -> np.ndarray:
    gray = as_gray(rgb)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = rgb.copy()
    count = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 25:
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter <= 0:
            continue
        count += 1
        circularity = float(4 * math.pi * area / (perimeter * perimeter)) if perimeter else 0.0
        cv2.drawContours(out, [cnt], -1, (0, 200, 0), 2)
        moments = cv2.moments(cnt)
        if moments["m00"]:
            cx = int(moments["m10"] / moments["m00"])
            cy = int(moments["m01"] / moments["m00"])
            cv2.circle(out, (cx, cy), 3, (0, 0, 255), -1)
        push_operation_metrics(
            {
                f"shape_{count}_area": area,
                f"shape_{count}_perimeter": perimeter,
                f"shape_{count}_circularity": circularity,
            },
        )
    push_operation_metrics({"shape_objects": count})
    return out


def _features_size(rgb: np.ndarray) -> np.ndarray:
    gray = as_gray(rgb)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = rgb.copy()
    count = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 25:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        if w == 0 or h == 0:
            continue
        count += 1
        aspect_ratio = float(w) / float(h)
        extent = float(area) / float(w * h)
        equiv_diameter = float(math.sqrt(4 * area / math.pi)) if area > 0 else 0.0
        cv2.rectangle(out, (x, y), (x + w, y + h), (255, 128, 0), 2)
        push_operation_metrics(
            {
                f"size_{count}_aspect_ratio": aspect_ratio,
                f"size_{count}_extent": extent,
                f"size_{count}_equiv_diameter": equiv_diameter,
            },
        )
    push_operation_metrics({"size_objects": count})
    return out


def _features_geometry(rgb: np.ndarray) -> np.ndarray:
    gray = as_gray(rgb)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out = rgb.copy()
    count = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 25:
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter <= 0:
            continue
        count += 1
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        solidity = float(area / hull_area) if hull_area > 0 else 0.0
        x, y, w, h = cv2.boundingRect(cnt)
        extent = float(area) / float(w * h) if w * h else 0.0
        compactness = float((perimeter * perimeter) / (4 * math.pi * area)) if area > 0 else 0.0
        eccentricity = 0.0
        orientation = 0.0
        if len(cnt) >= 5:
            (cx, cy), (MA, ma), angle = cv2.fitEllipse(cnt)
            major = max(MA, ma)
            minor = min(MA, ma)
            if major > 0:
                ratio = minor / major
                eccentricity = float(math.sqrt(max(0.0, 1 - ratio * ratio)))
            orientation = float(angle)
            cv2.ellipse(out, ((cx, cy), (MA, ma), angle), (128, 0, 255), 2)
        cv2.drawContours(out, [hull], -1, (0, 255, 255), 1)
        push_operation_metrics(
            {
                f"geometry_{count}_solidity": solidity,
                f"geometry_{count}_extent": extent,
                f"geometry_{count}_compactness": compactness,
                f"geometry_{count}_eccentricity": eccentricity,
                f"geometry_{count}_orientation": orientation,
            },
        )
    push_operation_metrics({"geometry_objects": count})
    return out


def _features_glcm(rgb: np.ndarray, params: Dict) -> np.ndarray:
    gray = as_gray(rgb)
    distance = max(1, int(params.get("glcmDistance", 1)))
    angles = [0, math.pi / 4, math.pi / 2, 3 * math.pi / 4]
    glcm = graycomatrix(gray, [distance], angles, levels=256, symmetric=True, normed=True)
    metrics = {
        "glcm_contrast": float(graycoprops(glcm, "contrast").mean()),
        "glcm_dissimilarity": float(graycoprops(glcm, "dissimilarity").mean()),
        "glcm_homogeneity": float(graycoprops(glcm, "homogeneity").mean()),
        "glcm_energy": float(graycoprops(glcm, "energy").mean()),
        "glcm_correlation": float(graycoprops(glcm, "correlation").mean()),
        "glcm_distance": float(distance),
    }
    push_operation_metrics(metrics)
    lines = [
        f"GLCM d={distance}",
        f"Contrast {metrics['glcm_contrast']:.2f}",
        f"Energy {metrics['glcm_energy']:.2f}",
        f"Homogeneity {metrics['glcm_homogeneity']:.2f}",
        f"Correlation {metrics['glcm_correlation']:.2f}",
    ]
    return _draw_text_block(rgb, lines)


def _features_lbp(rgb: np.ndarray, params: Dict) -> np.ndarray:
    gray = as_gray(rgb)
    radius = max(1, int(params.get("lbpRadius", 1)))
    n_points = radius * 8
    lbp = local_binary_pattern(gray, n_points, radius, method="uniform")
    hist, _ = np.histogram(lbp.ravel(), bins=np.arange(n_points + 3), density=True)
    for idx in range(min(hist.size, 6)):
        push_operation_metrics({f"lbp_hist_{idx}": float(hist[idx])})
    push_operation_metrics({"lbp_radius": float(radius)})
    if lbp.max() > 0:
        lbp_norm = (lbp / lbp.max() * 255.0).astype(np.uint8)
    else:
        lbp_norm = lbp.astype(np.uint8)
    return cv2.cvtColor(lbp_norm, cv2.COLOR_GRAY2BGR)


def _features_hog(rgb: np.ndarray, params: Dict) -> np.ndarray:
    gray = as_gray(rgb)
    valid_samples = {10, 50, 100}
    sample_count = int(params.get("hogSample", 10))
    if sample_count not in valid_samples:
        sample_count = 10
    features, hog_image = hog(
        gray,
        orientations=9,
        pixels_per_cell=(8, 8),
        cells_per_block=(2, 2),
        visualize=True,
        feature_vector=True,
    )
    hog_vis = exposure.rescale_intensity(hog_image, out_range=(0, 255)).astype(np.uint8)
    out = cv2.cvtColor(hog_vis, cv2.COLOR_GRAY2BGR)
    push_operation_metrics({"hog_dim": float(len(features))})
    for idx, value in enumerate(features[:sample_count], 1):
        push_operation_metrics({f"hog_head_{idx}": float(value)})
    lines = [f"HOG dim={len(features)}", f"Head {sample_count} sampel"]
    return _draw_text_block(out, lines)


def _features_color_hist(rgb: np.ndarray) -> np.ndarray:
    h, w = rgb.shape[:2]
    hist_height = max(60, min(120, h // 3 if h >= 3 else h))
    roi_start = max(0, h - hist_height)
    out = rgb.copy()
    canvas = np.full((hist_height, w, 3), 255, dtype=np.uint8)
    channel_sums = []
    for idx, color in enumerate([(255, 0, 0), (0, 255, 0), (0, 0, 255)]):
        hist = cv2.calcHist([rgb], [idx], None, [256], [0, 256]).flatten()
        channel_sums.append(float(hist.sum()))
        if hist.max() > 0:
            hist = hist / hist.max()
        scaled = (hist * (hist_height - 10)).astype(np.int32)
        for x in range(1, 256):
            x0 = int((x - 1) * w / 256)
            x1 = int(x * w / 256)
            cv2.line(
                canvas,
                (x0, hist_height - 2 - scaled[x - 1]),
                (x1, hist_height - 2 - scaled[x]),
                color,
                1,
            )
    push_operation_metrics(
        {
            "color_hist_sum_b": channel_sums[0],
            "color_hist_sum_g": channel_sums[1],
            "color_hist_sum_r": channel_sums[2],
        },
    )
    out[roi_start:] = canvas
    return out


def _features_color_stats(rgb: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_BGR2HSV)
    means = hsv.mean(axis=(0, 1))
    medians = np.median(hsv.reshape(-1, 3), axis=0)
    variances = hsv.var(axis=(0, 1))
    push_operation_metrics(
        {
            "color_stats_h_mean": float(means[0]),
            "color_stats_s_mean": float(means[1]),
            "color_stats_v_mean": float(means[2]),
            "color_stats_h_median": float(medians[0]),
            "color_stats_s_median": float(medians[1]),
            "color_stats_v_median": float(medians[2]),
            "color_stats_h_var": float(variances[0]),
            "color_stats_s_var": float(variances[1]),
            "color_stats_v_var": float(variances[2]),
        },
    )
    lines = [
        f"H mean/med/var: {means[0]:.1f}/{medians[0]:.1f}/{variances[0]:.1f}",
        f"S mean/med/var: {means[1]:.1f}/{medians[1]:.1f}/{variances[1]:.1f}",
        f"V mean/med/var: {means[2]:.1f}/{medians[2]:.1f}/{variances[2]:.1f}",
    ]
    return _draw_text_block(rgb, lines)


def _features_color_kmeans(rgb: np.ndarray, params: Dict) -> np.ndarray:
    k = min(6, max(2, int(params.get("kmeansK", 3))))
    Z = rgb.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _ret, labels, centers = cv2.kmeans(Z, k, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
    centers = centers.astype(np.uint8)
    counts = np.bincount(labels.flatten(), minlength=k)
    total = float(counts.sum()) if counts.sum() else 1.0
    for idx, (center, count) in enumerate(zip(centers, counts), 1):
        push_operation_metrics(
            {
                f"color_kmeans_{idx}_r": float(center[2]),
                f"color_kmeans_{idx}_g": float(center[1]),
                f"color_kmeans_{idx}_b": float(center[0]),
                f"color_kmeans_{idx}_ratio": float(count / total),
            },
        )
    h, w = rgb.shape[:2]
    bar_height = max(40, min(80, h // 5 if h >= 5 else h))
    roi_start = max(0, h - bar_height)
    out = rgb.copy()
    out[roi_start:] = 0
    cursor = 0
    for center, count in zip(centers, counts):
        width = int(w * (count / total))
        end = min(w, cursor + max(width, 1))
        out[roi_start:, cursor:end] = center
        cursor = end
    if cursor < w:
        out[roi_start:, cursor:] = centers[-1]
    return _draw_text_block(out, ["Dominant Colors"], origin=(10, roi_start + 20), line_height=20, bg_color=None)


OPERATION_MAP = {
    OperationEnum.NEGATIVE: negative_operation,
    OperationEnum.LOG: log_operation,
    OperationEnum.GAMMA: gamma_operation,
    OperationEnum.HISTOGRAM: histogram_operation,
    OperationEnum.HISTOGRAM_MATCH: histogram_match_operation,
    OperationEnum.GAUSSIAN: gaussian_operation,
    OperationEnum.MEDIAN: median_operation,
    OperationEnum.BILATERAL: bilateral_operation,
    OperationEnum.SHARPEN: sharpen_operation,
    OperationEnum.EDGE: edge_operation,
    OperationEnum.MORPHOLOGY: morphology_operation,
    OperationEnum.GEOMETRY: geometry_operation,
    OperationEnum.ACTIVE_CONTOUR: active_contour_operation,
    OperationEnum.FEATURES: features_operation,
    OperationEnum.HSV_THRESHOLD: hsv_threshold_operation,
    OperationEnum.KMEANS_COLOR: kmeans_color_operation,
    OperationEnum.THRESHOLD_GLOBAL: lambda image, params, target=None: threshold_operations(
        image,
        OperationEnum.THRESHOLD_GLOBAL,
        params,
        target,
    ),
    OperationEnum.THRESHOLD_ADAPTIVE: lambda image, params, target=None: threshold_operations(
        image,
        OperationEnum.THRESHOLD_ADAPTIVE,
        params,
        target,
    ),
}


def apply_operation(
    image: np.ndarray,
    operation: OperationEnum,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> np.ndarray:
    result, _ = apply_operation_with_metrics(image, operation, params, target=target)
    return result


def apply_operation_with_metrics(
    image: np.ndarray,
    operation: OperationEnum,
    params: Dict,
    target: Optional[np.ndarray] = None,
) -> tuple[np.ndarray, Dict[str, float]]:
    handler = OPERATION_MAP.get(operation)
    if handler is None:
        raise ValueError(f"Operasi {operation} tidak didukung")
    _reset_operation_metrics()
    try:
        result = handler(image, params, target)
    except TypeError:
        result = handler(image, params)
    processed = to_uint8(result)
    metrics = consume_operation_metrics()
    return processed, metrics


def generate_preview(
    image: np.ndarray,
    operation: OperationEnum,
    params: Dict,
    max_width: int = 640,
    target: Optional[np.ndarray] = None,
) -> tuple[np.ndarray, Dict[str, float]]:
    h, w = image.shape[:2]
    if w > max_width:
        ratio = max_width / float(w)
        image = cv2.resize(image, (int(w * ratio), int(h * ratio)), interpolation=cv2.INTER_AREA)
    processed, metrics = apply_operation_with_metrics(image, operation, params, target=target)
    return processed, metrics


def compute_metrics(original: np.ndarray, processed: np.ndarray) -> Dict[str, float]:
    try:
        original_gray = as_gray(original)
        processed_gray = as_gray(processed)
        ssim = structural_similarity(original_gray, processed_gray, data_range=255)
        psnr = peak_signal_noise_ratio(original_gray, processed_gray, data_range=255)
        return {"ssim": float(ssim), "psnr": float(psnr)}
    except Exception:
        return {}


def render_histogram_image(image: np.ndarray, mode: str = "rgb", width: int = 256, height: int = 120) -> np.ndarray:
    """Render histogram as a small PNG-ready BGR image (rgb or luminance)."""
    import cv2  # local import ensures availability at runtime

    canvas = np.full((height, width, 3), 255, dtype=np.uint8)
    if image is None or image.size == 0:
        return canvas

    rgb, _ = split_alpha(image)
    if rgb.ndim == 2:
        gray = rgb
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        max_val = float(hist.max()) if hist.size else 1.0
        max_val = max(max_val, 1e-6)
        for x in range(256):
            v = int((hist[x] / max_val) * (height - 10))
            cv2.line(canvas, (x, height), (x, height - v), (15, 23, 42), 1)
        return canvas

    if mode == "luminance":
        gray = as_gray(rgb)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
        max_val = float(hist.max()) if hist.size else 1.0
        max_val = max(max_val, 1e-6)
        for x in range(256):
            v = int((hist[x] / max_val) * (height - 10))
            cv2.line(canvas, (x, height), (x, height - v), (15, 23, 42), 1)
        return canvas

    # RGB overlay
    channels = cv2.split(rgb)
    colors = [(38, 38, 220), (74, 163, 22), (235, 99, 37)]  # BGR for red, green, blue strokes
    for ch, color in zip(channels, colors):
        hist = cv2.calcHist([ch], [0], None, [256], [0, 256]).flatten()
        max_val = float(hist.max()) if hist.size else 1.0
        max_val = max(max_val, 1e-6)
        prev = None
        for x in range(256):
            v = int((hist[x] / max_val) * (height - 10))
            pt = (x, height - v)
            if prev is not None:
                cv2.line(canvas, prev, pt, color, 1)
            prev = pt
    return canvas

>>>>>>> ee3fa41 (chore: update README and UI)
