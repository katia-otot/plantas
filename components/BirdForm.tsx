"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoPickerButtons } from "@/components/PhotoPickerButtons";
import { withBasePath } from "@/lib/base-path";
import { uploadPhotos } from "@/lib/client-api";

type Props = {
  mode: "create" | "edit";
  birdId?: string;
  initialName?: string;
  initialNotes?: string | null;
  initialCoverPhotoPath?: string | null;
};

export function BirdForm({
  mode,
  birdId,
  initialName = "",
  initialNotes = null,
  initialCoverPhotoPath = null,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [coverPhotoPath, setCoverPhotoPath] = useState(
    initialCoverPhotoPath,
  );
  const [saving, setSaving] = useState(false);

  async function handlePhotos(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    try {
      setSaving(true);
      const paths = await uploadPhotos(files);
      if (paths[0]) {
        setCoverPhotoPath(paths[0]);
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo subir la foto");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      alert("Escribí el nombre del pájaro");
      return;
    }

    try {
      setSaving(true);
      const url =
        mode === "create"
          ? withBasePath("/api/birds")
          : withBasePath(`/api/birds/${birdId}`);
      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || null,
          coverPhotoPath,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "No se pudo guardar");
      }

      const bird = (await response.json()) as { id: string };
      router.push(`/pajaros/${bird.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!birdId || mode !== "edit") {
      return;
    }
    if (!confirm(`¿Borrar a ${name.trim() || "este pájaro"}?`)) {
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(withBasePath(`/api/birds/${birdId}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("No se pudo borrar");
      }
      router.push("/pajaros");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo borrar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-emerald-50">
        {coverPhotoPath ? (
          <Image
            src={withBasePath(coverPhotoPath)}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 512px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            🐦
          </div>
        )}
      </div>

      <div>
        <span className="text-sm font-medium text-emerald-950">Foto</span>
        <div className="mt-2">
          <PhotoPickerButtons disabled={saving} onFiles={handlePhotos} />
        </div>
        {coverPhotoPath ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => setCoverPhotoPath(null)}
            className="mt-2 text-sm font-semibold text-emerald-800 hover:underline disabled:opacity-60"
          >
            Quitar foto
          </button>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-emerald-950">Nombre</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          placeholder="Ej. Hornero"
          maxLength={120}
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-emerald-950">
          Descripción (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          placeholder="Dónde lo ves, cómo se ve, dudas del nombre…"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "..." : mode === "create" ? "Agregar pájaro" : "Guardar"}
      </button>

      {mode === "edit" ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleDelete()}
          className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
        >
          Borrar
        </button>
      ) : null}
    </form>
  );
}
