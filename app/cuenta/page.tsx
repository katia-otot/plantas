import Link from "next/link";
import { auth } from "@/auth";
import { BillingPayButton } from "@/components/BillingPayButton";
import { SignOutButton } from "@/components/SignOutButton";
import { UserAccountSummary } from "@/components/UserAccountSummary";
import {
  ensureUserBilling,
  getAnnualPriceArs,
  getBillingEntitlement,
  getLifetimePriceArs,
  getTrialDays,
} from "@/lib/billing";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPriceArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-emerald-900/40"
      fill="none"
      aria-hidden
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function planBadgeClass(status: string): string {
  if (status === "lifetime") return "bg-emerald-100 text-emerald-900";
  if (status === "active") return "bg-sky-100 text-sky-950";
  if (status === "trial") return "bg-amber-100 text-amber-950";
  return "bg-rose-100 text-rose-900";
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <h1 className="text-xl font-semibold text-emerald-950">Cuenta</h1>
        <p className="mt-2 text-sm text-emerald-900/80">
          Iniciá sesión para ver tu plan.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-semibold text-emerald-800 underline"
        >
          Ir a login
        </Link>
      </main>
    );
  }

  await ensureUserBilling(session.user.id, session.user.email);
  const billing = await getBillingEntitlement(session.user.id);
  const annualPrice = getAnnualPriceArs();
  const lifetimePrice = getLifetimePriceArs();
  const checkoutReady = isMercadoPagoConfigured();

  const statusLabel =
    billing.status === "lifetime"
      ? "De por vida"
      : billing.status === "active"
        ? "Anual"
        : billing.status === "trial"
          ? "Prueba"
          : "Vencido";

  const planDetail =
    billing.status === "trial"
      ? `Hasta ${formatDate(billing.trialEndsAt)}${
          billing.daysRemaining != null
            ? ` · ${billing.daysRemaining}d`
            : ""
        }`
      : billing.status === "active"
        ? `Hasta ${formatDate(billing.paidUntil)}`
        : billing.status === "expired"
          ? "Elegí un plan para seguir"
          : null;

  const showPlans = !billing.lifetimeFree;

  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-emerald-950">Cuenta</h1>
        <div className="mt-4">
          <UserAccountSummary
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        </div>
      </div>

      {params.pago === "ok" ? (
        <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-900">
          Pago recibido. Si el plan no se actualiza en unos minutos, recargá
          esta página.
        </p>
      ) : null}
      {params.pago === "error" ? (
        <p className="rounded-xl bg-red-100 px-3 py-2 text-sm text-red-900">
          El pago no se completó. Podés intentar de nuevo.
        </p>
      ) : null}
      {params.pago === "pendiente" ? (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-950">
          Pago pendiente. Cuando Mercado Pago lo confirme, se activa el plan.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-950">Plan</p>
            {planDetail ? (
              <p className="mt-0.5 text-xs text-emerald-900/65">{planDetail}</p>
            ) : null}
          </div>
          <span
            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${planBadgeClass(billing.status)}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="border-t border-emerald-900/10">
          <Link
            href="/cuenta/notificaciones"
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-emerald-50/80"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-950">
                Notificaciones
              </p>
              <p className="mt-0.5 text-xs text-emerald-900/65">
                Horario y este dispositivo
              </p>
            </div>
            <ChevronRight />
          </Link>
        </div>

        <div className="border-t border-emerald-900/10">
          <Link
            href="/cuenta/ubicacion"
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-emerald-50/80"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-950">
                Ubicación
              </p>
              <p className="mt-0.5 text-xs text-emerald-900/65">
                Jardín para clima y lluvia
              </p>
            </div>
            <ChevronRight />
          </Link>
        </div>

        <div className="border-t border-emerald-900/10">
          <Link
            href="/cuenta/datos"
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-emerald-50/80"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-950">Datos</p>
              <p className="mt-0.5 text-xs text-emerald-900/65">
                Respaldo e importar planilla
              </p>
            </div>
            <ChevronRight />
          </Link>
        </div>
      </section>

      {showPlans ? (
        <section className="space-y-3">
          <h2 className="px-1 text-sm font-semibold text-emerald-950">
            {billing.status === "expired" ? "Elegí un plan" : "Cambiar plan"}
          </h2>

          {billing.status === "trial" ? (
            <p className="px-1 text-xs text-emerald-900/65">
              Prueba de {getTrialDays()} días. Podés pasar a un plan cuando
              quieras.
            </p>
          ) : null}

          <div className="space-y-3">
            <div className="space-y-2 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-950">
                  De por vida
                </p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatPriceArs(lifetimePrice)}
                </p>
              </div>
              <p className="text-xs text-emerald-900/65">Un solo pago.</p>
              {checkoutReady ? (
                <BillingPayButton
                  plan="lifetime"
                  label={`Pagar ${formatPriceArs(lifetimePrice)}`}
                />
              ) : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-950">Anual</p>
                <p className="text-sm font-semibold text-emerald-900">
                  {formatPriceArs(annualPrice)}
                </p>
              </div>
              <p className="text-xs text-emerald-900/65">Acceso por 1 año.</p>
              {checkoutReady ? (
                <BillingPayButton
                  plan="annual"
                  label={
                    billing.status === "active"
                      ? `Extender (${formatPriceArs(annualPrice)})`
                      : `Pagar ${formatPriceArs(annualPrice)}`
                  }
                />
              ) : null}
            </div>
          </div>

          {!checkoutReady ? (
            <p className="text-sm text-amber-800">
              Para habilitar los botones de pago, agregá{" "}
              <code className="rounded bg-amber-100 px-1">
                MERCADOPAGO_ACCESS_TOKEN
              </code>{" "}
              en el <code className="rounded bg-amber-100 px-1">.env</code> y
              reiniciá la app.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="pt-1">
        <SignOutButton />
      </div>
    </main>
  );
}
