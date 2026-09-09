"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { uploadPhotos } from "@/lib/client-api";

type Props = {
  hasPlan: boolean;
};

export function MapFloorPlanControls({ hasPlan }: Props) {
  const router = useRouter();
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function persist(mapImagePath: string) {
    const response = await fetch(withBasePath("/api/settings/map-image"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapImagePath }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(data?.error || "No se pudo guardar el plano");
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) {
      return;
    }
    try {
      setBusy(true);
      const [path] = await uploadPhotos([files[0]!]);
      await persist(path);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el plano",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-2">
      {!hasPlan ? (
        <p className="mb-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Todavía no hay plano. Cargá una imagen de tu casa o patio para
          ubicar las plantas.
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => galleryRef.current?.click()}
        className="rounded-xl border border-emerald-800/25 bg-white px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60"
      >
        {busy
          ? "Guardando…"
          : hasPlan
            ? "Cambiar plano"
            : "Cargar plano"}
      </button>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
