"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      id="bantuan"
      className="relative mt-24 overflow-hidden border-t border-neutral-200/80 bg-white"
    >
      <div className="absolute inset-0">
        <motion.div
          className="absolute -inset-[40%] rounded-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_55%)]"
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 48,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(124,58,237,0.18),_transparent_60%)]"
          animate={{ rotate: -360 }}
          transition={{
            repeat: Infinity,
            duration: 60,
            ease: "linear",
          }}
        />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 text-neutral-600">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
              AIntra Vision
            </h3>
            <p className="text-sm leading-relaxed text-neutral-600">
              Toolkit pengolahan citra 13 operasi dengan antarmuka responsif, animasi modern, dan observabilitas terintegrasi.
            </p>
          </div>
          <FooterNav
            title="Dokumentasi"
            items={[
              { label: "Panduan Pengguna", href: "#bantuan" },
              { label: "API Reference", href: "/docs/api" },
              { label: "Algoritma", href: "#operasi" },
            ]}
          />
          <FooterNav
            title="Legal"
            items={[
              { label: "Kebijakan Privasi", href: "/privacy" },
              { label: "Keamanan", href: "/security" },
              { label: "Syarat Layanan", href: "/terms" },
            ]}
          />
          <FooterNav
            title="Kontak"
            items={[
              { label: "hello@aintra.id", href: "mailto:hello@aintra.id" },
              { label: "Status Layanan", href: "/status" },
              { label: "Versi Build", href: "#" },
            ]}
          />
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-neutral-200/70 pt-4 text-sm text-neutral-500 sm:flex-row">
          <p>
             {new Date().getFullYear()} AIntra Vision
          </p>
          <div className="flex gap-4">
            <Link className="hover:text-neutral-900" href="/changelog">
              Changelog
            </Link>
            <Link className="hover:text-neutral-900" href="/security">
              Responsible Disclosure
            </Link>
            <Link className="hover:text-neutral-900" href="/metrics">
              Observability
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface FooterNavProps {
  title: string;
  items: { label: string; href: string }[];
}

function FooterNav({ title, items }: FooterNavProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
        {title}
      </h4>
      <ul className="space-y-2 text-sm text-neutral-600">
        {items.map((item) => (
          <li key={item.href}>
            <Link className="transition-colors hover:text-neutral-900" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
