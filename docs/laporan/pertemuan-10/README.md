# Pengolahan Citra Digital — Pertemuan 10

Mata Kuliah : Pengolahan Citra Digital  
Judul       : Ekstraksi Ciri (Features)  
Dosen       : Ibu Okta Irawati, S.Kom., M.Kom  
Kelas       : 05TPLK004  
Nama        : INTRA SEPRIANSA

## 1) Ringkasan
Operasi “Ekstraksi Ciri (Features)” mengekstrak informasi kuantitatif dari citra—mulai bentuk, ukuran, geometri, tekstur hingga warna. Setiap kategori menghasilkan overlay BGR 8-bit untuk panel Hasil dan metrik numerik yang dikirim ke Panel Metrik. Implementasi backend merujuk pada materi Pertemuan 10 mengenai morfologi lanjutan dan analisis ciri citra.

## 2) Kategori & Parameter
| Kategori FE | ID Parameter | Default | Keterangan |
|-------------|--------------|---------|------------|
| Shape | `category="shape"` | Bentuk objek dari kontur Otsu | Overlay kontur + centroid |
| Size | `category="size"` | Bounding box tiap objek | Menampilkan aspekt rasio, extent, diameter ekuivalen |
| Geometry | `category="geometry"` | Hull & Ellipse fit | Mengukur solidity, compactness, eccentricity |
| Texture (GLCM) | `category="texture_glcm"` + `glcmDistance` | Analisis co-occurrence | Kontras, homogenitas, korelasi |
| Texture (LBP) | `category="texture_lbp"` + `lbpRadius` | LBP uniform | Histogram LBP awal |
| Texture (HOG) | `category="texture_hog"` + `hogSample` | Gradien orientasi | Menampilkan dimensi dan head vektor HOG |
| Color Histogram | `category="color_hist"` | Histogram RGB 256-bin | Overlay histogram pada area bawah gambar |
| Color Statistics | `category="color_stats"` | Statistik HSV | Mean/median/var tiap kanal |
| Color K-Means | `category="color_kmeans"` + `kmeansK` | K warna dominan | Overlay bar swatch warna |

Parameter tambahan muncul secara kondisional (mis. `glcmDistance` hanya saat kategori GLCM) dengan properti `visibleIf` di konfigurasi frontend.

## 3) Cara Pakai (UI)
1. Unggah gambar melalui kartu “Unggahan Gambar”.
2. Pilih operasi **Ekstraksi Ciri (Features)** dari galeri operasi.
3. Atur kategori & parameter (field kondisional muncul otomatis).
4. Klik **Pratinjau** untuk overlay skala kecil dan metrik ringkas.
5. Jika sesuai, klik **Jalankan Proses** untuk resolusi penuh, pantau progress, lalu unduh hasil.

## 4) Cuplikan Implementasi
- Backend overlay & metrik: `features_operation` dan sub-fungsi di `backend/app/img_ops.py`.
- Entri enum: `OperationEnum.FEATURES` (file `backend/app/schemas.py`).
- FE kartu operasi & parameter kondisional: `frontend/src/lib/operations.ts` (id `"features"`).
- Render parameter dinamis `visibleIf`: `frontend/src/components/settings-panel.tsx`.

## 5) Payload /api/preview (Contoh)
```json
{ "image_id": "<ID_UPLOAD>", "operation": "features", "params": { "category": "shape" } }
```
Variasi cepat:
- GLCM: `{"category":"texture_glcm","glcmDistance":2}`
- LBP: `{"category":"texture_lbp","lbpRadius":3}`
- HOG: `{"category":"texture_hog","hogSample":50}`
- Color K-Means: `{"category":"color_kmeans","kmeansK":4}`

Upload via curl:
```bash
curl -F "file=@path/to/image.png" http://localhost:8000/api/upload
curl -X POST http://localhost:8000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"image_id":"<ID>","operation":"features","params":{"category":"geometry"}}'
```

## 6) Hasil Uji (Simpan di `docs/laporan/pertemuan-10/`)
- `p10_asli.png`
- `p10_shape_overlay.png`
- `p10_size_bbox.png`
- `p10_geometry_ellipse.png`
- `p10_glcm_overlay.png`
- `p10_lbp.png`
- `p10_hog_info.png`
- `p10_color_hist.png`
- `p10_color_stats.png`
- `p10_color_kmeans.png`

Tabel ringkas metrik (contoh pratinjau):
| Kategori | Metrik utama (Panel Metrik) |
|----------|-----------------------------|
| Shape | `shape_1_area`, `shape_1_perimeter`, `shape_1_circularity`, `shape_objects` |
| Size | `size_1_aspect_ratio`, `size_1_extent`, `size_1_equiv_diameter` |
| Geometry | `geometry_1_solidity`, `geometry_1_compactness`, `geometry_1_eccentricity` |
| GLCM | `glcm_contrast`, `glcm_homogeneity`, `glcm_energy`, `glcm_correlation` |
| LBP | `lbp_hist_0 .. lbp_hist_5`, `lbp_radius` |
| HOG | `hog_dim`, `hog_head_1 .. hog_head_n` |
| Color Histogram | `color_hist_sum_b/g/r` |
| Color Statistics | `color_stats_h_mean`, `color_stats_h_var`, dst. |
| Color K-Means | `color_kmeans_{i}_r/g/b`, `color_kmeans_{i}_ratio` |

## 7) QA Checklist
- [ ] `/api/health` merespons `status: ok`.
- [ ] Preview & proses kategori shape menghasilkan kontur + metrik area/perimeter.
- [ ] Size menampilkan bbox dan metrik rasio/extent.
- [ ] Geometry menggambar hull/ellipse dan metrik solidity/eccentricity.
- [ ] Texture GLCM mengisi kontras, energi, homogenitas, korelasi (jarak sesuai parameter).
- [ ] Texture LBP menghasilkan citra LBP dan histogram awal.
- [ ] Texture HOG menampilkan citra HOG + teks dimensi, metrik head sesuai sample.
- [ ] Color Histogram menggambar histogram RGB di area bawah gambar, metrik sum kanal.
- [ ] Color Statistics memberikan mean/median/var HSV + teks overlay.
- [ ] Color K-Means menampilkan bar swatch warna dominan + rasio dan nilai RGB.
- [ ] Panel Hasil selalu Asli vs Hasil, Panel Metrik menampilkan angka tanpa error.
- [ ] Parameter kondisional muncul ketika kategori relevan dipilih (glcm/lbp/hog/kmeans).
- [ ] Preview berjalan cepat (<~200 ms pada citra skala 512 px) tanpa error.

## 8) Rekomendasi Praktis
- Mulai dari kategori Shape untuk memahami struktur objek, lanjutkan ke Size/Geometry jika perlu metrik lanjutan.
- Untuk tekstur, coba GLCM (jarak 1–2) dan LBP radius 1–2; gunakan HOG jika butuh fitur gradien.
- Untuk warna, Color Histogram memberikan distribusi global; gunakan K-Means untuk warna dominan (atur `kmeansK` 3–4).
- Setelah mendapatkan metrik yang stabil, jalankan proses penuh dan unduh hasil overlay/metrics JSON.

## 9) Penutup
Operasi “Ekstraksi Ciri” memperkaya pipeline AIntra Vision: setelah morfologi/threshholding menghasilkan mask yang bersih, fitur bentuk, tekstur, dan warna dapat diekstrak sebagai dasar klasifikasi, clustering, maupun analitik lanjutan. Integrasi metrik langsung ke Panel Metrik memudahkan validasi cepat sebelum melanjutkan ke tahap model AI berikutnya.
