import { NextResponse } from "next/server";
import {
  deletePlant,
  getPlantById,
  updatePlant,
} from "@/lib/plants";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const plant = await getPlantById(id);

  if (!plant) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  return NextResponse.json(plant);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    const plant = await updatePlant(id, body);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar la planta" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deletePlant(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo eliminar la planta" },
      { status: 500 },
    );
  }
}
