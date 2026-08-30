"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

interface GardenNoteItemProps {
  id: string;
  title: string;
  body: string | null;
}

export function GardenNoteItem({ id, title, body }: GardenNoteItemProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    setDraftTitle(title);
    setDraftBody(body ?? "");
    setEditing(true);
  }

  function cancelEdit() {
    setDraftTitle(title);
    setDraftBody(body ?? "");
    setEditing(false);
  }

  async function handleSave() {
    if (!draftTitle.trim()) {
      alert("Escribí al menos un título");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(withBasePath(`/api/notes/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim(),
          body: draftBody.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "No se pudo guardar");
      }
      setEditing(false);
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

  async function handleDelete() {
    if (!confirm("¿Borrar esta nota?")) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(withBasePath(`/api/notes/${id}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("No se pudo borrar");
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo borrar la nota");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <article className="space-y-3 border-b border-emerald-900/10 py-4 last:border-b-0">
        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Título</span>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Nota</span>
          <textarea
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            disabled={saving}
            rows={4}
            className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="rounded-xl border border-emerald-900/15 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="border-b border-emerald-900/10 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-emerald-950">{title}</h3>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-emerald-800/70 hover:text-emerald-950"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs font-semibold text-emerald-800/70 hover:text-red-700 disabled:opacity-50"
          >
            {deleting ? "…" : "Borrar"}
          </button>
        </div>
      </div>
      {body ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-900/75">
          {body}
        </p>
      ) : null}
    </article>
  );
}
