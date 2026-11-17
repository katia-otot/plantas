import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureUserBilling, getBillingEntitlement } from "@/lib/billing";

/**
 * Bloquea escrituras si la prueba/pago venció.
 * Sin sesión (modo abierto local) no bloquea — igual que el resto de la app.
 */
export async function requireWriteAccess(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await ensureUserBilling(session.user.id, session.user.email);
  const entitlement = await getBillingEntitlement(session.user.id);
  if (entitlement.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error:
        "Tu prueba o suscripción venció. Renová Anthos para seguir registrando cuidados.",
      code: "BILLING_REQUIRED",
      billing: entitlement,
    },
    { status: 402 },
  );
}
