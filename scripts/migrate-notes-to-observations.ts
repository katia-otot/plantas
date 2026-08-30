/**
 * Copy Plant.notes into Plant.observations, then clear notes.
 * Safe to re-run: skips plants without notes; avoids duplicating text already in observations.
 * Usage: npx tsx scripts/migrate-notes-to-observations.ts
 */
import { PrismaClient } from "@prisma/client";
import { mergeNotesIntoObservations } from "../lib/plant-text";

const prisma = new PrismaClient();

async function main() {
  const plants = await prisma.plant.findMany({
    select: {
      id: true,
      name: true,
      notes: true,
      observations: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const plant of plants) {
    const notes = plant.notes?.trim() || "";
    if (!notes) {
      skipped += 1;
      continue;
    }

    const observations = mergeNotesIntoObservations(
      plant.observations,
      plant.notes,
    );

    await prisma.plant.update({
      where: { id: plant.id },
      data: {
        observations,
        notes: null,
      },
    });
    updated += 1;
    console.log(`migrated ${plant.name}`);
  }

  console.log(
    `done, updated ${updated}, skipped (no notes) ${skipped}, total ${plants.length}`,
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
