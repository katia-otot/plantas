"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { withBasePath } from "@/lib/base-path";
import type { Season } from "@/lib/types";

type SeasonMode = "auto" | Season;

interface SeasonSelectorProps {
  effectiveSeason: Season;
  calendarSeason: Season;
  seasonOverride: Season | null;
}

const MODE_LABELS: Record<SeasonMode, string> = {
  auto: "Automático",
  summer: "Verano",
  winter: "Invierno",
};

const MODE_ICONS = {
  auto: "sol",
  summer: "verano",
  winter: "invierno",
} as const;

export function SeasonSelector({
  effectiveSeason,
  calendarSeason,
  seasonOverride,
}: SeasonSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<SeasonMode | null>(null);
  const currentMode: SeasonMode = seasonOverride ?? "auto";

  async function handleSelect(mode: SeasonMode) {
    if (mode === currentMode || loading) {
      return;
    }

    try {
      setLoading(mode);
      const response = await fetch(withBasePath("/api/settings/season"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonOverride: mode === "auto" ? null : mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al cambiar estación");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo cambiar la estación");
    } finally {
      setLoading(null);
    }
  }

  const modes: SeasonMode[] = ["auto", "summer", "winter"];

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <h2 className="font-semibold text-amber-950">Clima / estación</h2>
      <p className="mt-1 text-sm text-amber-900/70">
        Por defecto sigue el calendario del hemisferio sur. Si el clima se
        adelanta, podés forzar verano o invierno para los riegos.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {modes.map((mode) => {
          const isActive = currentMode === mode;
          const isBusy = loading === mode;

          return (
            <button
              key={mode}
              type="button"
              disabled={loading !== null}
              onClick={() => handleSelect(mode)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-amber-100 text-amber-950 ring-2 ring-amber-500"
                  : "bg-white text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100/80"
              } disabled:opacity-60`}
            >
              <ActionIcon name={MODE_ICONS[mode]} size={40} alt="" />
              <span>{isBusy ? "..." : MODE_LABELS[mode]}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-amber-900/80">
        Usando{" "}
        <span className="font-semibold">
          {effectiveSeason === "summer" ? "verano" : "invierno"}
        </span>
        {seasonOverride && seasonOverride !== calendarSeason && (
          <>
            {" "}
            · calendario:{" "}
            {calendarSeason === "summer" ? "verano" : "invierno"}
          </>
        )}
      </p>
    </section>
  );
}
