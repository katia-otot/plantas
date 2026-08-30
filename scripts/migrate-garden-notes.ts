/**
 * Move mis-imported garden notes out of Plant into GardenNote, then optionally
 * re-import plants+notes from Excel.
 *
 * Run: npx tsx scripts/migrate-garden-notes.ts
 * With re-import: npx tsx scripts/migrate-garden-notes.ts --reimport
 */
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "../lib/db";
import {
  createGardenNote,
  isGardenNoteText,
} from "../lib/garden-notes";
import { createPlant, listPlants } from "../lib/plants";
import { parseSpreadsheetBuffer } from "../lib/import-plants";

async function migrateFromPlants() {
  const plants = await prisma.plant.findMany({
    orderBy: { name: "asc" },
  });

  const fake = plants.filter((plant) => isGardenNoteText(plant.name));
  let moved = 0;

  for (const plant of fake) {
    const bodyParts = [
      plant.notes,
      plant.observations,
      plant.frostResistance,
      plant.soilType,
      plant.fertilizerType,
    ].filter((part): part is string => Boolean(part?.trim()));

    await createGardenNote({
      title: plant.name.trim(),
      body: bodyParts.length ? bodyParts.join("\n") : null,
      category: "tip",
    });

    await prisma.careEvent.deleteMany({ where: { plantId: plant.id } });
    await prisma.photo.deleteMany({ where: { plantId: plant.id } });
    await prisma.plant.delete({ where: { id: plant.id } });
    moved += 1;
  }

  return { moved, remainingPlants: plants.length - moved };
}

async function reimportFromExcel() {
  const filePath =
    process.argv.find((arg) => arg.endsWith(".xlsx")) ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Plantas.xlsx");

  const buffer = await readFile(filePath);
  const parsed = parseSpreadsheetBuffer(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    path.basename(filePath),
  );

  await prisma.careEvent.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.gardenNote.deleteMany();

  for (const row of parsed.rows) {
    await createPlant(row);
  }
  for (const note of parsed.notes) {
    await createGardenNote(note);
  }

  return {
    plants: parsed.rows.length,
    notes: parsed.notes.length,
    skipped: parsed.skipped,
    mergedDuplicates: parsed.mergedDuplicates,
  };
}

async function main() {
  const doReimport = process.argv.includes("--reimport");

  if (doReimport) {
    const result = await reimportFromExcel();
    const plants = await listPlants();
    const notes = await prisma.gardenNote.count();
    console.log(
      JSON.stringify(
        {
          mode: "reimport",
          ...result,
          plantsInDb: plants.length,
          notesInDb: notes,
          sampleNotes: (
            await prisma.gardenNote.findMany({
              take: 5,
              orderBy: { title: "asc" },
              select: { title: true, category: true },
            })
          ).map((n) => n.title.slice(0, 80)),
          noteLikeLeftInPlants: plants.filter((p) => isGardenNoteText(p.name))
            .length,
        },
        null,
        2,
      ),
    );
  } else {
    const result = await migrateFromPlants();
    const notes = await prisma.gardenNote.count();
    console.log(
      JSON.stringify(
        {
          mode: "migrate",
          ...result,
          notesInDb: notes,
        },
        null,
        2,
      ),
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
