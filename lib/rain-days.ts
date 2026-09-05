import type { Plant } from "@prisma/client";
import {
  addCalendarDays,
  calendarDateToDate,
  todayCalendarDateString,
  toCalendarDateString,
} from "@/lib/calendar-date";
import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";
import {
  type RainIntensity,
  applyRainToNextWaterDate,
  isRainIntensity,
  rebuildNextWaterDate,
} from "@/lib/rain-credit";
import {
  getEffectiveSeason,
  getWaterIntervalDays,
  startOfDay,
} from "@/lib/schedule";
import type { Season } from "@/lib/types";
import { formatRainDayLabel } from "@/lib/format";

const ACTIVE_PLANT_WHERE = { status: "alta" } as const;

export type RainDayRecord = {
  id: string;
  rainDate: string;
  intensity: RainIntensity;
  source: string | null;
  version: number;
  updatedAt: Date;
};

function asIntensity(value: string): RainIntensity {
  if (!isRainIntensity(value)) {
    throw new Error(`Intensidad de lluvia inválida: ${value}`);
  }
  return value;
}

export async function listRainDays(
  gardenId?: string,
  limit = 90,
): Promise<RainDayRecord[]> {
  const gid = await resolveGardenId(gardenId);
  const rows = await prisma.rainDay.findMany({
    where: { gardenId: gid },
    orderBy: { rainDate: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    rainDate: row.rainDate,
    intensity: asIntensity(row.intensity),
    source: row.source,
    version: row.version,
    updatedAt: row.updatedAt,
  }));
}

export async function getRainDayForDate(
  rainDate: string,
  gardenId?: string,
): Promise<RainDayRecord | null> {
  const gid = await resolveGardenId(gardenId);
  const row = await prisma.rainDay.findUnique({
    where: { gardenId_rainDate: { gardenId: gid, rainDate } },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    rainDate: row.rainDate,
    intensity: asIntensity(row.intensity),
    source: row.source,
    version: row.version,
    updatedAt: row.updatedAt,
  };
}

async function syncLastRainAt(gardenId: string) {
  const latest = await prisma.rainDay.findFirst({
    where: {
      gardenId,
      intensity: { in: ["moderate", "heavy"] },
    },
    orderBy: { rainDate: "desc" },
  });
  const lastRainAt = latest ? calendarDateToDate(latest.rainDate) : null;
  await prisma.gardenSettings.upsert({
    where: { gardenId },
    create: { gardenId, lastRainAt },
    update: { lastRainAt },
  });
  return lastRainAt;
}

function intervalForPlantOnDate(
  plant: Pick<Plant, "waterSummerDays" | "waterWinterDays">,
  calendarDate: string,
  seasonOverride: Season | null,
): number {
  const date = calendarDateToDate(calendarDate);
  return getWaterIntervalDays(plant, date, seasonOverride);
}

/**
 * Rebuild nextWateredAt for outdoor plants from real waterings + RainDay rows.
 * Indoor plants are left unchanged.
 */
export async function rebuildOutdoorWaterSchedules(
  gardenId?: string,
  seasonOverride?: Season | null,
): Promise<{ plantsUpdated: number }> {
  const gid = await resolveGardenId(gardenId);
  const settings = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
  });
  const override =
    seasonOverride !== undefined
      ? seasonOverride
      : settings?.seasonOverride === "summer" ||
          settings?.seasonOverride === "winter"
        ? (settings.seasonOverride as Season)
        : null;

  const rainDays = await prisma.rainDay.findMany({
    where: { gardenId: gid },
    orderBy: { rainDate: "asc" },
  });

  const plants = await prisma.plant.findMany({
    where: { gardenId: gid, isIndoor: false, ...ACTIVE_PLANT_WHERE },
  });

  let plantsUpdated = 0;
  const todayStr = todayCalendarDateString();

  for (const plant of plants) {
    const wateringEvents = await prisma.careEvent.findMany({
      where: { plantId: plant.id, type: "watering" },
      orderBy: { happenedAt: "asc" },
      select: { happenedAt: true },
    });

    const lastWater =
      wateringEvents.length > 0
        ? wateringEvents[wateringEvents.length - 1]!.happenedAt
        : plant.lastWateredAt;

    let nextDate: string;

    if (!lastWater) {
      // Sin riego base: partir de "pendiente hoy" y reaplicar todas las lluvias
      // (idempotente; no reusa nextWateredAt ya afectado por lluvias).
      let next = todayStr;
      for (const day of rainDays) {
        next = applyRainToNextWaterDate({
          nextWaterDate: next,
          rainDate: day.rainDate,
          intervalDays: intervalForPlantOnDate(plant, day.rainDate, override),
          intensity: asIntensity(day.intensity),
        });
      }
      nextDate = next;
    } else {
      const baselineDate = toCalendarDateString(lastWater);
      const baselineInterval = intervalForPlantOnDate(
        plant,
        baselineDate,
        override,
      );
      const initialNext = addCalendarDays(baselineDate, baselineInterval);

      const waterEventsAfterBaseline = wateringEvents
        .map((event) => ({
          kind: "watering" as const,
          date: toCalendarDateString(event.happenedAt),
          intervalDays: intervalForPlantOnDate(
            plant,
            toCalendarDateString(event.happenedAt),
            override,
          ),
        }))
        .filter((event) => event.date > baselineDate);

      const rainEvents = rainDays
        .filter((day) => day.rainDate >= baselineDate)
        .map((day) => ({
          kind: "rain" as const,
          date: day.rainDate,
          intensity: asIntensity(day.intensity),
        }));

      nextDate = rebuildNextWaterDate({
        initialNextWaterDate: initialNext,
        intervalForDate: (calendarDate) =>
          intervalForPlantOnDate(plant, calendarDate, override),
        events: [...waterEventsAfterBaseline, ...rainEvents],
      });
    }

    const nextWateredAt = startOfDay(calendarDateToDate(nextDate));
    const current = plant.nextWateredAt
      ? startOfDay(plant.nextWateredAt).getTime()
      : null;
    if (current !== nextWateredAt.getTime()) {
      await prisma.plant.update({
        where: { id: plant.id },
        data: { nextWateredAt },
      });
      plantsUpdated += 1;
    }
  }

  return { plantsUpdated };
}

export async function upsertRainDay(args: {
  rainDate: string;
  intensity: RainIntensity;
  source?: string | null;
  gardenId?: string;
}): Promise<{
  rainDay: RainDayRecord;
  changed: boolean;
  plantsUpdated: number;
}> {
  const gid = await resolveGardenId(args.gardenId);
  const existing = await prisma.rainDay.findUnique({
    where: {
      gardenId_rainDate: { gardenId: gid, rainDate: args.rainDate },
    },
  });

  if (existing && existing.intensity === args.intensity) {
    return {
      rainDay: {
        id: existing.id,
        rainDate: existing.rainDate,
        intensity: asIntensity(existing.intensity),
        source: existing.source,
        version: existing.version,
        updatedAt: existing.updatedAt,
      },
      changed: false,
      plantsUpdated: 0,
    };
  }

  const row = await prisma.rainDay.upsert({
    where: {
      gardenId_rainDate: { gardenId: gid, rainDate: args.rainDate },
    },
    create: {
      gardenId: gid,
      rainDate: args.rainDate,
      intensity: args.intensity,
      source: args.source ?? "user",
      version: 1,
    },
    update: {
      intensity: args.intensity,
      source: args.source ?? existing?.source ?? "user",
      version: { increment: 1 },
    },
  });

  await syncLastRainAt(gid);

  // Keep a patio-wide care event note for history compatibility (one per day).
  const rainAt = calendarDateToDate(args.rainDate);
  const dayStart = startOfDay(rainAt);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  await prisma.careEvent.deleteMany({
    where: {
      gardenId: gid,
      type: "rain_skip",
      plantId: null,
      happenedAt: { gte: dayStart, lt: dayEnd },
    },
  });
  if (args.intensity === "moderate" || args.intensity === "heavy") {
    await prisma.careEvent.create({
      data: {
        gardenId: gid,
        plantId: null,
        type: "rain_skip",
        happenedAt: dayStart,
        notes: `${formatRainDayLabel(dayStart)} (${args.intensity === "heavy" ? "fuerte" : "moderada"})`,
      },
    });
  }

  const { plantsUpdated } = await rebuildOutdoorWaterSchedules(gid);

  return {
    rainDay: {
      id: row.id,
      rainDate: row.rainDate,
      intensity: asIntensity(row.intensity),
      source: row.source,
      version: row.version,
      updatedAt: row.updatedAt,
    },
    changed: true,
    plantsUpdated,
  };
}

export async function setTodaysRainIntensity(
  intensity: RainIntensity,
  now = new Date(),
  gardenId?: string,
) {
  const rainDate = todayCalendarDateString(now);
  return upsertRainDay({
    rainDate,
    intensity,
    source: "user",
    gardenId,
  });
}

/**
 * One-time: if there is lastRainAt but no RainDay, store as heavy (legacy full reset).
 */
export async function migrateLegacyLastRainAt(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const settings = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
  });
  if (!settings?.lastRainAt) {
    return { migrated: false as const };
  }
  const rainDate = toCalendarDateString(settings.lastRainAt);
  const existing = await prisma.rainDay.findUnique({
    where: { gardenId_rainDate: { gardenId: gid, rainDate } },
  });
  if (existing) {
    return { migrated: false as const };
  }
  await prisma.rainDay.create({
    data: {
      gardenId: gid,
      rainDate,
      intensity: "heavy",
      source: "legacy_migration",
    },
  });
  return { migrated: true as const, rainDate };
}

export { rainIntensityLabel } from "@/lib/rain-credit";

/** Re-export helper used by pages. */
export function effectiveSeasonFromSettings(
  seasonOverride: string | null | undefined,
  date = new Date(),
): Season {
  const override =
    seasonOverride === "summer" || seasonOverride === "winter"
      ? seasonOverride
      : null;
  return getEffectiveSeason(date, override);
}
