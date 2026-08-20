import type { Plant } from "@prisma/client";
import { prisma } from "./db";
import {
  addDays,
  computeEffectiveNextWateredAt,
  computeNextWateredAt,
  getEffectiveLastWateredAt,
  getNextSaturday,
  getScheduledFertilizerAt,
  getScheduledPestAt,
  markWateredAt,
  startOfDay,
} from "./schedule";
import type { CareEventType, Season } from "./types";
import {
  CARE_PRODUCT_LABELS,
  ensureTreatmentProduct,
  findTreatment,
  formatTreatmentActionNote,
  getDefaultProductName,
  getTreatmentByType,
  migrateLegacyPestNotesToTreatments,
  serializeCareTreatments,
  type PlantTreatment,
  type TreatmentType,
} from "./treatments";

export type PlantInput = {
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  isIndoor?: boolean;
  waterSummerDays?: number;
  waterWinterDays?: number;
  rainPostponeDays?: number;
  needsPruning?: boolean;
  nextPruneAt?: string | null;
  pruneNotes?: string | null;
  needsPest?: boolean;
  nextPestAt?: string | null;
  careTreatments?: PlantTreatment[] | null;
  pestNotes?: string | null;
  lastWateredAt?: string | null;
};

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  return startOfDay(new Date(value));
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

  const effectiveLast = getEffectiveLastWateredAt(
    { lastWateredAt: userLastWatered, isIndoor },
    lastGlobalRainAt,
  );
  const schedulePlant = { ...plantLike, lastWateredAt: effectiveLast };

  if (effectiveLast) {
    const schedule = markWateredAt(schedulePlant, effectiveLast, seasonOverride);
    return {
      lastWateredAt: schedule.lastWateredAt,
      nextWateredAt: schedule.nextWateredAt,
    };
  }

  return {
    lastWateredAt: null,
    nextWateredAt: computeNextWateredAt(schedulePlant, new Date(), seasonOverride),
  };
}

export type GardenSettingsData = {
  lastRainAt: Date | null;
  seasonOverride: Season | null;
};

function parseSeasonOverride(value: string | null | undefined): Season | null {
  if (value === "summer" || value === "winter") {
    return value;
  }

  return null;
}

export async function getGardenSettings(): Promise<GardenSettingsData> {
  const settings = await prisma.gardenSettings.findUnique({
    where: { id: "singleton" },
  });

  let lastRainAt = settings?.lastRainAt
    ? startOfDay(settings.lastRainAt)
    : null;

  if (!lastRainAt) {
    const latestRainEvent = await prisma.careEvent.findFirst({
      where: { type: "rain_skip" },
      orderBy: { happenedAt: "desc" },
      select: { happenedAt: true },
    });

    if (latestRainEvent) {
      lastRainAt = startOfDay(latestRainEvent.happenedAt);
      await recordGlobalRain(lastRainAt);
    }
  }

  return {
    lastRainAt,
    seasonOverride: parseSeasonOverride(settings?.seasonOverride),
  };
}

export async function getLastGlobalRainAt(): Promise<Date | null> {
  const settings = await getGardenSettings();
  return settings.lastRainAt;
}

export async function setSeasonOverride(override: Season | null) {
  await prisma.gardenSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", seasonOverride: override },
    update: { seasonOverride: override },
  });

  await recalculateAllWaterSchedules(override);
}

async function recalculateAllWaterSchedules(seasonOverride: Season | null) {
  const lastGlobalRainAt = await getLastGlobalRainAt();
  const plants = await prisma.plant.findMany();
  const today = new Date();

  for (const plant of plants) {
    const effectiveLast = getEffectiveLastWateredAt(plant, lastGlobalRainAt);
    const nextWateredAt = computeEffectiveNextWateredAt(
      { ...plant, lastWateredAt: effectiveLast },
      lastGlobalRainAt,
      today,
      seasonOverride,
    );

    await prisma.plant.update({
      where: { id: plant.id },
      data: { nextWateredAt },
    });
  }
}

async function recordGlobalRain(happenedAt: Date = new Date()) {
  const rainAt = startOfDay(happenedAt);

  await prisma.gardenSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", lastRainAt: rainAt },
    update: { lastRainAt: rainAt },
  });

  return rainAt;
}

export async function listPlants() {
  return prisma.plant.findMany({
    orderBy: { name: "asc" },
    include: {
      photos: {
        where: { eventId: null },
        take: 1,
      },
    },
  });
}

export async function getPlantById(id: string) {
  return prisma.plant.findUnique({
    where: { id },
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

export async function createPlant(input: PlantInput) {
  const gardenSettings = await getGardenSettings();
  const waterSchedule = buildInitialWaterSchedule(
    input,
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );

  return prisma.plant.create({
    data: {
      name: input.name.trim(),
      species: input.species?.trim() || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      coverPhotoPath: input.coverPhotoPath ?? null,
      isIndoor: input.isIndoor ?? false,
      waterSummerDays: input.waterSummerDays ?? 2,
      waterWinterDays: input.waterWinterDays ?? 5,
      rainPostponeDays: input.rainPostponeDays ?? 2,
      needsPruning: input.needsPruning ?? false,
      nextPruneAt: input.needsPruning
        ? parseOptionalDate(input.nextPruneAt)
        : null,
      pruneNotes: input.needsPruning
        ? input.pruneNotes?.trim() || null
        : null,
      needsPest: false,
      nextPestAt: null,
      careProducts: normalizeCareTreatments(input),
      pestNotes: null,
      lastWateredAt: waterSchedule.lastWateredAt,
      nextWateredAt: waterSchedule.nextWateredAt,
    },
  });
}

export async function updatePlant(id: string, input: PlantInput) {
  const existing = await prisma.plant.findUniqueOrThrow({ where: { id } });
  const gardenSettings = await getGardenSettings();
  const waterSchedule = buildInitialWaterSchedule(
    {
      ...input,
      isIndoor: input.isIndoor ?? existing.isIndoor,
      lastWateredAt:
        input.lastWateredAt ??
        existing.lastWateredAt?.toISOString().slice(0, 10) ??
        null,
    },
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );

  return prisma.plant.update({
    where: { id },
    data: {
      name: input.name.trim(),
      species: input.species?.trim() || null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      coverPhotoPath: input.coverPhotoPath ?? existing.coverPhotoPath,
      isIndoor: input.isIndoor ?? existing.isIndoor,
      waterSummerDays: input.waterSummerDays ?? existing.waterSummerDays,
      waterWinterDays: input.waterWinterDays ?? existing.waterWinterDays,
      rainPostponeDays: input.rainPostponeDays ?? existing.rainPostponeDays,
      needsPruning: input.needsPruning ?? false,
      nextPruneAt: input.needsPruning
        ? parseOptionalDate(input.nextPruneAt)
        : null,
      pruneNotes: input.needsPruning
        ? input.pruneNotes?.trim() || null
        : null,
      needsPest: existing.needsPest,
      nextPestAt: existing.nextPestAt,
      careProducts: normalizeCareTreatments(input, existing),
      pestNotes: existing.pestNotes,
      treatmentType: existing.treatmentType,
      lastWateredAt: waterSchedule.lastWateredAt,
      nextWateredAt: waterSchedule.nextWateredAt,
    },
  });
}

export async function deletePlant(id: string) {
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
  const gardenSettings = await getGardenSettings();
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

    const event = await tx.careEvent.create({
      data: {
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
  await recordGlobalRain(happenedAt);
  const plants = await prisma.plant.findMany({ where: { isIndoor: false } });
  const results = [];

  for (const plant of plants) {
    results.push(await performPlantAction(plant, "rain_skip", { happenedAt }));
  }

  return results;
}

export async function createPlantNote(
  plantId: string,
  notes: string,
  happenedAt: Date = new Date(),
  photoPaths: string[] = [],
) {
  return performPlantAction(
    await prisma.plant.findUniqueOrThrow({ where: { id: plantId } }),
    "note",
    { notes, happenedAt, photoPaths },
  );
}

export function getPlantScheduleSummary(
  plant: Plant,
  lastGlobalRainAt: Date | null = null,
  seasonOverride: Season | null = null,
) {
  return {
    nextWateredAt: computeEffectiveNextWateredAt(
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

export async function scheduleFertilizer(
  plantId: string,
  options?: {
    nextFertilizerAt?: string | null;
    notes?: string | null;
  },
) {
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
    treatmentType && treatmentType in CARE_PRODUCT_LABELS
      ? CARE_PRODUCT_LABELS[treatmentType as TreatmentType]
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
  const plant = await prisma.plant.findUniqueOrThrow({ where: { id: plantId } });
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

  if (treatmentType === "otro" && !notes) {
    throw new Error("Poné un nombre para el tratamiento");
  }

  let treatments = getPlantCareTreatments(plant);
  if (notes) {
    treatments = ensureTreatmentProduct(
      treatments,
      treatmentType,
      notes,
      options?.treatmentLabel ?? undefined,
    );
  }

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
  plant: Pick<Plant, "careProducts" | "pestNotes">,
): PlantTreatment[] {
  return migrateLegacyPestNotesToTreatments(
    plant.careProducts,
    plant.pestNotes,
  );
}

/** @deprecated Use getPlantCareTreatments */
export function getPlantCareProducts(
  plant: Pick<Plant, "careProducts" | "pestNotes">,
) {
  return getPlantCareTreatments(plant).flatMap((treatment) =>
    treatment.products.map((name) => ({
      name,
      type: treatment.type,
    })),
  );
}

export function schedulePruneReminder(
  plant: Plant,
  daysFromNow: number = 90,
): Date {
  return addDays(startOfDay(new Date()), daysFromNow);
}
