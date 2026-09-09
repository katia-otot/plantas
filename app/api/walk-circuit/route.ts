import { NextResponse } from "next/server";
import { getWalkCircuit, saveWalkCircuit } from "@/lib/walk-circuit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getWalkCircuit();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo leer el circuito" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { strokes?: unknown };
    const data = await saveWalkCircuit(body.strokes);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el circuito",
      },
      { status: 500 },
    );
  }
}
