import { NextResponse } from "next/server";
import { updatePlantStatus } from "@/lib/plants";
import { isPlantStatus } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!isPlantStatus(body.status)) {
      return NextResponse.json(
        { error: "Estado inválido. Usá alta, baja o posible." },
        { status: 400 },
      );
    }

    const plant = await updatePlantStatus(id, body.status);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado" },
      { status: 500 },
    );
  }
}
