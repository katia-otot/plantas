import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";
import { mergeNotesIntoObservations } from "@/lib/plant-text";
import { getUploadDir } from "@/lib/uploads";

export const BACKUP_VERSION = 1;

type BackupFileEntry =
  | { filename: string; mimeType: string; dataBase64: string }
  | { filename: string; missing: true };

type BackupPhoto = {
  id?: string;
  path: string;
  caption?: string | null;
  eventId?: string | null;
  createdAt?: string;
};

type BackupEvent = {
  id?: string;
  type: string;
  happenedAt: string;
  notes?: string | null;
  createdAt?: string;
  photos?: BackupPhoto[];
};

type BackupPlant = {
  id?: string;
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  isIndoor?: boolean;
  quantity?: number;
  status?: string | null;
  waterSummerDays?: number;
  waterWinterDays?: number;
  rainPostponeDays?: number;
  bidones?: string | null;
  lastWateredAt?: string | null;
  nextWateredAt?: string | null;
  needsFertilizer?: boolean;
  nextFertilizerAt?: string | null;
  fertilizerNotes?: string | null;
  lastFertilizedAt?: string | null;
  needsPruning?: boolean;
  nextPruneAt?: string | null;
  pruneNotes?: string | null;
  needsPest?: boolean;
  nextPestAt?: string | null;
  careProducts?: string | null;
  pestNotes?: string | null;
  treatmentType?: string | null;
  lastPestAt?: string | null;
  frostResistance?: string | null;
  soilType?: string | null;
  fertilizerType?: string | null;
  observations?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  mapSize?: number | null;
  createdAt?: string;
  updatedAt?: string;
  photos?: BackupPhoto[];
  events?: BackupEvent[];
};

type BackupBird = {
  id?: string;
  name: string;
  notes?: string | null;
  coverPhotoPath?: string | null;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

type BackupGardenNote = {
  id?: string;
  title: string;
  body?: string | null;
  category?: string | null;
  done?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PlantasBackup = {
  app?: string;
  version?: number;
  exportedAt?: string;
  settings?: {
    lastRainAt?: string | null;
    seasonOverride?: string | null;
    updatedAt?: string;
  } | null;
  plants?: BackupPlant[];
  birds?: BackupBird[];
  gardenNotes?: BackupGardenNote[];
  /** Patio-wide events (e.g. rain) with no plant. */
  patioEvents?: BackupEvent[];
  files?: Record<string, BackupFileEntry>;
};

function uploadFilenameFromPath(photoPath: string | null | undefined) {
  if (!photoPath) {
    return null;
  }

  const marker = "/api/uploads/";
  const index = photoPath.lastIndexOf(marker);
  if (index === -1) {
    return path.basename(photoPath);
  }

  return path.basename(photoPath.slice(index + marker.length));
}

function mimeFromFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
    default:
      return "image/jpeg";
  }
}

async function readPhotoFile(photoPath: string | null | undefined) {
  const filename = uploadFilenameFromPath(photoPath);
  if (!filename) {
    return null;
  }

  try {
    const buffer = await readFile(
      path.join(/* turbopackIgnore: true */ getUploadDir(), filename),
    );
    return {
      filename,
      mimeType: mimeFromFilename(filename),
      dataBase64: buffer.toString("base64"),
    };
  } catch {
    return {
      filename,
      missing: true as const,
    };
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseBackupJson(raw: string): PlantasBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("El archivo no es un JSON válido");
  }

  const backup = asObject(parsed);
  if (!backup) {
    throw new Error("El respaldo JSON no tiene el formato esperado");
  }

  if (
    backup.app != null &&
    backup.app !== "anthos" &&
    backup.app !== "plantas"
  ) {
    throw new Error('Este JSON no es un respaldo de Anthos');
  }

  if (!Array.isArray(backup.plants)) {
    throw new Error("El respaldo no incluye la lista de plantas");
  }

  return backup as PlantasBackup;
}

async function writeBackupFiles(files: PlantasBackup["files"]) {
  if (!files) {
    return { restored: 0, missing: 0 };
  }

  await mkdir(getUploadDir(), { recursive: true });
  let restored = 0;
  let missing = 0;

  for (const entry of Object.values(files)) {
    if (!entry || typeof entry !== "object" || !("filename" in entry)) {
      continue;
    }
    if ("missing" in entry && entry.missing) {
      missing += 1;
      continue;
    }
    if (!("dataBase64" in entry) || typeof entry.dataBase64 !== "string") {
      missing += 1;
      continue;
    }

    const safeName = path.basename(entry.filename);
    await writeFile(
      path.join(getUploadDir(), safeName),
      Buffer.from(entry.dataBase64, "base64"),
    );
    restored += 1;
  }

  return { restored, missing };
}

export async function buildBackupExport() {
  const gid = await resolveGardenId();
  const [plants, birds, notes, patioEvents, settings] = await Promise.all([
    prisma.plant.findMany({
      where: { gardenId: gid },
      orderBy: { name: "asc" },
      include: {
        events: {
          orderBy: { happenedAt: "desc" },
          include: { photos: true },
        },
        photos: {
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.bird.findMany({
      where: { gardenId: gid },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.gardenNote.findMany({
      where: { gardenId: gid },
      orderBy: { createdAt: "desc" },
    }),
    prisma.careEvent.findMany({
      where: { gardenId: gid, plantId: null },
      orderBy: { happenedAt: "desc" },
      include: { photos: true },
    }),
    prisma.gardenSettings.findUnique({ where: { gardenId: gid } }),
  ]);

  const photoPaths = new Set<string>();
  for (const plant of plants) {
    if (plant.coverPhotoPath) {
      photoPaths.add(plant.coverPhotoPath);
    }
    for (const photo of plant.photos) {
      photoPaths.add(photo.path);
    }
    for (const event of plant.events) {
      for (const photo of event.photos) {
        photoPaths.add(photo.path);
      }
    }
  }
  for (const bird of birds) {
    if (bird.coverPhotoPath) {
      photoPaths.add(bird.coverPhotoPath);
    }
  }

  const files: Record<string, BackupFileEntry> = {};

  await Promise.all(
    [...photoPaths].map(async (photoPath) => {
      const file = await readPhotoFile(photoPath);
      if (file) {
        files[photoPath] = file;
      }
    }),
  );

  return {
    app: "anthos",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settings
      ? {
          lastRainAt: settings.lastRainAt?.toISOString() ?? null,
          seasonOverride: settings.seasonOverride,
          updatedAt: settings.updatedAt.toISOString(),
        }
      : null,
    plants: plants.map((plant) => ({
      id: plant.id,
      name: plant.name,
      species: plant.species,
      location: plant.location,
      notes: null,
      coverPhotoPath: plant.coverPhotoPath,
      isIndoor: plant.isIndoor,
      quantity: plant.quantity,
      status: plant.status,
      waterSummerDays: plant.waterSummerDays,
      waterWinterDays: plant.waterWinterDays,
      rainPostponeDays: plant.rainPostponeDays,
      bidones: plant.bidones,
      lastWateredAt: plant.lastWateredAt?.toISOString() ?? null,
      nextWateredAt: plant.nextWateredAt?.toISOString() ?? null,
      needsFertilizer: plant.needsFertilizer,
      nextFertilizerAt: plant.nextFertilizerAt?.toISOString() ?? null,
      fertilizerNotes: plant.fertilizerNotes,
      lastFertilizedAt: plant.lastFertilizedAt?.toISOString() ?? null,
      needsPruning: plant.needsPruning,
      nextPruneAt: plant.nextPruneAt?.toISOString() ?? null,
      pruneNotes: plant.pruneNotes,
      needsPest: plant.needsPest,
      nextPestAt: plant.nextPestAt?.toISOString() ?? null,
      careProducts: plant.careProducts,
      pestNotes: plant.pestNotes,
      treatmentType: plant.treatmentType,
      lastPestAt: plant.lastPestAt?.toISOString() ?? null,
      frostResistance: plant.frostResistance,
      soilType: plant.soilType,
      fertilizerType: plant.fertilizerType,
      observations: mergeNotesIntoObservations(
        plant.observations,
        plant.notes,
      ),
      mapX: plant.mapX,
      mapY: plant.mapY,
      mapSize: plant.mapSize,
      createdAt: plant.createdAt.toISOString(),
      updatedAt: plant.updatedAt.toISOString(),
      photos: plant.photos.map((photo) => ({
        id: photo.id,
        path: photo.path,
        caption: photo.caption,
        eventId: photo.eventId,
        createdAt: photo.createdAt.toISOString(),
      })),
      events: plant.events.map((event) => ({
        id: event.id,
        type: event.type,
        happenedAt: event.happenedAt.toISOString(),
        notes: event.notes,
        createdAt: event.createdAt.toISOString(),
        photos: event.photos.map((photo) => ({
          id: photo.id,
          path: photo.path,
          caption: photo.caption,
          createdAt: photo.createdAt.toISOString(),
        })),
      })),
    })),
    birds: birds.map((bird) => ({
      id: bird.id,
      name: bird.name,
      notes: bird.notes,
      coverPhotoPath: bird.coverPhotoPath,
      sortOrder: bird.sortOrder,
      createdAt: bird.createdAt.toISOString(),
      updatedAt: bird.updatedAt.toISOString(),
    })),
    gardenNotes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      category: note.category,
      done: note.done,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    patioEvents: patioEvents.map((event) => ({
      id: event.id,
      type: event.type,
      happenedAt: event.happenedAt.toISOString(),
      notes: event.notes,
      createdAt: event.createdAt.toISOString(),
      photos: event.photos.map((photo) => ({
        id: photo.id,
        path: photo.path,
        caption: photo.caption,
        createdAt: photo.createdAt.toISOString(),
      })),
    })),
    files,
  } satisfies PlantasBackup;
}

export async function restoreBackup(
  backup: PlantasBackup,
  gardenId?: string,
) {
  const gid = await resolveGardenId(gardenId);
  const plants = backup.plants ?? [];
  const birds = backup.birds ?? [];
  const gardenNotes = backup.gardenNotes ?? [];
  const patioEvents = backup.patioEvents ?? [];
  const filesResult = await writeBackupFiles(backup.files);

  await prisma.$transaction(
    async (tx) => {
      const plantIds = (
        await tx.plant.findMany({
          where: { gardenId: gid },
          select: { id: true },
        })
      ).map((row) => row.id);

      await tx.photo.deleteMany({
        where: {
          OR: [
            { plantId: { in: plantIds } },
            { event: { is: { gardenId: gid } } },
          ],
        },
      });
      await tx.careEvent.deleteMany({ where: { gardenId: gid } });
      await tx.plant.deleteMany({ where: { gardenId: gid } });
      await tx.bird.deleteMany({ where: { gardenId: gid } });
      await tx.gardenNote.deleteMany({ where: { gardenId: gid } });

      for (const plant of plants) {
        if (!plant.name?.trim()) {
          continue;
        }

        const plantId = plant.id?.trim() || undefined;
        const createdPlant = await tx.plant.create({
          data: {
            ...(plantId ? { id: plantId } : {}),
            gardenId: gid,
            name: plant.name.trim(),
            species: plant.species?.trim() || null,
            location: plant.location?.trim() || null,
            notes: null,
            coverPhotoPath: plant.coverPhotoPath || null,
            isIndoor: Boolean(plant.isIndoor),
            quantity: Math.max(1, Math.round(plant.quantity ?? 1)),
            status: plant.status?.trim() || "alta",
            waterSummerDays: plant.waterSummerDays ?? 2,
            waterWinterDays: plant.waterWinterDays ?? 5,
            rainPostponeDays: plant.rainPostponeDays ?? 2,
            bidones: plant.bidones?.trim() || null,
            lastWateredAt: parseDate(plant.lastWateredAt),
            nextWateredAt: parseDate(plant.nextWateredAt),
            needsFertilizer: Boolean(plant.needsFertilizer),
            nextFertilizerAt: parseDate(plant.nextFertilizerAt),
            fertilizerNotes: plant.fertilizerNotes?.trim() || null,
            lastFertilizedAt: parseDate(plant.lastFertilizedAt),
            needsPruning: Boolean(plant.needsPruning),
            nextPruneAt: parseDate(plant.nextPruneAt),
            pruneNotes: plant.pruneNotes?.trim() || null,
            needsPest: Boolean(plant.needsPest),
            nextPestAt: parseDate(plant.nextPestAt),
            careProducts: plant.careProducts || null,
            pestNotes: plant.pestNotes?.trim() || null,
            treatmentType: plant.treatmentType?.trim() || null,
            lastPestAt: parseDate(plant.lastPestAt),
            frostResistance: plant.frostResistance?.trim() || null,
            soilType: plant.soilType?.trim() || null,
            fertilizerType: plant.fertilizerType?.trim() || null,
            observations: mergeNotesIntoObservations(
              plant.observations,
              plant.notes,
            ),
            mapX: plant.mapX ?? null,
            mapY: plant.mapY ?? null,
            mapSize: plant.mapSize ?? null,
            ...(parseDate(plant.createdAt)
              ? { createdAt: parseDate(plant.createdAt)! }
              : {}),
          },
        });

        const eventIdByBackupId = new Map<string, string>();

        for (const event of plant.events ?? []) {
          if (!event.type?.trim()) {
            continue;
          }
          const createdEvent = await tx.careEvent.create({
            data: {
              ...(event.id?.trim() ? { id: event.id.trim() } : {}),
              gardenId: gid,
              plantId: createdPlant.id,
              type: event.type.trim(),
              happenedAt: parseDate(event.happenedAt) ?? new Date(),
              notes: event.notes?.trim() || null,
              ...(parseDate(event.createdAt)
                ? { createdAt: parseDate(event.createdAt)! }
                : {}),
            },
          });
          if (event.id?.trim()) {
            eventIdByBackupId.set(event.id.trim(), createdEvent.id);
          }

          for (const photo of event.photos ?? []) {
            if (!photo.path?.trim()) {
              continue;
            }
            await tx.photo.create({
              data: {
                ...(photo.id?.trim() ? { id: photo.id.trim() } : {}),
                path: photo.path.trim(),
                caption: photo.caption?.trim() || null,
                plantId: createdPlant.id,
                eventId: createdEvent.id,
                ...(parseDate(photo.createdAt)
                  ? { createdAt: parseDate(photo.createdAt)! }
                  : {}),
              },
            });
          }
        }

        for (const photo of plant.photos ?? []) {
          if (!photo.path?.trim()) {
            continue;
          }
          // Event photos are already created above; skip duplicates listed on plant.
          if (photo.eventId) {
            continue;
          }
          await tx.photo.create({
            data: {
              ...(photo.id?.trim() ? { id: photo.id.trim() } : {}),
              path: photo.path.trim(),
              caption: photo.caption?.trim() || null,
              plantId: createdPlant.id,
              eventId: null,
              ...(parseDate(photo.createdAt)
                ? { createdAt: parseDate(photo.createdAt)! }
                : {}),
            },
          });
        }

        void eventIdByBackupId;
      }

      for (const bird of birds) {
        if (!bird.name?.trim()) {
          continue;
        }
        await tx.bird.create({
          data: {
            ...(bird.id?.trim() ? { id: bird.id.trim() } : {}),
            gardenId: gid,
            name: bird.name.trim(),
            notes: bird.notes?.trim() || null,
            coverPhotoPath: bird.coverPhotoPath || null,
            sortOrder: bird.sortOrder ?? 0,
            ...(parseDate(bird.createdAt)
              ? { createdAt: parseDate(bird.createdAt)! }
              : {}),
          },
        });
      }

      for (const note of gardenNotes) {
        if (!note.title?.trim()) {
          continue;
        }
        await tx.gardenNote.create({
          data: {
            ...(note.id?.trim() ? { id: note.id.trim() } : {}),
            gardenId: gid,
            title: note.title.trim(),
            body: note.body?.trim() || null,
            category: note.category?.trim() || "tip",
            done: Boolean(note.done),
            ...(parseDate(note.createdAt)
              ? { createdAt: parseDate(note.createdAt)! }
              : {}),
          },
        });
      }

      for (const event of patioEvents) {
        if (!event.type?.trim()) {
          continue;
        }
        const createdEvent = await tx.careEvent.create({
          data: {
            ...(event.id?.trim() ? { id: event.id.trim() } : {}),
            gardenId: gid,
            plantId: null,
            type: event.type.trim(),
            happenedAt: parseDate(event.happenedAt) ?? new Date(),
            notes: event.notes?.trim() || null,
            ...(parseDate(event.createdAt)
              ? { createdAt: parseDate(event.createdAt)! }
              : {}),
          },
        });

        for (const photo of event.photos ?? []) {
          if (!photo.path?.trim()) {
            continue;
          }
          await tx.photo.create({
            data: {
              ...(photo.id?.trim() ? { id: photo.id.trim() } : {}),
              path: photo.path.trim(),
              caption: photo.caption?.trim() || null,
              plantId: null,
              eventId: createdEvent.id,
              ...(parseDate(photo.createdAt)
                ? { createdAt: parseDate(photo.createdAt)! }
                : {}),
            },
          });
        }
      }

      if (backup.settings) {
        await tx.gardenSettings.upsert({
          where: { gardenId: gid },
          create: {
            gardenId: gid,
            lastRainAt: parseDate(backup.settings.lastRainAt),
            seasonOverride: backup.settings.seasonOverride ?? null,
          },
          update: {
            lastRainAt: parseDate(backup.settings.lastRainAt),
            seasonOverride: backup.settings.seasonOverride ?? null,
          },
        });
      }
    },
    { timeout: 120_000 },
  );

  return {
    plants: plants.filter((plant) => plant.name?.trim()).length,
    birds: birds.filter((bird) => bird.name?.trim()).length,
    gardenNotes: gardenNotes.filter((note) => note.title?.trim()).length,
    filesRestored: filesResult.restored,
    filesMissing: filesResult.missing,
  };
}

export function backupFilename(exportedAt = new Date()) {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `anthos-respaldo-${stamp}.json`;
}
