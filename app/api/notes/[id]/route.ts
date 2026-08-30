import { NextResponse } from "next/server";
import { deleteGardenNote, updateGardenNote } from "@/lib/garden-notes";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: unknown;
      body?: unknown;
    };

    const updated = await updateGardenNote(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      body:
        body.body === undefined
          ? undefined
          : typeof body.body === "string"
            ? body.body
            : null,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la nota",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteGardenNote(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo borrar la nota",
      },
      { status: 500 },
    );
  }
}
