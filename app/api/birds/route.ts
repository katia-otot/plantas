import { NextResponse } from "next/server";
import { createBird, listBirds } from "@/lib/birds";

export const dynamic = "force-dynamic";

export async function GET() {
  const birds = await listBirds();
  return NextResponse.json(birds);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      notes?: unknown;
      coverPhotoPath?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Escribí el nombre del pájaro" },
        { status: 400 },
      );
    }

    const bird = await createBird({
      name,
      notes: typeof body.notes === "string" ? body.notes : null,
      coverPhotoPath:
        typeof body.coverPhotoPath === "string" ? body.coverPhotoPath : null,
    });

    return NextResponse.json(bird, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo guardar",
      },
      { status: 500 },
    );
  }
}
