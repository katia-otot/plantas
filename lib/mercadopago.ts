import {
  type BillingPlan,
  getAnnualPriceArs,
  getLifetimePriceArs,
} from "@/lib/billing";

const MP_API = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en el entorno");
  }
  return token;
}

const DEFAULT_PUBLIC_SITE = "https://katiagadea.com.ar/plantas";

/**
 * Mercado Pago exige back_urls.success en HTTPS y con dominio
 * (rechaza localhost, http e IP) si auto_return está activo.
 */
function isMercadoPagoReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function checkoutSiteUrl(): string {
  const candidates = [
    process.env.MERCADOPAGO_SITE_URL,
    process.env.PLANTAS_PUBLIC_URL,
    process.env.AUTH_URL,
    DEFAULT_PUBLIC_SITE,
  ];
  for (const raw of candidates) {
    const url = raw?.trim().replace(/\/$/, "");
    if (url && isMercadoPagoReturnUrl(url)) return url;
  }
  return DEFAULT_PUBLIC_SITE;
}

export type CheckoutPreferenceResult = {
  id: string;
  initPoint: string;
  sandboxInitPoint: string | null;
};

function planCatalog(plan: BillingPlan): {
  id: string;
  title: string;
  description: string;
  unitPrice: number;
} {
  if (plan === "lifetime") {
    return {
      id: "anthos-lifetime",
      title: "Anthos — acceso de por vida",
      description: "Pago único: acceso completo a Anthos para siempre",
      unitPrice: getLifetimePriceArs(),
    };
  }
  return {
    id: "anthos-annual",
    title: "Anthos — plan anual",
    description: "Acceso completo a Anthos por 1 año",
    unitPrice: getAnnualPriceArs(),
  };
}

/** Crea preferencia Checkout Pro (anual o pago único de por vida). */
export async function createCheckoutPreference(input: {
  userId: string;
  email: string;
  plan: BillingPlan;
}): Promise<CheckoutPreferenceResult> {
  const catalog = planCatalog(input.plan);
  const base = checkoutSiteUrl();
  const token = getAccessToken();
  const webhook =
    process.env.MERCADOPAGO_WEBHOOK_URL?.trim() ||
    `${base}/api/billing/webhook`;

  const body: Record<string, unknown> = {
    items: [
      {
        id: catalog.id,
        title: catalog.title,
        description: catalog.description,
        quantity: 1,
        currency_id: "ARS",
        unit_price: catalog.unitPrice,
      },
    ],
    payer: {
      email: input.email,
    },
    external_reference: `${input.userId}:${input.plan}`,
    metadata: {
      userId: input.userId,
      plan: input.plan,
    },
    back_urls: {
      success: `${base}/cuenta?pago=ok`,
      failure: `${base}/cuenta?pago=error`,
      pending: `${base}/cuenta?pago=pendiente`,
    },
    auto_return: "approved",
  };

  if (isMercadoPagoReturnUrl(webhook)) {
    body.notification_url = webhook;
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mercado Pago preference error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };

  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) {
    throw new Error("Mercado Pago no devolvió init_point");
  }

  return {
    id: data.id,
    initPoint,
    sandboxInitPoint: data.sandbox_init_point ?? null,
  };
}

export type MercadoPagoPayment = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  metadata?: { userId?: string; plan?: string } | null;
};

export async function fetchMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPayment> {
  const token = getAccessToken();
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mercado Pago payment error: ${res.status} ${text}`);
  }
  return (await res.json()) as MercadoPagoPayment;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}
