const NOTIFY_TZ = "America/Argentina/Buenos_Aires";

export const DEFAULT_NOTIFY_WEEKDAY_TIME = "15:00";
export const DEFAULT_NOTIFY_WEEKEND_TIME = "10:30";

export type NotificationSchedule = {
  weekdayTime: string;
  weekendTime: string;
};

type ArgentinaClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

function readArgentinaClock(date: Date): ArgentinaClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NOTIFY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const weekdayLabel =
    parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    weekday: weekdayMap[weekdayLabel] ?? 1,
  };
}

export function parseNotifyTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatScheduleLabel(schedule: NotificationSchedule): string {
  return `lun–vie ${schedule.weekdayTime} · sáb–dom ${schedule.weekendTime} (Argentina)`;
}

/** Argentina is UTC-3 year-round (no DST). */
export function argentinaLocalToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0));
}

export function getNextNotificationAt(
  schedule: NotificationSchedule,
  from = new Date(),
): Date {
  const fromMs = from.getTime();
  const startMs = Math.ceil(fromMs / 60_000) * 60_000;

  for (let offsetMinutes = 0; offsetMinutes < 8 * 24 * 60; offsetMinutes++) {
    const probe = new Date(startMs + offsetMinutes * 60_000);
    const clock = readArgentinaClock(probe);
    const isWeekend = clock.weekday === 0 || clock.weekday === 6;
    const target = isWeekend ? schedule.weekendTime : schedule.weekdayTime;
    const [targetHour, targetMinute] = target.split(":").map(Number);

    if (clock.hour !== targetHour || clock.minute !== targetMinute) {
      continue;
    }

    const fireAt = argentinaLocalToDate(
      clock.year,
      clock.month,
      clock.day,
      targetHour,
      targetMinute,
    );
    if (fireAt.getTime() > fromMs) {
      return fireAt;
    }
  }

  throw new Error("No se pudo calcular el próximo aviso");
}

export function isNotificationDue(
  schedule: NotificationSchedule,
  lastNotifySentAt: Date | null,
  now = new Date(),
): boolean {
  const clock = readArgentinaClock(now);
  const isWeekend = clock.weekday === 0 || clock.weekday === 6;
  const target = isWeekend ? schedule.weekendTime : schedule.weekdayTime;
  const [targetHour, targetMinute] = target.split(":").map(Number);

  if (clock.hour !== targetHour || clock.minute !== targetMinute) {
    return false;
  }

  if (!lastNotifySentAt) {
    return true;
  }

  const last = readArgentinaClock(lastNotifySentAt);
  return !(
    last.year === clock.year &&
    last.month === clock.month &&
    last.day === clock.day
  );
}
