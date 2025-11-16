"use client";

import { Toaster as SonnerToaster } from "sonner";

export const Toaster = () => (
  <SonnerToaster
    position="top-right"
    theme="light"
    richColors
    toastOptions={{
      style: {
        borderRadius: "16px",
        border: "1px solid rgba(17, 24, 39, 0.1)",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
      },
    }}
  />
);
