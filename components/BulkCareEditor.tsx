"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import { MasterSelectCheckbox } from "@/components/ListSelectHeader";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { withBasePath } from "@/lib/base-path";
import { toInputDate } from "@/lib/format";
import { matchesPlantSearch } from "@/lib/plant-search";
import {
  PEST_TREATMENT_TYPES,
  TREATMENT_TYPE_LABELS,
  type TreatmentType,
} from "@/lib/treatments";

export type BulkCarePlant = {
  id: string;
  name: string;
  status: string;
  needsFertilizer: boolean;
  needsPruning: boolean;
  needsPest: boolean;
};

type CareKind = "fertilizer" | "prune" | "pest";

const CARE_OPTIONS: Array<{
  kind: CareKind;
  label: string;
  icon: ActionIconName;
}> = [
  { kind: "fertilizer", label: "Fertilizante", icon: "fertilizante" },
  { kind: "prune", label: "Poda", icon: "poda" },
  { kind: "pest", label: "Tratamiento", icon: "tratamiento-plagas" },
];

function pendingHint(plant: BulkCarePlant, kind: CareKind): string | null {
  if (kind === "fertilizer" && plant.needsFertilizer) return "Pendiente";
  if (kind === "prune" && plant.needsPruning) return "Pendiente";
  if (kind === "pest" && plant.needsPest) return "Pendiente";
  return null;
}

export function BulkCareEditor({ plants }: { plants: BulkCarePlant[] }) {
  const router = useRouter();
  const [careKind, setCareKind] = useState<CareKind>("fertilizer");
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [happenedAt, setHappenedAt] = useState(() => toInputDate(new Date()));
  const [notes, setNotes] = useState("");
  const [treatmentType, setTreatmentType] =
    useState<TreatmentType>("anti-bichos");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredPlants = useMemo(
    () => plants.filter((plant) => matchesPlantSearch(plant.name, query)),
    [plants, query],
  );

  const visibleIds = useMemo(
    () => filteredPlants.map((plant) => plant.id),
    [filteredPlants],
  );

  const visibleSelectedCount = useMemo(
    () => visibleIds.filter((id) => selected.has(id)).length,
    [visibleIds, selected],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  function toggleEditing() {
    setMessage(null);
    if (editing) {
      setEditing(false);
      setSelected(new Set());
      return;
    }
    setEditing(true);
  }

  function togglePlant(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((current) => {
        const next = new Set(current);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  }

  async function applyCare() {
    if (selected.size === 0) {
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      const response = await fetch(withBasePath("/api/plants/care-bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantIds: [...selected],
          action: careKind,
          happenedAt,
          notes: notes.trim() || undefined,
          treatmentType: careKind === "pest" ? treatmentType : undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        updated?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar");
      }
      const count = payload.updated ?? selected.size;
      setEditing(false);
      setSelected(new Set());
      setNotes("");
      setMessage(
        `Listo: ${count} planta${count === 1 ? "" : "s"} actualizada${count === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  if (plants.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
        <p className="font-semibold text-emerald-950">Todavía no hay plantas</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CARE_OPTIONS.map((option) => {
          const active = careKind === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              disabled={busy}
              onClick={() => {
                setCareKind(option.kind);
                setSelected(new Set());
                setMessage(null);
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                active
                  ? "bg-emerald-700 text-white"
                  : "border border-emerald-900/15 bg-white text-emerald-950 hover:bg-emerald-50"
              }`}
            >
              <ActionIcon name={option.icon} size={28} alt="" />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleEditing}
          disabled={busy}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            editing
              ? "border border-emerald-900/15 bg-white text-emerald-950 hover:bg-emerald-50"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
        >
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>

      {message ? (
        <p className="text-sm font-medium text-emerald-900">{message}</p>
      ) : null}

      {editing ? (
        <section className="sticky top-2 z-10 space-y-3 rounded-2xl border border-emerald-900/10 bg-white/95 p-3 shadow-md backdrop-blur">
          <label className="block text-sm text-emerald-950">
            <span className="mb-1 block font-medium">Fecha</span>
            <input
              type="date"
              value={happenedAt}
              max={toInputDate(new Date())}
              onChange={(event) => setHappenedAt(event.target.value)}
              className="w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm"
            />
          </label>

          {careKind === "pest" ? (
            <div className="flex flex-wrap gap-2">
              {PEST_TREATMENT_TYPES.map((type) => {
                const active = treatmentType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={busy}
                    onClick={() => setTreatmentType(type)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-emerald-900/15 bg-emerald-50 text-emerald-950"
                    }`}
                  >
                    {TREATMENT_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          ) : null}

          <label className="block text-sm text-emerald-950">
            <span className="mb-1 block font-medium">
              Nota (opcional)
            </span>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                careKind === "fertilizer"
                  ? "Ej. mismo fertilizante para rosales"
                  : careKind === "prune"
                    ? "Ej. poda de verano"
                    : "Ej. mismo producto"
              }
              className="w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => void applyCare()}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy
              ? "Guardando…"
              : `Registrar en ${selected.size || "…"} planta${selected.size === 1 ? "" : "s"}`}
          </button>
        </section>
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar planta…"
        className="w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm text-emerald-950"
      />

      {editing ? (
        <MasterSelectCheckbox
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected}
          disabled={busy || visibleIds.length === 0}
          label={`${selected.size} seleccionada${selected.size === 1 ? "" : "s"}`}
          onChange={toggleAllVisible}
        />
      ) : null}

      {filteredPlants.length === 0 ? (
        <p className="text-sm text-emerald-900/70">
          No hay plantas que coincidan con “{query.trim()}”.
        </p>
      ) : null}

      <ul className="space-y-2">
        {filteredPlants.map((plant) => {
          const pending = pendingHint(plant, careKind);
          const isSelected = selected.has(plant.id);

          if (editing) {
            return (
              <li key={plant.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => togglePlant(plant.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium text-emerald-950 transition disabled:opacity-60 ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-700/15 ring-2 ring-emerald-600"
                      : "border-emerald-900/10 bg-white hover:bg-emerald-50"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
                      isSelected
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-emerald-900/25 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate">{plant.name}</span>
                  {pending ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                      {pending}
                    </span>
                  ) : null}
                  {plant.status !== "alta" ? (
                    <PlantStatusBadge status={plant.status} />
                  ) : null}
                </button>
              </li>
            );
          }

          return (
            <li key={plant.id}>
              <Link
                href={`/plants/${plant.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-emerald-900/10 bg-white px-3 py-3 text-sm font-medium text-emerald-950 hover:bg-emerald-50"
              >
                <span className="min-w-0 truncate">{plant.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {pending ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">
                      {pending}
                    </span>
                  ) : null}
                  {plant.status !== "alta" ? (
                    <PlantStatusBadge status={plant.status} />
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
