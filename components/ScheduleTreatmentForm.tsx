"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toInputDate } from "@/lib/format";
import { withBasePath } from "@/lib/base-path";
import {
  TREATMENT_TYPE_LABELS,
  formatTreatmentActionNote,
  getDefaultProductForTreatment,
  getTreatmentLabel,
  type PlantTreatment,
  type TreatmentType,
} from "@/lib/treatments";

interface ScheduleTreatmentFormProps {
  plantId: string;
  needsPest: boolean;
  nextPestAt?: Date | string | null;
  pestNotes?: string | null;
  treatmentType?: string | null;
  careTreatments: PlantTreatment[];
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

function findInitialTreatmentIndex(
  treatments: PlantTreatment[],
  initialType?: string | null,
  pestNotes?: string | null,
): number {
  if (treatments.length === 0) {
    return 0;
  }

  const normalizedNotes = pestNotes?.trim().toLowerCase();

  if (initialType) {
    const byType = treatments.findIndex((treatment) => {
      if (treatment.type !== initialType) {
        return false;
      }

      if (!normalizedNotes) {
        return true;
      }

      return treatment.products.some(
        (product) => product.toLowerCase() === normalizedNotes,
      );
    });

    if (byType >= 0) {
      return byType;
    }
  }

  return 0;
}

export function ScheduleTreatmentForm({
  plantId,
  needsPest,
  nextPestAt,
  pestNotes,
  treatmentType: initialType,
  careTreatments,
}: ScheduleTreatmentFormProps) {
  const router = useRouter();
  const defaultDate = useMemo(() => getDefaultSaturdayInput(), []);
  const initialIndex = useMemo(
    () => findInitialTreatmentIndex(careTreatments, initialType, pestNotes),
    [careTreatments, initialType, pestNotes],
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const selectedTreatment = careTreatments[selectedIndex] ?? null;
  const [productName, setProductName] = useState(
    () =>
      pestNotes?.trim() ||
      (selectedTreatment ? getDefaultProductForTreatment(selectedTreatment) : ""),
  );
  const [nextDate, setNextDate] = useState(
    nextPestAt ? toInputDate(nextPestAt) : defaultDate,
  );
  const [saving, setSaving] = useState(false);

  function handleTreatmentChange(index: number) {
    const treatment = careTreatments[index];
    setSelectedIndex(index);
    setProductName(getDefaultProductForTreatment(treatment));
  }

  async function handleSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTreatment) {
      alert("Agregá tratamientos en editar planta primero");
      return;
    }

    const resolvedProduct =
      productName.trim() ||
      getDefaultProductForTreatment(selectedTreatment);

    if (selectedTreatment.type === "otro" && !resolvedProduct) {
      alert("Elegí un producto para este tratamiento");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(withBasePath(`/api/plants/${plantId}/pest`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextPestAt: nextDate,
          notes: resolvedProduct || null,
          treatmentType: selectedTreatment.type,
          treatmentLabel:
            selectedTreatment.type === "otro"
              ? getTreatmentLabel(selectedTreatment)
              : null,
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
          : "No se pudo programar el tratamiento",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    try {
      setSaving(true);
      const response = await fetch(withBasePath(`/api/plants/${plantId}/pest`), {
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

  const pendingLabel = initialType
    ? TREATMENT_TYPE_LABELS[initialType as TreatmentType] ?? "Tratamiento"
    : "Tratamiento";

  if (careTreatments.length === 0) {
    return (
      <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
        <h2 className="font-semibold text-orange-950">Programar tratamiento</h2>
        <p className="mt-2 text-sm text-orange-900/70">
          Primero cargá tratamientos en editar planta (anti-bichos, anti-hongos
          u otro).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 shadow-sm">
      <h2 className="font-semibold text-orange-950">Programar tratamiento</h2>
      <p className="mt-1 text-sm text-orange-900/70">
        Elegí uno de los tratamientos cargados para esta planta. Por defecto se
        sugiere el próximo sábado.
      </p>

      {needsPest && nextPestAt && (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-orange-950">
          Pendiente {pendingLabel.toLowerCase()} para{" "}
          {new Date(nextPestAt).toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
          {pestNotes ? ` · ${pestNotes}` : ""}
        </p>
      )}

      <form onSubmit={handleSchedule} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-orange-950">Tratamiento</span>
          <select
            value={selectedIndex}
            onChange={(event) =>
              handleTreatmentChange(Number(event.target.value))
            }
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-3 text-base outline-none ring-orange-400 focus:ring-2"
          >
            {careTreatments.map((treatment, index) => (
              <option key={`${treatment.type}-${index}`} value={index}>
                {getTreatmentLabel(treatment)}
                {treatment.products.length > 0
                  ? ` (${treatment.products.join(", ")})`
                  : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-orange-950">
            Próximo tratamiento
          </span>
          <input
            type="date"
            required
            value={nextDate}
            onChange={(event) => setNextDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-3 text-base outline-none ring-orange-400 focus:ring-2"
          />
        </label>

        {selectedTreatment && selectedTreatment.products.length > 1 ? (
          <label className="block">
            <span className="text-sm font-medium text-orange-950">Producto</span>
            <select
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-3 text-base outline-none ring-orange-400 focus:ring-2"
            >
              {selectedTreatment.products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </label>
        ) : selectedTreatment && selectedTreatment.products.length === 1 ? (
          <p className="text-sm text-orange-900/70">
            Producto: {selectedTreatment.products[0]}
          </p>
        ) : selectedTreatment?.type === "otro" ? (
          <label className="block">
            <span className="text-sm font-medium text-orange-950">Producto</span>
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-3 text-base outline-none ring-orange-400 focus:ring-2"
              placeholder="Ej. aceite de canela"
            />
          </label>
        ) : selectedTreatment ? (
          <p className="text-sm text-orange-900/70">
            Producto:{" "}
            {formatTreatmentActionNote(selectedTreatment) ||
              selectedTreatment.products[0]}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {saving
              ? "Guardando..."
              : needsPest
                ? "Actualizar recordatorio"
                : "Programar tratamiento"}
          </button>
          {needsPest && (
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="w-full rounded-xl border border-orange-300 px-4 py-3 text-sm font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-60"
            >
              Quitar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
