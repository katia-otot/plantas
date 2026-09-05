import type { Plant } from "@prisma/client";
import { prisma } from "./db";
import { assertPlantInGarden, resolveGardenId } from "./garden-access";
import {
  computeEffectiveNextWateredAt,
  computeNextWateredAt,
  getEffectiveLastWateredAt,
  getNextSaturday,
  getScheduledFertilizerAt,
  getScheduledPestAt,
  markWateredAt,
  resolveNextWateredAt,
  startOfDay,
} from "./schedule";
import { parseCalendarDate, toInputDate } from "./format";
import { mergeNotesIntoObservations } from "./plant-text";
import {
  DEFAULT_NOTIFY_WEEKDAY_TIME,
  DEFAULT_NOTIFY_WEEKEND_TIME,
  type NotificationSchedule,
  parseNotifyTime,
} from "./notification-schedule";
import {
  ACTIVE_PLANT_STATUS,
  isPlantStatus,
  normalizePlantStatus,
  type CareEventType,
  type PlantStatus,
  type Season,
} from "./types";
import {
  ensureTreatmentProduct,
  findTreatment,
  formatTreatmentActionNote,
  getDefaultProductName,
  getPruneDescription,
  getTreatmentByType,
  migrateLegacyPestNotesToTreatments,
  serializeCareTreatments,
  TREATMENT_TYPE_LABELS,
  withLegacyPruneTreatment,
  type PlantTreatment,
  type TreatmentType,
} from "./treatments";

export type PlantInput = {
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  status?: PlantStatus | string | null;
  isIndoor?: boolean;
  quantity?: number;
  waterSummerDays?: number;
  waterWinterDays?: number;
  rainPostponeDays?: number;
  bidones?: string | null;
  needsPruning?: boolean;
  nextPruneAt?: string | null;
  pruneNotes?: string | null;
  needsPest?: boolean;
  nextPestAt?: string | null;
  careTreatments?: PlantTreatment[] | null;
  pestNotes?: string | null;
  lastWateredAt?: string | null;
  frostResistance?: string | null;
  soilType?: string | null;
  fertilizerType?: string | null;
  observations?: string | null;
};

/** Only keys present in the patch are written to the DB. */
export type PlantPatch = Partial<PlantInput>;

export { mergeNotesIntoObservations } from "./plant-text";

/** Prisma `where` for plants that get Hoy / rain / upcoming cares. */
export const activePlantWhere = { status: ACTIVE_PLANT_STATUS } as const;

function parseOptionalDate(value?: string | null): Date | null {
  return parseCalendarDate(value);
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.trim() || null;
}

function normalizeCareTreatments(
  input: PlantInput,
  existing?: { careProducts: string | null; pestNotes: string | null },
): string | null {
  if (input.careTreatments) {
    return serializeCareTreatments(input.careTreatments);
  }

  if (existing) {
    return serializeCareTreatments(
      migrateLegacyPestNotesToTreatments(
        existing.careProducts,
        existing.pestNotes,
      ),
    );
  }

  return null;
}

function pruneFieldsFromTreatments(treatments: PlantTreatment[] | null | undefined) {
  const description = getPruneDescription(treatments ?? []);
  const hasPoda = Boolean(getTreatmentByType(treatments ?? [], "poda"));
  return { hasPoda, description };
}

function resolveProductNote(
  plant: Pick<Plant, "careProducts" | "pestNotes">,
  type: TreatmentType,
  notes?: string | null,
): string | null {
  const trimmed = notes?.trim();
  if (trimmed) {
    return trimmed;
  }

  const treatments = migrateLegacyPestNotesToTreatments(
    plant.careProducts,
    plant.pestNotes,
  );
  return getDefaultProductName(treatments, type);
}

export function buildInitialWaterSchedule(
  input: Pick<
    PlantInput,
    "waterSummerDays" | "waterWinterDays" | "lastWateredAt" | "isIndoor"
  >,
  lastGlobalRainAt: Date | null = null,
  seasonOverride: Season | null = null,
): { lastWateredAt: Date | null; nextWateredAt: Date } {
  const userLastWatered = parseOptionalDate(input.lastWateredAt);
  const isIndoor = input.isIndoor ?? false;
  const plantLike = {
    waterSummerDays: input.waterSummerDays ?? 2,
    waterWinterDays: input.waterWinterDays ?? 5,
    lastWateredAt: userLastWatered,
    isIndoor,
  };

  // Rain can advance the *next* watering, but must not overwrite the stored
  // "último riego" the user entered.
  const effectiveLast = getEffectiveLastWateredAt(
    { lastWateredAt: userLastWatered, isIndoor },
    lastGlobalRainAt,
  );

  if (effectiveLast) {
    const schedule = markWateredAt(
      {
        waterSummerDays: plantLike.waterSummerDays,
        waterWinterDays: plantLike.waterWinterDays,
      },
      effectiveLast,
      seasonOverride,
    );
    return {
      lastWateredAt: userLastWatered,
      nextWateredAt: schedule.nextWateredAt,
    };
  }

  return {
    lastWateredAt: null,
    nextWateredAt: computeNextWateredAt(plantLike, new Date(), seasonOverride),
  };
}

export type GardenSettingsData = {
  lastRainAt: Date | null;
  seasonOverride: Season | null;
  notificationSchedule: NotificationSchedule;
};

function parseSeasonOverride(value: string | null | undefined): Season | null {
  if (value === "summer" || value === "winter") {
    return value;
  }

  return null;
}

export async function getGardenSettings(
  gardenId?: string,
): Promise<GardenSettingsData> {
  const gid = await resolveGardenId(gardenId);
  const { migrateLegacyLastRainAt } = await import("@/lib/rain-days");
  await migrateLegacyLastRainAt(gid);

  const settings = await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid },
    update: {},
  });

  let lastRainAt = settings.lastRainAt
    ? startOfDay(settings.lastRainAt)
    : null;

  if (!lastRainAt) {
    const latestRainEvent = await prisma.careEvent.findFirst({
      where: { type: "rain_skip", gardenId: gid },
      orderBy: { happenedAt: "desc" },
      select: { happenedAt: true },
    });

    if (latestRainEvent) {
      lastRainAt = startOfDay(latestRainEvent.happenedAt);
      await recordGlobalRain(lastRainAt, gid);
    }
  }

  return {
    lastRainAt,
    seasonOverride: parseSeasonOverride(settings.seasonOverride),
    notificationSchedule: {
      weekdayTime:
        parseNotifyTime(settings.notifyWeekdayTime) ??
        DEFAULT_NOTIFY_WEEKDAY_TIME,
      weekendTime:
        parseNotifyTime(settings.notifyWeekendTime) ??
        DEFAULT_NOTIFY_WEEKEND_TIME,
    },
  };
}

export async function getNotificationSchedule(
  gardenId?: string,
): Promise<NotificationSchedule> {
  const settings = await getGardenSettings(gardenId);
  return settings.notificationSchedule;
}

export async function setNotificationSchedule(
  schedule: NotificationSchedule,
  gardenId?: string,
): Promise<NotificationSchedule> {
  const weekdayTime = parseNotifyTime(schedule.weekdayTime);
  const weekendTime = parseNotifyTime(schedule.weekendTime);
  if (!weekdayTime || !weekendTime) {
    throw new Error("Horario de avisos inválido");
  }

  const gid = await resolveGardenId(gardenId);
  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: {
      gardenId: gid,
      notifyWeekdayTime: weekdayTime,
      notifyWeekendTime: weekendTime,
    },
    update: {
      notifyWeekdayTime: weekdayTime,
      notifyWeekendTime: weekendTime,
    },
  });

  return { weekdayTime, weekendTime };
}

export async function markNotificationSent(
  sentAt = new Date(),
  gardenId?: string,
): Promise<void> {
  const gid = await resolveGardenId(gardenId);
  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid, lastNotifySentAt: sentAt },
    update: { lastNotifySentAt: sentAt },
  });
}

export async function getLastNotificationSentAt(
  gardenId?: string,
): Promise<Date | null> {
  const gid = await resolveGardenId(gardenId);
  const settings = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
    select: { lastNotifySentAt: true },
  });
  return settings?.lastNotifySentAt ?? null;
}

export async function getLastGlobalRainAt(
  gardenId?: string,
): Promise<Date | null> {
  const settings = await getGardenSettings(gardenId);
  return settings.lastRainAt;
}

export async function setSeasonOverride(override: Season | null) {
  const gid = await resolveGardenId();
  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid, seasonOverride: override },
    update: { seasonOverride: override },
  });

  await recalculateAllWaterSchedules(override, gid);
}

async function recalculateAllWaterSchedules(
  seasonOverride: Season | null,
  gardenId?: string,
) {
  const { rebuildOutdoorWaterSchedules } = await import("@/lib/rain-days");
  const gid = await resolveGardenId(gardenId);
  await rebuildOutdoorWaterSchedules(gid, seasonOverride);

  // Indoor plants: recompute from lastWateredAt only (rain ignored).
  const plants = await prisma.plant.findMany({
    where: { gardenId: gid, isIndoor: true },
  });
  const today = new Date();
  for (const plant of plants) {
    const nextWateredAt = computeNextWateredAt(plant, today, seasonOverride);
    await prisma.plant.update({
      where: { id: plant.id },
      data: { nextWateredAt },
    });
  }
}

async function recordGlobalRain(
  happenedAt: Date = new Date(),
  gardenId?: string,
) {
  const gid = await resolveGardenId(gardenId);
  const rainAt = startOfDay(happenedAt);

  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid, lastRainAt: rainAt },
    update: { lastRainAt: rainAt },
  });

  return rainAt;
}

export async function listPlants(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  return prisma.plant.findMany({
    where: { gardenId: gid },
    orderBy: { name: "asc" },
    include: {
      photos: {
        where: { eventId: null },
        take: 1,
      },
    },
  });
}

/** Plants in the patio (`alta`) — used for Hoy tasks, rain, upcoming cares. */
export async function listActivePlants(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  return prisma.plant.findMany({
    where: { gardenId: gid, ...activePlantWhere },
    orderBy: { name: "asc" },
    include: {
      photos: {
        where: { eventId: null },
        take: 1,
      },
    },
  });
}

export async function getPlantById(id: string, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  return prisma.plant.findFirst({
    where: { id, gardenId: gid },
    include: {
      events: {
        orderBy: { happenedAt: "desc" },
        include: { photos: true },
      },
      photos: {
        where: { eventId: null },
      },
    },
  });
}

export async function createPlant(input: PlantInput, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const gardenSettings = await getGardenSettings(gid);
  const waterSchedule = buildInitialWaterSchedule(
    input,
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );

  const treatments = input.careTreatments ?? [];
  const { hasPoda, description } = pruneFieldsFromTreatments(treatments);

  return prisma.plant.create({
    data: {
      gardenId: gid,
      name: input.name.trim(),
      species: input.species?.trim() || null,
      location: input.location?.trim() || null,
      notes: null,
      coverPhotoPath: input.coverPhotoPath ?? null,
      status: normalizePlantStatus(input.status),
      isIndoor: input.isIndoor ?? false,
      quantity: Math.max(1, Math.round(input.quantity ?? 1)),
      waterSummerDays: input.waterSummerDays ?? 2,
      waterWinterDays: input.waterWinterDays ?? 5,
      rainPostponeDays: input.rainPostponeDays ?? 2,
      bidones: input.bidones?.trim() || null,
      needsPruning: hasPoda ? Boolean(input.needsPruning) : false,
      nextPruneAt:
        hasPoda && input.needsPruning
          ? parseOptionalDate(input.nextPruneAt)
          : null,
      pruneNotes: hasPoda
        ? description || input.pruneNotes?.trim() || null
        : null,
      needsPest: false,
      nextPestAt: null,
      careProducts: normalizeCareTreatments(input),
      pestNotes: null,
      lastWateredAt: waterSchedule.lastWateredAt,
      nextWateredAt: waterSchedule.nextWateredAt,
      frostResistance: input.frostResistance?.trim() || null,
      soilType: input.soilType?.trim() || null,
      fertilizerType: input.fertilizerType?.trim() || null,
      observations: mergeNotesIntoObservations(
        input.observations,
        input.notes,
      ),
    },
  });
}

export async function updatePlant(id: string, input: PlantPatch) {
  const existing = await assertPlantInGarden(id);
  const data: Record<string, unknown> = {};

  if (hasOwn(input, "name")) {
    const name = input.name?.trim();
    if (!name) {
      throw new Error("El nombre es obligatorio");
    }
    data.name = name;
  }
  if (hasOwn(input, "species")) {
    data.species = trimOrNull(input.species);
  }
  if (hasOwn(input, "location")) {
    data.location = trimOrNull(input.location);
  }
  if (hasOwn(input, "notes") || hasOwn(input, "observations")) {
    const nextObservations = mergeNotesIntoObservations(
      hasOwn(input, "observations")
        ? input.observations
        : existing.observations,
      hasOwn(input, "notes")
        ? input.notes
        : hasOwn(input, "observations")
          ? null
          : existing.notes,
    );
    data.observations = nextObservations;
    data.notes = null;
  }
  if (hasOwn(input, "coverPhotoPath")) {
    data.coverPhotoPath = input.coverPhotoPath?.trim() || null;
  }
  if (hasOwn(input, "status") && input.status != null) {
    data.status = normalizePlantStatus(input.status);
  }
  if (hasOwn(input, "isIndoor")) {
    data.isIndoor = Boolean(input.isIndoor);
  }
  if (hasOwn(input, "quantity")) {
    data.quantity = Math.max(1, Math.round(input.quantity ?? existing.quantity));
  }
  if (hasOwn(input, "waterSummerDays")) {
    data.waterSummerDays = input.waterSummerDays ?? existing.waterSummerDays;
  }
  if (hasOwn(input, "waterWinterDays")) {
    data.waterWinterDays = input.waterWinterDays ?? existing.waterWinterDays;
  }
  if (hasOwn(input, "rainPostponeDays")) {
    data.rainPostponeDays = input.rainPostponeDays ?? existing.rainPostponeDays;
  }
  if (hasOwn(input, "bidones")) {
    data.bidones = trimOrNull(input.bidones);
  }
  if (hasOwn(input, "careTreatments")) {
    data.careProducts = input.careTreatments
      ? serializeCareTreatments(input.careTreatments)
      : null;
    const { hasPoda, description } = pruneFieldsFromTreatments(
      input.careTreatments,
    );
    if (!hasPoda) {
      data.needsPruning = false;
      data.nextPruneAt = null;
      data.pruneNotes = null;
    } else if (description) {
      data.pruneNotes = description;
    }
  }
  if (hasOwn(input, "needsPruning") && !hasOwn(input, "careTreatments")) {
    data.needsPruning = Boolean(input.needsPruning);
    if (input.needsPruning) {
      if (hasOwn(input, "nextPruneAt")) {
        data.nextPruneAt = parseOptionalDate(input.nextPruneAt);
      }
      if (hasOwn(input, "pruneNotes")) {
        data.pruneNotes = trimOrNull(input.pruneNotes);
      }
    } else {
      data.nextPruneAt = null;
      data.pruneNotes = null;
    }
  } else if (!hasOwn(input, "careTreatments")) {
    if (hasOwn(input, "nextPruneAt") && existing.needsPruning) {
      data.nextPruneAt = parseOptionalDate(input.nextPruneAt);
    }
    if (hasOwn(input, "pruneNotes") && existing.needsPruning) {
      data.pruneNotes = trimOrNull(input.pruneNotes);
    }
  }
  if (hasOwn(input, "frostResistance")) {
    data.frostResistance = trimOrNull(input.frostResistance);
  }
  if (hasOwn(input, "soilType")) {
    data.soilType = trimOrNull(input.soilType);
  }
  if (hasOwn(input, "fertilizerType")) {
    data.fertilizerType = trimOrNull(input.fertilizerType);
  }

  const waterFieldsChanged =
    hasOwn(input, "lastWateredAt") ||
    hasOwn(input, "waterSummerDays") ||
    hasOwn(input, "waterWinterDays") ||
    hasOwn(input, "isIndoor");

  if (waterFieldsChanged) {
    const gardenSettings = await getGardenSettings();
    const waterSchedule = buildInitialWaterSchedule(
      {
        waterSummerDays:
          input.waterSummerDays ?? existing.waterSummerDays,
        waterWinterDays:
          input.waterWinterDays ?? existing.waterWinterDays,
        isIndoor: input.isIndoor ?? existing.isIndoor,
        lastWateredAt: hasOwn(input, "lastWateredAt")
          ? input.lastWateredAt ?? null
          : toInputDate(existing.lastWateredAt) || null,
      },
      gardenSettings.lastRainAt,
      gardenSettings.seasonOverride,
    );
    data.lastWateredAt = waterSchedule.lastWateredAt;
    data.nextWateredAt = waterSchedule.nextWateredAt;
  }

  if (Object.keys(data).length === 0) {
    return existing;
  }

  return prisma.plant.update({
    where: { id },
    data,
  });
}

/** Status-only update for quick changes from the plants list. */
export async function updatePlantStatus(id: string, status: PlantStatus) {
  if (!isPlantStatus(status)) {
    throw new Error("Estado inválido");
  }

  await assertPlantInGarden(id);
  return prisma.plant.update({
    where: { id },
    data: { status: normalizePlantStatus(status) },
  });
}

export async function updatePlantMapPin(
  id: string,
  pin: { mapX: number | null; mapY: number | null; mapSize?: number | null },
) {
  await assertPlantInGarden(id);
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const clearing = pin.mapX == null || pin.mapY == null;

  return prisma.plant.update({
    where: { id },
    data: clearing
      ? { mapX: null, mapY: null, mapSize: null }
      : {
          mapX: clamp(pin.mapX!, 0, 100),
          mapY: clamp(pin.mapY!, 0, 100),
          mapSize:
            pin.mapSize == null ? undefined : clamp(pin.mapSize, 4, 28),
        },
  });
}

export async function updatePlantCoverPhoto(
  id: string,
  coverPhotoPath: string | null,
) {
  await assertPlantInGarden(id);
  return prisma.plant.update({
    where: { id },
    data: {
      coverPhotoPath: coverPhotoPath?.trim() || null,
    },
  });
}

export async function deletePlant(id: string) {
  await assertPlantInGarden(id);
  return prisma.plant.delete({ where: { id } });
}

export async function performPlantAction(
  plant: Plant,
  action: CareEventType,
  options?: {
    notes?: string;
    happenedAt?: Date;
    photoPaths?: string[];
    treatmentType?: TreatmentType;
    treatmentLabel?: string | null;
  },
) {
  const happenedAt = options?.happenedAt ?? new Date();
  const notes = options?.notes?.trim() || null;
  const photoPaths = options?.photoPaths ?? [];
  const gardenSettings = await getGardenSettings(plant.gardenId);
  const treatments = getPlantCareTreatments(plant);
  const pestTreatment =
    options?.treatmentType &&
    findTreatment(
      treatments,
      options.treatmentType,
      options.treatmentLabel,
    );
  const eventNotes =
    action === "prune" && !notes && plant.pruneNotes
      ? plant.pruneNotes
      : action === "fertilizer" && !notes
        ? plant.fertilizerNotes ||
          (() => {
            const fertilizer = getTreatmentByType(treatments, "fertilizante");
            return fertilizer
              ? formatTreatmentActionNote(fertilizer)
              : null;
          })()
        : action === "pest" && !notes
          ? pestTreatment
            ? formatTreatmentActionNote(pestTreatment)
            : formatTreatmentNote(plant.treatmentType, plant.pestNotes)
          : action === "pest" && notes && options?.treatmentType
            ? formatTreatmentActionNote(
                pestTreatment ?? {
                  type: options.treatmentType,
                  products: [notes],
                },
                notes,
              )
            : notes;

  let updateData: Partial<Plant> = {};

  switch (action) {
    case "watering": {
      const schedule = markWateredAt(
        plant,
        happenedAt,
        gardenSettings.seasonOverride,
      );
      updateData = {
        lastWateredAt: schedule.lastWateredAt,
        nextWateredAt: schedule.nextWateredAt,
      };
      break;
    }
    case "rain_skip": {
      // Rain advances next watering but must not overwrite stored "último riego".
      const schedule = markWateredAt(
        plant,
        happenedAt,
        gardenSettings.seasonOverride,
      );
      updateData = {
        nextWateredAt: schedule.nextWateredAt,
      };
      break;
    }
    case "fertilizer": {
      updateData = {
        lastFertilizedAt: startOfDay(happenedAt),
        needsFertilizer: false,
        nextFertilizerAt: null,
        fertilizerNotes: null,
      };
      break;
    }
    case "prune": {
      updateData = {
        needsPruning: false,
        nextPruneAt: null,
        pruneNotes: null,
      };
      break;
    }
    case "pest": {
      updateData = {
        lastPestAt: startOfDay(happenedAt),
        needsPest: false,
        nextPestAt: null,
        pestNotes: null,
        treatmentType: null,
      };
      break;
    }
    case "note":
      break;
    default:
      throw new Error("Acción no soportada");
  }

  return prisma.$transaction(async (tx) => {
    const updatedPlant = await tx.plant.update({
      where: { id: plant.id },
      data: updateData,
    });

    // Rain history is one patio-wide entry from applyRainToAllPlants.
    if (action === "rain_skip") {
      return { plant: updatedPlant, event: null };
    }

    const event = await tx.careEvent.create({
      data: {
        gardenId: plant.gardenId,
        plantId: plant.id,
        type: action,
        happenedAt,
        notes: eventNotes,
      },
    });

    if (photoPaths.length > 0) {
      await tx.photo.createMany({
        data: photoPaths.map((path) => ({
          path,
          plantId: plant.id,
          eventId: event.id,
        })),
      });
    }

    return { plant: updatedPlant, event };
  });
}

export async function applyRainToAllPlants(happenedAt: Date = new Date()) {
  const { setTodaysRainIntensity } = await import("@/lib/rain-days");
  const result = await setTodaysRainIntensity("heavy", happenedAt);
  return {
    plantsUpdated: result.plantsUpdated,
    alreadyRecorded: !result.changed,
    intensity: result.rainDay.intensity,
  };
}

export async function undoTodaysRain(now: Date = new Date()) {
  const { setTodaysRainIntensity } = await import("@/lib/rain-days");
  const result = await setTodaysRainIntensity("none", now);
  return {
    lastRainAt: null as Date | null,
    plantCount: result.plantsUpdated,
    intensity: result.rainDay.intensity,
  };
}

export function rainedOnDate(
  lastRainAt: Date | null | undefined,
  day: Date = new Date(),
): boolean {
  if (!lastRainAt) {
    return false;
  }
  return startOfDay(lastRainAt).getTime() === startOfDay(day).getTime();
}

export function getPlantScheduleSummary(
  plant: Plant,
  lastGlobalRainAt: Date | null = null,
  seasonOverride: Season | null = null,
) {
  return {
    nextWateredAt: resolveNextWateredAt(
      plant,
      lastGlobalRainAt,
      new Date(),
      seasonOverride,
    ),
    nextFertilizerAt: getScheduledFertilizerAt(plant),
    nextPestAt: getScheduledPestAt(plant),
    nextPruneAt: plant.needsPruning ? plant.nextPruneAt : null,
  };
}

export async function scheduleWatering(
  plantId: string,
  options?: {
    nextWateredAt?: string | null;
  },
) {
  const plant = await assertPlantInGarden(plantId);
  const nextWateredAt = options?.nextWateredAt
    ? parseOptionalDate(options.nextWateredAt)
    : getNextSaturday();

  if (!nextWateredAt) {
    throw new Error("Fecha inválida");
  }

  return prisma.$transaction(async (tx) => {
    const updatedPlant = await tx.plant.update({
      where: { id: plantId },
      data: { nextWateredAt },
    });

    const event = await tx.careEvent.create({
      data: {
        gardenId: plant.gardenId,
        plantId,
        type: "water_scheduled",
        happenedAt: new Date(),
        notes: `Programado para ${nextWateredAt.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "short",
        })}`,
      },
    });

    return { plant: updatedPlant, event };
  });
}

export async function resetWaterSchedule(plantId: string) {
  const plant = await assertPlantInGarden(plantId);
  const gardenSettings = await getGardenSettings(plant.gardenId);
  const nextWateredAt = computeEffectiveNextWateredAt(
    plant,
    gardenSettings.lastRainAt,
    new Date(),
    gardenSettings.seasonOverride,
  );

  return prisma.plant.update({
    where: { id: plantId },
    data: { nextWateredAt },
  });
}

export async function scheduleFertilizer(
  plantId: string,
  options?: {
    nextFertilizerAt?: string | null;
    notes?: string | null;
  },
) {
  const plant = await assertPlantInGarden(plantId);
  const nextFertilizerAt = options?.nextFertilizerAt
    ? parseOptionalDate(options.nextFertilizerAt)
    : getNextSaturday();
  const notes = options?.notes?.trim() || null;

  if (!nextFertilizerAt) {
    throw new Error("Fecha inválida");
  }

  return prisma.$transaction(async (tx) => {
    const updatedPlant = await tx.plant.update({
      where: { id: plantId },
      data: {
        needsFertilizer: true,
        nextFertilizerAt,
        fertilizerNotes: notes,
      },
    });

    const event = await tx.careEvent.create({
      data: {
        gardenId: plant.gardenId,
        plantId,
        type: "fertilizer_scheduled",
        happenedAt: new Date(),
        notes:
          notes ??
          `Programado para ${nextFertilizerAt.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}`,
      },
    });

    return { plant: updatedPlant, event };
  });
}

export async function cancelFertilizer(plantId: string) {
  await assertPlantInGarden(plantId);
  return prisma.plant.update({
    where: { id: plantId },
    data: {
      needsFertilizer: false,
      nextFertilizerAt: null,
      fertilizerNotes: null,
    },
  });
}

function formatTreatmentNote(
  treatmentType: string | null | undefined,
  productName: string | null | undefined,
): string | null {
  const typeLabel =
    treatmentType && treatmentType in TREATMENT_TYPE_LABELS
      ? TREATMENT_TYPE_LABELS[treatmentType as TreatmentType]
      : null;

  if (typeLabel && productName) {
    return `${typeLabel}: ${productName}`;
  }

  return productName || typeLabel || null;
}

export async function schedulePestTreatment(
  plantId: string,
  options?: {
    nextPestAt?: string | null;
    notes?: string | null;
    treatmentType?: TreatmentType | null;
    treatmentLabel?: string | null;
  },
) {
  const plant = await assertPlantInGarden(plantId);
  const treatmentType: TreatmentType =
    options?.treatmentType === "anti-bichos" ||
    options?.treatmentType === "anti-hongos" ||
    options?.treatmentType === "otro"
      ? options.treatmentType
      : "anti-bichos";

  const nextPestAt = options?.nextPestAt
    ? parseOptionalDate(options.nextPestAt)
    : getNextSaturday();
  const notes = resolveProductNote(plant, treatmentType, options?.notes);

  if (!nextPestAt) {
    throw new Error("Fecha inválida");
  }

  if (!notes) {
    throw new Error(
      treatmentType === "otro"
        ? "Poné un nombre para el tratamiento"
        : "Indicá el producto del tratamiento",
    );
  }

  const treatments = ensureTreatmentProduct(
    getPlantCareTreatments(plant),
    treatmentType,
    notes,
    options?.treatmentLabel ?? undefined,
  );

  const scheduledTreatment =
    treatmentType === "otro"
      ? treatments.find(
          (treatment) =>
            treatment.type === "otro" &&
            (options?.treatmentLabel
              ? treatment.label?.toLowerCase() ===
                options.treatmentLabel.toLowerCase()
              : treatment.products.some(
                  (product) =>
                    product.toLowerCase() === notes?.toLowerCase(),
                )),
        )
      : getTreatmentByType(treatments, treatmentType);

  const eventLabel = scheduledTreatment
    ? formatTreatmentActionNote(scheduledTreatment, notes)
    : formatTreatmentNote(treatmentType, notes);

  return prisma.$transaction(async (tx) => {
    const updatedPlant = await tx.plant.update({
      where: { id: plantId },
      data: {
        needsPest: true,
        nextPestAt,
        pestNotes: notes,
        treatmentType,
        careProducts: serializeCareTreatments(treatments),
      },
    });

    const event = await tx.careEvent.create({
      data: {
        gardenId: plant.gardenId,
        plantId,
        type: "pest_scheduled",
        happenedAt: new Date(),
        notes:
          eventLabel ??
          `Programado para ${nextPestAt.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}`,
      },
    });

    return { plant: updatedPlant, event };
  });
}

export async function cancelPestTreatment(plantId: string) {
  await assertPlantInGarden(plantId);
  return prisma.plant.update({
    where: { id: plantId },
    data: {
      needsPest: false,
      nextPestAt: null,
      pestNotes: null,
      treatmentType: null,
    },
  });
}

export function getPlantCareTreatments(
  plant: Pick<Plant, "careProducts" | "pestNotes" | "pruneNotes" | "needsPruning">,
): PlantTreatment[] {
  return withLegacyPruneTreatment(
    migrateLegacyPestNotesToTreatments(plant.careProducts, plant.pestNotes),
    plant.pruneNotes,
    plant.needsPruning,
  );
}

export async function schedulePrune(
  plantId: string,
  options?: {
    nextPruneAt?: string | null;
    notes?: string | null;
  },
) {
  const plant = await assertPlantInGarden(plantId);
  const nextPruneAt = options?.nextPruneAt
    ? parseOptionalDate(options.nextPruneAt)
    : getNextSaturday();
  const notes =
    options?.notes?.trim() ||
    getPruneDescription(getPlantCareTreatments(plant)) ||
    null;

  if (!nextPruneAt) {
    throw new Error("Fecha inválida");
  }

  let careProducts = plant.careProducts;
  if (notes) {
    careProducts = serializeCareTreatments(
      ensureTreatmentProduct(getPlantCareTreatments(plant), "poda", notes),
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedPlant = await tx.plant.update({
      where: { id: plantId },
      data: {
        needsPruning: true,
        nextPruneAt,
        pruneNotes: notes,
        careProducts,
      },
    });

    const event = await tx.careEvent.create({
      data: {
        gardenId: plant.gardenId,
        plantId,
        type: "prune_scheduled",
        happenedAt: new Date(),
        notes:
          notes ??
          `Programada para ${nextPruneAt.toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}`,
      },
    });

    return { plant: updatedPlant, event };
  });
}

export async function cancelPrune(plantId: string) {
  await assertPlantInGarden(plantId);
  return prisma.plant.update({
    where: { id: plantId },
    data: {
      needsPruning: false,
      nextPruneAt: null,
    },
  });
}
