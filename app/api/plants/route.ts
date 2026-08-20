import { NextResponse } from "next/server";
import { createPlant, listPlants } from "@/lib/plants";

export async function GET() {
  const plants = await listPlants();
  return NextResponse.json(plants);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    const plant = await createPlant(body);
    return NextResponse.json(plant, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo crear la planta" },
      { status: 500 },
    );
  }
}
