"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { shallow } from "zustand/shallow";

import { getOpsRegistry } from "@/lib/api";
import { useProcessingStore } from "@/store/use-processing-store";

export function RegistryLoader() {
  const { operationsCount, setRegistry } = useProcessingStore(
    (state) => ({
      operationsCount: state.operations.length,
      setRegistry: state.setRegistry,
    }),
    shallow,
  );
  const loadingRef = useRef(false);

  useEffect(() => {
    if (operationsCount || loadingRef.current) {
      return;
    }
    let cancelled = false;
    loadingRef.current = true;
    getOpsRegistry()
      .then((entries) => {
        if (!cancelled) {
          setRegistry(entries);
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar operasi");
      })
      .finally(() => {
        loadingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [operationsCount, setRegistry]);

  return null;
}

