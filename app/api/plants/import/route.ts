import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";
import { createGardenNote } from "@/lib/garden-notes";
import { createPlant } from "@/lib/plants";
import { parseSpreadsheetBuffer } from "@/lib/import-plants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const replaceExisting =
      formData.get("replace") === "1" || formData.get("replace") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Subí un archivo Excel o CSV" },
        { status: 400 },
      );
    }

    const filename = file.name || "plantas.xlsx";
    const lower = filename.toLowerCase();
    if (
      !lower.endsWith(".xlsx") &&
      !lower.endsWith(".xls") &&
      !lower.endsWith(".csv")
    ) {
      return NextResponse.json(
        { error: "Formato no soportado. Usá .xlsx, .xls o .csv" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseSpreadsheetBuffer(buffer, filename);

    if (parsed.rows.length === 0 && parsed.notes.length === 0) {
      return NextResponse.json(
        {
          error:
            "No encontré filas para importar. Revisá que haya una columna Nombre/Planta.",
          headers: parsed.headers,
        },
        { status: 400 },
      );
    }

    if (replaceExisting) {
      const gid = await resolveGardenId();
      const plantIds = (
        await prisma.plant.findMany({
          where: { gardenId: gid },
          select: { id: true },
        })
      ).map((p) => p.id);

      await prisma.photo.deleteMany({
        where: {
          OR: [
            { plantId: { in: plantIds } },
            { event: { is: { gardenId: gid } } },
          ],
        },
      });
      await prisma.careEvent.deleteMany({ where: { gardenId: gid } });
      await prisma.plant.deleteMany({ where: { gardenId: gid } });
      await prisma.gardenNote.deleteMany({ where: { gardenId: gid } });
    }

    const created = [];
    for (const row of parsed.rows) {
      const plant = await createPlant(row);
      created.push({ id: plant.id, name: plant.name });
    }

    const createdNotes = [];
    for (const note of parsed.notes) {
      const saved = await createGardenNote(note);
      createdNotes.push({ id: saved.id, title: saved.title });
    }

    return NextResponse.json({
      imported: created.length,
      notesImported: createdNotes.length,
      skipped: parsed.skipped,
      mergedDuplicates: parsed.mergedDuplicates,
      replaced: replaceExisting,
      headers: parsed.headers,
      plants: created,
      notes: createdNotes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo importar el archivo",
      },
      { status: 500 },
    );
  }
}
