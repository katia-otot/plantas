"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { withBasePath } from "@/lib/base-path";
import type { RainIntensity } from "@/lib/rain-credit";

interface RainAllButtonProps {
  plantCount: number;
  todayIntensity: RainIntensity | null;
  targetDate?: string | null;
}

function InfoCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function RainAllButton({
  plantCount,
  todayIntensity,
  targetDate = null,
}: RainAllButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<RainIntensity | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function register(intensity: RainIntensity) {
    if (plantCount === 0) {
      alert("Agregá plantas de exterior primero para registrar la lluvia.");
      return;
    }

    if (todayIntensity === intensity) {
      setFeedback("Ya estaba registrada así.");
      return;
    }

    try {
      setLoading(intensity);
      setFeedback(null);
      const response = await fetch(withBasePath("/api/rain"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intensity,
          ...(targetDate ? { rainDate: targetDate } : {}),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Error al registrar lluvia");
      }

      setFeedback(data.message ?? "Listo.");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "No se pudo registrar la lluvia",
      );
    } finally {
      setLoading(null);
    }
  }

  const selected =
    todayIntensity === "moderate" || todayIntensity === "heavy"
      ? todayIntensity
      : null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-sky-950">¿Llovió hoy?</h2>
        <Link
          href={withBasePath("/lluvias/info")}
          aria-label="Información de lluvias"
          title="Información de lluvias"
          className="rounded-full p-1.5 text-sky-800 hover:bg-sky-100"
        >
          <InfoCircleIcon className="h-6 w-6" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={loading !== null || plantCount === 0}
          onClick={() => register("moderate")}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold disabled:opacity-60 ${
            selected === "moderate"
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-sky-200 bg-white text-sky-950 hover:bg-sky-50"
          }`}
        >
          {loading === "moderate" ? (
            <span>...</span>
          ) : (
            <>
              <ActionIcon name="lluvia" size={48} alt="" />
              <span>Lluvia moderada</span>
            </>
          )}
        </button>
        <button
          type="button"
          disabled={loading !== null || plantCount === 0}
          onClick={() => register("heavy")}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-semibold disabled:opacity-60 ${
            selected === "heavy"
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-sky-200 bg-white text-sky-950 hover:bg-sky-50"
          }`}
        >
          {loading === "heavy" ? (
            <span>...</span>
          ) : (
            <>
              <ActionIcon name="lluvia-fuerte" size={48} alt="" />
              <span>Lluvia fuerte</span>
            </>
          )}
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm font-medium text-sky-950">{feedback}</p>
      ) : null}
    </section>
  );
}
