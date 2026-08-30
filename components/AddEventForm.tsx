"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import { PhotoPickerButtons } from "@/components/PhotoPickerButtons";
import { performAction, uploadPhotos } from "@/lib/client-api";
import { toInputDate } from "@/lib/format";
import { TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import type { CareEventType } from "@/lib/types";
import { EVENT_LABELS } from "@/lib/types";

interface AddEventFormProps {
  plantId: string;
}

type FormEventType = CareEventType | "anti-bichos" | "anti-hongos";

const eventOptions: Array<{
  value: FormEventType;
  label: string;
  icon: ActionIconName;
}> = [
  { value: "note", label: EVENT_LABELS.note, icon: "agenda" },
  { value: "watering", label: EVENT_LABELS.watering, icon: "regar" },
  { value: "fertilizer", label: EVENT_LABELS.fertilizer, icon: "fertilizante" },
  { value: "prune", label: EVENT_LABELS.prune, icon: "poda" },
  {
    value: "anti-bichos",
    label: TREATMENT_TYPE_LABELS["anti-bichos"],
    icon: "tratamiento-plagas",
  },
  {
    value: "anti-hongos",
    label: TREATMENT_TYPE_LABELS["anti-hongos"],
    icon: "tratamiento-hongos",
  },
];

export function AddEventForm({ plantId }: AddEventFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<FormEventType>("note");
  const [notes, setNotes] = useState("");
  const [happenedAt, setHappenedAt] = useState(() => toInputDate(new Date()));
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  function addPhotos(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    setPhotos((current) => [...current, ...Array.from(files)]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isTreatment =
      eventType === "anti-bichos" || eventType === "anti-hongos";
    const action: CareEventType = isTreatment ? "pest" : eventType;

    if (action === "note" && !notes.trim()) {
      alert("Escribí una nota para el historial");
      return;
    }

    try {
      setSaving(true);
      const photoPaths = photos.length > 0 ? await uploadPhotos(photos) : [];

      await performAction(plantId, action, {
        notes: notes.trim() || undefined,
        photoPaths,
        happenedAt,
        treatmentType: isTreatment ? eventType : undefined,
      });

      setNotes("");
      setHappenedAt(toInputDate(new Date()));
      setPhotos([]);
      setEventType("note");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la entrada");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-emerald-900/10 bg-white px-4 py-3.5 text-left shadow-sm hover:bg-emerald-50/80"
      >
        <span className="text-sm font-semibold text-emerald-950">
          Agregar al historial
        </span>
        <span className="text-lg font-semibold leading-none text-emerald-800">
          +
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Agregar al historial
        </h2>
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen(false)}
          className="rounded-lg px-2 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <span className="text-sm font-medium text-emerald-950">Tipo</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {eventOptions.map((option) => {
              const active = eventType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEventType(option.value)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-emerald-100 text-emerald-950 ring-2 ring-emerald-600"
                      : "border border-emerald-900/10 bg-white text-emerald-900 hover:bg-emerald-50"
                  }`}
                >
                  <ActionIcon name={option.icon} size={36} alt="" />
                  <span className="leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

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

        <div>
          <span className="text-sm font-medium text-emerald-950">Fotos</span>
          <div className="mt-2">
            <PhotoPickerButtons
              disabled={saving}
              multiple
              onFiles={addPhotos}
            />
          </div>
          {photos.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm text-emerald-900/70">
                {photos.length} foto{photos.length === 1 ? "" : "s"} lista
                {photos.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPhotos([])}
                className="text-sm font-semibold text-emerald-800 hover:underline disabled:opacity-60"
              >
                Quitar
              </button>
            </div>
          ) : null}
        </div>
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
