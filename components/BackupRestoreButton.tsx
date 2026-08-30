"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function BackupRestoreButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Esto reemplaza plantas, historial, pájaros, notas y fotos con el respaldo JSON. ¿Continuar?",
    );
    if (!confirmed) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    try {
      setLoading(true);
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(withBasePath("/api/backup"), {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        error?: string;
        plants?: number;
        birds?: number;
        gardenNotes?: number;
        filesRestored?: number;
        filesMissing?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Error al restaurar");
      }

      const missingNote =
        payload.filesMissing && payload.filesMissing > 0
          ? ` · ${payload.filesMissing} fotos no estaban en el archivo`
          : "";
      alert(
        `Respaldo restaurado: ${payload.plants ?? 0} plantas` +
          (payload.birds ? ` · ${payload.birds} pájaros` : "") +
          (payload.gardenNotes ? ` · ${payload.gardenNotes} notas` : "") +
          (payload.filesRestored
            ? ` · ${payload.filesRestored} fotos`
            : "") +
          missingNote,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo restaurar el respaldo",
      );
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
      >
        {loading ? "Restaurando..." : "Restaurar respaldo (JSON)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => handleFile(event.target.files)}
      />
    </>
  );
}
