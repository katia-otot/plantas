import { NextResponse } from "next/server";
import { getMapImagePath, setMapImagePath } from "@/lib/map-image";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMapImagePath();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo leer el plano" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      mapImagePath?: unknown;
      clear?: unknown;
    };

    if (body.clear === true) {
      const data = await setMapImagePath(null);
      return NextResponse.json(data);
    }

    if (typeof body.mapImagePath !== "string" || !body.mapImagePath.trim()) {
      return NextResponse.json(
        { error: "Plano inválido" },
        { status: 400 },
      );
    }

    const data = await setMapImagePath(body.mapImagePath);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo guardar el plano",
      },
      { status: 500 },
    );
  }
}
