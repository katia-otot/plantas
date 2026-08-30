import { getGardenSettings, listActivePlants } from "@/lib/plants";
import { getPlantDueTasks } from "@/lib/schedule";
import { TASK_LABELS, type Season, type TaskType } from "@/lib/types";

export type TodayTaskSummary = {
  plantId: string;
  plantName: string;
  taskType: TaskType;
  dueAt: string;
  status: "due" | "overdue";
};

export async function getTodayTaskSummaries(
  lastGlobalRainAt?: Date | null,
  seasonOverride?: Season | null,
  gardenId?: string,
): Promise<TodayTaskSummary[]> {
  const settings =
    lastGlobalRainAt !== undefined && seasonOverride !== undefined
      ? {
          lastRainAt: lastGlobalRainAt,
          seasonOverride,
        }
      : await getGardenSettings(gardenId);

  const plants = await listActivePlants(gardenId);
  const today = new Date();
  const tasks: TodayTaskSummary[] = [];

  for (const plant of plants) {
    const dueTasks = getPlantDueTasks(
      plant,
      today,
      settings.lastRainAt,
      settings.seasonOverride,
    ).filter((task) => task.status !== "ok");

    for (const task of dueTasks) {
      tasks.push({
        plantId: plant.id,
        plantName: plant.name,
        taskType: task.taskType,
        dueAt: task.dueAt.toISOString(),
        status: task.status as "due" | "overdue",
      });
    }
  }

  tasks.sort((a, b) => {
    const priority = { overdue: 0, due: 1 } as const;
    const diff = priority[a.status] - priority[b.status];
    if (diff !== 0) {
      return diff;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return tasks;
}

export function buildTodayNotificationCopy(tasks: TodayTaskSummary[]): {
  title: string;
  body: string;
} | null {
  if (tasks.length === 0) {
    return null;
  }

  const counts = new Map<TaskType, number>();
  for (const task of tasks) {
    counts.set(task.taskType, (counts.get(task.taskType) ?? 0) + 1);
  }

  const parts = [...counts.entries()].map(([type, count]) => {
    const label = TASK_LABELS[type].toLowerCase();
    return `${count} ${label}${count === 1 ? "" : "s"}`;
  });

  const overdue = tasks.filter((task) => task.status === "overdue").length;
  const title =
    overdue > 0
      ? `Hoy: ${tasks.length} pendiente${tasks.length === 1 ? "" : "s"}`
      : "Hoy en el patio";

  return {
    title,
    body: parts.join(" · "),
  };
}
