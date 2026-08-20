import { NextResponse } from "next/server";
import { applyRainToAllPlants } from "@/lib/plants";

export async function POST() {
  try {
    const results = await applyRainToAllPlants();
    return NextResponse.json({
      count: results.length,
      plants: results.map(({ plant }) => ({
        id: plant.id,
        name: plant.name,
        nextWateredAt: plant.nextWateredAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo registrar la lluvia" },
      { status: 500 },
    );
  }
}
