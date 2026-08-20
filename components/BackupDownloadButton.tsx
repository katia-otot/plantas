"use client";

import { withBasePath } from "@/lib/base-path";

export function BackupDownloadButton() {
  return (
    <a
      href={withBasePath("/api/backup")}
      className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
    >
      Descargar respaldo (JSON)
    </a>
  );
}
