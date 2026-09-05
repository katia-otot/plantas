import { ensureDefaultGarden } from "@/lib/garden-access";
import { prisma } from "@/lib/db";
import {
  formatScheduleLabel,
  getNextNotificationAt,
  getNextRainAskAt,
  isNotificationDue,
  isRainAskDue,
} from "@/lib/notification-schedule";
import {
  getLastNotificationSentAt,
  getNotificationSchedule,
  markNotificationSent,
} from "@/lib/plants";
import { notifyRainAsk, notifyTodayTasks } from "@/lib/push";
import { maybeAskAboutRainForGarden } from "@/lib/rain-ask";

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

async function runScheduledTick() {
  try {
    const shared = await ensureDefaultGarden();
    const schedule = await getNotificationSchedule(shared.id);
    const now = new Date();

    const settings = await prisma.gardenSettings.findUnique({
      where: { gardenId: shared.id },
    });

    if (
      isRainAskDue(schedule, settings?.lastRainAskSentAt ?? null, now)
    ) {
      const ask = await maybeAskAboutRainForGarden(shared.id, now);
      if (ask.shouldNotify) {
        await notifyRainAsk({
          targetDate: ask.targetDate,
          url: `/lluvias?fecha=${ask.targetDate}`,
        });
      }
      await prisma.gardenSettings.upsert({
        where: { gardenId: shared.id },
        create: {
          gardenId: shared.id,
          lastRainAskSentAt: now,
          lastRainAskDate: ask.targetDate,
        },
        update: {
          lastRainAskSentAt: now,
          lastRainAskDate: ask.targetDate,
        },
      });
    }

    const lastSent = await getLastNotificationSentAt(shared.id);
    if (isNotificationDue(schedule, lastSent, now)) {
      const result = await notifyTodayTasks();
      if (!result.skipped) {
        await markNotificationSent(now, shared.id);
      }
    }
  } catch (error) {
    console.error("[notification-scheduler] falló el tick programado", error);
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
    const nextNotify = getNextNotificationAt(schedule);
    const nextAsk = getNextRainAskAt(schedule);
    const nextAt =
      nextAsk.getTime() < nextNotify.getTime() ? nextAsk : nextNotify;
    const delayMs = Math.max(0, nextAt.getTime() - Date.now());

    console.info(
      `[notification-scheduler] próximo evento: ${nextAt.toISOString()} (riego ${formatScheduleLabel(schedule)}; pregunta lluvia 30 min antes)`,
    );

    const state = getSchedulerState();
    state.timer = setTimeout(() => {
      void runScheduledTick();
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
