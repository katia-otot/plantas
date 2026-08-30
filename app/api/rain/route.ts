import { NextResponse } from "next/server";
import { applyRainToAllPlants, undoTodaysRain } from "@/lib/plants";

export async function POST() {
  try {
    const result = await applyRainToAllPlants();
    return NextResponse.json({
      plantsUpdated: result.plantsUpdated,
      alreadyRecorded: result.alreadyRecorded,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo registrar la lluvia" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const result = await undoTodaysRain();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo deshacer la lluvia" },
      { status: 500 },
    );
  }
}
