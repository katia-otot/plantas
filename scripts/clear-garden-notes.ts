/**
 * Delete all GardenNote rows from local SQLite. Plants untouched.
 * Run: npx tsx scripts/clear-garden-notes.ts
 */
import { prisma } from "../lib/db";

async function main() {
  const beforeNotes = await prisma.gardenNote.count();
  const beforePlants = await prisma.plant.count();
  const deleted = await prisma.gardenNote.deleteMany();
  const afterNotes = await prisma.gardenNote.count();
  const afterPlants = await prisma.plant.count();

  console.log(
    JSON.stringify(
      {
        beforeNotes,
        deleted: deleted.count,
        afterNotes,
        beforePlants,
        afterPlants,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
