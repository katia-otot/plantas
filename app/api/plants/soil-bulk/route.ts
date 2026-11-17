import { NextResponse } from "next/server";
import { requireWriteAccess } from "@/lib/billing-guard";
import { updatePlantsSoilType } from "@/lib/plants";
import {
  SOIL_PH_CATEGORIES,
  type SoilPhCategory,
} from "@/lib/soil-ph";

function isSoilCategory(value: unknown): value is SoilPhCategory {
  return (
    typeof value === "string" &&
    (SOIL_PH_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function POST(request: Request) {
  const denied = await requireWriteAccess();
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      plantIds?: unknown;
      soilType?: unknown;
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

    let soilType: string | null = null;
    if (body.soilType === null || body.soilType === "") {
      soilType = null;
    } else if (isSoilCategory(body.soilType)) {
      soilType = body.soilType;
    } else {
      return NextResponse.json(
        { error: "Tipo de suelo inválido" },
        { status: 400 },
      );
    }

    const result = await updatePlantsSoilType(plantIds, soilType);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo actualizar el suelo" },
      { status: 500 },
    );
  }
}
