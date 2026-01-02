"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileImage, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize } from "@/lib/utils";
import { uploadImage } from "@/lib/api";
import { useProcessingStore } from "@/store/use-processing-store";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function FileUploadReferenceCard() {
  const { referenceImage, setReference } = useProcessingStore((state) => ({
    referenceImage: state.referenceImage,
    setReference: state.setReference,
  }));
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const file = acceptedFiles[0];

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Format target tidak didukung", {
          description: "Unggah PNG, JPG, atau WEBP.",
        });
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        toast.error("Ukuran file target terlalu besar", {
          description: "Maksimum 25 MB.",
        });
        return;
      }

      setUploading(true);
      const previewUrl = URL.createObjectURL(file);

      try {
        const response = await uploadImage(file);
        setReference({
          id: response.image_id,
          name: response.filename,
          size: response.size,
          type: response.content_type,
          previewUrl,
          uploadedAt: Date.now(),
        });
        toast.success("Gambar target siap digunakan", {
          description: `${response.filename} terunggah sebagai referensi.`,
        });
      } catch (error) {
        URL.revokeObjectURL(previewUrl);
        console.error(error);
        setReference(undefined);
        toast.error("Unggah target gagal", {
          description: error instanceof Error ? error.message : "Terjadi kesalahan server.",
        });
      } finally {
        setUploading(false);
      }
    },
    [setReference],
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
    if (uploading) return "Mengunggah referensi...";
    if (referenceImage) return "Referensi siap dipakai";
    return "Seret & lepas gambar target di sini";
  }, [uploading, referenceImage]);

  const handleReset = () => {
    if (referenceImage?.previewUrl && referenceImage.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(referenceImage.previewUrl);
    }
    setReference(undefined);
  };

  return (
    <Card className="overflow-hidden border-neutral-200/80 bg-white/80">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">Gambar Target</CardTitle>
        <CardDescription className="text-sm text-neutral-500">
          Referensi histogram untuk operasi Histogram Matching. Ukuran maksimum 25 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              ) : referenceImage ? (
                <FileImage className="h-7 w-7" />
              ) : (
                <UploadCloud className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-neutral-900">{uploadState}</p>
              {referenceImage ? (
                <div className="text-xs text-neutral-500">
                  {referenceImage.name} - {formatFileSize(referenceImage.size)}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Atau klik untuk memilih file referensi dari perangkat Anda.
                </p>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-gradient-to-br from-white/20 via-transparent to-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        </div>

        {referenceImage && (
          <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white">
              <Image
                src={referenceImage.previewUrl}
                alt={referenceImage.name}
                width={320}
                height={240}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-700">Detail Referensi</p>
                <p className="text-sm text-neutral-500">
                  ID: {referenceImage.id} - {formatFileSize(referenceImage.size)} -{" "}
                  {referenceImage.type}
                </p>
              </div>
              <p className="text-sm text-neutral-500">
                Gambar target akan dipakai sebagai acuan distribusi intensitas saat menjalankan
                operasi Histogram Matching.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleReset} disabled={uploading}>
                  <X className="mr-2 h-4 w-4" />
                  Hapus Referensi
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
