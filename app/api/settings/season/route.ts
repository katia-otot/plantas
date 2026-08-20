import { NextResponse } from "next/server";
import { setSeasonOverride } from "@/lib/plants";
import type { Season } from "@/lib/types";

function parseSeasonOverride(value: unknown): Season | null {
  if (value === null) {
    return null;
  }

  if (value === "summer" || value === "winter") {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const seasonOverride = parseSeasonOverride(body.seasonOverride);

    if (body.seasonOverride !== null && seasonOverride === null) {
      return NextResponse.json(
        { error: "Estación inválida" },
        { status: 400 },
      );
    }

    await setSeasonOverride(seasonOverride);

    return NextResponse.json({ seasonOverride });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cambiar la estación" },
      { status: 500 },
    );
  }
}
