export type CareEventType =
  | "watering"
  | "rain_skip"
  | "fertilizer"
  | "fertilizer_scheduled"
  | "prune"
  | "pest"
  | "pest_scheduled"
  | "note";

export type Season = "summer" | "winter";

export type DueStatus = "ok" | "due" | "overdue";

export type TaskType = "water" | "fertilizer" | "prune" | "pest";

import type { PlantTreatment } from "@/lib/treatments";

export interface PlantTask {
  plantId: string;
  plantName: string;
  taskType: TaskType;
  dueAt: string;
  status: DueStatus;
  coverPhotoPath: string | null;
  careTreatments: PlantTreatment[];
}

export const EVENT_LABELS: Record<CareEventType, string> = {
  watering: "Riego",
  rain_skip: "Lluvia",
  fertilizer: "Fertilizante",
  fertilizer_scheduled: "Fertilizante programado",
  prune: "Poda",
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
