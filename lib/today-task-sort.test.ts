import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareTodayTasks,
  compareTodayTasksByOverdue,
  compareTodayTasksByPath,
} from "./today-task-sort";

function task(
  plantId: string,
  status: "overdue" | "due",
  walkOrder: number | null,
  dueAt = "2026-03-10T12:00:00.000Z",
) {
  return { plantId, status, walkOrder, dueAt };
}

describe("compareTodayTasksByOverdue", () => {
  it("pone atrasadas antes que las de hoy", () => {
    const overdue = task("a", "overdue", 5);
    const due = task("b", "due", 1);
    assert.ok(compareTodayTasksByOverdue(overdue, due) < 0);
  });

  it("dentro del mismo estado usa el camino", () => {
    const first = task("a", "due", 1);
    const second = task("b", "due", 3);
    assert.ok(compareTodayTasksByOverdue(first, second) < 0);
  });
});

describe("compareTodayTasksByPath", () => {
  it("prioriza el orden del camino aunque haya atrasadas", () => {
    const lateOnPath = task("a", "overdue", 4);
    const dueEarlierOnPath = task("b", "due", 1);
    assert.ok(compareTodayTasksByPath(dueEarlierOnPath, lateOnPath) < 0);
  });

  it("deja sin camino al final", () => {
    const onPath = task("a", "due", 2);
    const offPath = task("b", "overdue", null);
    assert.ok(compareTodayTasksByPath(onPath, offPath) < 0);
  });
});

describe("compareTodayTasks", () => {
  it("por defecto ordena por atrasadas", () => {
    const overdue = task("a", "overdue", 9);
    const due = task("b", "due", 1);
    assert.ok(compareTodayTasks(overdue, due) < 0);
  });

  it("respeta el modo camino", () => {
    const overdue = task("a", "overdue", 9);
    const due = task("b", "due", 1);
    assert.ok(compareTodayTasks(overdue, due, "path") > 0);
  });
});
