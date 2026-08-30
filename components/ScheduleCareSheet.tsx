"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import { getDefaultSaturdayInput } from "@/lib/care-schedule";
import { toInputDate } from "@/lib/format";
import { withBasePath } from "@/lib/base-path";
import {
  PEST_TREATMENT_TYPES,
  TREATMENT_TYPE_LABELS,
  formatTreatmentActionNote,
  getDefaultProductForTreatment,
  getTreatmentByType,
  getTreatmentLabel,
  isPestTreatmentType,
  type PlantTreatment,
  type TreatmentType,
} from "@/lib/treatments";

export type ScheduleCareKind = "water" | "fertilizer" | "prune" | "treatment";

const NEW_TREATMENT_OPTION = "new";

type Props = {
  open: boolean;
  kind: ScheduleCareKind | null;
  plantId: string;
  careTreatments: PlantTreatment[];
  nextWateredAt?: string | Date | null;
  needsFertilizer?: boolean;
  nextFertilizerAt?: string | Date | null;
  fertilizerNotes?: string | null;
  needsPruning?: boolean;
  nextPruneAt?: string | Date | null;
  pruneNotes?: string | null;
  needsPest?: boolean;
  nextPestAt?: string | Date | null;
  pestNotes?: string | null;
  treatmentType?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

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

export function ScheduleCareSheet({
  open,
  kind,
  plantId,
  careTreatments,
  nextWateredAt = null,
  needsFertilizer = false,
  nextFertilizerAt = null,
  fertilizerNotes = null,
  needsPruning = false,
  nextPruneAt = null,
  pruneNotes = null,
  needsPest = false,
  nextPestAt = null,
  pestNotes = null,
  treatmentType = null,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const defaultDate = useMemo(() => getDefaultSaturdayInput(), []);
  const fertilizerTreatment = useMemo(
    () => getTreatmentByType(careTreatments, "fertilizante"),
    [careTreatments],
  );
  const pruneTreatment = useMemo(
    () => getTreatmentByType(careTreatments, "poda"),
    [careTreatments],
  );
  const pestTreatments = useMemo(
    () =>
      careTreatments.filter((treatment) => isPestTreatmentType(treatment.type)),
    [careTreatments],
  );

  const [nextDate, setNextDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [productName, setProductName] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTreatmentType, setNewTreatmentType] =
    useState<TreatmentType>("anti-bichos");
  const [newTreatmentLabel, setNewTreatmentLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !kind) {
      return;
    }

    if (kind === "water") {
      setNextDate(nextWateredAt ? toInputDate(nextWateredAt) : defaultDate);
      setNotes("");
      setProductName("");
      setCreatingNew(false);
    } else if (kind === "fertilizer") {
      setNextDate(
        nextFertilizerAt ? toInputDate(nextFertilizerAt) : defaultDate,
      );
      setProductName(
        fertilizerNotes?.trim() ||
          (fertilizerTreatment
            ? getDefaultProductForTreatment(fertilizerTreatment)
            : ""),
      );
      setCreatingNew(false);
    } else if (kind === "prune") {
      setNextDate(nextPruneAt ? toInputDate(nextPruneAt) : defaultDate);
      setNotes(
        pruneNotes?.trim() ||
          (pruneTreatment
            ? getDefaultProductForTreatment(pruneTreatment)
            : ""),
      );
      setCreatingNew(false);
    } else {
      setNextDate(nextPestAt ? toInputDate(nextPestAt) : defaultDate);
      setNewTreatmentType("anti-bichos");
      setNewTreatmentLabel("");
      if (pestTreatments.length === 0) {
        setCreatingNew(true);
        setSelectedIndex(0);
        setProductName("");
      } else {
        const index = findInitialTreatmentIndex(
          pestTreatments,
          treatmentType,
          pestNotes,
        );
        const selected = pestTreatments[index] ?? null;
        setCreatingNew(false);
        setSelectedIndex(index);
        setProductName(
          pestNotes?.trim() ||
            (selected ? getDefaultProductForTreatment(selected) : ""),
        );
      }
    }
  }, [
    open,
    kind,
    defaultDate,
    nextWateredAt,
    nextFertilizerAt,
    fertilizerNotes,
    fertilizerTreatment,
    nextPruneAt,
    pruneNotes,
    pruneTreatment,
    nextPestAt,
    pestNotes,
    treatmentType,
    pestTreatments,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open || !kind) {
    return null;
  }

  const selectedTreatment =
    !creatingNew && kind === "treatment"
      ? (pestTreatments[selectedIndex] ?? null)
      : null;
  const titles: Record<ScheduleCareKind, string> = {
    water: "Programar riego",
    fertilizer: "Programar fertilizante",
    prune: "Programar poda",
    treatment: "Programar tratamiento",
  };
  const titleIcons: Record<ScheduleCareKind, ActionIconName> = {
    water: "regar",
    fertilizer: "fertilizante",
    prune: "poda",
    treatment: "tratamiento-plagas",
  };

  async function handleSave() {
    try {
      setSaving(true);

      if (kind === "water") {
        const response = await fetch(
          withBasePath(`/api/plants/${plantId}/water`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nextWateredAt: nextDate,
            }),
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Error al programar");
        }
      } else if (kind === "fertilizer") {
        const resolvedProduct =
          productName.trim() ||
          (fertilizerTreatment
            ? getDefaultProductForTreatment(fertilizerTreatment)
            : "");
        const response = await fetch(
          withBasePath(`/api/plants/${plantId}/fertilizer`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nextFertilizerAt: nextDate,
              notes: resolvedProduct || null,
            }),
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Error al programar");
        }
      } else if (kind === "prune") {
        const response = await fetch(
          withBasePath(`/api/plants/${plantId}/prune`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nextPruneAt: nextDate,
              notes: notes.trim() || null,
            }),
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Error al programar");
        }
      } else {
        let treatmentType: TreatmentType;
        let treatmentLabel: string | null;
        let resolvedProduct: string;

        if (creatingNew) {
          treatmentType = newTreatmentType;
          resolvedProduct = productName.trim();
          if (!resolvedProduct) {
            alert("Indicá el producto del tratamiento");
            return;
          }
          if (treatmentType === "otro") {
            treatmentLabel =
              newTreatmentLabel.trim() || resolvedProduct;
          } else {
            treatmentLabel = null;
          }
        } else {
          if (!selectedTreatment) {
            alert("Elegí un tratamiento o creá uno nuevo");
            return;
          }
          treatmentType = selectedTreatment.type;
          resolvedProduct =
            productName.trim() ||
            getDefaultProductForTreatment(selectedTreatment);
          if (selectedTreatment.type === "otro" && !resolvedProduct) {
            alert("Elegí un producto para este tratamiento");
            return;
          }
          treatmentLabel =
            selectedTreatment.type === "otro"
              ? getTreatmentLabel(selectedTreatment)
              : null;
        }

        const response = await fetch(
          withBasePath(`/api/plants/${plantId}/pest`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nextPestAt: nextDate,
              notes: resolvedProduct || null,
              treatmentType,
              treatmentLabel,
            }),
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Error al programar");
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el recordatorio",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelSchedule() {
    try {
      setSaving(true);
      const endpoint =
        kind === "water"
          ? "water"
          : kind === "fertilizer"
            ? "fertilizer"
            : kind === "prune"
              ? "prune"
              : "pest";
      const response = await fetch(
        withBasePath(`/api/plants/${plantId}/${endpoint}`),
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Error al cancelar");
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        kind === "water"
          ? "No se pudo restablecer el riego"
          : "No se pudo cancelar el recordatorio",
      );
    } finally {
      setSaving(false);
    }
  }

  const canCancel =
    (kind === "water" && Boolean(nextWateredAt)) ||
    (kind === "fertilizer" && needsFertilizer) ||
    (kind === "prune" && needsPruning) ||
    (kind === "treatment" && needsPest);

  const pendingLabel =
    kind === "treatment" && treatmentType
      ? (TREATMENT_TYPE_LABELS[treatmentType as TreatmentType] ??
        "Tratamiento")
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        disabled={saving}
        className="absolute inset-0 bg-emerald-950/40"
        onClick={() => {
          if (!saving) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-emerald-900/10 bg-white p-4 shadow-xl sm:rounded-2xl"
      >
        <h2
          id={titleId}
          className="flex items-center gap-3 text-base font-semibold text-emerald-950"
        >
          <ActionIcon name={titleIcons[kind]} size={44} alt="" />
          {titles[kind]}
        </h2>
        <p className="mt-1 text-sm text-emerald-900/70">
          {kind === "water"
            ? "Si no podés regar hoy, elegí cuándo vas a poder. Ese día aparece en Hoy."
            : kind === "treatment"
              ? "Elegí un tratamiento de la planta o creá uno nuevo y programalo acá."
              : "Elegí cuándo querés el recordatorio. Por defecto se sugiere el próximo sábado."}
        </p>

        {kind === "water" && nextWateredAt ? (
          <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-950">
            Próximo riego ahora:{" "}
            {new Date(nextWateredAt).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        ) : null}

        {kind === "fertilizer" && needsFertilizer && nextFertilizerAt ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Ya hay uno para{" "}
            {new Date(nextFertilizerAt).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
            {fertilizerNotes ? ` · ${fertilizerNotes}` : ""}
          </p>
        ) : null}

        {kind === "prune" && needsPruning && nextPruneAt ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Ya hay una para{" "}
            {new Date(nextPruneAt).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
            {pruneNotes ? ` · ${pruneNotes}` : ""}
          </p>
        ) : null}

        {kind === "treatment" && needsPest && nextPestAt ? (
          <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-950">
            Pendiente {pendingLabel?.toLowerCase() ?? "tratamiento"} para{" "}
            {new Date(nextPestAt).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
            {pestNotes ? ` · ${pestNotes}` : ""}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {kind === "treatment" ? (
            <>
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Tratamiento
                </span>
                <select
                  value={
                    creatingNew
                      ? NEW_TREATMENT_OPTION
                      : String(selectedIndex)
                  }
                  disabled={saving}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === NEW_TREATMENT_OPTION) {
                      setCreatingNew(true);
                      setProductName("");
                      setNewTreatmentLabel("");
                      return;
                    }
                    const index = Number(value);
                    const treatment = pestTreatments[index];
                    setCreatingNew(false);
                    setSelectedIndex(index);
                    setProductName(
                      treatment
                        ? getDefaultProductForTreatment(treatment)
                        : "",
                    );
                  }}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                >
                  {pestTreatments.map((treatment, index) => (
                    <option key={`${treatment.type}-${index}`} value={index}>
                      {getTreatmentLabel(treatment)}
                      {treatment.products.length > 0
                        ? ` (${treatment.products.join(", ")})`
                        : ""}
                    </option>
                  ))}
                  <option value={NEW_TREATMENT_OPTION}>
                    Nuevo tratamiento…
                  </option>
                </select>
              </label>

              {creatingNew ? (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-emerald-950">
                      Tipo
                    </span>
                    <select
                      value={newTreatmentType}
                      disabled={saving}
                      onChange={(event) => {
                        const type = event.target.value as TreatmentType;
                        setNewTreatmentType(type);
                        if (type !== "otro") {
                          setNewTreatmentLabel("");
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                    >
                      {PEST_TREATMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {TREATMENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {newTreatmentType === "otro" ? (
                    <label className="block">
                      <span className="text-sm font-medium text-emerald-950">
                        Nombre
                      </span>
                      <input
                        value={newTreatmentLabel}
                        disabled={saving}
                        onChange={(event) =>
                          setNewTreatmentLabel(event.target.value)
                        }
                        className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                        placeholder="Ej. aceite de neem"
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-sm font-medium text-emerald-950">
                      Producto
                    </span>
                    <input
                      value={productName}
                      disabled={saving}
                      required
                      onChange={(event) => setProductName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                      placeholder={
                        newTreatmentType === "anti-hongos"
                          ? "Ej. oxicloruro de cobre"
                          : newTreatmentType === "anti-bichos"
                            ? "Ej. jabón potásico"
                            : "Ej. aceite de canela"
                      }
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-emerald-950">Fecha</span>
            <input
              type="date"
              required
              value={nextDate}
              disabled={saving}
              onChange={(event) => setNextDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            />
          </label>

          {kind === "prune" ? (
            <label className="block">
              <span className="text-sm font-medium text-emerald-950">
                Descripción (opcional)
              </span>
              <textarea
                value={notes}
                disabled={saving}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                placeholder="Ej. sacar ramas secas, formar copa..."
              />
            </label>
          ) : null}

          {kind === "fertilizer" ? (
            fertilizerTreatment && fertilizerTreatment.products.length > 1 ? (
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Producto
                </span>
                <select
                  value={productName}
                  disabled={saving}
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                >
                  {fertilizerTreatment.products.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </label>
            ) : fertilizerTreatment &&
              fertilizerTreatment.products.length === 1 ? (
              <p className="text-sm text-emerald-900/70">
                Producto: {fertilizerTreatment.products[0]}
              </p>
            ) : (
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Producto o nota (opcional)
                </span>
                <input
                  value={productName}
                  disabled={saving}
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                  placeholder="Ej. humus líquido, guano..."
                />
              </label>
            )
          ) : null}

          {kind === "treatment" && selectedTreatment ? (
            selectedTreatment.products.length > 1 ? (
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Producto
                </span>
                <select
                  value={productName}
                  disabled={saving}
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                >
                  {selectedTreatment.products.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedTreatment.products.length === 1 ? (
              <p className="text-sm text-emerald-900/70">
                Producto: {selectedTreatment.products[0]}
              </p>
            ) : selectedTreatment.type === "otro" ? (
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Producto
                </span>
                <input
                  value={productName}
                  disabled={saving}
                  required
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                  placeholder="Ej. aceite de canela"
                />
              </label>
            ) : (
              <p className="text-sm text-emerald-900/70">
                Producto:{" "}
                {formatTreatmentActionNote(selectedTreatment) ||
                  selectedTreatment.products[0]}
              </p>
            )
          ) : null}

          <button
            type="button"
            disabled={
              saving ||
              (kind === "treatment" &&
                creatingNew &&
                !productName.trim())
            }
            onClick={() => void handleSave()}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving
              ? "..."
              : canCancel
                ? "Actualizar recordatorio"
                : creatingNew && kind === "treatment"
                  ? "Crear y programar"
                  : "Programar"}
          </button>

          {canCancel ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleCancelSchedule()}
              className="w-full rounded-xl border border-emerald-900/15 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
            >
              {kind === "water"
                ? "Volver al intervalo automático"
                : "Quitar recordatorio"}
            </button>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
