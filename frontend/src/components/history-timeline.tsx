"use client";

import { RotateCcw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";
<<<<<<< HEAD
import { useProcessingStore } from "@/store/use-processing-store";
import { shallow } from "zustand/shallow";

export function HistoryTimeline() {
  const { history, setOperation, resetParams, updateParam } = useProcessingStore(
    (state) => ({
      history: state.history,
      setOperation: state.setOperation,
      resetParams: state.resetParams,
      updateParam: state.updateParam,
    }),
    shallow,
  );

  const handleRestore = (entryId: string) => {
    const entry = history.find((item) => item.id === entryId);
    if (!entry) return;
    setOperation(entry.operationId);
    resetParams(entry.operationId);
    Object.entries(entry.params).forEach(([key, value]) => {
      updateParam(entry.operationId, key, value);
    });
  };

  return (
    <section id="riwayat" className="mx-auto mt-16 max-w-6xl px-6">
      <Card className="border-neutral-200/80 bg-white/90">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
=======
import { HISTORY_LIMIT, HISTORY_VISIBLE, useProcessingStore } from "@/store/use-processing-store";

export function HistoryTimeline() {
  const { history, setOperation, resetParams, updateParam } = useProcessingStore((state) => ({
    history: state.history,
    setOperation: state.setOperation,
    resetParams: state.resetParams,
    updateParam: state.updateParam,
  }));

  const handleRestore = (entryId: string) => {
    const entry = history.find((item) => item.id === entryId);
    if (!entry) return;
    setOperation(entry.operationId);
    resetParams(entry.operationId);
    Object.entries(entry.params).forEach(([key, value]) => {
      updateParam(entry.operationId, key, value);
    });
  };

  return (
    <section id="riwayat" className="mx-auto mt-16 max-w-6xl px-6">
      <Card className="border-neutral-200/80 bg-white/90">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
>>>>>>> ee3fa41 (chore: update README and UI)
          <div>
            <CardTitle className="text-xl font-semibold text-neutral-900">Riwayat Proses</CardTitle>
            <CardDescription className="text-neutral-500">
              Menampilkan {HISTORY_VISIBLE} entri, scroll untuk melihat lainnya. Riwayat lokal disimpan maksimal {HISTORY_LIMIT} entri. Klik salah satu entri untuk mengembalikan parameter dan operasi.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-sm text-neutral-500">Belum ada riwayat proses.</p>
          ) : (
            <div className="max-h-[720px] overflow-y-auto pr-1">
              <ul className="space-y-4">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                        <Badge className="bg-neutral-900 text-white">{entry.operationId}</Badge>
                        <span>{entry.imageName}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatRelativeTime(entry.createdAt)}  {Object.keys(entry.params).length} parameter
                      </p>
                    </div>
<<<<<<< HEAD
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatRelativeTime(entry.createdAt)}  {Object.keys(entry.params).length} parameter
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                    {Object.entries(entry.params).slice(0, 4).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-full bg-neutral-100 px-3 py-1"
                      >
                        {key}: {Array.isArray(value) ? value.join(" / ") : String(value)}
                      </span>
                    ))}
                    {Object.entries(entry.params).length > 4 && (
                      <span className="rounded-full bg-neutral-100 px-3 py-1">
                        +{Object.entries(entry.params).length - 4} parameter
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleRestore(entry.id)}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Pulihkan
                    </Button>
                    {entry.resultB64 && (
                      <a
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900",
                        )}
                        href={`data:image/png;base64,${entry.resultB64}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Settings className="h-4 w-4" /> Lihat Hasil
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
=======
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                      {Object.entries(entry.params).slice(0, 4).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full bg-neutral-100 px-3 py-1"
                        >
                          {key}: {Array.isArray(value) ? value.join(" / ") : String(value)}
                        </span>
                      ))}
                      {Object.entries(entry.params).length > 4 && (
                        <span className="rounded-full bg-neutral-100 px-3 py-1">
                          +{Object.entries(entry.params).length - 4} parameter
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleRestore(entry.id)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Pulihkan
                      </Button>
                      {entry.resultUrl && (
                        <a
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900",
                          )}
                          href={entry.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Settings className="h-4 w-4" /> Lihat Hasil
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
>>>>>>> ee3fa41 (chore: update README and UI)
          )}
        </CardContent>
      </Card>
    </section>
  );
}
