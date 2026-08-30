import { prisma } from "./db";
import {
  assertBirdInGarden,
  resolveGardenId,
  SHARED_GARDEN_SLUG,
} from "./garden-access";

/** Initial patio bird sightings — name + optional note. Only for shared patio. */
export const DEFAULT_BIRDS: Array<{ name: string; notes: string | null }> = [
  { name: "Búhos (Lechus)", notes: null },
  { name: "Teros", notes: null },
  { name: "Garza pampeana", notes: null },
  { name: "Calandria", notes: null },
  { name: "Golondrina", notes: null },
  { name: "Hornero", notes: null },
  {
    name: "Ratonera",
    notes: "La chiquita que viene a las rejas",
  },
  { name: "Benteveo", notes: null },
  { name: "Gorrión", notes: null },
  {
    name: "Tordo?",
    notes:
      "Uno negro chiquito; hay otro mediano y no sé si es el mismo",
  },
  { name: "Chiquito de copete rojo", notes: null },
  { name: "Pirincho", notes: null },
  { name: "Cotorras", notes: null },
  { name: "Colibrí (verde)", notes: null },
  { name: "Chimango", notes: null },
  {
    name: "Tijereta?",
    notes: "Chiquito, cola muy larga",
  },
  { name: "Zorzal", notes: null },
  {
    name: "Pájaro carpintero real",
    notes: "¿Colaptes melanochloros?",
  },
  { name: "Chorlito", notes: null },
  { name: "Mirlo", notes: null },
  { name: "Jilguero dorado", notes: null },
  { name: "Pecho Colorado / Loica", notes: null },
];

export type BirdInput = {
  name: string;
  notes?: string | null;
  coverPhotoPath?: string | null;
};

/**
 * Seed default birds only for the shared patio if it somehow has none.
 * Personal gardens stay empty.
 */
export async function ensureDefaultBirds(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const garden = await prisma.garden.findUnique({ where: { id: gid } });
  if (!garden || garden.slug !== SHARED_GARDEN_SLUG) {
    return;
  }

  const count = await prisma.bird.count({ where: { gardenId: gid } });
  if (count > 0) {
    return;
  }

  await prisma.bird.createMany({
    data: DEFAULT_BIRDS.map((bird, index) => ({
      gardenId: gid,
      name: bird.name,
      notes: bird.notes,
      sortOrder: index,
    })),
  });
}

export async function listBirds(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  await ensureDefaultBirds(gid);
  return prisma.bird.findMany({
    where: { gardenId: gid },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getBirdById(id: string, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  return prisma.bird.findFirst({ where: { id, gardenId: gid } });
}

export async function createBird(input: BirdInput, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const name = input.name.trim();
  if (!name) {
    throw new Error("Escribí el nombre del pájaro");
  }

  const max = await prisma.bird.aggregate({
    where: { gardenId: gid },
    _max: { sortOrder: true },
  });
  return prisma.bird.create({
    data: {
      gardenId: gid,
      name,
      notes: input.notes?.trim() || null,
      coverPhotoPath: input.coverPhotoPath?.trim() || null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateBird(id: string, input: BirdInput) {
  await assertBirdInGarden(id);
  const name = input.name.trim();
  if (!name) {
    throw new Error("Escribí el nombre del pájaro");
  }

  return prisma.bird.update({
    where: { id },
    data: {
      name,
      notes: input.notes?.trim() || null,
      coverPhotoPath:
        input.coverPhotoPath === undefined
          ? undefined
          : input.coverPhotoPath?.trim() || null,
    },
  });
}

export async function updateBirdCoverPhoto(
  id: string,
  coverPhotoPath: string | null,
) {
  await assertBirdInGarden(id);
  return prisma.bird.update({
    where: { id },
    data: {
      coverPhotoPath: coverPhotoPath?.trim() || null,
    },
  });
}

export async function deleteBird(id: string) {
  await assertBirdInGarden(id);
  return prisma.bird.delete({ where: { id } });
}
