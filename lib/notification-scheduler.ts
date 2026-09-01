import { ensureDefaultGarden } from "@/lib/garden-access";
import {
  formatScheduleLabel,
  getNextNotificationAt,
  isNotificationDue,
} from "@/lib/notification-schedule";
import {
  getLastNotificationSentAt,
  getNotificationSchedule,
  markNotificationSent,
} from "@/lib/plants";
import { notifyTodayTasks } from "@/lib/push";

const SCHEDULER_KEY = "__plantasNotificationScheduler";

type SchedulerState = {
  timer: ReturnType<typeof setTimeout> | null;
  started: boolean;
};

function getSchedulerState(): SchedulerState {
  const globalScope = globalThis as typeof globalThis & {
    [SCHEDULER_KEY]?: SchedulerState;
  };

  if (!globalScope[SCHEDULER_KEY]) {
    globalScope[SCHEDULER_KEY] = { timer: null, started: false };
  }

  return globalScope[SCHEDULER_KEY]!;
}

function shouldRunScheduler() {
  if (process.env.NOTIFY_SCHEDULER_DISABLED === "1") {
    return false;
  }

  return (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_NOTIFICATION_SCHEDULER === "1"
  );
}

function clearScheduledNotification() {
  const state = getSchedulerState();
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

async function runScheduledNotification() {
  try {
    const shared = await ensureDefaultGarden();
    const schedule = await getNotificationSchedule(shared.id);
    const lastSent = await getLastNotificationSentAt(shared.id);
    const now = new Date();

    if (!isNotificationDue(schedule, lastSent, now)) {
      return;
    }

    const result = await notifyTodayTasks();
    if (!result.skipped) {
      await markNotificationSent(now, shared.id);
    }
  } catch (error) {
    console.error("[notification-scheduler] falló el envío programado", error);
  } finally {
    await scheduleNextNotification();
  }
}

async function scheduleNextNotification() {
  clearScheduledNotification();

  if (!shouldRunScheduler()) {
    return;
  }

  try {
    const shared = await ensureDefaultGarden();
    const schedule = await getNotificationSchedule(shared.id);
    const nextAt = getNextNotificationAt(schedule);
    const delayMs = Math.max(0, nextAt.getTime() - Date.now());

    console.info(
      `[notification-scheduler] próximo aviso: ${nextAt.toISOString()} (${formatScheduleLabel(schedule)})`,
    );

    const state = getSchedulerState();
    state.timer = setTimeout(() => {
      void runScheduledNotification();
    }, delayMs);
  } catch (error) {
    console.error(
      "[notification-scheduler] no se pudo programar el próximo aviso",
      error,
    );
  }
}

export async function startNotificationScheduler() {
  if (!shouldRunScheduler()) {
    return;
  }

  const state = getSchedulerState();
  if (state.started) {
    await refreshNotificationScheduler();
    return;
  }

  state.started = true;
  await scheduleNextNotification();
}

export async function refreshNotificationScheduler() {
  if (!shouldRunScheduler()) {
    return;
  }

  await scheduleNextNotification();
}
