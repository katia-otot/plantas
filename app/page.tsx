import Link from "next/link";
import Image from "next/image";
import { ActionIcon } from "@/components/ActionIcon";
import {
  formatDueLabel,
  getEffectiveSeason,
  getPlantDueTasks,
  getSeason,
  getSeasonLabel,
  getWaterIntervalDays,
  startOfDay,
} from "@/lib/schedule";
import {
  getGardenSettings,
  getPlantCareTreatments,
  getPlantScheduleSummary,
  listActivePlants,
  rainedOnDate,
} from "@/lib/plants";
import { toPlantCareSchedule } from "@/lib/care-schedule";
import { resolveGardenId } from "@/lib/garden-access";
import { withBasePath } from "@/lib/base-path";
import { TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import { TASK_LABELS, type Season } from "@/lib/types";
import { RainAllButton } from "@/components/RainAllButton";
import { TaskCard } from "@/components/TaskCard";

export const dynamic = "force-dynamic";

async function getTodayTasks(
  lastGlobalRainAt: Date | null,
  seasonOverride: Season | null,
) {
  const plants = await listActivePlants();
  const today = new Date();
  const tasks = [];

  for (const plant of plants) {
    const dueTasks = getPlantDueTasks(
      plant,
      today,
      lastGlobalRainAt,
      seasonOverride,
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

  tasks.sort((a, b) => {
    const priority = { overdue: 0, due: 1, ok: 2 } as const;
    const diff = priority[a.status] - priority[b.status];
    if (diff !== 0) {
      return diff;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return tasks;
}

export default async function HomePage() {
  const today = new Date();
  const gardenId = await resolveGardenId();
  const gardenSettings = await getGardenSettings(gardenId);
  const calendarSeason = getSeason(today);
  const effectiveSeason = getEffectiveSeason(today, gardenSettings.seasonOverride);
  const tasks = await getTodayTasks(
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );
  const plants = (
    await listActivePlants(gardenId)
  ).length;
  const outdoorPlants = (
    await listActivePlants(gardenId)
  ).filter((p) => !p.isIndoor).length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Patio
        </p>
        <div className="flex items-center gap-3">
          <ActionIcon name="agenda" size={52} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">Hoy</h1>
        </div>
        <p className="text-sm text-emerald-900/70">
          Estación: {getSeasonLabel(effectiveSeason)}
          {gardenSettings.seasonOverride &&
            gardenSettings.seasonOverride !== calendarSeason &&
            ` (calendario: ${getSeasonLabel(calendarSeason).toLowerCase()})`}
          {" · "}
          {plants} planta
          {plants === 1 ? "" : "s"}
        </p>
      </header>

      <RainAllButton
        plantCount={outdoorPlants}
        rainedToday={rainedOnDate(gardenSettings.lastRainAt, today)}
        lastRainAt={gardenSettings.lastRainAt}
      />

      {tasks.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <div className="flex justify-center">
            <ActionIcon name="planta" size={64} alt="" />
          </div>
          <p className="mt-3 text-lg font-semibold text-emerald-950">
            Todo al día
          </p>
          <p className="mt-2 text-sm text-emerald-900/70">
            No hay tareas pendientes por ahora.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={`${task.plantId}-${task.taskType}`} task={task} />
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-emerald-950">Próximos cuidados</h2>
        <UpcomingList
          lastGlobalRainAt={gardenSettings.lastRainAt}
          seasonOverride={gardenSettings.seasonOverride}
        />
      </section>
    </main>
  );
}

async function UpcomingList({
  lastGlobalRainAt,
  seasonOverride,
}: {
  lastGlobalRainAt: Date | null;
  seasonOverride: Season | null;
}) {
  const plants = await listActivePlants();
  const today = new Date();
  const upcoming = plants
    .flatMap((plant) => {
      const summary = getPlantScheduleSummary(
        plant,
        lastGlobalRainAt,
        seasonOverride,
      );
      const items = [];

      if (summary.nextWateredAt) {
        items.push({
          id: `${plant.id}-water`,
          plantId: plant.id,
          plantName: plant.name,
          coverPhotoPath: plant.coverPhotoPath,
          label: "Riego",
          dueAt: summary.nextWateredAt,
          interval: getWaterIntervalDays(plant, today, seasonOverride),
        });
      }

      if (summary.nextFertilizerAt) {
        items.push({
          id: `${plant.id}-fertilizer`,
          plantId: plant.id,
          plantName: plant.name,
          coverPhotoPath: plant.coverPhotoPath,
          label: TASK_LABELS.fertilizer,
          dueAt: summary.nextFertilizerAt,
          interval: null,
        });
      }

      if (summary.nextPruneAt) {
        items.push({
          id: `${plant.id}-prune`,
          plantId: plant.id,
          plantName: plant.name,
          coverPhotoPath: plant.coverPhotoPath,
          label: TASK_LABELS.prune,
          dueAt: summary.nextPruneAt,
          interval: null,
        });
      }

      if (summary.nextPestAt) {
        items.push({
          id: `${plant.id}-pest`,
          plantId: plant.id,
          plantName: plant.name,
          coverPhotoPath: plant.coverPhotoPath,
          label:
            plant.treatmentType &&
            plant.treatmentType in TREATMENT_TYPE_LABELS
              ? TREATMENT_TYPE_LABELS[
                  plant.treatmentType as keyof typeof TREATMENT_TYPE_LABELS
                ]
              : TASK_LABELS.pest,
          dueAt: summary.nextPestAt,
          interval: null,
        });
      }

      return items;
    })
    .filter((item) => startOfDay(item.dueAt) > startOfDay(today))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 6);

  if (upcoming.length === 0) {
    return (
      <p className="mt-3 text-sm text-emerald-900/70">
        No hay cuidados próximos después de hoy.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {upcoming.map((item) => (
        <li key={item.id}>
          <Link
            href={`/plants/${item.plantId}`}
            className="flex overflow-hidden rounded-xl border border-emerald-900/10 bg-emerald-50/70 transition hover:border-emerald-300"
          >
            <div className="relative w-20 shrink-0 self-stretch min-h-[4.5rem] bg-emerald-100">
              {item.coverPhotoPath ? (
                <Image
                  src={withBasePath(item.coverPhotoPath)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full min-h-[4.5rem] items-center justify-center text-2xl">
                  🌿
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-emerald-950">
                  {item.plantName}
                </p>
                <p className="text-sm text-emerald-900/70">{item.label}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-emerald-800">
                {formatDueLabel(item.dueAt)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
