"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { withBasePath } from "@/lib/base-path";
import { formatShortWeekdayDay } from "@/lib/format";

interface RainAllButtonProps {
  plantCount: number;
  rainedToday: boolean;
  lastRainAt?: Date | string | null;
}

export function RainAllButton({
  plantCount,
  rainedToday,
  lastRainAt = null,
}: RainAllButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRain() {
    if (plantCount === 0) {
      alert("Agregá plantas primero para registrar la lluvia.");
      return;
    }

    if (
      !confirm("¿Registrar que llovió hoy? Se actualiza el riego del patio.")
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(withBasePath("/api/rain"), { method: "POST" });

      if (!response.ok) {
        throw new Error("Error al registrar lluvia");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar la lluvia");
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    if (
      !confirm(
        "¿Deshacer la lluvia de hoy? Se recalcula el riego de las plantas de exterior.",
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(withBasePath("/api/rain"), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al deshacer la lluvia");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo deshacer la lluvia");
    } finally {
      setLoading(false);
    }
  }

  if (rainedToday) {
    return (
      <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
        <h2 className="font-semibold text-sky-950">Llovió hoy</h2>
        <p className="mt-1 text-sm text-sky-900/70">
          Ya está registrada
          {lastRainAt ? ` · ${formatShortWeekdayDay(lastRainAt)}` : ""}. El
          riego se calcula desde la lluvia.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={handleUndo}
          className="mt-3 w-full rounded-xl border border-sky-300 bg-white px-4 py-3 text-sm font-semibold text-sky-950 hover:bg-sky-50 disabled:opacity-60"
        >
          {loading ? "..." : "Deshacer lluvia"}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
      <h2 className="font-semibold text-sky-950">¿Llovió hoy?</h2>
      <button
        type="button"
        disabled={loading || plantCount === 0}
        onClick={handleRain}
        aria-label={loading ? "Registrando lluvia" : "Registrar lluvia"}
        title="Registrar lluvia"
        className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-5 text-sky-950 shadow-sm hover:bg-sky-50 disabled:opacity-60"
      >
        {loading ? (
          <span className="text-sm font-semibold">...</span>
        ) : (
          <ActionIcon name="lluvia" size={64} alt="" />
        )}
      </button>
    </section>
  );
}
