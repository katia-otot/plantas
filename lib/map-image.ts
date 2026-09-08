import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";

function isUploadPath(value: string) {
  return value.startsWith("/api/uploads/") && value.length > "/api/uploads/".length;
}

export async function getMapImagePath(gardenId?: string): Promise<{
  mapImagePath: string | null;
  mapSrc: string | null;
  hasPlan: boolean;
}> {
  const gid = await resolveGardenId(gardenId);
  const settings = await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid },
    update: {},
    select: { mapImagePath: true },
  });

  const path = settings.mapImagePath?.trim() || null;
  if (path && isUploadPath(path)) {
    return {
      mapImagePath: path,
      mapSrc: path,
      hasPlan: true,
    };
  }

  return {
    mapImagePath: null,
    mapSrc: null,
    hasPlan: false,
  };
}

export async function setMapImagePath(
  mapImagePath: string | null,
  gardenId?: string,
): Promise<{
  mapImagePath: string | null;
  mapSrc: string | null;
  hasPlan: boolean;
}> {
  const gid = await resolveGardenId(gardenId);

  if (mapImagePath != null) {
    const trimmed = mapImagePath.trim();
    if (!isUploadPath(trimmed)) {
      throw new Error("Ruta de plano inválida");
    }
    await prisma.gardenSettings.upsert({
      where: { gardenId: gid },
      create: { gardenId: gid, mapImagePath: trimmed },
      update: { mapImagePath: trimmed },
    });
    return getMapImagePath(gid);
  }

  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: { gardenId: gid, mapImagePath: null },
    update: { mapImagePath: null },
  });

  return getMapImagePath(gid);
}
