import Link from "next/link";
import { auth } from "@/auth";
import {
  ensureUserBilling,
  getBillingEntitlement,
} from "@/lib/billing";

export async function BillingBanner() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  await ensureUserBilling(session.user.id, session.user.email);
  const billing = await getBillingEntitlement(session.user.id);

  if (billing.lifetimeFree || billing.status === "active") {
    return null;
  }

  if (billing.status === "trial" && billing.daysRemaining != null) {
    if (billing.daysRemaining > 5) {
      return null;
    }
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        Te quedan {billing.daysRemaining} día
        {billing.daysRemaining === 1 ? "" : "s"} de prueba.{" "}
        <Link
          href="/cuenta"
          className="font-semibold underline underline-offset-2"
        >
          Ver cuenta
        </Link>
      </div>
    );
  }

  if (billing.status === "expired") {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-950">
        Tu acceso de escritura venció. Podés mirar el patio, pero para registrar
        riegos y cuidados{" "}
        <Link
          href="/cuenta"
          className="font-semibold underline underline-offset-2"
        >
          renovás acá
        </Link>
        .
      </div>
    );
  }

  return null;
}
