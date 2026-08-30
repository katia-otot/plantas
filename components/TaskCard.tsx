"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { performAction } from "@/lib/client-api";
import { formatDate, toInputDate } from "@/lib/format";
import { PLANT_PHOTO_ASPECT_RATIO } from "@/lib/photo-size";
import type { PlantTask } from "@/lib/types";
import { TASK_LABELS } from "@/lib/types";
import type { ActionIconName } from "./ActionIcon";
import { ActionIcon } from "./ActionIcon";
import { QuickActions } from "./QuickActions";
import { StatusBadge } from "./StatusBadge";

const TASK_ICONS: Record<PlantTask["taskType"], ActionIconName> = {
  water: "regar",
  fertilizer: "fertilizante",
  prune: "poda",
  pest: "tratamiento-plagas",
};

export function TaskCard({ task }: { task: PlantTask }) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const today = toInputDate(new Date());

  async function markDone(happenedAt?: string) {
    const actionMap = {
      water: "watering",
      fertilizer: "fertilizer",
      prune: "prune",
      pest: "pest",
    } as const;

    try {
      setLoading(true);
      await performAction(
        task.plantId,
        actionMap[task.taskType],
        happenedAt ? { happenedAt } : undefined,
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo marcar como hecho");
    } finally {
      setLoading(false);
    }
  }

  function openPastDatePicker() {
    const input = dateInputRef.current;
    if (!input || loading) {
      return;
    }
    input.value = today;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Fall through to click() for browsers that block showPicker.
      }
    }
    input.click();
  }

  function handlePastDateChange(value: string) {
    if (!value) {
      return;
    }
    if (value > today) {
      alert("Elegí una fecha de hoy o anterior");
      return;
    }
    void markDone(value);
  }

  const isWater = task.taskType === "water";
  const taskIcon = TASK_ICONS[task.taskType];

  return (
    <article className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
      <Link
        href={`/plants/${task.plantId}`}
        className="relative block w-full bg-emerald-50"
        style={{ aspectRatio: PLANT_PHOTO_ASPECT_RATIO }}
        aria-label={`Ver ${task.plantName}`}
      >
        {task.coverPhotoPath ? (
          <Image
            src={withBasePath(task.coverPhotoPath)}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🌿
          </div>
        )}
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <ActionIcon name={taskIcon} size={36} alt="" />
            <div className="min-w-0">
              <Link
                href={`/plants/${task.plantId}`}
                className="text-base font-semibold text-emerald-950 hover:underline"
              >
                {task.plantName}
              </Link>
              <p className="mt-1 text-sm text-emerald-900/80">
                {TASK_LABELS[task.taskType]} · {formatDate(task.dueAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={task.status} />
        </div>

        {isWater ? (
          <div className="relative mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void markDone(today)}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-100 disabled:opacity-60"
            >
              {loading ? (
                "..."
              ) : (
                <>
                  <ActionIcon name="regar" size={32} alt="" />
                  <span>Regué hoy</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={openPastDatePicker}
              className="inline-flex items-center rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
            >
              Otra fecha
            </button>
            <input
              ref={dateInputRef}
              type="date"
              max={today}
              tabIndex={-1}
              aria-label="Fecha del riego"
              className="pointer-events-none absolute h-px w-px opacity-0"
              onChange={(event) => handlePastDateChange(event.target.value)}
            />
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void markDone()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100 disabled:opacity-60"
            >
              {loading ? (
                "..."
              ) : (
                <>
                  <ActionIcon name={taskIcon} size={32} alt="" />
                  <span>Listo</span>
                </>
              )}
            </button>
          </div>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-emerald-800">
            Programar
          </summary>
          <div className="mt-3">
            <QuickActions
              plantId={task.plantId}
              careTreatments={task.careTreatments}
              schedule={task.schedule}
              compact
            />
          </div>
        </details>
      </div>
    </article>
  );
}
