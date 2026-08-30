import { NextResponse } from "next/server";
import { notifyTodayTasks } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Manual test from the Plantas UI (private patio app). Cron uses /notify-today with secret. */
export async function POST() {
  try {
    const result = await notifyTodayTasks({ forceEmpty: true });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron enviar notificaciones",
      },
      { status: 500 },
    );
  }
}
