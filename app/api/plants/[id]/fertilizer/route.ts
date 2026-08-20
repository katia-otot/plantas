import { NextResponse } from "next/server";
import { cancelFertilizer, scheduleFertilizer } from "@/lib/plants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = await scheduleFertilizer(id, {
      nextFertilizerAt: body.nextFertilizerAt ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo programar el fertilizante";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const plant = await cancelFertilizer(id);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cancelar el fertilizante" },
      { status: 500 },
    );
  }
}
