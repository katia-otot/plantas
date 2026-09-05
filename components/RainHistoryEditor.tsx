"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";
import {
  rainIntensityLabel,
  type RainIntensity,
} from "@/lib/rain-credit";

export type RainDayRecord = {
  id: string;
  rainDate: string;
  intensity: RainIntensity;
  source: string | null;
  version: number;
  updatedAt: Date;
};

export function RainHistoryEditor({
  initialDays,
}: {
  initialDays: RainDayRecord[];
}) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function save(rainDate: string, intensity: RainIntensity) {
    try {
      setBusyDate(rainDate);
      setMessage(null);
      const response = await fetch(withBasePath("/api/rain"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rainDate, intensity }),
      });
      const data = (await response.json()) as {
        message?: string;
        error?: string;
        rainDay?: RainDayRecord;
      };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar");
      }
      if (data.rainDay) {
        setDays((prev) => {
          const without = prev.filter((d) => d.rainDate !== rainDate);
          return [data.rainDay!, ...without].sort((a, b) =>
            a.rainDate < b.rainDate ? 1 : -1,
          );
        });
      }
      setMessage(data.message ?? "Guardado.");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error");
    } finally {
      setBusyDate(null);
    }
  }

  async function addPast() {
    if (!newDate) {
      alert("Elegí una fecha");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (newDate > today) {
      alert("No se pueden registrar lluvias futuras");
      return;
    }
    await save(newDate, "moderate");
    setNewDate("");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-sky-950">Agregar fecha pasada</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="date"
            value={newDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setNewDate(event.target.value)}
            className="rounded-xl border border-sky-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addPast}
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Agregar como moderada
          </button>
        </div>
      </section>

      {message ? (
        <p className="text-sm font-medium text-sky-950">{message}</p>
      ) : null}

      {days.length === 0 ? (
        <p className="text-sm text-sky-900/70">Todavía no hay lluvias registradas.</p>
      ) : (
        <ul className="space-y-3">
          {days.map((day) => (
            <li
              key={day.id}
              className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sky-950">{day.rainDate}</p>
                  <p className="text-sm text-sky-900/70">
                    {rainIntensityLabel(day.intensity)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["moderate", "Moderada"],
                    ["heavy", "Fuerte"],
                    ["none", "No cuenta"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={busyDate === day.rainDate}
                    onClick={() => save(day.rainDate, value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                      day.intensity === value
                        ? "border-sky-700 bg-sky-700 text-white"
                        : "border-sky-200 bg-sky-50 text-sky-950"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
