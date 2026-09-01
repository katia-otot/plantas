import { NextResponse } from "next/server";
import { notifyTodayTasks } from "@/lib/push";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.PUSH_NOTIFY_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/** Manual trigger only. Scheduled sends use the in-app notification scheduler. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const forceEmpty = url.searchParams.get("force") === "1";
    const result = await notifyTodayTasks({ forceEmpty });
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
