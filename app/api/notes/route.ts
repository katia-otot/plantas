import { NextResponse } from "next/server";
import { createGardenNote, listGardenNotes } from "@/lib/garden-notes";

export const dynamic = "force-dynamic";

export async function GET() {
  const notes = await listGardenNotes();
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: unknown;
      body?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Escribí un título o el texto de la nota" },
        { status: 400 },
      );
    }

    const noteBody =
      typeof body.body === "string" ? body.body.trim() || null : null;

    const note = await createGardenNote({
      title,
      body: noteBody,
      category: "tip",
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo guardar la nota",
      },
      { status: 500 },
    );
  }
}
