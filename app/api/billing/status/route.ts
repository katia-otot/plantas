import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ensureUserBilling,
  getAnnualPriceArs,
  getBillingEntitlement,
  getLifetimePriceArs,
  getTrialDays,
} from "@/lib/billing";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await ensureUserBilling(session.user.id, session.user.email);
  const billing = await getBillingEntitlement(session.user.id);

  return NextResponse.json({
    billing,
    trialDays: getTrialDays(),
    annualPriceArs: getAnnualPriceArs(),
    lifetimePriceArs: getLifetimePriceArs(),
    checkoutReady: isMercadoPagoConfigured(),
  });
}
