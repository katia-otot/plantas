"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { performAction } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import type { PlantTask } from "@/lib/types";
import { TASK_LABELS } from "@/lib/types";
import { QuickActions } from "./QuickActions";
import { StatusBadge } from "./StatusBadge";

export function TaskCard({ task }: { task: PlantTask }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markDone() {
    const actionMap = {
      water: "watering",
      fertilizer: "fertilizer",
      prune: "prune",
      pest: "pest",
    } as const;

    try {
      setLoading(true);
      await performAction(task.plantId, actionMap[task.taskType]);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo marcar como hecho");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
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
        <StatusBadge status={task.status} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={markDone}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {loading ? "..." : "Listo"}
        </button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">
          Más acciones
        </summary>
        <div className="mt-3">
          <QuickActions
            plantId={task.plantId}
            careTreatments={task.careTreatments}
            compact
          />
        </div>
      </details>
    </article>
  );
}
