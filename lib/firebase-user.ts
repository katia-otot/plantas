import type { DecodedIdToken } from "firebase-admin/auth";
import { prisma } from "@/lib/db";
import { ensureGardenAccess } from "@/lib/garden-access";
import { normalizeEmail } from "@/lib/owner-emails";

/**
 * Create or update Auth.js User + Firebase Account, then ensure garden access.
 * Owners → shared patio (existing data). New users → empty personal patio.
 * Does not wipe Plant / CareEvent / Bird / GardenNote rows.
 */
export async function upsertUserFromFirebaseToken(decoded: DecodedIdToken) {
  const emailRaw = decoded.email;
  if (!emailRaw) {
    throw new Error("El token de Firebase no incluye email");
  }

  const email = normalizeEmail(emailRaw);
  const name = decoded.name ?? null;
  const image = decoded.picture ?? null;
  const firebaseUid = decoded.uid;

  const byAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "firebase",
        providerAccountId: firebaseUid,
      },
    },
    include: { user: true },
  });

  let user = byAccount?.user ?? null;

  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name: name ?? user.name,
        image: image ?? user.image,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name,
        image,
      },
    });
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "firebase",
        providerAccountId: firebaseUid,
      },
    },
    create: {
      userId: user.id,
      type: "oidc",
      provider: "firebase",
      providerAccountId: firebaseUid,
    },
    update: {
      userId: user.id,
    },
  });

  await ensureGardenAccess(user.id, email);

  return {
    id: user.id,
    email: user.email ?? email,
    name: user.name,
    image: user.image,
  };
}
