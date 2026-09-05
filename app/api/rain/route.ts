import { NextResponse } from "next/server";
import { todayCalendarDateString } from "@/lib/calendar-date";
import { isRainIntensity } from "@/lib/rain-credit";
import {
  getRainDayForDate,
  setTodaysRainIntensity,
  upsertRainDay,
} from "@/lib/rain-days";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rainDate =
      searchParams.get("date") ?? todayCalendarDateString(new Date());
    const rainDay = await getRainDayForDate(rainDate);
    return NextResponse.json({ rainDate, rainDay });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo leer la lluvia" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      intensity?: string;
      rainDate?: string;
      source?: string;
    };

    if (!body.intensity || !isRainIntensity(body.intensity)) {
      return NextResponse.json(
        { error: "Intensidad inválida (moderate | heavy | none)" },
        { status: 400 },
      );
    }

    const intensity = body.intensity;
    const result = body.rainDate
      ? await upsertRainDay({
          rainDate: body.rainDate,
          intensity,
          source: body.source ?? "user",
        })
      : await setTodaysRainIntensity(intensity);

    const label =
      intensity === "moderate"
        ? "Lluvia moderada registrada"
        : intensity === "heavy"
          ? "Lluvia fuerte registrada"
          : "Lluvia marcada como no cuenta";

    return NextResponse.json({
      changed: result.changed,
      plantsUpdated: result.plantsUpdated,
      rainDay: result.rainDay,
      message: result.changed
        ? `${label}. Se actualizaron los próximos riegos.`
        : "Sin cambios (ya estaba registrada así).",
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
    const result = await setTodaysRainIntensity("none");
    return NextResponse.json({
      changed: result.changed,
      plantsUpdated: result.plantsUpdated,
      rainDay: result.rainDay,
      message: result.changed
        ? "Se quitó el aporte de lluvia de hoy."
        : "Hoy no tenía lluvia con aporte.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo deshacer la lluvia" },
      { status: 500 },
    );
  }
}
