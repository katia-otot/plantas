"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function GardenNoteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      alert("Escribí al menos un título o la nota");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(withBasePath("/api/notes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "No se pudo guardar");
      }

      setTitle("");
      setBody("");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "No se pudo guardar la nota",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-emerald-950">Nueva nota</h2>
      <label className="mt-3 block">
        <span className="text-sm font-medium text-emerald-950">Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          placeholder="Ej. Horario vivero X"
          maxLength={200}
        />
      </label>
      <label className="mt-3 block">
        <span className="text-sm font-medium text-emerald-950">
          Nota (opcional)
        </span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          placeholder="Detalle, tip, dato útil…"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Agregar nota"}
      </button>
    </form>
  );
}
