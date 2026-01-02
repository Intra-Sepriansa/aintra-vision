<<<<<<< HEAD
﻿"use client";

import { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { FileImage, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import { uploadImage } from "@/lib/api";
import { useProcessingStore } from "@/store/use-processing-store";
import { shallow } from "zustand/shallow";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function FileUploadCard() {
  const { originalImage, setUpload, setOriginal, setUploading, uploading, setError } =
    useProcessingStore(
      (state) => ({
        originalImage: state.originalImage,
        setUpload: state.setUpload,
        setOriginal: state.setOriginal,
        setUploading: state.setUploading,
        uploading: state.uploading,
        setError: state.setError,
      }),
      shallow,
    );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const file = acceptedFiles[0];

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Format tidak didukung", {
          description: "Unggah PNG, JPG, atau WEBP.",
        });
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        toast.error("Ukuran file terlalu besar", {
          description: "Maksimum 25 MB.",
        });
        return;
      }

      setUploading(true);
      setError(null);

      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        setOriginal(base64 ?? null);
      };
      reader.readAsDataURL(file);

      try {
        const response = await uploadImage(file);
        setUpload({
          id: response.image_id,
          name: response.filename,
          size: response.size,
          type: response.content_type,
          previewUrl,
          uploadedAt: Date.now(),
        });
        toast.success("Gambar berhasil diunggah", {
          description: `${response.filename} siap diproses.`,
        });
      } catch (error) {
        URL.revokeObjectURL(previewUrl);
        console.error(error);
        setUpload(undefined);
        setOriginal(null);
        setError(error instanceof Error ? error.message : "Gagal mengunggah");
        toast.error("Unggah gagal", {
          description:
            error instanceof Error ? error.message : "Terjadi kesalahan server.",
        });
      } finally {
        setUploading(false);
      }
    },
    [setUpload, setOriginal, setUploading, setError],
  );

  const onDropRejected = useCallback(() => {
    toast.error("Unggah ditolak", {
      description: "Pastikan format dan ukuran sesuai ketentuan.",
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    maxFiles: 1,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  });

  const uploadState = useMemo(() => {
    if (uploading) return "Mengunggah...";
    if (originalImage) return "Gambar siap diproses";
    return "Seret dan lepas gambar Anda di sini";
  }, [uploading, originalImage]);

  const handleReset = () => {
    if (originalImage?.previewUrl && originalImage.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(originalImage.previewUrl);
    }
    setUpload(undefined);
    setOriginal(null);
  };

  return (
    <Card className="overflow-hidden border-neutral-200/80 bg-white/80">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">
          Unggahan Gambar
        </CardTitle>
        <CardDescription className="text-sm text-neutral-500">
          Format yang didukung: PNG, JPG, WEBP. Maksimal 25 MB. Validasi MIME otomatis dan deteksi magic bytes di backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* ==== FIX: Dropzone root props di wrapper <div>, bukan langsung di motion.div ==== */}
        <div {...getRootProps()} className="group relative">
          <input {...getInputProps()} />

          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: isDragActive ? 1 : 0.92, scale: isDragActive ? 1.01 : 1 }}
            transition={{ duration: 0.3 }}
            className="relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/70 px-6 py-10 text-center transition-colors hover:border-neutral-400"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 shadow-inner">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : originalImage ? (
                <FileImage className="h-7 w-7" />
              ) : (
                <UploadCloud className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-base font-medium text-neutral-900">{uploadState}</p>
              {originalImage ? (
                <div className="text-xs text-neutral-500">
                  {originalImage.name} - {formatFileSize(originalImage.size)}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Atau klik untuk memilih file dari perangkat Anda.
                </p>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-white/20 via-transparent to-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        </div>

        {originalImage && (
          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white">
              <Image
                src={originalImage.previewUrl}
                alt={originalImage.name}
                width={320}
                height={240}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-700">Detail Gambar</p>
                <p className="text-sm text-neutral-500">
                  ID: {originalImage.id}  {formatFileSize(originalImage.size)}  {originalImage.type}
                </p>
              </div>

              <p className="text-sm text-neutral-500">
                File disimpan sementara dan akan dibersihkan otomatis setelah 72 jam. Gunakan pengaturan operasi di bawah untuk menyesuaikan pratinjau dan pemrosesan penuh.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <X className="mr-2 h-4 w-4" />
                  Hapus & Unggah Ulang
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
=======
"use client";

import { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { FileImage, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import { uploadImage } from "@/lib/api";
import { useProcessingStore } from "@/store/use-processing-store";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function FileUploadCard() {
  const {
    originalImage,
    setUpload,
    setPreviewImage,
    setUploading,
    uploading,
    setError,
  } = useProcessingStore((state) => ({
    originalImage: state.originalImage,
    setUpload: state.setUpload,
    setPreviewImage: state.setPreviewImage,
    setUploading: state.setUploading,
    uploading: state.uploading,
    setError: state.setError,
  }));

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const file = acceptedFiles[0];

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Format tidak didukung", { description: "Unggah PNG, JPG, atau WEBP." });
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error("Ukuran file terlalu besar", { description: "Maksimum 25 MB." });
        return;
      }

      setUploading(true);
      setError(null);

      const previewUrl = URL.createObjectURL(file);

      try {
        const response = await uploadImage(file);
        setUpload({
          id: response.image_id,
          name: response.filename,
          size: response.size,
          type: response.content_type,
          previewUrl,
          uploadedAt: Date.now(),
        });
        setPreviewImage(previewUrl);
        toast.success("Gambar berhasil diunggah", {
          description: `${response.filename} siap diproses.`,
        });
      } catch (error) {
        URL.revokeObjectURL(previewUrl);
        console.error(error);
        setUpload(undefined);
        setPreviewImage(undefined);
        setError(error instanceof Error ? error.message : "Gagal mengunggah");
        toast.error("Unggah gagal", {
          description: error instanceof Error ? error.message : "Terjadi kesalahan server.",
        });
      } finally {
        setUploading(false);
      }
    },
    [setUpload, setPreviewImage, setUploading, setError],
  );

  const onDropRejected = useCallback(() => {
    toast.error("Unggah ditolak", { description: "Pastikan format dan ukuran sesuai ketentuan." });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: false,
    maxFiles: 1,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  });

  const uploadState = useMemo(() => {
    if (uploading) return "Mengunggah...";
    if (originalImage) return "Gambar siap diproses";
    return "Seret dan lepas gambar Anda di sini";
  }, [uploading, originalImage]);

  const handleReset = () => {
    if (originalImage?.previewUrl && originalImage.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(originalImage.previewUrl);
    }
    setUpload(undefined);
    setPreviewImage(undefined);
  };

  return (
    <Card className="overflow-hidden border-neutral-200/80 bg-white/80">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">Unggahan Gambar</CardTitle>
        <CardDescription className="text-sm text-neutral-500">
          Format yang didukung: PNG, JPG, WEBP. Maksimal 25 MB. Validasi MIME otomatis dan deteksi
          magic bytes di backend.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Penting: spread props dropzone di wrapper <div>, bukan di <motion.div> */}
        <div {...getRootProps()} className="group relative">
          <input {...getInputProps()} />

          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: isDragActive ? 1 : 0.92, scale: isDragActive ? 1.01 : 1 }}
            transition={{ duration: 0.3 }}
            className="relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/70 px-6 py-10 text-center transition-colors hover:border-neutral-400"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 shadow-inner">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : originalImage ? (
                <FileImage className="h-7 w-7" />
              ) : (
                <UploadCloud className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-base font-medium text-neutral-900">{uploadState}</p>
              {originalImage ? (
                <div className="text-xs text-neutral-500">
                  {originalImage.name} - {formatFileSize(originalImage.size)}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Atau klik untuk memilih file dari perangkat Anda.</p>
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-white/20 via-transparent to-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        </div>

        {originalImage && (
          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white">
              <Image
                src={originalImage.previewUrl}
                alt={originalImage.name}
                width={320}
                height={240}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-700">Detail Gambar</p>
                <p className="text-sm text-neutral-500">
                  ID: {originalImage.id} {formatFileSize(originalImage.size)} {originalImage.type}
                </p>
              </div>

              <p className="text-sm text-neutral-500">
                File disimpan sementara dan akan dibersihkan otomatis setelah 72 jam. Gunakan
                pengaturan operasi di bawah untuk menyesuaikan pratinjau dan pemrosesan penuh.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <X className="mr-2 h-4 w-4" />
                  Hapus & Unggah Ulang
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
>>>>>>> ee3fa41 (chore: update README and UI)
