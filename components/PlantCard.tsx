import Image from "next/image";
import Link from "next/link";
import { formatDueLabel, getPlantDueTasks, getWorstStatus } from "@/lib/schedule";
import { withBasePath } from "@/lib/base-path";
import type { Season } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface PlantCardProps {
  id: string;
  name: string;
  species?: string | null;
  location?: string | null;
  coverPhotoPath?: string | null;
  nextWateredAt: Date | string | null;
  lastFertilizedAt?: Date | string | null;
  needsFertilizer?: boolean;
  nextFertilizerAt?: Date | string | null;
  needsPruning?: boolean;
  nextPruneAt?: Date | string | null;
  needsPest?: boolean;
  nextPestAt?: Date | string | null;
  waterSummerDays: number;
  waterWinterDays: number;
  isIndoor?: boolean;
  rainPostponeDays: number;
  lastWateredAt?: Date | string | null;
  lastGlobalRainAt?: Date | string | null;
  seasonOverride?: Season | null;
}

export function PlantCard(props: PlantCardProps) {
  const lastGlobalRainAt = props.lastGlobalRainAt
    ? new Date(props.lastGlobalRainAt)
    : null;
  const plant = {
    lastWateredAt: props.lastWateredAt
      ? new Date(props.lastWateredAt)
      : null,
    nextPruneAt: props.nextPruneAt ? new Date(props.nextPruneAt) : null,
    needsPest: props.needsPest ?? false,
    nextPestAt: props.nextPestAt ? new Date(props.nextPestAt) : null,
    needsFertilizer: props.needsFertilizer ?? false,
    nextFertilizerAt: props.nextFertilizerAt
      ? new Date(props.nextFertilizerAt)
      : null,
    needsPruning: props.needsPruning ?? false,
    waterSummerDays: props.waterSummerDays,
    waterWinterDays: props.waterWinterDays,
    isIndoor: props.isIndoor ?? false,
  };

  const tasks = getPlantDueTasks(
    plant,
    new Date(),
    lastGlobalRainAt,
    props.seasonOverride ?? null,
  );
  const worstStatus = getWorstStatus(tasks);
  const nextTask = tasks[0];

  return (
    <Link
      href={`/plants/${props.id}`}
      className="flex gap-3 rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-sm transition hover:border-emerald-300"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
        {props.coverPhotoPath ? (
          <Image
            src={withBasePath(props.coverPhotoPath)}
            alt={props.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🌿</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="truncate text-base font-semibold text-emerald-950">
              {props.name}
            </h3>
            {(props.species || props.location) && (
              <p className="truncate text-sm text-emerald-800/70">
                {[props.species, props.location].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <StatusBadge status={worstStatus} />
        </div>

        {nextTask && (
          <p className="mt-2 text-sm text-emerald-900/80">
            {formatDueLabel(nextTask.dueAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
