import { toInputDate } from "@/lib/format";
import type { ScheduleCareKind } from "@/lib/schedule-care-form";

export function getDefaultSaturdayInput(from = new Date()): string {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  return toInputDate(nextSaturday);
}

export function getTodayInput(from = new Date()): string {
  return toInputDate(from);
}

const LAST_CARE_DATE_PREFIX = "anthos:last-schedule-care-date:";

function careDateStorageKey(kind: Exclude<ScheduleCareKind, "water">): string {
  return `${LAST_CARE_DATE_PREFIX}${kind}`;
}

/** Last date chosen for fertilizer / prune / treatment in this browser tab. */
export function getRememberedScheduleCareDate(
  kind: Exclude<ScheduleCareKind, "water">,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.sessionStorage.getItem(careDateStorageKey(kind));
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberScheduleCareDate(
  kind: Exclude<ScheduleCareKind, "water">,
  date: string,
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }
  try {
    window.sessionStorage.setItem(careDateStorageKey(kind), date);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Hoy o anterior = ya hecho; futuro = queda pendiente en Hoy. */
export function isScheduleCareDateAlreadyDone(
  dateInput: string,
  todayInput = getTodayInput(),
): boolean {
  return Boolean(dateInput) && dateInput <= todayInput;
}

export type PlantCareSchedule = {
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

export function toPlantCareSchedule(plant: {
  nextWateredAt?: Date | string | null;
  needsFertilizer: boolean;
  nextFertilizerAt?: Date | string | null;
  fertilizerNotes?: string | null;
  needsPruning: boolean;
  nextPruneAt?: Date | string | null;
  pruneNotes?: string | null;
  needsPest: boolean;
  nextPestAt?: Date | string | null;
  pestNotes?: string | null;
  treatmentType?: string | null;
}): PlantCareSchedule {
  const asIso = (value?: Date | string | null) => {
    if (!value) {
      return null;
    }
    return value instanceof Date ? value.toISOString() : String(value);
  };

  return {
    nextWateredAt: asIso(plant.nextWateredAt),
    needsFertilizer: plant.needsFertilizer,
    nextFertilizerAt: asIso(plant.nextFertilizerAt),
    fertilizerNotes: plant.fertilizerNotes ?? null,
    needsPruning: plant.needsPruning,
    nextPruneAt: asIso(plant.nextPruneAt),
    pruneNotes: plant.pruneNotes ?? null,
    needsPest: plant.needsPest,
    nextPestAt: asIso(plant.nextPestAt),
    pestNotes: plant.pestNotes ?? null,
    treatmentType: plant.treatmentType ?? null,
  };
}
