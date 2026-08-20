import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUploadDir } from "@/lib/uploads";

export const BACKUP_VERSION = 1;

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
    const buffer = await readFile(path.join(getUploadDir(), filename));
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

export async function buildBackupExport() {
  const [plants, settings] = await Promise.all([
    prisma.plant.findMany({
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
    prisma.gardenSettings.findUnique({ where: { id: "singleton" } }),
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

  const files: Record<
    string,
    | { filename: string; mimeType: string; dataBase64: string }
    | { filename: string; missing: true }
  > = {};

  await Promise.all(
    [...photoPaths].map(async (photoPath) => {
      const file = await readPhotoFile(photoPath);
      if (file) {
        files[photoPath] = file;
      }
    }),
  );

  return {
    app: "plantas",
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
      notes: plant.notes,
      coverPhotoPath: plant.coverPhotoPath,
      isIndoor: plant.isIndoor,
      waterSummerDays: plant.waterSummerDays,
      waterWinterDays: plant.waterWinterDays,
      rainPostponeDays: plant.rainPostponeDays,
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
    files,
  };
}

export function backupFilename(exportedAt = new Date()) {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `plantas-respaldo-${stamp}.json`;
}
