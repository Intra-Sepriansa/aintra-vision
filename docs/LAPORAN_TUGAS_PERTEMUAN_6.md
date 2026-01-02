Mata Kuliah: Pengolahan Citra Digital
Judul: Segmentasi Citra — Global/Adaptive/Otsu Thresholding & Active Contour
Dosen: Ibu Okta Irawati, S.Kom., M.Kom
Kelas: 05TPLK004
Nama: INTRA SEPRIANSA

# Laporan Tugas Pertemuan 6

## 1) Ringkasan
Pertemuan ini berfokus pada segmentasi citra menggunakan pendekatan thresholding (global, adaptive, dan Otsu) serta active contour (snakes). Tujuannya adalah memisahkan objek dari latar dengan parameter yang dapat diatur pengguna. Arsitektur aplikasi: Frontend (FE) menampilkan tampilan Asli vs Hasil, sedangkan Backend (BE) memproses citra melalui endpoint `/api/preview` (pratinjau resolusi terkelola) dan `/api/process` (proses penuh). Hasil dikembalikan sebagai PNG base64 untuk ditampilkan di UI.

## 2) Operasi Pertemuan 6 (Nama & ID di project)
- `threshold_global` — Global Thresholding. Parameter: `thresh`, `type=binary|binary_inv`, `output=mask|overlay`.
- `threshold_adaptive` — Adaptive Thresholding. Parameter: `method=mean|gaussian`, `block_size` (ganjil), `C`, `type`, `output`.
- `threshold_otsu` — Otsu’s Method. Parameter: `sigma` (pra-blur opsional), `type`, `output`.
- `active_contour` — Snakes. Parameter: `init=circle|rect`, `radius_factor`, `alpha`, `beta`, `gamma`, `max_iter`, `output=mask|overlay|contour`.

Catatan UI: Kartu “Adaptive Threshold & Otsu” (ID `threshold-adaptive`) pada FE dapat memanggil BE `threshold_adaptive` atau `threshold_otsu` sesuai pilihan mode pengguna — ini murni pemetaan UI ke operasi BE, tanpa perlu perubahan kode.

## 3) Letak File & Fungsi (referensi kode yang sudah ada)
- Backend:
  - `backend/app/img_ops.py` → fungsi: `threshold_global_operation`, `threshold_adaptive_operation`, `threshold_otsu_operation`, `active_contour_operation`.
  - Dispatcher/registry di akhir file: `OPERATION_MAP.update({...})` untuk memetakan ID operasi ke fungsi.
- Frontend:
  - `frontend/src/lib/operations.ts` → definisi kartu/parameter operasi segmentasi (label, opsi, dan default).
  - `frontend/src/components/area-result.tsx` → viewer Asli vs Hasil (panel kanan menampilkan hasil/preview base64 PNG).
- Contoh lokasi gambar demo (untuk dokumentasi, bukan runtime):
  - `frontend/public/samples/p6_source.jpg`
  - `frontend/public/samples/p6_source2.jpg`

## 4) Potongan Kode Kunci (pendek, hanya inti)
Berikut potongan kode ringkas sebagai referensi dokumentasi (bukan instruksi edit file). Baris hanya inti, maks 10–15 baris per blok.

### a) Global Threshold
```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
flag = cv2.THRESH_BINARY if type == 'binary' else cv2.THRESH_BINARY_INV
_, mask = cv2.threshold(gray, int(thresh), 255, flag)
if output == 'overlay':
    overlay = img.copy()
    overlay[mask > 0] = (0, 255, 0)
    result = overlay
else:
    result = mask
```

### b) Adaptive Threshold
```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
method_flag = cv2.ADAPTIVE_THRESH_MEAN_C if method == 'mean' else cv2.ADAPTIVE_THRESH_GAUSSIAN_C
th_type = cv2.THRESH_BINARY if type == 'binary' else cv2.THRESH_BINARY_INV
mask = cv2.adaptiveThreshold(gray, 255, method_flag, th_type, int(block_size), int(C))
result = mask if output == 'mask' else cv2.bitwise_or(img, img, mask=mask)
```

### c) Otsu Threshold
```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
if sigma and sigma > 0:
    k = int(max(3, 2*round(3*sigma)+1))
    gray = cv2.GaussianBlur(gray, (k, k), sigmaX=sigma, sigmaY=sigma)
flag = (cv2.THRESH_BINARY if type == 'binary' else cv2.THRESH_BINARY_INV) | cv2.THRESH_OTSU
_, mask = cv2.threshold(gray, 0, 255, flag)
result = mask if output == 'mask' else cv2.bitwise_or(img, img, mask=mask)
```

### d) Active Contour (Snakes)
```python
I = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
h, w = I.shape[:2]
init = init_circle(h, w, radius_factor) if init_mode == 'circle' else init_rect(h, w)
snake = active_contour(gaussian(I, 1.0), init, alpha=alpha, beta=beta, gamma=gamma, max_num_iter=max_iter)
mask = polygon_to_mask((h, w), snake)
if output == 'contour':
    result = draw_contour(img, snake, color=(0,255,0))
elif output == 'overlay':
    result = overlay_mask(img, mask, color=(0,255,0))
else:
    result = (mask*255).astype(np.uint8)
```

## 5) Contoh Payload API (Preview)
Contoh JSON ringkas untuk `/api/preview` (field `image_id`/`job_id` menyesuaikan implementasi aktual proyek).

```json
{
  "operation": "threshold_global",
  "params": { "thresh": 127, "type": "binary", "output": "mask" }
}
```

```json
{
  "operation": "threshold_adaptive",
  "params": { "method": "gaussian", "block_size": 15, "C": 2, "type": "binary_inv", "output": "mask" }
}
```

```json
{
  "operation": "threshold_otsu",
  "params": { "sigma": 1.0, "type": "binary", "output": "overlay" }
}
```

```json
{
  "operation": "active_contour",
  "params": { "init": "circle", "radius_factor": 0.45, "alpha": 0.2, "beta": 0.2, "gamma": 0.01, "max_iter": 300, "output": "overlay" }
}
```

## 6) Alur Pakai (UI)
1. Unggah Gambar Sumber.
2. Pilih salah satu operasi segmentasi, atur parameter → Pratinjau.
3. Tinjau Asli vs Hasil (mask/overlay/contour).
4. Jalankan Proses untuk resolusi penuh dan (opsional) unduh hasil.

## 7) Analisis & Rekomendasi
- Global: efektif pada pencahayaan merata; kurang stabil pada iluminasi tidak seragam.
- Adaptive: tangguh untuk non-uniform illumination; gunakan `block_size` ganjil dan `C` kecil untuk kompensasi lokal.
- Otsu: sangat baik pada histogram bimodal; pra-blur ringan (σ≈1) membantu mengurangi noise dan memperjelas puncak histogram.
- Active Contour: mampu menangkap bentuk kompleks/halus; sensitif pada inisialisasi dan parameter (`alpha` menekan stretching, `beta` menghaluskan kurva, `gamma` laju konvergensi).

Rekomendasi praktis:
- Mulai dari pratinjau kecil; naikkan `block_size` bertahap (11→15→21) sambil memonitor tepi yang hilang.
- Untuk Otsu, aktifkan Gaussian blur σ∈[0.8..1.5] saat citra ber-noise.
- Active contour: gunakan `init=circle` dengan `radius_factor≈0.4–0.5` untuk objek pusat; kecilkan `gamma` bila osilasi.

## 8) QA & Uji
- Output bertipe `uint8`, ukuran spasial sama dengan input.
- Validasi `block_size` ganjil dan ≥3.
- Alur Preview → Process → Download berjalan sukses tanpa error.
- Mode output `mask`/`overlay`/`contour` ter-render benar di viewer Asli vs Hasil.

## 9) Checklist Selesai
- [x] Semua operasi P6 terdokumentasi.
- [x] Contoh payload API tersedia.
- [x] Tidak ada perubahan kode sumber.
- [x] Lokasi file & sampel gambar disebutkan.

## 10) Penutup
Segmentasi merupakan tahap kunci dalam pipeline AIntra Vision untuk mengekstraksi objek/region penting sebelum analisis lanjutan. Kombinasi thresholding (global, adaptive, Otsu) dan active contour menyediakan spektrum teknik dari yang cepat dan sederhana hingga yang mampu mengikuti kontur kompleks, selaras dengan konsep Pengolahan Citra Digital yang dibahas di kelas.

