import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ensureDefaultGarden } from "@/lib/garden-access";
import {
  DEFAULT_NOTIFY_WEEKDAY_TIME,
  DEFAULT_NOTIFY_WEEKEND_TIME,
  getNextNotificationAt,
  parseNotifyTime,
} from "@/lib/notification-schedule";
import {
  getNotificationSchedule,
  setNotificationSchedule,
} from "@/lib/plants";
import {
  refreshNotificationScheduler,
  startNotificationScheduler,
} from "@/lib/notification-scheduler";

const SCHEDULER_KEY = "__plantasNotificationScheduler";
const mutableEnv = process.env as Record<string, string | undefined>;

function restoreEnv(
  key: string,
  value: string | undefined,
) {
  if (value === undefined) {
    delete mutableEnv[key];
  } else {
    mutableEnv[key] = value;
  }
}

describe("notification schedule persistence", () => {
  let gardenId: string;
  let previousSchedule: { weekdayTime: string; weekendTime: string };

  before(async () => {
    gardenId = (await ensureDefaultGarden()).id;
    previousSchedule = await getNotificationSchedule(gardenId);
  });

  after(async () => {
    await setNotificationSchedule(previousSchedule, gardenId);
  });

  it("reads and writes schedule in GardenSettings", async () => {
    const saved = await setNotificationSchedule(
      { weekdayTime: "14:20", weekendTime: "09:40" },
      gardenId,
    );
    assert.deepEqual(saved, { weekdayTime: "14:20", weekendTime: "09:40" });

    const loaded = await getNotificationSchedule(gardenId);
    assert.deepEqual(loaded, saved);
  });

  it("rejects invalid times at validation layer", () => {
    assert.equal(parseNotifyTime("99:99"), null);
    assert.equal(parseNotifyTime("10:30"), "10:30");
  });
});

describe("notification scheduler", () => {
  let gardenId: string;
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_NOTIFICATION_SCHEDULER: process.env.ENABLE_NOTIFICATION_SCHEDULER,
    NOTIFY_SCHEDULER_DISABLED: process.env.NOTIFY_SCHEDULER_DISABLED,
  };

  before(async () => {
    gardenId = (await ensureDefaultGarden()).id;
    mutableEnv.ENABLE_NOTIFICATION_SCHEDULER = "1";
    delete mutableEnv.NOTIFY_SCHEDULER_DISABLED;
    resetSchedulerState();
  });

  after(async () => {
    resetSchedulerState();
    await setNotificationSchedule(
      {
        weekdayTime: DEFAULT_NOTIFY_WEEKDAY_TIME,
        weekendTime: DEFAULT_NOTIFY_WEEKEND_TIME,
      },
      gardenId,
    );

    restoreEnv("NODE_ENV", previousEnv.NODE_ENV);
    restoreEnv(
      "ENABLE_NOTIFICATION_SCHEDULER",
      previousEnv.ENABLE_NOTIFICATION_SCHEDULER,
    );
    restoreEnv(
      "NOTIFY_SCHEDULER_DISABLED",
      previousEnv.NOTIFY_SCHEDULER_DISABLED,
    );
  });

  it("does not schedule when disabled", async () => {
    mutableEnv.NOTIFY_SCHEDULER_DISABLED = "1";
    await startNotificationScheduler();
    assert.equal(getSchedulerTimer(), null);
    delete mutableEnv.NOTIFY_SCHEDULER_DISABLED;
  });

  it("schedules the next notification timer", async () => {
    await setNotificationSchedule(
      {
        weekdayTime: DEFAULT_NOTIFY_WEEKDAY_TIME,
        weekendTime: DEFAULT_NOTIFY_WEEKEND_TIME,
      },
      gardenId,
    );
    await startNotificationScheduler();
    assert.notEqual(getSchedulerTimer(), null);
  });

  it("reschedules after a settings change", async () => {
    await startNotificationScheduler();
    const firstTimer = getSchedulerTimer();
    assert.notEqual(firstTimer, null);

    await setNotificationSchedule(
      { weekdayTime: "07:30", weekendTime: "19:15" },
      gardenId,
    );
    await refreshNotificationScheduler();

    const secondTimer = getSchedulerTimer();
    assert.notEqual(secondTimer, null);

    const schedule = await getNotificationSchedule(gardenId);
    const nextAt = getNextNotificationAt(schedule);
    assert.ok(nextAt.getTime() > Date.now() - 60_000);
  });
});

function resetSchedulerState() {
  const globalScope = globalThis as typeof globalThis & {
    [SCHEDULER_KEY]?: { timer: ReturnType<typeof setTimeout> | null };
  };
  if (globalScope[SCHEDULER_KEY]?.timer) {
    clearTimeout(globalScope[SCHEDULER_KEY]!.timer!);
  }
  delete globalScope[SCHEDULER_KEY];
}

function getSchedulerTimer() {
  const globalScope = globalThis as typeof globalThis & {
    [SCHEDULER_KEY]?: { timer: ReturnType<typeof setTimeout> | null };
  };
  return globalScope[SCHEDULER_KEY]?.timer ?? null;
}
