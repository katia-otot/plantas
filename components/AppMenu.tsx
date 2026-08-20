"use client";

import { useEffect, useId, useState } from "react";
import { SeasonSelector } from "@/components/SeasonSelector";
import type { Season } from "@/lib/types";

interface AppMenuProps {
  effectiveSeason: Season;
  calendarSeason: Season;
  seasonOverride: Season | null;
}

export function AppMenu({
  effectiveSeason,
  calendarSeason,
  seasonOverride,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="app-menu-panel"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-emerald-950 transition hover:bg-emerald-100/80"
      >
        <span className="sr-only">Menú</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-emerald-950/35"
            onClick={() => setOpen(false)}
          />

          <aside
            id="app-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-[min(100%,22rem)] flex-col bg-[#edf7f0] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-emerald-900/10 px-4 py-3">
              <h2 id={titleId} className="text-lg font-semibold text-emerald-950">
                Menú
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-emerald-950 transition hover:bg-emerald-100/80"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SeasonSelector
                effectiveSeason={effectiveSeason}
                calendarSeason={calendarSeason}
                seasonOverride={seasonOverride}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
