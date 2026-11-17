"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { FrostGroupsEditor } from "@/components/FrostGroupsEditor";
import { PlantCard } from "@/components/PlantCard";
import { SoilPhGroupsEditor } from "@/components/SoilPhGroupsEditor";
import { StatusGroupsList } from "@/components/StatusGroupsList";
import { WaterIntervalGroups } from "@/components/WaterIntervalGroups";
import {
  FROST_CATEGORIES,
  FROST_CATEGORY_STYLE,
} from "@/lib/frost";
import {
  buildFrostViewsForList,
  buildSoilPhViewsForList,
  buildStatusGroupsForList,
  parsePlantListGroupParam,
  plantListGroupToParam,
  PLANT_LIST_GROUP_LABELS,
  PLANT_LIST_GROUP_MODES,
  readStoredPlantListGroupMode,
  readStoredWaterSeason,
  SOIL_PH_LEGEND,
  waterPlantsForList,
  writeStoredPlantListGroupMode,
  writeStoredWaterSeason,
  type PlantListGroupMode,
} from "@/lib/plant-list-groups";
import { getEffectiveSeason } from "@/lib/schedule";
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
  initialGroupMode?: PlantListGroupMode | string;
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

function GroupLegend({
  items,
}: {
  items: ReadonlyArray<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-medium">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-emerald-950 shadow-sm"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function PlantsList({
  plants,
  lastGlobalRainAt,
  seasonOverride,
  initialGroupMode = "none",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSeason = getEffectiveSeason(new Date(), seasonOverride ?? null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [groupMode, setGroupMode] = useState<PlantListGroupMode>(() =>
    typeof initialGroupMode === "string"
      ? parsePlantListGroupParam(initialGroupMode)
      : initialGroupMode,
  );
  const [waterSeason, setWaterSeason] = useState<Season>(defaultSeason);

  useEffect(() => {
    const fromUrl = searchParams.get("agrupar");
    if (fromUrl != null) {
      const mode = parsePlantListGroupParam(fromUrl);
      setGroupMode(mode);
      writeStoredPlantListGroupMode(mode);
      return;
    }

    const stored = readStoredPlantListGroupMode();
    const fallback =
      typeof initialGroupMode === "string"
        ? parsePlantListGroupParam(initialGroupMode)
        : initialGroupMode;
    const mode = stored ?? fallback;
    setGroupMode(mode);
    if (mode !== "none") {
      const param = plantListGroupToParam(mode);
      if (param) {
        router.replace(`/plants?agrupar=${param}`, { scroll: false });
      }
    }
  }, [searchParams, initialGroupMode, router]);

  useEffect(() => {
    const stored = readStoredWaterSeason();
    if (stored) {
      setWaterSeason(stored);
    }
  }, []);

  const filteredFlat = useMemo(() => {
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

  const statusGroups = useMemo(
    () => buildStatusGroupsForList(plants),
    [plants],
  );
  const frostViews = useMemo(() => buildFrostViewsForList(plants), [plants]);
  const soilViews = useMemo(() => buildSoilPhViewsForList(plants), [plants]);
  const waterPlants = useMemo(() => waterPlantsForList(plants), [plants]);

  function updateGroupMode(next: PlantListGroupMode) {
    setGroupMode(next);
    writeStoredPlantListGroupMode(next);
    const param = plantListGroupToParam(next);
    const url = param ? `/plants?agrupar=${param}` : "/plants";
    router.replace(url, { scroll: false });
  }

  function updateWaterSeason(next: Season) {
    setWaterSeason(next);
    writeStoredWaterSeason(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-emerald-900/15 bg-white px-3 py-2 shadow-sm">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-emerald-800/70">
            Agrupar
          </span>
          <select
            value={groupMode}
            onChange={(event) =>
              updateGroupMode(event.target.value as PlantListGroupMode)
            }
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-emerald-950 outline-none"
          >
            {PLANT_LIST_GROUP_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {PLANT_LIST_GROUP_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>

        {groupMode === "water" ? (
          <div
            className="flex shrink-0 rounded-2xl border border-emerald-900/15 bg-white p-1 shadow-sm"
            role="group"
            aria-label="Estación del riego"
          >
            <button
              type="button"
              onClick={() => updateWaterSeason("summer")}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                waterSeason === "summer"
                  ? "bg-emerald-700 text-white"
                  : "text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              Verano
            </button>
            <button
              type="button"
              onClick={() => updateWaterSeason("winter")}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                waterSeason === "winter"
                  ? "bg-emerald-700 text-white"
                  : "text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              Invierno
            </button>
          </div>
        ) : null}
      </div>

      {groupMode === "none" ? (
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

          {filteredFlat.length === 0 ? (
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
                  {filteredFlat.length} de {plants.length}
                </p>
              ) : null}
              <section className="space-y-3">
                {filteredFlat.map((plant) => (
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
      ) : null}

      {groupMode === "status" ? (
        <StatusGroupsList groups={statusGroups} />
      ) : null}

      {groupMode === "water" ? (
        <WaterIntervalGroups
          plants={waterPlants}
          season={waterSeason}
          onSeasonChange={updateWaterSeason}
          embedded
          showSeasonToggle={false}
        />
      ) : null}

      {groupMode === "frost" ? (
        <div className="space-y-4">
          <GroupLegend
            items={FROST_CATEGORIES.map((category) => ({
              label: `${category} ${FROST_CATEGORY_STYLE[category].threshold}`,
              color: FROST_CATEGORY_STYLE[category].swatch,
            }))}
          />
          <FrostGroupsEditor groups={frostViews} />
        </div>
      ) : null}

      {groupMode === "soil" ? (
        <div className="space-y-4">
          <GroupLegend items={SOIL_PH_LEGEND} />
          <SoilPhGroupsEditor groups={soilViews} />
        </div>
      ) : null}
    </div>
  );
}
