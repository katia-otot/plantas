import type { Garden } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getOwnerEmails,
  isOwnerEmail,
  normalizeEmail,
} from "@/lib/owner-emails";

/** Lazy import to avoid auth ↔ garden-access cycle. */
async function getAuthSession() {
  const { auth } = await import("@/auth");
  return auth();
}

export { getOwnerEmails, isOwnerEmail, normalizeEmail };

export const SHARED_GARDEN_SLUG = "default";

/**
 * Shared patio for AUTH_OWNER_EMAILS / hardcoded owners.
 * Does not touch plants — only Garden + GardenMember rows.
 */
export async function ensureDefaultGarden(): Promise<Garden> {
  let garden = await prisma.garden.findUnique({
    where: { slug: SHARED_GARDEN_SLUG },
  });
  if (!garden) {
    garden = await prisma.garden.create({
      data: {
        slug: SHARED_GARDEN_SLUG,
        name: "Patio compartido",
      },
    });
  }

  for (const email of getOwnerEmails()) {
    await prisma.gardenMember.upsert({
      where: {
        gardenId_email: {
          gardenId: garden.id,
          email,
        },
      },
      create: {
        gardenId: garden.id,
        email,
        role: "owner",
      },
      update: {},
    });
  }

  return garden;
}

async function findMembershipGarden(
  userId: string,
  email: string,
): Promise<Garden | null> {
  const byUser = await prisma.gardenMember.findFirst({
    where: { userId },
    include: { garden: true },
    orderBy: { createdAt: "asc" },
  });
  if (byUser?.garden) {
    return byUser.garden;
  }

  const byEmail = await prisma.gardenMember.findFirst({
    where: { email },
    include: { garden: true },
    orderBy: { createdAt: "asc" },
  });
  if (byEmail?.garden) {
    if (!byEmail.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (userExists) {
        await prisma.gardenMember.update({
          where: { id: byEmail.id },
          data: { userId },
        });
      }
    }
    return byEmail.garden;
  }

  return null;
}

/** Link / ensure membership on the shared patio for an owner email. */
export async function linkUserToSharedGarden(
  userId: string,
  email: string,
): Promise<Garden> {
  const normalized = normalizeEmail(email);
  const garden = await ensureDefaultGarden();

  await prisma.gardenMember.upsert({
    where: {
      gardenId_email: {
        gardenId: garden.id,
        email: normalized,
      },
    },
    create: {
      gardenId: garden.id,
      email: normalized,
      userId,
      role: "owner",
    },
    update: {
      userId,
      role: "owner",
    },
  });

  if (!garden.ownerUserId) {
    return prisma.garden.update({
      where: { id: garden.id },
      data: { ownerUserId: userId },
    });
  }

  return garden;
}

async function ensureGardenSettings(gardenId: string) {
  await prisma.gardenSettings.upsert({
    where: { gardenId },
    create: { gardenId },
    update: {},
  });
}

/** Create an empty personal patio for a new Google user. */
export async function createPersonalGarden(
  userId: string,
  email: string,
): Promise<Garden> {
  const normalized = normalizeEmail(email);
  const slug = `user-${userId}`;

  const existing = await prisma.garden.findUnique({ where: { slug } });
  if (existing) {
    await prisma.gardenMember.upsert({
      where: {
        gardenId_email: { gardenId: existing.id, email: normalized },
      },
      create: {
        gardenId: existing.id,
        email: normalized,
        userId,
        role: "owner",
      },
      update: { userId, role: "owner" },
    });
    await ensureGardenSettings(existing.id);
    return existing;
  }

  const garden = await prisma.garden.create({
    data: {
      slug,
      name: "Mi patio",
      ownerUserId: userId,
      members: {
        create: {
          email: normalized,
          userId,
          role: "owner",
        },
      },
      settings: {
        create: {},
      },
    },
  });

  return garden;
}

/**
 * On first login / every sign-in:
 * - Owner emails (or existing shared members) → shared patio (keeps all data)
 * - Anyone else → personal empty patio
 */
export async function ensureGardenAccess(
  userId: string,
  email: string,
): Promise<Garden> {
  const normalized = normalizeEmail(email);

  const existing = await findMembershipGarden(userId, normalized);
  if (existing) {
    if (existing.slug === SHARED_GARDEN_SLUG) {
      await linkUserToSharedGarden(userId, normalized);
      await ensureGardenSettings(existing.id);
      return (
        (await prisma.garden.findUnique({ where: { id: existing.id } })) ??
        existing
      );
    }
    await ensureGardenSettings(existing.id);
    return existing;
  }

  if (isOwnerEmail(normalized)) {
    const garden = await linkUserToSharedGarden(userId, normalized);
    await ensureGardenSettings(garden.id);
    return garden;
  }

  return createPersonalGarden(userId, normalized);
}

/**
 * Resolve the garden for the current request.
 * With session → user's patio. Without (auth off / scripts) → shared default.
 */
export async function resolveGardenId(explicit?: string): Promise<string> {
  if (explicit) {
    return explicit;
  }

  const session = await getAuthSession();
  if (session?.user?.id && session.user.email) {
    const garden = await ensureGardenAccess(
      session.user.id,
      session.user.email,
    );
    return garden.id;
  }

  return (await ensureDefaultGarden()).id;
}

/** Ensure a plant belongs to the caller's garden (or explicit gardenId). */
export async function assertPlantInGarden(
  plantId: string,
  gardenId?: string,
) {
  const gid = await resolveGardenId(gardenId);
  const plant = await prisma.plant.findFirst({
    where: { id: plantId, gardenId: gid },
  });
  if (!plant) {
    throw new Error("Planta no encontrada en tu patio");
  }
  return plant;
}

export async function assertBirdInGarden(birdId: string, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const bird = await prisma.bird.findFirst({
    where: { id: birdId, gardenId: gid },
  });
  if (!bird) {
    throw new Error("Pájaro no encontrado en tu patio");
  }
  return bird;
}

export async function assertNoteInGarden(noteId: string, gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  const note = await prisma.gardenNote.findFirst({
    where: { id: noteId, gardenId: gid },
  });
  if (!note) {
    throw new Error("Nota no encontrada en tu patio");
  }
  return note;
}
