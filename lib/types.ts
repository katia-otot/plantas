import type { PlantTreatment } from "@/lib/treatments";

export type CareEventType =
  | "watering"
  | "rain_skip"
  | "water_scheduled"
  | "fertilizer"
  | "fertilizer_scheduled"
  | "prune"
  | "prune_scheduled"
  | "pest"
  | "pest_scheduled"
  | "note";

export type Season = "summer" | "winter";

export type DueStatus = "ok" | "due" | "overdue";

export type TaskType = "water" | "fertilizer" | "prune" | "pest";

/** Plant lifecycle in the patio collection. */
export const PLANT_STATUSES = ["alta", "baja", "posible"] as const;
export type PlantStatus = (typeof PLANT_STATUSES)[number];

/** Only `alta` plants appear in Hoy / rain / upcoming cares. */
export const ACTIVE_PLANT_STATUS: PlantStatus = "alta";

export const PLANT_STATUS_LABELS: Record<PlantStatus, string> = {
  alta: "Alta",
  baja: "Baja",
  posible: "Posible",
};

export function isPlantStatus(value: unknown): value is PlantStatus {
  return (
    typeof value === "string" &&
    (PLANT_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizePlantStatus(value: unknown): PlantStatus {
  if (typeof value !== "string") {
    return ACTIVE_PLANT_STATUS;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (
    normalized === "alta" ||
    normalized === "activa" ||
    normalized === "active" ||
    normalized === "vivo" ||
    normalized === "viva"
  ) {
    return "alta";
  }

  if (
    normalized === "baja" ||
    normalized === "muerta" ||
    normalized === "muerto" ||
    normalized === "removed" ||
    normalized === "inactive" ||
    normalized === "inactiva"
  ) {
    return "baja";
  }

  if (
    normalized === "posible" ||
    normalized === "candidata" ||
    normalized === "candidato" ||
    normalized === "wishlist" ||
    normalized === "futura" ||
    normalized === "future"
  ) {
    return "posible";
  }

  return ACTIVE_PLANT_STATUS;
}

export function isActivePlantStatus(status: string | null | undefined): boolean {
  return (status ?? ACTIVE_PLANT_STATUS) === ACTIVE_PLANT_STATUS;
}

export interface PlantTask {
  plantId: string;
  plantName: string;
  taskType: TaskType;
  dueAt: string;
  status: DueStatus;
  coverPhotoPath: string | null;
  careTreatments: PlantTreatment[];
  schedule: {
    nextWateredAt: string | null;
    needsFertilizer: boolean;
    nextFertilizerAt: string | null;
    fertilizerNotes: string | null;
    needsPruning: boolean;
    nextPruneAt: string | null;
    pruneNotes: string | null;
    needsPest: boolean;
    nextPestAt: string | null;
    pestNotes: string | null;
    treatmentType: string | null;
  };
}

export const EVENT_LABELS: Record<CareEventType, string> = {
  watering: "Riego",
  rain_skip: "Lluvia",
  water_scheduled: "Riego programado",
  fertilizer: "Fertilizante",
  fertilizer_scheduled: "Fertilizante programado",
  prune: "Poda",
  prune_scheduled: "Poda programada",
  pest: "Tratamiento",
  pest_scheduled: "Tratamiento programado",
  note: "Nota",
};

export const TASK_LABELS: Record<TaskType, string> = {
  water: "Riego",
  fertilizer: "Fertilizante",
  prune: "Poda",
  pest: "Tratamiento",
};
