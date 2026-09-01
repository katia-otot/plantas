import { NextResponse } from "next/server";
import {
  getNotificationSchedule,
  setNotificationSchedule,
} from "@/lib/plants";
import { refreshNotificationScheduler } from "@/lib/notification-scheduler";
import { parseNotifyTime } from "@/lib/notification-schedule";

export async function GET() {
  try {
    const schedule = await getNotificationSchedule();
    return NextResponse.json(schedule);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo leer el horario de avisos" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const weekdayTime = parseNotifyTime(body.weekdayTime);
    const weekendTime = parseNotifyTime(body.weekendTime);

    if (!weekdayTime || !weekendTime) {
      return NextResponse.json(
        { error: "Horario inválido (usá formato HH:MM)" },
        { status: 400 },
      );
    }

    const schedule = await setNotificationSchedule({
      weekdayTime,
      weekendTime,
    });

    await refreshNotificationScheduler();

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo guardar el horario de avisos" },
      { status: 500 },
    );
  }
}
