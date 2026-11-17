"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import {
  compareTodayTasks,
  isTodaySortMode,
  TODAY_SORT_STORAGE_KEY,
  type TodaySortMode,
} from "@/lib/today-task-sort";
import type { PlantTask } from "@/lib/types";

type TodayListTask = PlantTask & {
  walkOrder?: number | null;
};

const SORT_OPTIONS: { mode: TodaySortMode; label: string }[] = [
  { mode: "path", label: "Camino" },
  { mode: "overdue", label: "Atrasadas" },
];

/** Same idea as the walk-circuit control on the map. */
function PathSortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M4 18c3-1 5-6 8-6s5 5 8 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4" cy="18" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="20" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Clock + alert for overdue-first sort. */
function OverdueSortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8v4.5l3 1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortIcon({ mode }: { mode: TodaySortMode }) {
  return mode === "path" ? <PathSortIcon /> : <OverdueSortIcon />;
}

export function TodayTaskList({ tasks }: { tasks: TodayListTask[] }) {
  const [sortMode, setSortMode] = useState<TodaySortMode>("overdue");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TODAY_SORT_STORAGE_KEY);
      if (isTodaySortMode(stored)) {
        setSortMode(stored);
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  function selectMode(mode: TodaySortMode) {
    setSortMode(mode);
    try {
      window.localStorage.setItem(TODAY_SORT_STORAGE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => compareTodayTasks(a, b, sortMode)),
    [tasks, sortMode],
  );

  return (
    <section className="space-y-3">
      <div
        className="flex justify-end gap-1"
        role="group"
        aria-label="Orden de la lista"
      >
        {SORT_OPTIONS.map(({ mode, label }) => {
          const isActive = sortMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => selectMode(mode)}
              aria-label={`Ordenar por ${label.toLowerCase()}`}
              aria-pressed={isActive}
              title={label}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                isActive
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-emerald-900/15 bg-white text-emerald-900/70 hover:bg-emerald-50"
              }`}
            >
              <SortIcon mode={mode} />
            </button>
          );
        })}
      </div>

      {sortedTasks.map((task) => (
        <TaskCard key={`${task.plantId}-${task.taskType}`} task={task} />
      ))}
    </section>
  );
}
