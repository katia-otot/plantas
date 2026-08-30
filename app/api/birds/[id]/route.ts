import { NextResponse } from "next/server";
import { deleteBird, getBirdById, updateBird } from "@/lib/birds";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bird = await getBirdById(id);
  if (!bird) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(bird);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const existing = await getBirdById(id);
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: unknown;
      notes?: unknown;
      coverPhotoPath?: unknown;
    };

    const name =
      typeof body.name === "string" ? body.name.trim() : existing.name;
    if (!name) {
      return NextResponse.json(
        { error: "Escribí el nombre del pájaro" },
        { status: 400 },
      );
    }

    const bird = await updateBird(id, {
      name,
      notes:
        body.notes === undefined
          ? existing.notes
          : typeof body.notes === "string"
            ? body.notes
            : null,
      coverPhotoPath:
        body.coverPhotoPath === undefined
          ? existing.coverPhotoPath
          : typeof body.coverPhotoPath === "string"
            ? body.coverPhotoPath
            : null,
    });

    return NextResponse.json(bird);
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

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const existing = await getBirdById(id);
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    await deleteBird(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo borrar",
      },
      { status: 500 },
    );
  }
}
