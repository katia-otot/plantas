import { NextResponse } from "next/server";
import {
  getGardenSettings,
  getPlantCareTreatments,
  listActivePlants,
} from "@/lib/plants";
import { toPlantCareSchedule } from "@/lib/care-schedule";
import { getEffectiveSeason, getPlantDueTasks, getSeason } from "@/lib/schedule";
import { compareTodayTasks } from "@/lib/today-task-sort";
import type { PlantTask } from "@/lib/types";

export async function GET() {
  const [plants, gardenSettings] = await Promise.all([
    listActivePlants(),
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
        schedule: toPlantCareSchedule(plant),
      });
    }
  }

  const withOrder = tasks.map((task) => {
    const plant = plants.find((item) => item.id === task.plantId);
    return { ...task, walkOrder: plant?.walkOrder ?? null };
  });
  withOrder.sort(compareTodayTasks);

  return NextResponse.json({
    tasks: withOrder,
    season: getEffectiveSeason(today, gardenSettings.seasonOverride),
    calendarSeason: getSeason(today),
    seasonOverride: gardenSettings.seasonOverride,
  });
}
