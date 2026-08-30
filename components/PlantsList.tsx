"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { PlantCard } from "@/components/PlantCard";
import type { Season } from "@/lib/types";

export type PlantsListItem = {
  id: string;
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  status?: string | null;
  quantity?: number;
  isIndoor?: boolean;
  bidones?: string | null;
  fertilizerNotes?: string | null;
  pruneNotes?: string | null;
  pestNotes?: string | null;
  careProducts?: string | null;
  treatmentType?: string | null;
  frostResistance?: string | null;
  soilType?: string | null;
  fertilizerType?: string | null;
  observations?: string | null;
  nextWateredAt: Date | string | null;
  lastFertilizedAt?: Date | string | null;
  needsFertilizer?: boolean;
  nextFertilizerAt?: Date | string | null;
  needsPruning?: boolean;
  nextPruneAt?: Date | string | null;
  needsPest?: boolean;
  nextPestAt?: Date | string | null;
  waterSummerDays: number;
  waterWinterDays: number;
  rainPostponeDays: number;
  lastWateredAt?: Date | string | null;
};

type Props = {
  plants: PlantsListItem[];
  lastGlobalRainAt?: Date | string | null;
  seasonOverride?: Season | null;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function plantHaystack(plant: PlantsListItem) {
  return normalize(
    [
      plant.name,
      plant.species,
      plant.location,
      plant.notes,
      plant.status,
      plant.isIndoor ? "interior" : "exterior patio",
      plant.bidones,
      plant.fertilizerNotes,
      plant.pruneNotes,
      plant.pestNotes,
      plant.careProducts,
      plant.treatmentType,
      plant.frostResistance,
      plant.soilType,
      plant.fertilizerType,
      plant.observations,
      plant.quantity != null ? `x${plant.quantity}` : null,
      plant.needsFertilizer ? "fertilizante" : null,
      plant.needsPruning ? "poda" : null,
      plant.needsPest ? "plagas tratamiento" : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function PlantsList({
  plants,
  lastGlobalRainAt,
  seasonOverride,
}: Props) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const terms = normalize(deferredQuery)
      .split(/\s+/)
      .filter(Boolean);
    if (terms.length === 0) {
      return plants;
    }
    return plants.filter((plant) => {
      const haystack = plantHaystack(plant);
      return terms.every((term) => haystack.includes(term));
    });
  }, [plants, deferredQuery]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Buscar plantas</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, ubicación, observaciones…"
          autoComplete="off"
          className="w-full rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 text-sm text-emerald-950 shadow-sm outline-none placeholder:text-emerald-900/45 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </label>

      {filtered.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <div className="flex justify-center">
            <ActionIcon name="planta" size={56} alt="" />
          </div>
          <p className="mt-3 font-semibold text-emerald-950">
            Ninguna planta coincide
          </p>
          <p className="mt-1 text-sm text-emerald-900/70">
            Probá con otro nombre, lugar o dato de la ficha.
          </p>
        </section>
      ) : (
        <>
          {query.trim() ? (
            <p className="text-sm text-emerald-900/70">
              {filtered.length} de {plants.length}
            </p>
          ) : null}
          <section className="space-y-3">
            {filtered.map((plant) => (
              <PlantCard
                key={plant.id}
                {...plant}
                lastGlobalRainAt={lastGlobalRainAt}
                seasonOverride={seasonOverride}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
