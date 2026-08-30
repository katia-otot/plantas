import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = {
    plants: await prisma.plant.count(),
    events: await prisma.careEvent.count(),
    birds: await prisma.bird.count(),
    notes: await prisma.gardenNote.count(),
    photos: await prisma.photo.count(),
    gardens: await prisma.garden.count().catch(() => -1),
    members: await prisma.gardenMember.count().catch(() => -1),
    settings: await prisma.gardenSettings.count(),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
