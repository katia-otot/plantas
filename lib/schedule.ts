import type { Plant } from "@prisma/client";
import type { DueStatus, Season, TaskType } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfDay(result);
}

export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;

  if (month === 12 || month <= 2) {
    return "summer";
  }

  if (month >= 6 && month <= 8) {
    return "winter";
  }

  if (month >= 9 && month <= 11) {
    return "summer";
  }

  return "winter";
}

export function getSeasonLabel(season: Season): string {
  return season === "summer" ? "Verano" : "Invierno";
}

export function getEffectiveSeason(
  date: Date,
  seasonOverride?: Season | null,
): Season {
  if (seasonOverride) {
    return seasonOverride;
  }

  return getSeason(date);
}

export function getWaterIntervalDays(
  plant: Pick<Plant, "waterSummerDays" | "waterWinterDays">,
  date: Date = new Date(),
  seasonOverride?: Season | null,
): number {
  const season = getEffectiveSeason(date, seasonOverride);
  return season === "summer" ? plant.waterSummerDays : plant.waterWinterDays;
}

export function getEffectiveLastWateredAt(
  plant: Pick<Plant, "lastWateredAt" | "isIndoor">,
  lastGlobalRainAt: Date | null,
): Date | null {
  const lastWater = plant.lastWateredAt ? startOfDay(plant.lastWateredAt) : null;
  const lastRain =
    plant.isIndoor || !lastGlobalRainAt ? null : startOfDay(lastGlobalRainAt);

  if (!lastWater && !lastRain) {
    return null;
  }

  if (!lastWater) {
    return lastRain;
  }

  if (!lastRain) {
    return lastWater;
  }

  return lastWater.getTime() >= lastRain.getTime() ? lastWater : lastRain;
}

export function computeEffectiveNextWateredAt(
  plant: Pick<
    Plant,
    "waterSummerDays" | "waterWinterDays" | "lastWateredAt" | "isIndoor"
  >,
  lastGlobalRainAt: Date | null,
  fromDate: Date = new Date(),
  seasonOverride?: Season | null,
): Date {
  const effectiveLast = getEffectiveLastWateredAt(plant, lastGlobalRainAt);
  return computeNextWateredAt(
    { ...plant, lastWateredAt: effectiveLast },
    fromDate,
    seasonOverride,
  );
}

export function computeNextWateredAt(
  plant: Pick<
    Plant,
    "waterSummerDays" | "waterWinterDays" | "lastWateredAt"
  >,
  fromDate: Date = new Date(),
  seasonOverride?: Season | null,
): Date {
  if (!plant.lastWateredAt) {
    return startOfDay(fromDate);
  }

  const base = plant.lastWateredAt;
  const interval = getWaterIntervalDays(plant, fromDate, seasonOverride);
  return addDays(startOfDay(base), interval);
}

export function postponeWatering(
  plant: Pick<
    Plant,
    | "nextWateredAt"
    | "rainPostponeDays"
    | "waterSummerDays"
    | "waterWinterDays"
    | "lastWateredAt"
  >,
  fromDate: Date = new Date(),
  seasonOverride?: Season | null,
): Date {
  const currentNext =
    plant.nextWateredAt ?? computeNextWateredAt(plant, fromDate, seasonOverride);
  return addDays(currentNext, plant.rainPostponeDays);
}

export function markWateredAt(
  plant: Pick<
    Plant,
    "waterSummerDays" | "waterWinterDays"
  >,
  wateredAt: Date = new Date(),
  seasonOverride?: Season | null,
): { lastWateredAt: Date; nextWateredAt: Date } {
  const lastWateredAt = startOfDay(wateredAt);
  const nextWateredAt = addDays(
    lastWateredAt,
    getWaterIntervalDays(plant, lastWateredAt, seasonOverride),
  );
  return { lastWateredAt, nextWateredAt };
}

export function getNextSaturday(fromDate: Date = new Date()): Date {
  const date = startOfDay(fromDate);
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  return addDays(date, daysUntilSaturday);
}

export function getScheduledFertilizerAt(
  plant: Pick<
    { needsFertilizer: boolean; nextFertilizerAt: Date | null },
    "needsFertilizer" | "nextFertilizerAt"
  >,
): Date | null {
  if (!plant.needsFertilizer || !plant.nextFertilizerAt) {
    return null;
  }

  return startOfDay(plant.nextFertilizerAt);
}

export function getScheduledPestAt(
  plant: Pick<{ needsPest: boolean; nextPestAt: Date | null }, "needsPest" | "nextPestAt">,
): Date | null {
  if (!plant.needsPest || !plant.nextPestAt) {
    return null;
  }

  return startOfDay(plant.nextPestAt);
}

export function getDueStatus(dueAt: Date, today: Date = new Date()): DueStatus {
  const todayStart = startOfDay(today).getTime();
  const dueStart = startOfDay(dueAt).getTime();

  if (dueStart < todayStart) {
    return "overdue";
  }

  if (dueStart === todayStart) {
    return "due";
  }

  return "ok";
}

export function daysUntil(dueAt: Date, today: Date = new Date()): number {
  const diff = startOfDay(dueAt).getTime() - startOfDay(today).getTime();
  return Math.round(diff / MS_PER_DAY);
}

export function formatDueLabel(dueAt: Date, today: Date = new Date()): string {
  const status = getDueStatus(dueAt, today);
  const delta = daysUntil(dueAt, today);

  if (status === "overdue") {
    const overdueDays = Math.abs(delta);
    return overdueDays === 0 ? "Atrasada" : `Atrasada ${overdueDays}d`;
  }

  if (status === "due") {
    return "Hoy";
  }

  if (delta === 1) {
    return "Mañana";
  }

  return `En ${delta} días`;
}

export function getPlantDueTasks(
  plant: {
    lastWateredAt: Date | null;
    nextPruneAt: Date | null;
    needsPest: boolean;
    nextPestAt: Date | null;
    needsFertilizer: boolean;
    nextFertilizerAt: Date | null;
    needsPruning: boolean;
    waterSummerDays: number;
    waterWinterDays: number;
    isIndoor: boolean;
  },
  today: Date = new Date(),
  lastGlobalRainAt: Date | null = null,
  seasonOverride?: Season | null,
): Array<{ taskType: TaskType; dueAt: Date; status: DueStatus }> {
  const tasks: Array<{ taskType: TaskType; dueAt: Date; status: DueStatus }> =
    [];

  const nextWater = computeEffectiveNextWateredAt(
    plant,
    lastGlobalRainAt,
    today,
    seasonOverride,
  );
  tasks.push({
    taskType: "water",
    dueAt: nextWater,
    status: getDueStatus(nextWater, today),
  });

  const nextFertilizer = getScheduledFertilizerAt(plant);
  if (nextFertilizer) {
    tasks.push({
      taskType: "fertilizer",
      dueAt: nextFertilizer,
      status: getDueStatus(nextFertilizer, today),
    });
  }

  if (plant.needsPruning && plant.nextPruneAt) {
    tasks.push({
      taskType: "prune",
      dueAt: plant.nextPruneAt,
      status: getDueStatus(plant.nextPruneAt, today),
    });
  }

  const nextPest = getScheduledPestAt(plant);
  if (nextPest) {
    tasks.push({
      taskType: "pest",
      dueAt: nextPest,
      status: getDueStatus(nextPest, today),
    });
  }

  const priority: Record<DueStatus, number> = {
    overdue: 0,
    due: 1,
    ok: 2,
  };

  return tasks.sort((a, b) => {
    const statusDiff = priority[a.status] - priority[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.dueAt.getTime() - b.dueAt.getTime();
  });
}

export function getWorstStatus(tasks: Array<{ status: DueStatus }>): DueStatus {
  if (tasks.some((task) => task.status === "overdue")) {
    return "overdue";
  }
  if (tasks.some((task) => task.status === "due")) {
    return "due";
  }
  return "ok";
}
