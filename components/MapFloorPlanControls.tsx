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
  const [open, setOpen] = useState(!hasPlan);

  async function persist(body: { mapImagePath: string } | { clear: true }) {
    const response = await fetch(withBasePath("/api/settings/map-image"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
      await persist({ mapImagePath: path });
      setOpen(false);
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

  async function removePlan() {
    if (busy) {
      return;
    }
    if (
      !window.confirm(
        "¿Quitar el plano? Tus plantas en el mapa se quedan donde están.",
      )
    ) {
      return;
    }
    try {
      setBusy(true);
      await persist({ clear: true });
      setOpen(true);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "No se pudo quitar el plano",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-2">
      {!hasPlan ? (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Todavía no hay plano. Cargá una imagen de tu casa o patio para
          ubicar las plantas.
        </p>
      ) : null}

      <div className={`${hasPlan ? "" : "mt-2"} flex flex-wrap items-center gap-2`}>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl border border-emerald-800/25 bg-white px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60"
        >
          {open ? "Cerrar" : hasPlan ? "Cambiar plano" : "Cargar plano"}
        </button>
        {hasPlan ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void removePlan()}
            className="rounded-xl border border-emerald-800/15 bg-transparent px-3 py-2 text-sm font-medium text-emerald-900/80 hover:bg-emerald-50 disabled:opacity-60"
          >
            Quitar plano
          </button>
        ) : null}
        {busy ? (
          <span className="text-sm text-emerald-900/70">Guardando…</span>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-emerald-900/10 bg-white p-3 shadow-sm">
          <p className="text-sm text-emerald-900/80">
            Subí una foto o captura del plano de tu casa o patio. Las plantas
            ya ubicadas se mantienen en porcentaje del mapa.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Elegir imagen
            </button>
          </div>
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
      ) : null}
    </div>
  );
}
