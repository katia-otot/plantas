import Link from "next/link";
import {
  formatDueLabel,
  getEffectiveSeason,
  getPlantDueTasks,
  getSeason,
  getSeasonLabel,
  getWaterIntervalDays,
} from "@/lib/schedule";
import {
  getGardenSettings,
  getPlantCareTreatments,
  getPlantScheduleSummary,
  listPlants,
} from "@/lib/plants";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import { TASK_LABELS, type Season } from "@/lib/types";
import { RainAllButton } from "@/components/RainAllButton";
import { SeasonSelector } from "@/components/SeasonSelector";
import { TaskCard } from "@/components/TaskCard";

async function getTodayTasks(
  lastGlobalRainAt: Date | null,
  seasonOverride: Season | null,
) {
  const plants = await listPlants();
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
  const gardenSettings = await getGardenSettings();
  const calendarSeason = getSeason(today);
  const effectiveSeason = getEffectiveSeason(today, gardenSettings.seasonOverride);
  const tasks = await getTodayTasks(
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );
  const plants = await prisma.plant.count();
  const outdoorPlants = await prisma.plant.count({ where: { isIndoor: false } });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Patio
        </p>
        <h1 className="text-3xl font-bold text-emerald-950">Hoy</h1>
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

      <SeasonSelector
        effectiveSeason={effectiveSeason}
        calendarSeason={calendarSeason}
        seasonOverride={gardenSettings.seasonOverride}
      />

      <RainAllButton plantCount={outdoorPlants} />

      {tasks.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-emerald-950">
            Todo al día
          </p>
          <p className="mt-2 text-sm text-emerald-900/70">
            No hay tareas pendientes por ahora.
          </p>
          <Link
            href="/plants/new"
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Agregar planta
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={`${task.plantId}-${task.taskType}`} task={task} />
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-emerald-950">Próximos cuidados</h2>
          <Link href="/plants" className="text-sm font-medium text-emerald-700">
            Ver plantas
          </Link>
        </div>
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
  const plants = await listPlants();
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
          plantName: plant.name,
          label: "Riego",
          dueAt: summary.nextWateredAt,
          interval: getWaterIntervalDays(plant, today, seasonOverride),
        });
      }

      if (summary.nextFertilizerAt) {
        items.push({
          id: `${plant.id}-fertilizer`,
          plantName: plant.name,
          label: TASK_LABELS.fertilizer,
          dueAt: summary.nextFertilizerAt,
          interval: null,
        });
      }

      if (summary.nextPruneAt) {
        items.push({
          id: `${plant.id}-prune`,
          plantName: plant.name,
          label: TASK_LABELS.prune,
          dueAt: summary.nextPruneAt,
          interval: null,
        });
      }

      if (summary.nextPestAt) {
        items.push({
          id: `${plant.id}-pest`,
          plantName: plant.name,
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
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 6);

  if (upcoming.length === 0) {
    return (
      <p className="mt-3 text-sm text-emerald-900/70">
        Agregá plantas para ver el calendario de cuidados.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {upcoming.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50/70 px-3 py-3"
        >
          <div>
            <p className="font-medium text-emerald-950">{item.plantName}</p>
            <p className="text-sm text-emerald-900/70">
              {item.label} · {formatDate(item.dueAt)}
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800">
            {formatDueLabel(item.dueAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
