import { NextResponse } from "next/server";
import { requireWriteAccess } from "@/lib/billing-guard";
import { updatePlantsFrostResistance } from "@/lib/plants";
import { FROST_CATEGORIES, type FrostCategory } from "@/lib/frost";

function isFrostCategory(value: unknown): value is FrostCategory {
  return (
    typeof value === "string" &&
    (FROST_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  const denied = await requireWriteAccess();
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      plantIds?: unknown;
      frostResistance?: unknown;
    };

    if (!Array.isArray(body.plantIds)) {
      return NextResponse.json(
        { error: "Faltan las plantas a actualizar" },
        { status: 400 },
      );
    }

    const plantIds = body.plantIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (plantIds.length === 0) {
      return NextResponse.json(
        { error: "Seleccioná al menos una planta" },
        { status: 400 },
      );
    }

    let frostResistance: string | null = null;
    if (body.frostResistance === null || body.frostResistance === "") {
      frostResistance = null;
    } else if (isFrostCategory(body.frostResistance)) {
      frostResistance = body.frostResistance;
    } else {
      return NextResponse.json(
        { error: "Resistencia a heladas inválida" },
        { status: 400 },
      );
    }

    const result = await updatePlantsFrostResistance(
      plantIds,
      frostResistance,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar la resistencia a heladas" },
      { status: 500 },
    );
  }
}
