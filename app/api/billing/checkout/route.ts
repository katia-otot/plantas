import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ensureUserBilling,
  getBillingEntitlement,
  isBillingPlan,
} from "@/lib/billing";
import {
  createCheckoutPreference,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await ensureUserBilling(session.user.id, session.user.email);
  const billing = await getBillingEntitlement(session.user.id);

  if (billing.lifetimeFree) {
    return NextResponse.json(
      { error: "Tu cuenta ya tiene acceso de por vida; no hace falta pagar." },
      { status: 400 },
    );
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      {
        error:
          "Mercado Pago aún no está configurado. Probá más tarde o contactá a quien administra Anthos.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
  const plan = isBillingPlan(body.plan) ? body.plan : null;
  if (!plan) {
    return NextResponse.json(
      { error: "Elegí un plan: annual o lifetime" },
      { status: 400 },
    );
  }

  try {
    const preference = await createCheckoutPreference({
      userId: session.user.id,
      email: session.user.email,
      plan,
    });
    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      plan,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar el pago";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
