"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function ImportExcelButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    const confirmed = window.confirm(
      "Esto reemplaza todas las plantas actuales con el archivo. ¿Continuar?",
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
      body.append("replace", "1");

      const response = await fetch(withBasePath("/api/plants/import"), {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as {
        error?: string;
        imported?: number;
        notesImported?: number;
        skipped?: number;
        mergedDuplicates?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Error al importar");
      }

      const mergeNote = payload.mergedDuplicates
        ? ` · ${payload.mergedDuplicates} filas duplicadas unificadas`
        : "";
      const notesNote = payload.notesImported
        ? ` · ${payload.notesImported} notas del patio`
        : "";
      alert(
        `Importadas ${payload.imported ?? 0} plantas (reemplazo limpio)` +
          notesNote +
          (payload.skipped ? ` · ${payload.skipped} filas omitidas` : "") +
          mergeNote,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo importar el Excel",
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
        {loading ? "Importando..." : "Importar Excel / CSV"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={(event) => handleFile(event.target.files)}
      />
    </>
  );
}
