import { prisma } from "@/lib/db";
import { isLifetimeFreeEmail } from "@/lib/lifetime-emails";
import { normalizeEmail } from "@/lib/owner-emails";

export type BillingStatus = "trial" | "active" | "expired" | "lifetime";

export type BillingEntitlement = {
  allowed: boolean;
  status: BillingStatus;
  lifetimeFree: boolean;
  trialEndsAt: string | null;
  paidUntil: string | null;
  /** Días restantes de prueba o de plan pago (null si lifetime / vencido sin resto). */
  daysRemaining: number | null;
  reason: "ok" | "lifetime" | "trial" | "paid" | "expired";
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getTrialDays(): number {
  const raw = Number(process.env.BILLING_TRIAL_DAYS ?? "14");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 14;
}

export type BillingPlan = "annual" | "lifetime";

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "annual" || value === "lifetime";
}

export function getAnnualPriceArs(): number {
  const raw = Number(process.env.BILLING_ANNUAL_PRICE_ARS ?? "15000");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 15000;
}

/** Pago único: acceso de por vida. */
export function getLifetimePriceArs(): number {
  const raw = Number(process.env.BILLING_LIFETIME_PRICE_ARS ?? "40000");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 40000;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.ceil((b - a) / MS_PER_DAY);
}

export function evaluateBilling(input: {
  lifetimeFree: boolean;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  now?: Date;
}): BillingEntitlement {
  const now = input.now ?? new Date();

  if (input.lifetimeFree) {
    return {
      allowed: true,
      status: "lifetime",
      lifetimeFree: true,
      trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
      paidUntil: input.paidUntil?.toISOString() ?? null,
      daysRemaining: null,
      reason: "lifetime",
    };
  }

  if (input.paidUntil && input.paidUntil.getTime() > now.getTime()) {
    return {
      allowed: true,
      status: "active",
      lifetimeFree: false,
      trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
      paidUntil: input.paidUntil.toISOString(),
      daysRemaining: Math.max(0, daysBetween(now, input.paidUntil)),
      reason: "paid",
    };
  }

  if (input.trialEndsAt && input.trialEndsAt.getTime() > now.getTime()) {
    return {
      allowed: true,
      status: "trial",
      lifetimeFree: false,
      trialEndsAt: input.trialEndsAt.toISOString(),
      paidUntil: input.paidUntil?.toISOString() ?? null,
      daysRemaining: Math.max(0, daysBetween(now, input.trialEndsAt)),
      reason: "trial",
    };
  }

  return {
    allowed: false,
    status: "expired",
    lifetimeFree: false,
    trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
    paidUntil: input.paidUntil?.toISOString() ?? null,
    daysRemaining: 0,
    reason: "expired",
  };
}

type BillingUserRow = {
  id: string;
  email: string | null;
  lifetimeFree: boolean;
  billingStatus: string;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
};

/**
 * Primera vez / cada login: fundadores → lifetime; resto → prueba 14 días.
 * Early lifetime solo a mano (script / DB), no automático.
 * No acorta trials ni pagos ya existentes.
 */
export async function ensureUserBilling(
  userId: string,
  email: string | null | undefined,
): Promise<BillingUserRow> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuario no encontrado para billing");
  }

  const normalized = email ? normalizeEmail(email) : user.email;
  const now = new Date();
  const patch: {
    lifetimeFree?: boolean;
    billingStatus?: string;
    trialEndsAt?: Date | null;
    billingUpdatedAt?: Date;
  } = {};

  if (isLifetimeFreeEmail(normalized)) {
    if (!user.lifetimeFree || user.billingStatus !== "lifetime") {
      patch.lifetimeFree = true;
      patch.billingStatus = "lifetime";
      patch.billingUpdatedAt = now;
    }
  } else if (user.lifetimeFree) {
    // Ya marcado a mano como early lifetime.
    if (user.billingStatus !== "lifetime") {
      patch.billingStatus = "lifetime";
      patch.billingUpdatedAt = now;
    }
  } else if (!user.trialEndsAt && !user.paidUntil) {
    const trialEnds = new Date(now.getTime() + getTrialDays() * MS_PER_DAY);
    patch.trialEndsAt = trialEnds;
    patch.billingStatus = "trial";
    patch.billingUpdatedAt = now;
  } else {
    const entitlement = evaluateBilling(user);
    if (user.billingStatus !== entitlement.status) {
      patch.billingStatus = entitlement.status;
      patch.billingUpdatedAt = now;
    }
  }

  if (Object.keys(patch).length === 0) {
    return user;
  }

  return prisma.user.update({
    where: { id: userId },
    data: patch,
  });
}

export async function getBillingEntitlement(
  userId: string,
): Promise<BillingEntitlement> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return {
      allowed: false,
      status: "expired",
      lifetimeFree: false,
      trialEndsAt: null,
      paidUntil: null,
      daysRemaining: 0,
      reason: "expired",
    };
  }
  return evaluateBilling(user);
}

/** Extiende o inicia el plan anual tras un pago confirmado. */
export async function activatePaidYear(
  userId: string,
  paymentId: string,
  now = new Date(),
): Promise<BillingUserRow> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }
  if (user.lifetimeFree) {
    return user;
  }

  const base =
    user.paidUntil && user.paidUntil.getTime() > now.getTime()
      ? user.paidUntil
      : now;
  const paidUntil = new Date(base);
  paidUntil.setFullYear(paidUntil.getFullYear() + 1);

  return prisma.user.update({
    where: { id: userId },
    data: {
      paidUntil,
      billingStatus: "active",
      mpLastPaymentId: paymentId,
      billingUpdatedAt: now,
    },
  });
}

/** Pago único: acceso de por vida. */
export async function activatePaidLifetime(
  userId: string,
  paymentId: string,
  now = new Date(),
): Promise<BillingUserRow> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      lifetimeFree: true,
      billingStatus: "lifetime",
      mpLastPaymentId: paymentId,
      billingUpdatedAt: now,
    },
  });
}

export async function activatePaidPlan(
  userId: string,
  paymentId: string,
  plan: BillingPlan,
  now = new Date(),
): Promise<BillingUserRow> {
  if (plan === "lifetime") {
    return activatePaidLifetime(userId, paymentId, now);
  }
  return activatePaidYear(userId, paymentId, now);
}
