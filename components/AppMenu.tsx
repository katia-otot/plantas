"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ActionIcon } from "@/components/ActionIcon";
import { SeasonSelector } from "@/components/SeasonSelector";
import { UserAccountSummary } from "@/components/UserAccountSummary";
import {
  getClientMountedSnapshot,
  getServerMountedSnapshot,
  shouldRenderClientPortal,
  subscribeClientMounted,
} from "@/lib/client-mounted";
import type { Season } from "@/lib/types";

interface AppMenuProps {
  effectiveSeason: Season;
  calendarSeason: Season;
  seasonOverride: Season | null;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

const consultaLinks = [
  {
    href: "/lluvias",
    label: "Historial de lluvias",
    icon: "lluvia" as const,
  },
  {
    href: "/consulta/historial",
    label: "Historial",
    icon: "agenda" as const,
  },
  {
    href: "/notas",
    label: "Notas del patio",
    icon: "notas" as const,
  },
  {
    href: "/pajaros",
    label: "Pájaros",
    icon: "pajarito" as const,
  },
  {
    href: "/consulta/cuidados",
    label: "Cuidados en lote",
    icon: "fertilizante" as const,
  },
];

export function AppMenu({
  effectiveSeason,
  calendarSeason,
  seasonOverride,
  user = null,
}: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeClientMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
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

  const panel = shouldRenderClientPortal(open, mounted)
      ? createPortal(
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-emerald-950/40"
              onClick={() => setOpen(false)}
            />

            <aside
              id="app-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,22rem)] flex-col bg-[#edf7f0] shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-emerald-900/10 px-4 py-3">
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-emerald-950"
                >
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

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-emerald-950">Consultas</h3>
                  <div className="mt-3 space-y-2">
                    {consultaLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-100"
                      >
                        <ActionIcon name={item.icon} size={40} alt="" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                <SeasonSelector
                  effectiveSeason={effectiveSeason}
                  calendarSeason={calendarSeason}
                  seasonOverride={seasonOverride}
                />

                <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
                  {user ? (
                    <UserAccountSummary
                      name={user.name}
                      email={user.email}
                      image={user.image}
                    />
                  ) : null}
                  <div className={user ? "mt-3" : undefined}>
                    <Link
                      href="/cuenta"
                      onClick={() => setOpen(false)}
                      className="flex items-center rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-100"
                    >
                      Ver cuenta
                    </Link>
                  </div>
                </section>
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

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
      {panel}
    </>
  );
}
