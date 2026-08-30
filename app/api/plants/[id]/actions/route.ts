import { NextResponse } from "next/server";
import { getPlantById, performPlantAction } from "@/lib/plants";
import { startOfDay } from "@/lib/schedule";
import type { TreatmentType } from "@/lib/treatments";
import type { CareEventType } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_ACTIONS: CareEventType[] = [
  "watering",
  "rain_skip",
  "fertilizer",
  "prune",
  "pest",
  "note",
];

function parseHappenedAt(value: unknown): Date {
  if (!value || typeof value !== "string") {
    return startOfDay(new Date());
  }

  let parsed: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    parsed = startOfDay(new Date(year, month - 1, day));
  } else {
    parsed = startOfDay(new Date(value));
  }

  if (Number.isNaN(parsed.getTime())) {
    return startOfDay(new Date());
  }

  const today = startOfDay(new Date());
  return parsed.getTime() > today.getTime() ? today : parsed;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const action = body.action as CareEventType;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    const plant = await getPlantById(id);
    if (!plant) {
      return NextResponse.json(
        { error: "Planta no encontrada" },
        { status: 404 },
      );
    }

    const happenedAt = parseHappenedAt(body.happenedAt);

    const treatmentType =
      body.treatmentType === "anti-bichos" ||
      body.treatmentType === "anti-hongos" ||
      body.treatmentType === "otro"
        ? (body.treatmentType as TreatmentType)
        : undefined;

    const result = await performPlantAction(plant, action, {
      notes: body.notes,
      happenedAt,
      photoPaths: body.photoPaths ?? [],
      treatmentType,
      treatmentLabel:
        typeof body.treatmentLabel === "string" ? body.treatmentLabel : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo registrar la acción" },
      { status: 500 },
    );
  }
}
