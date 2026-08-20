"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toInputDate } from "@/lib/format";

interface ScheduleFertilizerFormProps {
  plantId: string;
  needsFertilizer: boolean;
  nextFertilizerAt?: Date | string | null;
  fertilizerNotes?: string | null;
}

function getDefaultSaturdayInput(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  return toInputDate(nextSaturday);
}

export function ScheduleFertilizerForm({
  plantId,
  needsFertilizer,
  nextFertilizerAt,
  fertilizerNotes,
}: ScheduleFertilizerFormProps) {
  const router = useRouter();
  const defaultDate = useMemo(() => getDefaultSaturdayInput(), []);
  const [nextDate, setNextDate] = useState(
    nextFertilizerAt ? toInputDate(nextFertilizerAt) : defaultDate,
  );
  const [notes, setNotes] = useState(fertilizerNotes?.trim() || "");
  const [saving, setSaving] = useState(false);

  async function handleSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      const response = await fetch(`/api/plants/${plantId}/fertilizer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextFertilizerAt: nextDate,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Error al programar");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo programar el fertilizante",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    try {
      setSaving(true);
      const response = await fetch(`/api/plants/${plantId}/fertilizer`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al cancelar");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo cancelar el recordatorio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <h2 className="font-semibold text-amber-950">Programar fertilizante</h2>
      <p className="mt-1 text-sm text-amber-900/70">
        Cuando creas que hace falta, elegí una fecha. Por defecto se sugiere el
        próximo sábado.
      </p>

      {needsFertilizer && nextFertilizerAt && (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-amber-950">
          Pendiente para{" "}
          {new Date(nextFertilizerAt).toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
          {fertilizerNotes ? ` · ${fertilizerNotes}` : ""}
        </p>
      )}

      <form onSubmit={handleSchedule} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-amber-950">
            Próximo fertilizante
          </span>
          <input
            type="date"
            required
            value={nextDate}
            onChange={(event) => setNextDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-3 text-base outline-none ring-amber-400 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-amber-950">
            Producto o nota (opcional)
          </span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-3 text-base outline-none ring-amber-400 focus:ring-2"
            placeholder="Ej. humus líquido, guano..."
          />
        </label>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saving
              ? "Guardando..."
              : needsFertilizer
                ? "Actualizar recordatorio"
                : "Programar fertilizante"}
          </button>
          {needsFertilizer && (
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="w-full rounded-xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Quitar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
