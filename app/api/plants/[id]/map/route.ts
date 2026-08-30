import { NextResponse } from "next/server";
import { updatePlantMapPin } from "@/lib/plants";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      mapX?: unknown;
      mapY?: unknown;
      mapSize?: unknown;
      clear?: unknown;
    };

    if (body.clear === true) {
      const plant = await updatePlantMapPin(id, {
        mapX: null,
        mapY: null,
        mapSize: null,
      });
      return NextResponse.json(plant);
    }

    const mapX = typeof body.mapX === "number" ? body.mapX : Number(body.mapX);
    const mapY = typeof body.mapY === "number" ? body.mapY : Number(body.mapY);
    if (!Number.isFinite(mapX) || !Number.isFinite(mapY)) {
      return NextResponse.json(
        { error: "Posición inválida" },
        { status: 400 },
      );
    }

    const mapSize =
      body.mapSize === undefined || body.mapSize === null
        ? undefined
        : typeof body.mapSize === "number"
          ? body.mapSize
          : Number(body.mapSize);

    const plant = await updatePlantMapPin(id, {
      mapX,
      mapY,
      mapSize: mapSize !== undefined && Number.isFinite(mapSize) ? mapSize : undefined,
    });
    return NextResponse.json(plant);
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
