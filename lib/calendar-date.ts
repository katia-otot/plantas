/** Calendar-day helpers in America/Argentina/Buenos_Aires (no DST). */

export const GARDEN_TIMEZONE = "America/Argentina/Buenos_Aires";

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function readParts(date: Date, timeZone = GARDEN_TIMEZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

/** Local calendar date string YYYY-MM-DD in the garden timezone. */
export function toCalendarDateString(
  date: Date,
  timeZone = GARDEN_TIMEZONE,
): string {
  const { year, month, day } = readParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseCalendarDateString(value: string): CalendarDate {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Fecha de calendario inválida: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Fecha de calendario inválida: ${value}`);
  }
  return { year, month, day };
}

/** Noon UTC-3 as Date — stable midday for that calendar day (no DST). */
export function calendarDateToDate(
  value: string | CalendarDate,
): Date {
  const { year, month, day } =
    typeof value === "string" ? parseCalendarDateString(value) : value;
  return new Date(Date.UTC(year, month - 1, day, 15, 0, 0, 0));
}

export function addCalendarDays(value: string, days: number): string {
  const { year, month, day } = parseCalendarDateString(value);
  const utc = Date.UTC(year, month - 1, day + days, 12, 0, 0, 0);
  return toCalendarDateString(new Date(utc), "UTC");
}

/** Signed calendar-day difference: end − start. */
export function differenceInCalendarDays(
  end: string,
  start: string,
): number {
  const a = parseCalendarDateString(start);
  const b = parseCalendarDateString(end);
  const startUtc = Date.UTC(a.year, a.month - 1, a.day);
  const endUtc = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

export function maxCalendarDate(a: string, b: string): string {
  return differenceInCalendarDays(a, b) >= 0 ? a : b;
}

export function todayCalendarDateString(
  now = new Date(),
  timeZone = GARDEN_TIMEZONE,
): string {
  return toCalendarDateString(now, timeZone);
}
