"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { withBasePath } from "@/lib/base-path";

interface RainAllButtonProps {
  plantCount: number;
}

export function RainAllButton({ plantCount }: RainAllButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRain() {
    if (plantCount === 0) {
      alert("Agregá plantas primero para registrar la lluvia.");
      return;
    }

    if (
      !confirm(
        `¿Registrar lluvia hoy para ${plantCount === 1 ? "la planta" : "las plantas"}?`,
      )
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

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
      <h2 className="font-semibold text-indigo-950">¿Llovió hoy?</h2>
      <button
        type="button"
        disabled={loading || plantCount === 0}
        onClick={handleRain}
        aria-label={loading ? "Registrando lluvia" : "Llovió"}
        title="Llovió"
        className="mt-3 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-4 text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? (
          <span className="text-sm font-semibold">...</span>
        ) : (
          <ActionIcon name="water-cycle" size={40} />
        )}
      </button>
    </section>
  );
}
