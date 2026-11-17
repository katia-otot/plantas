import {
  formatFrostValue,
  frostGroupCategory,
  frostSortKey,
  frostStyle,
  parseFrostValue,
  type FrostValue,
} from "@/lib/frost";
import {
  formatSoilPhValue,
  parseSoilPhValue,
  soilPhGroupCategory,
  soilPhSortKey,
  soilPhStyle,
  SOIL_PH_LABELS,
  type SoilPhValue,
} from "@/lib/soil-ph";
import {
  isActivePlantStatus,
  normalizePlantStatus,
  PLANT_STATUS_LABELS,
  PLANT_STATUSES,
  type PlantStatus,
  type Season,
} from "@/lib/types";

export const PLANT_LIST_GROUP_MODES = [
  "none",
  "status",
  "water",
  "frost",
  "soil",
] as const;

export type PlantListGroupMode = (typeof PLANT_LIST_GROUP_MODES)[number];

export const PLANT_LIST_GROUP_LABELS: Record<PlantListGroupMode, string> = {
  none: "Sin agrupar",
  status: "Por estado",
  water: "Por riego",
  frost: "Heladas",
  soil: "pH del suelo",
};

/** URL `?agrupar=` values ↔ internal modes. */
const AGRUPAR_TO_MODE: Record<string, PlantListGroupMode> = {
  estado: "status",
  riego: "water",
  heladas: "frost",
  suelo: "soil",
  status: "status",
  water: "water",
  frost: "frost",
  soil: "soil",
  none: "none",
};

export function parsePlantListGroupParam(
  raw: string | string[] | undefined,
): PlantListGroupMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return "none";
  }
  return AGRUPAR_TO_MODE[value.trim().toLowerCase()] ?? "none";
}

export function plantListGroupToParam(mode: PlantListGroupMode): string | null {
  if (mode === "none") {
    return null;
  }
  if (mode === "status") {
    return "estado";
  }
  if (mode === "water") {
    return "riego";
  }
  if (mode === "frost") {
    return "heladas";
  }
  return "suelo";
}

const GROUP_MODE_STORAGE_KEY = "plantas.plants-list.agrupar";
const WATER_SEASON_STORAGE_KEY = "plantas.plants-list.water-season";

export function readStoredPlantListGroupMode(): PlantListGroupMode | null {
  try {
    const raw = window.localStorage.getItem(GROUP_MODE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parsePlantListGroupParam(raw);
  } catch {
    return null;
  }
}

export function writeStoredPlantListGroupMode(mode: PlantListGroupMode) {
  try {
    window.localStorage.setItem(
      GROUP_MODE_STORAGE_KEY,
      plantListGroupToParam(mode) ?? "none",
    );
  } catch {
    // private mode / quota
  }
}

export function readStoredWaterSeason(): Season | null {
  try {
    const raw = window.localStorage.getItem(WATER_SEASON_STORAGE_KEY);
    if (raw === "summer" || raw === "winter") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredWaterSeason(season: Season) {
  try {
    window.localStorage.setItem(WATER_SEASON_STORAGE_KEY, season);
  } catch {
    // private mode / quota
  }
}

export type PlantListGroupItem = {
  id: string;
  name: string;
  status?: string | null;
  coverPhotoPath?: string | null;
  quantity?: number;
  frostResistance?: string | null;
  soilType?: string | null;
  waterSummerDays: number;
  waterWinterDays: number;
  isIndoor?: boolean;
};

export type PlantListGroup = {
  key: string;
  label: string;
  sectionClass: string;
  badgeClass: string;
  swatch: string | null;
  items: PlantListGroupItem[];
};

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

function groupByStatus(plants: PlantListGroupItem[]): PlantListGroup[] {
  return PLANT_STATUSES.map((status: PlantStatus) => {
    const items = sortByName(
      plants.filter(
        (plant) => normalizePlantStatus(plant.status) === status,
      ),
    );
    return {
      key: status,
      label: PLANT_STATUS_LABELS[status],
      sectionClass: "border-emerald-900/10 bg-white",
      badgeClass: "bg-emerald-100 text-emerald-900",
      swatch: null,
      items,
    };
  }).filter((group) => group.items.length > 0);
}

function groupByWater(
  plants: PlantListGroupItem[],
  season: Season,
): PlantListGroup[] {
  const active = plants.filter((plant) =>
    isActivePlantStatus(normalizePlantStatus(plant.status)),
  );
  const map = new Map<number, PlantListGroupItem[]>();

  for (const plant of active) {
    const days =
      season === "summer" ? plant.waterSummerDays : plant.waterWinterDays;
    const list = map.get(days);
    if (list) {
      list.push(plant);
    } else {
      map.set(days, [plant]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([days, items]) => ({
      key: `d${days}`,
      label: `Cada ${days} día${days === 1 ? "" : "s"}`,
      sectionClass: "border-emerald-900/10 bg-white",
      badgeClass: "bg-emerald-100 text-emerald-900",
      swatch: null,
      items: sortByName(items),
    }));
}

function groupByFrost(plants: PlantListGroupItem[]): PlantListGroup[] {
  const eligible = plants.filter((plant) => {
    const status = normalizePlantStatus(plant.status);
    return status === "alta" || status === "posible";
  });

  const groups = new Map<
    string,
    {
      label: string;
      style: ReturnType<typeof frostStyle>;
      sort: [number, number, string];
      items: PlantListGroupItem[];
    }
  >();

  for (const plant of eligible) {
    const parsed = parseFrostValue(plant.frostResistance);
    const category = frostGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ?? "Sin tipificar";
    const representative: FrostValue | null = category
      ? { kind: "category", category }
      : null;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(plant);
    } else {
      groups.set(key, {
        label,
        style: frostStyle(representative ?? parsed),
        sort: frostSortKey(representative ?? parsed),
        items: [plant],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const da = a.sort[0] - b.sort[0];
      if (da !== 0) return da;
      const db = a.sort[1] - b.sort[1];
      if (db !== 0) return db;
      return a.sort[2].localeCompare(b.sort[2], "es");
    })
    .map((group) => ({
      key: group.label,
      label: group.label,
      sectionClass: group.style.section,
      badgeClass: group.style.badge,
      swatch: group.style.swatch,
      items: sortByName(group.items),
    }));
}

function groupBySoil(plants: PlantListGroupItem[]): PlantListGroup[] {
  const eligible = plants.filter((plant) => {
    const status = normalizePlantStatus(plant.status);
    return status === "alta" || status === "posible";
  });

  const groups = new Map<
    string,
    {
      label: string;
      style: ReturnType<typeof soilPhStyle>;
      sort: [number, number, string];
      items: PlantListGroupItem[];
    }
  >();

  for (const plant of eligible) {
    const parsed = parseSoilPhValue(plant.soilType);
    const category = soilPhGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ? SOIL_PH_LABELS[category] : "Sin tipificar";
    const representative: SoilPhValue | null = category
      ? { kind: "category", category }
      : null;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(plant);
    } else {
      groups.set(key, {
        label,
        style: soilPhStyle(representative ?? parsed),
        sort: soilPhSortKey(representative ?? parsed),
        items: [plant],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const da = a.sort[0] - b.sort[0];
      if (da !== 0) return da;
      const db = a.sort[1] - b.sort[1];
      if (db !== 0) return db;
      return a.sort[2].localeCompare(b.sort[2], "es");
    })
    .map((group) => ({
      key: group.label,
      label: group.label,
      sectionClass: group.style.section,
      badgeClass: group.style.badge,
      swatch: group.style.swatch,
      items: sortByName(group.items),
    }));
}

export function groupPlantsForList(
  plants: PlantListGroupItem[],
  mode: PlantListGroupMode,
  waterSeason: Season,
): PlantListGroup[] {
  if (mode === "none") {
    return [];
  }
  if (mode === "status") {
    return groupByStatus(plants);
  }
  if (mode === "water") {
    return groupByWater(plants, waterSeason);
  }
  if (mode === "frost") {
    return groupByFrost(plants);
  }
  return groupBySoil(plants);
}

/** Shapes matching StatusGroupsList / FrostGroupsEditor / SoilPhGroupsEditor. */

export function buildStatusGroupsForList(plants: PlantListGroupItem[]) {
  return PLANT_STATUSES.map((status: PlantStatus) => ({
    status,
    items: sortByName(
      plants
        .filter((plant) => normalizePlantStatus(plant.status) === status)
        .map((plant) => ({
          id: plant.id,
          name: plant.name,
          quantity: plant.quantity ?? 1,
          coverPhotoPath: plant.coverPhotoPath ?? null,
        })),
    ),
  }));
}

export function buildFrostViewsForList(plants: PlantListGroupItem[]) {
  const eligible = plants.filter((plant) => {
    const status = normalizePlantStatus(plant.status);
    return status === "alta" || status === "posible";
  });

  const groups = new Map<
    string,
    {
      label: string;
      style: ReturnType<typeof frostStyle>;
      sort: [number, number, string];
      items: Array<{
        id: string;
        name: string;
        status: string;
        detail: string | null;
      }>;
    }
  >();

  for (const plant of eligible) {
    const parsed = parseFrostValue(plant.frostResistance);
    const category = frostGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ?? "Sin tipificar";
    const representative: FrostValue | null = category
      ? { kind: "category", category }
      : null;
    const detail =
      parsed?.kind === "celsius" ? formatFrostValue(parsed) : null;
    const item = {
      id: plant.id,
      name: plant.name,
      status: normalizePlantStatus(plant.status),
      detail,
    };
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        label,
        style: frostStyle(representative ?? parsed),
        sort: frostSortKey(representative ?? parsed),
        items: [item],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const da = a.sort[0] - b.sort[0];
      if (da !== 0) return da;
      const db = a.sort[1] - b.sort[1];
      if (db !== 0) return db;
      return a.sort[2].localeCompare(b.sort[2], "es");
    })
    .map((group) => ({
      label: group.label,
      sectionClass: group.style.section,
      badgeClass: group.style.badge,
      swatch: group.style.swatch,
      items: sortByName(group.items),
    }));
}

export function buildSoilPhViewsForList(plants: PlantListGroupItem[]) {
  const eligible = plants.filter((plant) => {
    const status = normalizePlantStatus(plant.status);
    return status === "alta" || status === "posible";
  });

  const groups = new Map<
    string,
    {
      label: string;
      style: ReturnType<typeof soilPhStyle>;
      sort: [number, number, string];
      items: Array<{
        id: string;
        name: string;
        status: string;
        detail: string | null;
      }>;
    }
  >();

  for (const plant of eligible) {
    const parsed = parseSoilPhValue(plant.soilType);
    const category = soilPhGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ? SOIL_PH_LABELS[category] : "Sin tipificar";
    const representative: SoilPhValue | null = category
      ? { kind: "category", category }
      : null;
    const detail = parsed?.kind === "ph" ? formatSoilPhValue(parsed) : null;
    const item = {
      id: plant.id,
      name: plant.name,
      status: normalizePlantStatus(plant.status),
      detail,
    };
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        label,
        style: soilPhStyle(representative ?? parsed),
        sort: soilPhSortKey(representative ?? parsed),
        items: [item],
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => {
      const da = a.sort[0] - b.sort[0];
      if (da !== 0) return da;
      const db = a.sort[1] - b.sort[1];
      if (db !== 0) return db;
      return a.sort[2].localeCompare(b.sort[2], "es");
    })
    .map((group) => ({
      label: group.label,
      sectionClass: group.style.section,
      badgeClass: group.style.badge,
      swatch: group.style.swatch,
      items: sortByName(group.items),
    }));
}

export function waterPlantsForList(plants: PlantListGroupItem[]) {
  return sortByName(
    plants.filter((plant) =>
      isActivePlantStatus(normalizePlantStatus(plant.status)),
    ),
  ).map((plant) => ({
    id: plant.id,
    name: plant.name,
    quantity: plant.quantity ?? 1,
    coverPhotoPath: plant.coverPhotoPath ?? null,
    waterSummerDays: plant.waterSummerDays,
    waterWinterDays: plant.waterWinterDays,
    isIndoor: plant.isIndoor ?? false,
  }));
}

export const SOIL_PH_LEGEND = [
  { label: "Ácido <6.25", color: "#e74c3c" },
  { label: "Lev. ácido <6.75", color: "#f39c12" },
  { label: "Neutro <7.25", color: "#c0ca33" },
  { label: "Lev. alcalino ≥7.25", color: "#1abc9c" },
] as const;
