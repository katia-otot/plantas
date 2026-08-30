"use client";

import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { formatDueLabel, getPlantDueTasks, getWorstStatus } from "@/lib/schedule";
import {
  isActivePlantStatus,
  normalizePlantStatus,
  TASK_LABELS,
  type Season,
} from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface PlantCardProps {
  id: string;
  name: string;
  species?: string | null;
  location?: string | null;
  coverPhotoPath?: string | null;
  status?: string | null;
  quantity?: number;
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
  const status = normalizePlantStatus(props.status);
  const lastGlobalRainAt = props.lastGlobalRainAt
    ? new Date(props.lastGlobalRainAt)
    : null;
  const isActive = isActivePlantStatus(status);
  const plant = {
    lastWateredAt: props.lastWateredAt
      ? new Date(props.lastWateredAt)
      : null,
    nextWateredAt: props.nextWateredAt
      ? new Date(props.nextWateredAt)
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

  const tasks = isActive
    ? getPlantDueTasks(
        plant,
        new Date(),
        lastGlobalRainAt,
        props.seasonOverride ?? null,
      )
    : [];
  const worstStatus = getWorstStatus(tasks);
  const today = new Date();

  return (
    <article
      className={`relative flex overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm transition hover:border-emerald-300 ${
        isActive ? "" : "opacity-80"
      }`}
    >
      <Link
        href={`/plants/${props.id}`}
        className="absolute inset-0"
        aria-label={`Ver ${props.name}`}
      />

      <div className="relative z-0 w-24 shrink-0 self-stretch min-h-[5.5rem] pointer-events-none">
        {props.coverPhotoPath ? (
          <Image
            src={withBasePath(props.coverPhotoPath)}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full min-h-[5.5rem] items-center justify-center bg-emerald-50 text-3xl">
            🌿
          </div>
        )}
      </div>

      <div className="relative z-0 min-w-0 flex-1 p-3 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-emerald-950">
              {props.name}
              {(props.quantity ?? 1) > 1 ? (
                <span className="ml-1 font-medium text-emerald-800/70">
                  ×{props.quantity}
                </span>
              ) : null}
            </h3>
            {(props.species || props.location) && (
              <p className="truncate text-sm text-emerald-800/70">
                {[props.species, props.location].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          {isActive && worstStatus !== "ok" ? (
            <div className="shrink-0">
              <StatusBadge status={worstStatus} />
            </div>
          ) : null}
        </div>

        {tasks.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {tasks.map((task) => (
              <li
                key={`${task.taskType}-${task.dueAt.toISOString()}`}
                className="text-sm text-emerald-900/80"
              >
                {formatDueLabel(
                  task.dueAt,
                  today,
                  TASK_LABELS[task.taskType],
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
