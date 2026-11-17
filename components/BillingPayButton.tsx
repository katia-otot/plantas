"use client";

import { useState } from "react";
import type { BillingPlan } from "@/lib/billing";
import { withBasePath } from "@/lib/base-path";

export function BillingPayButton({
  plan,
  disabled = false,
  label,
}: {
  plan: BillingPlan;
  disabled?: boolean;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/billing/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        initPoint?: string;
        error?: string;
      };
      if (!res.ok || !data.initPoint) {
        throw new Error(data.error || "No se pudo iniciar el pago");
      }
      window.location.href = data.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al pagar");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={onPay}
        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Redirigiendo a Mercado Pago…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
