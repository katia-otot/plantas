import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateBilling,
  getAnnualPriceArs,
  getLifetimePriceArs,
  isBillingPlan,
} from "./billing";
import {
  isLifetimeFreeEmail,
  LIFETIME_FREE_EMAILS,
  MAX_LIFETIME_FREE_USERS,
} from "./lifetime-emails";

describe("lifetime emails fundadores", () => {
  it("reconoce los dos emails correctos", () => {
    assert.equal(isLifetimeFreeEmail("katiagadea19@gmail.com"), true);
    assert.equal(isLifetimeFreeEmail("Nechegoyen90529@gmail.com"), true);
    assert.equal(isLifetimeFreeEmail("katiagadea19@gmail"), false);
    assert.equal(isLifetimeFreeEmail("katiagadea194@gmail.com"), false);
    assert.equal(isLifetimeFreeEmail("otra@gmail.com"), false);
    assert.equal(LIFETIME_FREE_EMAILS.length, 2);
    assert.equal(MAX_LIFETIME_FREE_USERS, 5);
  });
});

describe("evaluateBilling", () => {
  const now = new Date("2026-11-04T15:00:00.000Z");

  it("lifetime siempre permitido", () => {
    const e = evaluateBilling({
      lifetimeFree: true,
      trialEndsAt: null,
      paidUntil: null,
      now,
    });
    assert.equal(e.allowed, true);
    assert.equal(e.status, "lifetime");
    assert.equal(e.reason, "lifetime");
  });

  it("trial vigente", () => {
    const e = evaluateBilling({
      lifetimeFree: false,
      trialEndsAt: new Date("2026-11-18T15:00:00.000Z"),
      paidUntil: null,
      now,
    });
    assert.equal(e.allowed, true);
    assert.equal(e.status, "trial");
    assert.equal(e.daysRemaining, 14);
  });

  it("pago vigente gana sobre trial vencido", () => {
    const e = evaluateBilling({
      lifetimeFree: false,
      trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
      paidUntil: new Date("2027-11-04T15:00:00.000Z"),
      now,
    });
    assert.equal(e.allowed, true);
    assert.equal(e.status, "active");
    assert.equal(e.reason, "paid");
  });

  it("vencido sin pago", () => {
    const e = evaluateBilling({
      lifetimeFree: false,
      trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
      paidUntil: null,
      now,
    });
    assert.equal(e.allowed, false);
    assert.equal(e.status, "expired");
    assert.equal(e.reason, "expired");
  });
});

describe("precios y planes", () => {
  it("defaults 15k anual y 40k lifetime", () => {
    assert.equal(getAnnualPriceArs(), 15000);
    assert.equal(getLifetimePriceArs(), 40000);
    assert.equal(isBillingPlan("annual"), true);
    assert.equal(isBillingPlan("lifetime"), true);
    assert.equal(isBillingPlan("monthly"), false);
  });
});
