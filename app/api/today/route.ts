import { NextResponse } from "next/server";
import { getGardenSettings, getPlantCareTreatments, listPlants } from "@/lib/plants";
import { getEffectiveSeason, getPlantDueTasks, getSeason } from "@/lib/schedule";
import type { DueStatus, PlantTask } from "@/lib/types";

function statusPriority(status: DueStatus): number {
  if (status === "overdue") return 0;
  if (status === "due") return 1;
  return 2;
}

export async function GET() {
  const [plants, gardenSettings] = await Promise.all([
    listPlants(),
    getGardenSettings(),
  ]);
  const today = new Date();
  const tasks: PlantTask[] = [];

  for (const plant of plants) {
    const dueTasks = getPlantDueTasks(
      plant,
      today,
      gardenSettings.lastRainAt,
      gardenSettings.seasonOverride,
    ).filter(
      (task) => task.status !== "ok",
    );

    for (const task of dueTasks) {
      tasks.push({
        plantId: plant.id,
        plantName: plant.name,
        taskType: task.taskType,
        dueAt: task.dueAt.toISOString(),
        status: task.status,
        coverPhotoPath: plant.coverPhotoPath,
        careTreatments: getPlantCareTreatments(plant),
      });
    }
  }

  tasks.sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return NextResponse.json({
    tasks,
    season: getEffectiveSeason(today, gardenSettings.seasonOverride),
    calendarSeason: getSeason(today),
    seasonOverride: gardenSettings.seasonOverride,
  });
}
