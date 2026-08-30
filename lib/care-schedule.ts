import { toInputDate } from "@/lib/format";

export function getDefaultSaturdayInput(from = new Date()): string {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  return toInputDate(nextSaturday);
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
