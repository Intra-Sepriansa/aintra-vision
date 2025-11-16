"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SupportSection() {
  return (
    <section id="bantuan" className="mx-auto mt-16 max-w-6xl px-6">
      <Card className="border-neutral-200/80 bg-white/90">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-neutral-900">Bantuan & Dokumentasi</CardTitle>
          <CardDescription className="text-neutral-500">
            Ringkasan endpoints backend, tips performa, serta jaminan keamanan yang siap Anda audit.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
              Endpoint Backend
            </h3>
            <ul className="space-y-3 text-sm text-neutral-600">
              <li>
                <Badge className="mr-2 bg-neutral-900 text-white">POST</Badge>
                /api/upload  Validasi MIME, batas ukuran 25MB
              </li>
              <li>
                <Badge className="mr-2 bg-neutral-900 text-white">POST</Badge>
                /api/preview  Pratinjau cepat resolusi rendah
              </li>
              <li>
                <Badge className="mr-2 bg-neutral-900 text-white">POST</Badge>
                /api/process  Background task + WebSocket progress
              </li>
              <li>
                <Badge className="mr-2 bg-neutral-900 text-white">GET</Badge>
                /api/jobs/:id  Status, metrik (SSIM, PSNR)
              </li>
              <li>
                <Badge className="mr-2 bg-neutral-900 text-white">GET</Badge>
                /api/download/:id  Unduh hasil PNG
              </li>
            </ul>
          </div>
          <div>
            <Accordion type="single" collapsible defaultValue="performa">
              <AccordionItem value="performa">
                <AccordionTrigger>Optimasi Performa</AccordionTrigger>
                <AccordionContent>
                  Gunakan batas resolusi 1280px saat pratinjau, aktifkan worker pool untuk batch, dan gunakan caching Redis untuk hasil sementara.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="keamanan">
                <AccordionTrigger>Keamanan & Audit</AccordionTrigger>
                <AccordionContent>
                  Validasi magic-bytes, rate limit, CSP ketat, HSTS, audit log, dan opsi anonimisasi wajah/PII tersedia di backend FastAPI.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="qa">
                <AccordionTrigger>Testing & QA</AccordionTrigger>
                <AccordionContent>
                  Unit test per operasi, golden test SSIM/PSNR, integrasi upload?process?download, serta E2E Playwright untuk gestur slider.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
