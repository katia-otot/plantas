/**
 * One-off local import of Downloads/Plantas.xlsx into SQLite.
 * Run: npx tsx scripts/import-local-xlsx.ts
 */
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "../lib/db";
import { createGardenNote } from "../lib/garden-notes";
import { createPlant, listPlants } from "../lib/plants";
import { parseSpreadsheetBuffer } from "../lib/import-plants";

async function main() {
  const filePath =
    process.argv[2] ||
    path.join(process.env.USERPROFILE || "", "Downloads", "Plantas.xlsx");

  const buffer = await readFile(filePath);
  const parsed = parseSpreadsheetBuffer(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
    path.basename(filePath),
  );

  console.log(
    JSON.stringify(
      {
        sheetName: parsed.sheetName,
        headers: parsed.headers,
        toImport: parsed.rows.length,
        notesToImport: parsed.notes.length,
        skipped: parsed.skipped,
        mergedDuplicates: parsed.mergedDuplicates,
        sample: parsed.rows.slice(0, 3).map((row) => ({
          name: row.name,
          quantity: row.quantity,
          bidones: row.bidones,
          notes: row.notes?.slice(0, 80),
          waterSummerDays: row.waterSummerDays,
          waterWinterDays: row.waterWinterDays,
          frostResistance: row.frostResistance,
          soilType: row.soilType,
          fertilizerType: row.fertilizerType,
        })),
        sampleNotes: parsed.notes.slice(0, 5).map((note) => ({
          title: note.title.slice(0, 80),
          category: note.category,
        })),
        withQuantityGt1: parsed.rows.filter((row) => (row.quantity ?? 1) > 1)
          .length,
        withBidones: parsed.rows.filter((row) => row.bidones).length,
        withNotes: parsed.rows.filter((row) => row.notes).length,
      },
      null,
      2,
    ),
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

  const plants = await listPlants();
  const notesCount = await prisma.gardenNote.count();
  const withFrost = plants.filter((plant) => plant.frostResistance).length;
  const withSoil = plants.filter((plant) => plant.soilType).length;
  const withNotes = plants.filter((plant) => plant.notes).length;
  const withBidones = plants.filter((plant) => plant.bidones).length;
  const withQty = plants.filter((plant) => plant.quantity > 1).length;
  const withObs = plants.filter((plant) => plant.observations).length;

  console.log(
    JSON.stringify(
      {
        imported: parsed.rows.length,
        notesImported: notesCount,
        totalInDb: plants.length,
        withFrost,
        withSoil,
        withNotes,
        withBidones,
        withQuantityGt1: withQty,
        withObservationsLeftover: withObs,
        names: plants.map(
          (plant) =>
            `${plant.name}${plant.quantity > 1 ? ` ×${plant.quantity}` : ""}`,
        ),
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
