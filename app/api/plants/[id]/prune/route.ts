import { NextResponse } from "next/server";
import { cancelPrune, schedulePrune } from "@/lib/plants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = await schedulePrune(id, {
      nextPruneAt: body.nextPruneAt ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo programar la poda";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const plant = await cancelPrune(id);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cancelar la poda" },
      { status: 500 },
    );
  }
}
