"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { performAction, uploadPhotos } from "@/lib/client-api";
import { toInputDate } from "@/lib/format";
import { TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import type { CareEventType } from "@/lib/types";
import { EVENT_LABELS } from "@/lib/types";

interface AddEventFormProps {
  plantId: string;
}

type FormEventType = CareEventType | "anti-bichos" | "anti-hongos";

const eventOptions: Array<{ value: FormEventType; label: string }> = [
  { value: "note", label: EVENT_LABELS.note },
  { value: "watering", label: EVENT_LABELS.watering },
  { value: "fertilizer", label: EVENT_LABELS.fertilizer },
  { value: "prune", label: EVENT_LABELS.prune },
  { value: "anti-bichos", label: TREATMENT_TYPE_LABELS["anti-bichos"] },
  { value: "anti-hongos", label: TREATMENT_TYPE_LABELS["anti-hongos"] },
];

export function AddEventForm({ plantId }: AddEventFormProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState<FormEventType>("note");
  const [notes, setNotes] = useState("");
  const [happenedAt, setHappenedAt] = useState(() => toInputDate(new Date()));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isTreatment =
      eventType === "anti-bichos" || eventType === "anti-hongos";
    const action: CareEventType = isTreatment ? "pest" : eventType;

    if (action === "note" && !notes.trim()) {
      alert("Escribí una nota para el historial");
      return;
    }

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("photos") as HTMLInputElement;

    try {
      setSaving(true);
      const photoPaths = fileInput.files?.length
        ? await uploadPhotos(fileInput.files)
        : [];

      await performAction(plantId, action, {
        notes: notes.trim() || undefined,
        photoPaths,
        happenedAt,
        treatmentType: isTreatment ? eventType : undefined,
      });

      setNotes("");
      setHappenedAt(toInputDate(new Date()));
      form.reset();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la entrada");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
        Agregar al historial
      </h2>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Tipo</span>
          <select
            value={eventType}
            onChange={(event) =>
              setEventType(event.target.value as FormEventType)
            }
            className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          >
            {eventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Fecha</span>
          <input
            type="date"
            value={happenedAt}
            onChange={(event) => setHappenedAt(event.target.value)}
            max={toInputDate(new Date())}
            className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Notas</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            placeholder="Qué pasó, qué hiciste, cómo se ve..."
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-emerald-950">Fotos</span>
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-sm"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar entrada"}
      </button>
    </form>
  );
}
