export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "—";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Full rain day label like "Llovió el 21 de agosto". */
export function formatRainDayLabel(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "Llovió";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return "Llovió";
  }

  const dayMonth = value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
  return `Llovió el ${dayMonth}`;
}

/** Short label like "vie 21" or "mar 18". */
export function formatShortWeekdayDay(
  date: Date | string | null | undefined,
): string {
  if (!date) {
    return "—";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return "—";
  }

  const weekday = value
    .toLocaleDateString("es-AR", { weekday: "short" })
    .replace(/\.$/, "")
    .toLowerCase();
  return `${weekday} ${value.getDate()}`;
}

export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  // Already a YYYY-MM-DD calendar string (e.g. from <input type="date">).
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a calendar date for Argentina-local storage.
 * Never use `new Date("YYYY-MM-DD")` — that is UTC and shifts the day back.
 */
export function parseCalendarDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}
