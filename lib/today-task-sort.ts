/** Shared sort for Hoy task lists: walk circuit first, then due priority. */

export function compareTodayTasks<
  T extends {
    plantId: string;
    status: "overdue" | "due" | "ok" | string;
    dueAt: string;
    walkOrder?: number | null;
  },
>(a: T, b: T): number {
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

  const priority = { overdue: 0, due: 1, ok: 2 } as Record<string, number>;
  const statusDiff =
    (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
  if (statusDiff !== 0) {
    return statusDiff;
  }
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}
