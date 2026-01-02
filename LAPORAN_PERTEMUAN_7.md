# Pengolahan Citra Digital — Pertemuan 7

Mata Kuliah: Pengolahan Citra Digital  
Judul: Deteksi Tepi (Sobel/Prewitt/Canny) & Segmentasi Warna (HSV Threshold, K-Means)  
Dosen: Ibu Okta Irawati, S.Kom., M.Kom  
Kelas: 05TPLK004  
Nama: INTRA SEPRIANSA

## Ringkasan
- Tujuan: pemisahan objek via fitur tepi dan informasi warna, kemudian memvisualisasikan hasil pada UI Asli vs Hasil dan mengeksekusi pratinjau/proses melalui backend FastAPI.
- Alur FE ↔ BE: Frontend mengirim ke FastAPI endpoint `POST /api/preview` untuk pratinjau cepat dan `POST /api/process` untuk proses penuh resolusi asli. Hasil pratinjau/hasil akhir disajikan sebagai gambar yang dapat dibuka melalui `/media/...`.
- Rujukan materi: Citra Digital Pertemuan 7

## Pemetaan Operasi di Project
- Deteksi Tepi → ID: `edge`
  - Sobel: tersedia (method=`sobel`).
  - Canny: tersedia (method=`canny`).
  - Prewitt: belum ada (dibahas teoretis & langkah how‑to singkat di bawah; tidak ada patch pada proyek).

- Segmentasi Warna
  - HSV Threshold: belum ada (teori & how‑to singkat; tanpa patch).
  - K‑Means Warna: belum ada (teori & how‑to singkat; tanpa patch).

## Letak File & Data yang Ditempel di Laporan
Simpan screenshot/hasil uji untuk keperluan laporan (tidak dibuild FE/BE):
- `docs/laporan/pertemuan-7/p7_asli.png`
- `docs/laporan/pertemuan-7/p7_sobel.png`
- `docs/laporan/pertemuan-7/p7_canny.png`
- `docs/laporan/pertemuan-7/p7_hsv_mask.png` (opsional — uji manual)
- `docs/laporan/pertemuan-7/p7_kmeans.png` (opsional — uji manual)

Contoh caption di teks: (Gambar: p7_sobel.png)

## Kode Kunci Singkat (konsep, 10–15 baris/blok)

Sobel (konsep, setara BE `edge`: `sobel`)

```python
import cv2, numpy as np
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
sx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
sy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
mag = cv2.magnitude(sx, sy)
sobel = cv2.convertScaleAbs(mag)
```

Canny (konsep, setara BE `edge`: `canny`)

```python
import cv2
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(g, 100, 200, apertureSize=3, L2gradient=True)
```

Prewitt (konsep saja; belum ada di project)

```python
import cv2, numpy as np
kx = np.array([[-1,0,1],[-1,0,1],[-1,0,1]], np.float32)
ky = np.array([[ 1,1,1],[ 0,0,0],[-1,-1,-1]], np.float32)
gx = cv2.filter2D(g, -1, kx); gy = cv2.filter2D(g, -1, ky)
prewitt = cv2.convertScaleAbs(cv2.magnitude(gx.astype("float32"), gy.astype("float32")))
```

HSV Threshold (konsep; belum ada di project)

```python
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
lower = (Hmin, Smin, Vmin); upper = (Hmax, Smax, Vmax)
mask = cv2.inRange(hsv, lower, upper)
seg  = cv2.bitwise_and(img, img, mask=mask)
```

K‑Means Warna (konsep; belum ada di project)

```python
import numpy as np, cv2
Z = img.reshape(-1,3).astype(np.float32)
K = 3; criteria = (cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
_, labels, centers = cv2.kmeans(Z, K, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
centers = centers.astype("uint8")
kmeans = centers[labels.flatten()].reshape(img.shape)
```

## Contoh Payload API Project (yang tersedia sesuai kode saat ini)

Sobel

```json
{ "operation": "edge", "params": { "method": "sobel" } }
```

Canny

```json
{ "operation": "edge", "params": { "method": "canny", "threshold1": 100, "threshold2": 200 } }
```

Catatan: Backend `edge_operation` menerima `method`, `threshold1`, dan `threshold2`. Parameter seperti `ksize`, `axis`, atau `aperture` tidak digunakan pada implementasi proyek saat ini.

## Alur Pakai di UI (AIntra Vision)
1. Unggah gambar pada kartu “Unggahan Gambar”.
2. Pilih operasi “Deteksi Tepi (edge)”, setel `method` menjadi Sobel atau Canny sesuai kebutuhan.
3. Klik “Pratinjau” untuk melihat Asli vs Hasil.
4. Jika sesuai, klik “Jalankan Proses” untuk pemrosesan resolusi penuh dan unduh hasil.
5. Ambil hasil pratinjau/hasil proses untuk ditempel sebagai (Gambar: p7_sobel.png) dan (Gambar: p7_canny.png).

Untuk Prewitt/HSV/K‑Means: lakukan uji offline di notebook/skrip terpisah (tanpa menyentuh kode proyek), simpan gambar ke path yang disebut, lalu rujuk di laporan.

## Analisis & Perbandingan (ringkas)
- Sobel: gradien pertama; respons halus namun sensitif noise; cocok untuk kontur dominan.
- Canny: pipeline (Gaussian → gradien → NMS → hysteresis); kontur presisi tinggi, butuh tuning ambang.
- Prewitt: kernel sederhana; komputasi cepat, akurasi umumnya di bawah Sobel.
- HSV Threshold: efektif untuk warna dominan spesifik; sensitif pencahayaan dan bayangan.
- K‑Means: segmentasi berbasis cluster; hasil stabil namun memerlukan pemilihan K dan komputasi lebih tinggi.

## QA & Validasi
- Pastikan ukuran output sama dengan input dan bertipe `uint8`.
- Canny: uji beberapa set ambang (misal 50/150, 100/200, 150/300) untuk melihat pengaruh hysteresis.
- Jika panel metrik aktif, dokumentasikan SSIM/PSNR (di-backend tersedia util `compute_metrics`).

## Rencana Implementasi (tanpa patch; roadmap)
- Prewitt di project: tambah opsi kernel pada operasi `edge` (method=`prewitt`), implementasi via `filter2D` dengan kernel X/Y.
- HSV Threshold: usulan id `color-threshold` dengan parameter `{ space: "HSV", lower, upper, output }` (mask/overlay).
- K‑Means Warna: usulan id `color-kmeans` dengan parameter `{ k, max_iter, attempts, sample, output }`.
- Semua tetap menghasilkan Asli vs Hasil pada viewer kanan agar konsisten dengan UX yang ada.

## Lampiran Gambar
- (Gambar: p7_asli.png) — citra input.
- (Gambar: p7_sobel.png) — hasil Sobel.
- (Gambar: p7_canny.png) — hasil Canny.
- (Opsional) (Gambar: p7_hsv_mask.png) — mask HSV.
- (Opsional) (Gambar: p7_kmeans.png) — hasil K‑Means.

