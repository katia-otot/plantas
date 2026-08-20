import { NextResponse } from "next/server";
import { cancelPestTreatment, schedulePestTreatment } from "@/lib/plants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = await schedulePestTreatment(id, {
      nextPestAt: body.nextPestAt ?? null,
      notes: body.notes ?? null,
      treatmentType: body.treatmentType ?? null,
      treatmentLabel: body.treatmentLabel ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "No se pudo programar el tratamiento";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const plant = await cancelPestTreatment(id);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cancelar el tratamiento" },
      { status: 500 },
    );
  }
}
