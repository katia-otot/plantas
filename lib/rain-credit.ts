import {
  addCalendarDays,
  differenceInCalendarDays,
  maxCalendarDate,
} from "@/lib/calendar-date";

export type RainIntensity = "none" | "moderate" | "heavy";

export function isRainIntensity(value: unknown): value is RainIntensity {
  return value === "none" || value === "moderate" || value === "heavy";
}

/** Moderate rain credit: ceil(I / 3). Heavy: full interval. */
export function rainCreditDays(
  intervalDays: number,
  intensity: RainIntensity,
): number {
  if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
    throw new Error("Intervalo de riego inválido");
  }
  if (intensity === "none") {
    return 0;
  }
  if (intensity === "heavy") {
    return intervalDays;
  }
  return Math.ceil(intervalDays / 3);
}

/**
 * Apply one rain contribution to a plant's next watering date.
 * N / T are calendar YYYY-MM-DD. Indoor / none leave N unchanged.
 */
export function applyRainToNextWaterDate(args: {
  nextWaterDate: string;
  rainDate: string;
  intervalDays: number;
  intensity: RainIntensity;
  isIndoor?: boolean;
}): string {
  const {
    nextWaterDate,
    rainDate,
    intervalDays,
    intensity,
    isIndoor = false,
  } = args;

  if (isIndoor || intensity === "none") {
    return nextWaterDate;
  }

  if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
    throw new Error("Intervalo de riego inválido");
  }

  const R = differenceInCalendarDays(nextWaterDate, rainDate);
  const credito = rainCreditDays(intervalDays, intensity);
  const diasRestantes = Math.min(intervalDays, Math.max(0, R) + credito);
  const fechaCandidata = addCalendarDays(rainDate, diasRestantes);
  return maxCalendarDate(nextWaterDate, fechaCandidata);
}

/**
 * Replay watering + rain events chronologically onto a baseline next date.
 * Same-day order: watering first, then rain.
 */
export function rebuildNextWaterDate(args: {
  /** Next watering date immediately after the baseline watering (baseline + I). */
  initialNextWaterDate: string;
  intervalForDate: (calendarDate: string) => number;
  events: Array<
    | { kind: "watering"; date: string; intervalDays: number }
    | { kind: "rain"; date: string; intensity: RainIntensity }
  >;
  isIndoor?: boolean;
}): string {
  if (args.isIndoor) {
    return args.initialNextWaterDate;
  }

  const events = [...args.events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    if (a.kind === b.kind) {
      return 0;
    }
    return a.kind === "watering" ? -1 : 1;
  });

  let next = args.initialNextWaterDate;

  for (const event of events) {
    if (event.kind === "watering") {
      next = addCalendarDays(event.date, event.intervalDays);
      continue;
    }
    const intervalDays = args.intervalForDate(event.date);
    next = applyRainToNextWaterDate({
      nextWaterDate: next,
      rainDate: event.date,
      intervalDays,
      intensity: event.intensity,
    });
  }

  return next;
}

export function rainIntensityLabel(intensity: RainIntensity): string {
  switch (intensity) {
    case "moderate":
      return "Lluvia moderada";
    case "heavy":
      return "Lluvia fuerte";
    case "none":
      return "No cuenta";
  }
}
