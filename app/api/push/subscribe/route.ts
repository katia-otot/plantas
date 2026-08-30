import { NextResponse } from "next/server";
import {
  removePushSubscription,
  savePushSubscription,
  type SerializedPushSubscription,
} from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SerializedPushSubscription;
    await savePushSubscription(body, request.headers.get("user-agent"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la suscripción",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
    }
    await removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo cancelar la suscripción" },
      { status: 500 },
    );
  }
}
