/**
 * Ensure the shared patio exists and both owner emails are members.
 * Usage: npx tsx scripts/bootstrap-patio-owners.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_EMAILS = [
  "nechegoyen90529@gmail.com",
  "katiagadea19@gmail.com",
  ...(process.env.AUTH_OWNER_EMAILS?.split(",") ?? []),
]
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function main() {
  const emails = [...new Set(OWNER_EMAILS)];
  let garden = await prisma.garden.findUnique({ where: { slug: "default" } });
  if (!garden) {
    garden = await prisma.garden.create({
      data: { slug: "default", name: "Patio compartido" },
    });
    console.log(`created garden ${garden.id}`);
  } else {
    console.log(`garden exists ${garden.id}`);
  }

  for (const email of emails) {
    await prisma.gardenMember.upsert({
      where: {
        gardenId_email: { gardenId: garden.id, email },
      },
      create: {
        gardenId: garden.id,
        email,
        role: "owner",
      },
      update: { role: "owner" },
    });
    console.log(`owner: ${email}`);
  }

  await prisma.gardenSettings.upsert({
    where: { gardenId: garden.id },
    create: { gardenId: garden.id },
    update: {},
  });

  console.log(
    "done — existing plants/historial stay on this garden; new users get personal patios",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
