import { NextResponse } from "next/server";
import { requireWriteAccess } from "@/lib/billing-guard";
import { performBulkPlantAction } from "@/lib/plants";
import { startOfDay } from "@/lib/schedule";
import type { TreatmentType } from "@/lib/treatments";

const VALID_ACTIONS = ["fertilizer", "prune", "pest"] as const;
type BulkCareAction = (typeof VALID_ACTIONS)[number];

function isBulkCareAction(value: unknown): value is BulkCareAction {
  return (
    typeof value === "string" &&
    (VALID_ACTIONS as readonly string[]).includes(value)
  );
}

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

export async function POST(request: Request) {
  const denied = await requireWriteAccess();
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      plantIds?: unknown;
      action?: unknown;
      happenedAt?: unknown;
      notes?: unknown;
      treatmentType?: unknown;
      treatmentLabel?: unknown;
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

    if (!isBulkCareAction(body.action)) {
      return NextResponse.json(
        { error: "Acción inválida (fertilizer | prune | pest)" },
        { status: 400 },
      );
    }

    const treatmentType =
      body.treatmentType === "anti-bichos" ||
      body.treatmentType === "anti-hongos" ||
      body.treatmentType === "otro"
        ? (body.treatmentType as TreatmentType)
        : undefined;

    if (body.action === "pest" && !treatmentType) {
      return NextResponse.json(
        { error: "Elegí el tipo de tratamiento" },
        { status: 400 },
      );
    }

    const result = await performBulkPlantAction(plantIds, body.action, {
      happenedAt: parseHappenedAt(body.happenedAt),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      treatmentType,
      treatmentLabel:
        typeof body.treatmentLabel === "string"
          ? body.treatmentLabel
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo registrar el cuidado" },
      { status: 500 },
    );
  }
}
