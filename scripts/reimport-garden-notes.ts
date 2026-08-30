/**
 * Rebuild GardenNote rows from Excel (notes only). Plants stay unless a
 * note-like name is still wrongly stored as Plant.
 *
 * Run: npx tsx scripts/reimport-garden-notes.ts
 * Optional path: npx tsx scripts/reimport-garden-notes.ts "C:\path\Plantas.xlsx"
 */
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "../lib/db";
import {
  isGardenNoteText,
  replaceAllGardenNotes,
} from "../lib/garden-notes";
import { parseSpreadsheetBuffer } from "../lib/import-plants";

async function moveNoteLikePlants() {
  const plants = await prisma.plant.findMany({ orderBy: { name: "asc" } });
  const fake = plants.filter((plant) => isGardenNoteText(plant.name));
  let moved = 0;

  for (const plant of fake) {
    // Will be replaced by Excel reimport; just delete the fake plant.
    await prisma.careEvent.deleteMany({ where: { plantId: plant.id } });
    await prisma.photo.deleteMany({ where: { plantId: plant.id } });
    await prisma.plant.delete({ where: { id: plant.id } });
    moved += 1;
  }

  return { moved, plantsLeft: plants.length - moved };
}

async function main() {
  const filePath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Plantas.xlsx");

  const moved = await moveNoteLikePlants();

  const buffer = await readFile(filePath);
  const parsed = parseSpreadsheetBuffer(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    path.basename(filePath),
  );

  await replaceAllGardenNotes(parsed.notes);

  const sample = await prisma.gardenNote.findMany({
    where: {
      OR: [
        { title: { contains: "Hummus" } },
        { body: { contains: "Almacenar" } },
        { title: { contains: "Compost" } },
        { body: { contains: "Perlita" } },
      ],
    },
    select: { title: true, body: true, category: true },
  });

  console.log(
    JSON.stringify(
      {
        filePath,
        notesFromExcel: parsed.notes.length,
        notesInDb: await prisma.gardenNote.count(),
        plantsUntouchedExceptMoved: moved,
        plantsInDb: await prisma.plant.count(),
        noteLikeLeftInPlants: (
          await prisma.plant.findMany({ select: { name: true } })
        ).filter((p) => isGardenNoteText(p.name)).length,
        sampleShaped: sample.map((n) => ({
          title: n.title,
          body: n.body?.slice(0, 120) ?? null,
          category: n.category,
        })),
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
