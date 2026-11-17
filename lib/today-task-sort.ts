/** Sort modes for the Hoy task list. */
export type TodaySortMode = "overdue" | "path";

export const TODAY_SORT_STORAGE_KEY = "anthos.hoy.sortMode";

type TodaySortable = {
  plantId: string;
  status: "overdue" | "due" | "ok" | string;
  dueAt: string;
  walkOrder?: number | null;
};

function compareWalkOrder(a: TodaySortable, b: TodaySortable): number {
  const aOrder = a.walkOrder;
  const bOrder = b.walkOrder;
  const aOnPath = aOrder != null;
  const bOnPath = bOrder != null;

  if (aOnPath && bOnPath && aOrder !== bOrder) {
    return aOrder! - bOrder!;
  }
  if (aOnPath !== bOnPath) {
    return aOnPath ? -1 : 1;
  }
  return 0;
}

function compareDueAt(a: TodaySortable, b: TodaySortable): number {
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

function compareStatusPriority(a: TodaySortable, b: TodaySortable): number {
  const priority = { overdue: 0, due: 1, ok: 2 } as Record<string, number>;
  return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
}

/** Atrasadas primero, después orden del camino. */
export function compareTodayTasksByOverdue(
  a: TodaySortable,
  b: TodaySortable,
): number {
  const statusDiff = compareStatusPriority(a, b);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const walkDiff = compareWalkOrder(a, b);
  if (walkDiff !== 0) {
    return walkDiff;
  }

  return compareDueAt(a, b);
}

/** Orden del camino; a igual orden, atrasadas primero. */
export function compareTodayTasksByPath(
  a: TodaySortable,
  b: TodaySortable,
): number {
  const walkDiff = compareWalkOrder(a, b);
  if (walkDiff !== 0) {
    return walkDiff;
  }

  const statusDiff = compareStatusPriority(a, b);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  return compareDueAt(a, b);
}

/** Shared sort for Hoy. Default: overdue first (notifications / API). */
export function compareTodayTasks(
  a: TodaySortable,
  b: TodaySortable,
  mode: TodaySortMode = "overdue",
): number {
  return mode === "path"
    ? compareTodayTasksByPath(a, b)
    : compareTodayTasksByOverdue(a, b);
}

export function isTodaySortMode(value: unknown): value is TodaySortMode {
  return value === "overdue" || value === "path";
}
