import { NextResponse } from "next/server";
import { activatePaidPlan, isBillingPlan, type BillingPlan } from "@/lib/billing";
import {
  fetchMercadoPagoPayment,
  type MercadoPagoPayment,
} from "@/lib/mercadopago";

function parsePaymentOwner(payment: MercadoPagoPayment): {
  userId: string;
  plan: BillingPlan;
} | null {
  const metaPlan = isBillingPlan(payment.metadata?.plan)
    ? payment.metadata.plan
    : null;
  const ref = payment.external_reference?.trim() || "";
  const sep = ref.lastIndexOf(":");
  if (sep > 0) {
    const userId = ref.slice(0, sep);
    const fromRef = ref.slice(sep + 1);
    if (userId) {
      return {
        userId,
        plan: isBillingPlan(fromRef) ? fromRef : metaPlan ?? "annual",
      };
    }
  }
  const userId = ref || payment.metadata?.userId || "";
  if (!userId) return null;
  return { userId, plan: metaPlan ?? "annual" };
}

/**
 * Webhook Mercado Pago (topic=payment).
 * Público a propósito — la validez se confirma consultando la API de MP.
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      "";

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as {
        data?: { id?: string | number };
        id?: string | number;
        type?: string;
        action?: string;
      } | null;
      if (body?.data?.id != null) {
        paymentId = String(body.data.id);
      } else if (body?.id != null && !paymentId) {
        paymentId = String(body.id);
      }
    }

    if (!paymentId) {
      return NextResponse.json({ ok: true, skipped: "no_payment_id" });
    }

    const payment = await fetchMercadoPagoPayment(paymentId);
    if (payment.status !== "approved") {
      return NextResponse.json({
        ok: true,
        skipped: "not_approved",
        status: payment.status,
      });
    }

    const parsed = parsePaymentOwner(payment);
    if (!parsed) {
      console.error("MP payment without user reference", paymentId);
      return NextResponse.json(
        { ok: false, error: "missing_user" },
        { status: 400 },
      );
    }

    const { userId, plan } = parsed;

    await activatePaidPlan(userId, String(payment.id), plan);
    return NextResponse.json({
      ok: true,
      userId,
      paymentId: payment.id,
      plan,
    });
  } catch (error) {
    console.error("billing webhook error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // MP a veces hace GET de prueba al configurar la URL.
  return POST(request);
}
