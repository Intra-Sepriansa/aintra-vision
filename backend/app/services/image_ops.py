
from __future__ import annotations

import base64
import math
from copy import deepcopy
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple, Union

import cv2
import numpy as np
from skimage.metrics import peak_signal_noise_ratio, structural_similarity

OperationParams = Dict[str, Any]
OperationName = Union[str, Enum]
OperationCallable = Callable[[np.ndarray, OperationParams], np.ndarray]


def load_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Failed to load image from {path}")
    return image


def decode_image(raw: bytes) -> np.ndarray:
    array = np.frombuffer(raw, np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Failed to decode image payload")
    return image


def ensure_uint8(image: np.ndarray) -> np.ndarray:
    if image.dtype == np.uint8:
        return image
    if np.issubdtype(image.dtype, np.floating):
        image = np.nan_to_num(image, nan=0.0, posinf=255.0, neginf=0.0)
        image = np.clip(image, 0.0, 255.0)
        return image.astype(np.uint8)
    if np.issubdtype(image.dtype, np.integer):
        image = np.clip(image, 0, 255)
        return image.astype(np.uint8)
    raise ValueError(f"Unsupported dtype: {image.dtype}")


def encode_png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", ensure_uint8(image))
    if not ok:
        raise ValueError("Failed to encode image as PNG")
    return buffer.tobytes()


def encode_png_b64(image: np.ndarray) -> str:
    return base64.b64encode(encode_png(image)).decode("ascii")


def split_alpha(image: np.ndarray) -> Tuple[np.ndarray, Optional[np.ndarray]]:
    if image.ndim == 3 and image.shape[2] == 4:
        return image[:, :, :3], image[:, :, 3]
    return image, None


def merge_alpha(image: np.ndarray, alpha: Optional[np.ndarray]) -> np.ndarray:
    if alpha is None:
        return ensure_uint8(image)
    base = ensure_uint8(image)
    if base.ndim == 2:
        base = cv2.cvtColor(base, cv2.COLOR_GRAY2BGR)
    return np.dstack([base, alpha])


def to_gray(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return image
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _ensure_odd(value: int) -> int:
    return value if value % 2 == 1 else value + 1


def _clip01(value: float) -> float:
    return float(max(0.0, min(1.0, value)))


def op_negative(image: np.ndarray, params: OperationParams) -> np.ndarray:
    mode = params.get("mode", "rgb")
    blend = _clip01(float(params.get("blend", 1.0)))
    rgb, alpha = split_alpha(image)
    if mode == "luma":
        hsv = cv2.cvtColor(rgb, cv2.COLOR_BGR2HSV)
        hsv = hsv.astype(np.uint16)
        hsv[..., 2] = 255 - hsv[..., 2]
        negative = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    else:
        negative = cv2.bitwise_not(rgb)
    blended = cv2.addWeighted(negative, blend, rgb, 1.0 - blend, 0.0)
    return merge_alpha(blended, alpha)


def op_log(image: np.ndarray, params: OperationParams) -> np.ndarray:
    gain = float(params.get("gain", 1.0))
    rgb, alpha = split_alpha(image)
    normalized = rgb.astype(np.float32) / 255.0
    logged = gain * np.log1p(normalized)
    logged = cv2.normalize(logged, None, 0, 255, cv2.NORM_MINMAX)
    return merge_alpha(ensure_uint8(logged), alpha)


def op_gamma(image: np.ndarray, params: OperationParams) -> np.ndarray:
    gamma = max(0.01, float(params.get("gamma", 1.0)))
    rgb, alpha = split_alpha(image)
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)], dtype=np.float32)
    table = np.clip(table, 0, 255).astype(np.uint8)
    corrected = cv2.LUT(rgb, table)
    return merge_alpha(corrected, alpha)


def op_hist_eq_clahe(image: np.ndarray, params: OperationParams) -> np.ndarray:
    mode = params.get("mode", "clahe_lab")
    clip_limit = float(params.get("clip_limit", 2.0))
    tile_grid = int(params.get("tile_grid", 8))
    tile_grid = max(2, tile_grid)
    rgb, alpha = split_alpha(image)

    if mode == "he_gray":
        gray = to_gray(rgb)
        equalized = cv2.equalizeHist(gray)
        equalized = cv2.cvtColor(equalized, cv2.COLOR_GRAY2BGR)
        return merge_alpha(equalized, alpha)

    lab = cv2.cvtColor(rgb, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid, tile_grid))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    equalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return merge_alpha(equalized, alpha)


def op_gaussian(image: np.ndarray, params: OperationParams) -> np.ndarray:
    ksize = _ensure_odd(int(params.get("ksize", 5)))
    sigma = float(params.get("sigma", 1.0))
    return cv2.GaussianBlur(ensure_uint8(image), (ksize, ksize), sigma)


def op_median(image: np.ndarray, params: OperationParams) -> np.ndarray:
    ksize = _ensure_odd(int(params.get("ksize", 5)))
    rgb, alpha = split_alpha(image)
    filtered = cv2.medianBlur(ensure_uint8(rgb), ksize)
    return merge_alpha(filtered, alpha)


def op_bilateral(image: np.ndarray, params: OperationParams) -> np.ndarray:
    diameter = int(params.get("d", 9))
    sigma_color = float(params.get("sigmaColor", 75))
    sigma_space = float(params.get("sigmaSpace", 75))
    filtered = cv2.bilateralFilter(ensure_uint8(image), diameter, sigma_color, sigma_space)
    return filtered


def op_sharpen(image: np.ndarray, params: OperationParams) -> np.ndarray:
    method = params.get("method", "laplacian")
    rgb, alpha = split_alpha(image)
    rgb = ensure_uint8(rgb)

    if method == "unsharp":
        alpha_gain = float(params.get("alpha", 1.0))
        blurred = cv2.GaussianBlur(rgb, (0, 0), 1.0)
        sharp = cv2.addWeighted(rgb, 1.0 + alpha_gain, blurred, -alpha_gain, 0)
    else:
        ksize = _ensure_odd(int(params.get("ksize", 3)))
        lap = cv2.Laplacian(rgb, cv2.CV_16S, ksize=ksize)
        sharp = cv2.convertScaleAbs(rgb - lap)

    return merge_alpha(sharp, alpha)


def op_edges(image: np.ndarray, params: OperationParams) -> np.ndarray:
    mode = params.get("mode", "canny")
    rgb, alpha = split_alpha(image)
    gray = to_gray(rgb)

    if mode == "sobel":
        ksize = _ensure_odd(int(params.get("ksize", 3)))
        grad_x = cv2.Sobel(gray, cv2.CV_16S, 1, 0, ksize=ksize)
        grad_y = cv2.Sobel(gray, cv2.CV_16S, 0, 1, ksize=ksize)
        abs_x = cv2.convertScaleAbs(grad_x)
        abs_y = cv2.convertScaleAbs(grad_y)
        edges = cv2.addWeighted(abs_x, 0.5, abs_y, 0.5, 0)
    else:
        t1 = int(params.get("t1", 100))
        t2 = int(params.get("t2", 200))
        aperture = int(params.get("aperture", 3))
        l2grad = bool(params.get("l2grad", False))
        edges = cv2.Canny(gray, t1, t2, apertureSize=aperture, L2gradient=l2grad)

    edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    return merge_alpha(edges_bgr, alpha)


def op_morph(image: np.ndarray, params: OperationParams) -> np.ndarray:
    op = params.get("op", "open")
    kernel_size = max(1, int(params.get("kernel", 3)))
    iterations = max(1, int(params.get("iter", 1)))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    rgb, alpha = split_alpha(image)
    gray = to_gray(rgb)

    if op == "erode":
        transformed = cv2.erode(gray, kernel, iterations=iterations)
    elif op == "dilate":
        transformed = cv2.dilate(gray, kernel, iterations=iterations)
    elif op == "close":
        transformed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=iterations)
    else:
        transformed = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel, iteration=iterations)

    transformed_bgr = cv2.cvtColor(transformed, cv2.COLOR_GRAY2BGR)
    return merge_alpha(transformed_bgr, alpha)


def op_geo(image: np.ndarray, params: OperationParams) -> np.ndarray:
    rotate_deg = float(params.get("rotate_deg", 0.0))
    scale = float(params.get("scale", 1.0))
    tx = float(params.get("tx", 0.0))
    ty = float(params.get("ty", 0.0))

    h, w = image.shape[:2]
    center = (w / 2.0, h / 2.0)
    matrix = cv2.getRotationMatrix2D(center, rotate_deg, scale)
    matrix[0, 2] += tx
    matrix[1, 2] += ty

    transformed = cv2.warpAffine(
        ensure_uint8(image),
        matrix,
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT,
    )
    return transformed


def op_thresh_global(image: np.ndarray, params: OperationParams) -> np.ndarray:
    threshold = float(params.get("thresh", 128))
    ttype = str(params.get("type", "binary"))

    type_map = {
        "binary": cv2.THRESH_BINARY,
        "binary_inv": cv2.THRESH_BINARY_INV,
        "truncate": cv2.THRESH_TRUNC,
        "tozero": cv2.THRESH_TOZERO,
        "tozero_inv": cv2.THRESH_TOZERO_INV,
    }
    cv_type = type_map.get(ttype, cv2.THRESH_BINARY)

    rgb, alpha = split_alpha(image)
    gray = to_gray(rgb)
    _, binary = cv2.threshold(gray, threshold, 255, cv_type)
    binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    return merge_alpha(binary_bgr, alpha)


def op_thresh_adapt_otsu(image: np.ndarray, params: OperationParams) -> np.ndarray:
    method = params.get("method", "adaptive_gaussian")
    block_size = _ensure_odd(int(params.get("block_size", 11)))
    c_val = float(params.get("C", 2))
    pre_blur = bool(params.get("pre_blur", False))

    rgb, alpha = split_alpha(image)
    gray = to_gray(rgb)

    if pre_blur:
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

    if method == "otsu":
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else:
        adaptive_method = (
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C
            if method == "adaptive_gaussian"
            else cv2.ADAPTIVE_THRESH_MEAN_C
        )
        binary = cv2.adaptiveThreshold(
            gray, 255, adaptive_method, cv2.THRESH_BINARY, block_size, c_val
        )

    binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
    return merge_alpha(binary_bgr, alpha)


def op_nlmeans(image: np.ndarray, params: OperationParams) -> np.ndarray:
    h_luma = float(params.get("h_luma", 10.0))
    h_color = float(params.get("h_color", 10.0))
    template = _ensure_odd(int(params.get("template", 7)))
    search = _ensure_odd(int(params.get("search", 21)))
    rgb, alpha = split_alpha(image)
    denoised = cv2.fastNlMeansDenoisingColored(
        ensure_uint8(rgb), None, h_luma, h_color, template, search
    )
    return merge_alpha(denoised, alpha)


def op_white_balance(image: np.ndarray, params: OperationParams) -> np.ndarray:
    strength = _clip01(float(params.get("strength", 1.0)))
    rgb, alpha = split_alpha(image)
    rgb32 = rgb.astype(np.float32)
    eps = 1e-6
    b, g, r = cv2.split(rgb32)
    mean_b, mean_g, mean_r = b.mean() + eps, g.mean() + eps, r.mean() + eps
    mean = (mean_b + mean_g + mean_r) / 3.0
    balanced = cv2.merge([b * (mean / mean_b), g * (mean / mean_g), r * (mean / mean_r)])
    balanced = np.clip(balanced, 0, 255).astype(np.uint8)
    blended = cv2.addWeighted(balanced, strength, rgb, 1.0 - strength, 0)
    return merge_alpha(blended, alpha)


def op_hsv_adjust(image: np.ndarray, params: OperationParams) -> np.ndarray:
    delta_h = float(params.get("delta_h", 0.0))
    scale_s = float(params.get("scale_s", 1.0))
    scale_v = float(params.get("scale_v", 1.0))
    rgb, alpha = split_alpha(image)
    hsv = cv2.cvtColor(ensure_uint8(rgb), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + (delta_h / 2.0)) % 180.0
    hsv[..., 1] = np.clip(hsv[..., 1] * scale_s, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * scale_v, 0, 255)
    adjusted = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    return merge_alpha(adjusted, alpha)


def op_contrast_stretch(image: np.ndarray, params: OperationParams) -> np.ndarray:
    p_low = float(params.get("p_low", 2.0))
    p_high = float(params.get("p_high", 98.0))
    rgb, alpha = split_alpha(image)
    rgb = ensure_uint8(rgb)
    out = np.empty_like(rgb)
    for idx in range(rgb.shape[2]):
        channel = rgb[..., idx].astype(np.float32)
        lo = np.percentile(channel, p_low)
        hi = np.percentile(channel, p_high)
        if math.isclose(hi, lo, abs_tol=1e-3):
            out[..., idx] = channel
        else:
            scaled = (channel - lo) * (255.0 / (hi - lo))
            out[..., idx] = np.clip(scaled, 0, 255)
    return merge_alpha(out.astype(np.uint8), alpha)


def op_cartoonize(image: np.ndarray, params: OperationParams) -> np.ndarray:
    rgb, alpha = split_alpha(image)
    gray = to_gray(rgb)
    gray = cv2.medianBlur(gray, 7)
    edges = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 2
    )
    color = cv2.bilateralFilter(ensure_uint8(rgb), d=9, sigmaColor=75, sigmaSpace=75)
    edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    cartoon = cv2.bitwise_and(color, edges_bgr)
    return merge_alpha(cartoon, alpha)


def schema(
    type_: str,
    *,
    default: Any = None,
    minimum: Any = None,
    maximum: Any = None,
    step: Any = None,
    enum: Optional[Sequence[Any]] = None,
    description: str = "",
    unit: Optional[str] = None,
) -> Dict[str, Any]:
    data: Dict[str, Any] = {"type": type_}
    if default is not None:
        data["default"] = default
    if minimum is not None:
        data["minimum"] = minimum
    if maximum is not None:
        data["maximum"] = maximum
    if step is not None:
        data["step"] = step
    if enum is not None:
        data["enum"] = list(enum)
    if description:
        data["description"] = description
    if unit:
        data["unit"] = unit
    return data


def spec(
    label: str,
    category: str,
    description: str,
    *,
    recommended: Optional[str] = None,
    schema: Optional[Dict[str, Any]] = None,
    required: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    data = {
        "label": label,
        "category": category,
        "description": description,
    }
    if recommended:
        data["recommended"] = recommended
    properties = schema or {}
    payload: Dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        payload["required"] = list(required)
    data["schema"] = payload
    return data


REGISTRY_CORE: Dict[str, Dict[str, Any]] = {
    "negative": spec(
        label="Negatif Citra",
        category="Enhancement",
        description="Membalik warna citra; tersedia mode luminance-only dan blending.",
        recommended="Ideal untuk menonjolkan struktur dokumen atau artefak film.",
        schema={
            "mode": schema(
                "string",
                default="rgb",
                enum=["rgb", "luma"],
                description="Negatif penuh (RGB) atau kanal luminance saja.",
            ),
            "blend": schema(
                "number",
                default=1.0,
                minimum=0.0,
                maximum=1.0,
                step=0.05,
                unit="ratio",
                description="Blend hasil negatif dengan gambar asli.",
            ),
        },
    ),
    "log": spec(
        label="Log Transform",
        category="Enhancement",
        description="Transformasi logaritmik untuk menonjolkan detail gelap dan terang.",
        schema={
            "gain": schema(
                "number",
                default=1.0,
                minimum=0.1,
                maximum=5.0,
                step=0.1,
                description="Faktor penguat transformasi logaritmik.",
            ),
        },
    ),
    "gamma": spec(
        label="Gamma Correction",
        category="Enhancement",
        description="Koreksi gamma untuk mengatur pencahayaan global.",
        schema={
            "gamma": schema(
                "number",
                default=1.0,
                minimum=0.2,
                maximum=3.0,
                step=0.05,
                description="Nilai gamma (γ<1 mencerahkan, γ>1 menggelapkan).",
            ),
        },
    ),
    "hist_eq_clahe": spec(
        label="Histogram Eq / CLAHE",
        category="Enhancement",
        description="Equalisasi histogram global atau CLAHE pada ruang LAB.",
        recommended="Gunakan CLAHE untuk foto dengan pencahayaan tidak merata.",
        schema={
            "mode": schema(
                "string",
                default="clahe_lab",
                enum=["clahe_lab", "he_gray"],
                description="CLAHE LAB atau equalization global grayscale.",
            ),
            "clip_limit": schema(
                "number",
                default=2.0,
                minimum=1.0,
                maximum=6.0,
                step=0.1,
                description="Pembatas amplifikasi kontras CLAHE.",
            ),
            "tile_grid": schema(
                "integer",
                default=8,
                minimum=4,
                maximum=16,
                step=1,
                description="Ukuran grid ubin CLAHE per dimensi.",
            ),
        },
    ),
    "gaussian": spec(
        label="Gaussian Blur",
        category="Filtering",
        description="Pengaburan Gaussian untuk mereduksi noise gaussian.",
        schema={
            "ksize": schema(
                "integer",
                default=5,
                minimum=3,
                maximum=15,
                step=2,
                description="Ukuran kernel (ganjil).",
            ),
            "sigma": schema(
                "number",
                default=1.0,
                minimum=0.3,
                maximum=3.0,
                step=0.1,
                description="Standar deviasi Gaussian.",
            ),
        },
    ),
    "median": spec(
        label="Median Filter",
        category="Filtering",
        description="Filter median untuk noise impuls (salt & pepper).",
        schema={
            "ksize": schema(
                "integer",
                default=5,
                minimum=3,
                maximum=15,
                step=2,
                description="Ukuran kernel median (ganjil).",
            ),
        },
    ),
    "bilateral": spec(
        label="Bilateral Filter",
        category="Filtering",
        description="Smoothing sadar tepi untuk mempertahankan detail.",
        schema={
            "d": schema(
                "integer",
                default=9,
                minimum=3,
                maximum=19,
                step=2,
                description="Diameter neighbourhood filter.",
            ),
            "sigmaColor": schema(
                "number",
                default=75.0,
                minimum=10.0,
                maximum=150.0,
                step=1.0,
                description="Sigma domain warna.",
            ),
            "sigmaSpace": schema(
                "number",
                default=75.0,
                minimum=10.0,
                maximum=150.0,
                step=1.0,
                description="Sigma domain spasial.",
            ),
        },
    ),
    "sharpen": spec(
        label="Sharpen",
        category="Edge & Detail",
        description="Penajaman berbasis Laplacian atau Unsharp Mask.",
        schema={
            "method": schema(
                "string",
                default="laplacian",
                enum=["laplacian", "unsharp"],
                description="Metode penajaman.",
            ),
            "ksize": schema(
                "integer",
                default=3,
                minimum=1,
                maximum=7,
                step=2,
                description="Ukuran kernel Laplacian (ganjil).",
            ),
            "alpha": schema(
                "number",
                default=1.0,
                minimum=0.0,
                maximum=2.0,
                step=0.05,
                description="Kuat blending Unsharp Mask.",
            ),
        },
    ),
    "edges": spec(
        label="Edge Detection",
        category="Edge & Detail",
        description="Deteksi tepi Canny atau Sobel dengan parameter lengkap.",
        recommended="Canny untuk tekstur halus, Sobel untuk peta gradien kasar.",
        schema={
            "mode": schema(
                "string",
                default="canny",
                enum=["canny", "sobel"],
                description="Algoritma deteksi tepi.",
            ),
            "t1": schema(
                "integer",
                default=100,
                minimum=0,
                maximum=255,
                step=1,
                description="Ambang bawah Canny.",
            ),
            "t2": schema(
                "integer",
                default=200,
                minimum=0,
                maximum=255,
                step=1,
                description="Ambang atas Canny.",
            ),
            "aperture": schema(
                "integer",
                default=3,
                enum=[3, 5, 7],
                description="Ukuran kernel sobel untuk Canny.",
            ),
            "l2grad": schema(
                "boolean",
                default=False,
                description="Gunakan norma L2 pada Canny.",
            ),
            "ksize": schema(
                "integer",
                default=3,
                minimum=1,
                maximum=7,
                step=2,
                description="Ukuran kernel Sobel (ganjil).",
            ),
        },
    ),
    "morph": spec(
        label="Morfologi",
        category="Edge & Detail",
        description="Operasi morfologi (open/close/erode/dilate) dengan kontrol kernel.",
        schema={
            "op": schema(
                "string",
                default="open",
                enum=["erode", "dilate", "open", "close"],
                description="Jenis operasi morfologi.",
            ),
            "kernel": schema(
                "integer",
                default=3,
                minimum=1,
                maximum=15,
                step=1,
                description="Ukuran kernel persegi.",
            ),
            "iter": schema(
                "integer",
                default=1,
                minimum=1,
                maximum=5,
                step=1,
                description="Jumlah iterasi operasi.",
            ),
        },
    ),
    "geo": spec(
        label="Transformasi Geometri",
        category="Geometry",
        description="Rotasi, skala, dan translasi citra.",
        schema={
            "rotate_deg": schema(
                "number",
                default=0.0,
                minimum=-45.0,
                maximum=45.0,
                step=0.5,
                unit="deg",
                description="Rotasi dalam derajat.",
            ),
            "scale": schema(
                "number",
                default=1.0,
                minimum=0.5,
                maximum=2.0,
                step=0.05,
                description="Faktor skala.",
            ),
            "tx": schema(
                "number",
                default=0.0,
                minimum=-200.0,
                maximum=200.0,
                step=1.0,
                unit="px",
                description="Translasi horizontal.",
            ),
            "ty": schema(
                "number",
                default=0.0,
                minimum=-200.0,
                maximum=200.0,
                step=1.0,
                unit="px",
                description="Translasi vertikal.",
            ),
        },
    ),
    "thresh_global": spec(
        label="Threshold Global",
        category="Segmentation",
        description="Ambang global dengan berbagai mode thresholding.",
        schema={
            "thresh": schema(
                "number",
                default=128.0,
                minimum=0.0,
                maximum=255.0,
                step=1.0,
                description="Nilai ambang threshold.",
            ),
            "type": schema(
                "string",
                default="binary",
                enum=["binary", "binary_inv", "truncate", "tozero", "tozero_inv"],
                description="Jenis threshold yang digunakan.",
            ),
        },
    ),
    "thresh_adapt_otsu": spec(
        label="Adaptive / Otsu Threshold",
        category="Segmentation",
        description="Threshold adaptif (Mean/Gaussian) atau Otsu otomatis.",
        schema={
            "method": schema(
                "string",
                default="adaptive_gaussian",
                enum=["adaptive_mean", "adaptive_gaussian", "otsu"],
                description="Metode threshold.",
            ),
            "block_size": schema(
                "integer",
                default=11,
                minimum=3,
                maximum=51,
                step=2,
                description="Ukuran blok adaptif (ganjil).",
            ),
            "C": schema(
                "number",
                default=2.0,
                minimum=-10.0,
                maximum=10.0,
                step=0.5,
                description="Nilai yang dikurangkan dari mean adaptif.",
            ),
            "pre_blur": schema(
                "boolean",
                default=False,
                description="Gunakan Gaussian blur sebelum threshold.",
            ),
        },
    ),
    "nlmeans": spec(
        label="Non-Local Means",
        category="Filtering",
        description="Denoise canggih yang mempertahankan detail tekstur.",
        recommended="Gunakan pada foto ISO tinggi atau citra medis ber-noise.",
        schema={
            "h_luma": schema(
                "number",
                default=10.0,
                minimum=5.0,
                maximum=20.0,
                step=0.5,
                description="Kekuatan filter luminance.",
            ),
            "h_color": schema(
                "number",
                default=10.0,
                minimum=5.0,
                maximum=20.0,
                step=0.5,
                description="Kekuatan filter chroma.",
            ),
            "template": schema(
                "integer",
                default=7,
                minimum=3,
                maximum=11,
                step=2,
                description="Ukuran patch referensi.",
            ),
            "search": schema(
                "integer",
                default=21,
                minimum=15,
                maximum=31,
                step=2,
                description="Ukuran area pencarian.",
            ),
        },
    ),
    "white_balance": spec(
        label="White Balance (Gray-World)",
        category="Enhancement",
        description="Normalisasi warna berbasis asumsi Gray-World.",
        schema={
            "strength": schema(
                "number",
                default=1.0,
                minimum=0.0,
                maximum=1.0,
                step=0.1,
                description="Blend hasil white-balance dengan citra asli.",
            ),
        },
    ),
    "hsv_adjust": spec(
        label="Hue & Saturation Adjust",
        category="Enhancement",
        description="Penyesuaian hue/saturasi/value global.",
        schema={
            "delta_h": schema(
                "number",
                default=0.0,
                minimum=-180.0,
                maximum=180.0,
                step=5.0,
                unit="deg",
                description="Perubahan hue dalam derajat.",
            ),
            "scale_s": schema(
                "number",
                default=1.0,
                minimum=0.0,
                maximum=3.0,
                step=0.05,
                description="Skala saturasi.",
            ),
            "scale_v": schema(
                "number",
                default=1.0,
                minimum=0.0,
                maximum=3.0,
                step=0.05,
                description="Skala value (brightness).",
            ),
        },
    ),
    "contrast_stretch": spec(
        label="Contrast Stretch",
        category="Enhancement",
        description="Perenggangan histogram berbasis persentil.",
        recommended="Memperlebar kontras tanpa clipping ekstrem.",
        schema={
            "p_low": schema(
                "number",
                default=2.0,
                minimum=0.0,
                maximum=10.0,
                step=0.5,
                unit="percent",
                description="Persentil bawah sebagai titik hitam.",
            ),
            "p_high": schema(
                "number",
                default=98.0,
                minimum=90.0,
                maximum=100.0,
                step=0.5,
                unit="percent",
                description="Persentil atas sebagai titik putih.",
            ),
        },
    ),
    "cartoonize": spec(
        label="Cartoonize",
        category="Edge & Detail",
        description="Efek kartun dengan bilateral smoothing dan deteksi tepi adaptif.",
        schema={},
    ),
}


ALIASES: Mapping[str, str] = {
    "histogram": "hist_eq_clahe",
    "clahe": "hist_eq_clahe",
    "edge": "edges",
    "morphology": "morph",
    "geometry": "geo",
    "threshold-global": "thresh_global",
    "threshold_global": "thresh_global",
    "threshold-adaptive": "thresh_adapt_otsu",
    "threshold_adaptive": "thresh_adapt_otsu",
}


CANONICAL_OPERATIONS: Dict[str, OperationCallable] = {
    "negative": op_negative,
    "log": op_log,
    "gamma": op_gamma,
    "hist_eq_clahe": op_hist_eq_clahe,
    "gaussian": op_gaussian,
    "median": op_median,
    "bilateral": op_bilateral,
    "sharpen": op_sharpen,
    "edges": op_edges,
    "morph": op_morph,
    "geo": op_geo,
    "thresh_global": op_thresh_global,
    "thresh_adapt_otsu": op_thresh_adapt_otsu,
    "nlmeans": op_nlmeans,
    "white_balance": op_white_balance,
    "hsv_adjust": op_hsv_adjust,
    "contrast_stretch": op_contrast_stretch,
    "cartoonize": op_cartoonize,
}


def normalise_operation_name(operation: OperationName) -> str:
    if isinstance(operation, Enum):
        key = str(operation.value)
    else:
        key = str(operation)
    key = key.strip().lower()
    return ALIASES.get(key, key)


def _operation_properties(spec: Dict[str, Any]) -> Dict[str, Any]:
    schema = spec.get("schema")
    if isinstance(schema, Mapping):
        properties = schema.get("properties")
        if isinstance(properties, Mapping):
            return properties  # type: ignore[return-value]
    return {}


def get_operation_defaults(operation: OperationName) -> Dict[str, Any]:
    canonical = normalise_operation_name(operation)
    spec = REGISTRY_CORE.get(canonical)
    if spec is None:
        raise ValueError(f"Unknown operation: {operation}")
    defaults: Dict[str, Any] = {}
    for param_id, param_schema in _operation_properties(spec).items():
        defaults[param_id] = param_schema.get("default")
    return defaults


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "on"}:
            return True
        if lowered in {"false", "0", "no", "off"}:
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    raise ValueError(f"Cannot interpret {value!r} as boolean")


def _coerce_number(value: Any, *, integer: bool) -> Union[int, float]:
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        number = float(value.strip())
    else:
        raise ValueError("Expected numeric value")
    if integer:
        if not number.is_integer():
            raise ValueError("Value must be an integer")
        return int(number)
    return number


def _validate_step(value: float, *, base: Optional[float], step: Optional[float]) -> None:
    if step in (None, 0):
        return
    origin = base if base is not None else 0.0
    quotient = (value - origin) / step
    if not math.isclose(round(quotient), quotient, abs_tol=1e-6):
        raise ValueError(f"Value {value} does not align with step {step}")


def prepare_operation_params(operation: OperationName, params: Optional[OperationParams]) -> OperationParams:
    canonical = normalise_operation_name(operation)
    spec = REGISTRY_CORE.get(canonical)
    if spec is None:
        raise ValueError(f"Unknown operation: {operation}")

    schema_def = _operation_properties(spec)
    params = params or {}

    unknown = set(params.keys()) - set(schema_def.keys())
    if unknown:
        raise ValueError(
            f"Unknown parameter(s) for {operation}: {', '.join(sorted(unknown))}"
        )

    validated: OperationParams = {}
    for param_id, prop in schema_def.items():
        raw = params[param_id] if param_id in params else prop.get("default")
        if raw is None:
            continue

        p_type = prop.get("type", "number")
        if p_type == "boolean":
            coerced = _coerce_bool(raw)
        elif p_type == "integer":
            coerced = _coerce_number(raw, integer=True)
        elif p_type == "number":
            coerced = _coerce_number(raw, integer=False)
        elif p_type == "string":
            coerced = str(raw)
        else:
            raise ValueError(f"Unsupported schema type: {p_type}")

        if "enum" in prop and coerced not in prop["enum"]:
            raise ValueError(f"Parameter {param_id} must be one of {prop['enum']}")

        minimum = prop.get("minimum")
        if minimum is not None and coerced < minimum:
            raise ValueError(f"Parameter {param_id} must be >= {minimum}")

        maximum = prop.get("maximum")
        if maximum is not None and coerced > maximum:
            raise ValueError(f"Parameter {param_id} must be <= {maximum}")

        if isinstance(coerced, (int, float)):
            base = minimum if isinstance(minimum, (int, float)) else prop.get("default")
            _validate_step(
                float(coerced),
                base=base if isinstance(base, (int, float)) else None,
                step=prop.get("step"),
            )

        validated[param_id] = coerced

    return validated


def list_operations() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for op_id, spec in REGISTRY_CORE.items():
        items.append(
            {
                "id": op_id,
                "label": spec["label"],
                "category": spec["category"],
                "description": spec.get("description"),
                "recommended": spec.get("recommended"),
                "defaults": get_operation_defaults(op_id),
                "schema": deepcopy(spec.get("schema", {})),
                "canonical": op_id,
            }
        )

    for alias, canonical in ALIASES.items():
        if canonical not in REGISTRY_CORE:
            continue
        spec = REGISTRY_CORE[canonical]
        items.append(
            {
                "id": alias,
                "label": spec["label"],
                "category": spec["category"],
                "description": spec.get("description"),
                "recommended": spec.get("recommended"),
                "defaults": get_operation_defaults(canonical),
                "schema": deepcopy(spec.get("schema", {})),
                "canonical": canonical,
            }
        )

    return items


def canonical_operation_id(operation: OperationName) -> str:
    return normalise_operation_name(operation)


def apply_operation(image: np.ndarray, operation: OperationName, params: Optional[OperationParams]) -> np.ndarray:
    canonical = normalise_operation_name(operation)
    func = CANONICAL_OPERATIONS.get(canonical)
    if func is None:
        raise ValueError(f"Operation {operation} is not supported")
    validated = prepare_operation_params(canonical, params or {})
    return func(image, validated)


def generate_preview(
    image: np.ndarray,
    operation: OperationName,
    params: Optional[OperationParams],
    *,
    max_size: int = 512,
) -> np.ndarray:
    h, w = image.shape[:2]
    scale = min(max_size / float(max(h, w)), 1.0)
    if scale < 1.0:
        resized = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        resized = image
    return apply_operation(resized, operation, params or {})


def compute_metrics(original: np.ndarray, processed: np.ndarray) -> Dict[str, float]:
    try:
        original_gray = to_gray(ensure_uint8(original))
        processed_gray = to_gray(ensure_uint8(processed))
        ssim = structural_similarity(original_gray, processed_gray, data_range=255)
        psnr = peak_signal_noise_ratio(original_gray, processed_gray, data_range=255)
        return {"ssim": float(ssim), "psnr": float(psnr)}
    except Exception:
        return {}


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
    "prepare_operation_params",
    "canonical_operation_id",
]
