"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { withBasePath } from "@/lib/base-path";
import {
  PLANT_STATUS_LABELS,
  type PlantStatus,
} from "@/lib/types";

const PREVIEW_COUNT = 3;

const STATUS_BLURBS: Record<PlantStatus, string> = {
  alta: "En el patio · entran en Hoy y recordatorios",
  baja: "Ya no las tenés · sin notificaciones",
  posible: "Candidatas a futuro · sin notificaciones",
};

export type StatusGroupPlant = {
  id: string;
  name: string;
  quantity: number;
  coverPhotoPath: string | null;
};

export type StatusGroup = {
  status: PlantStatus;
  items: StatusGroupPlant[];
};

function StatusGroupSection({ group }: { group: StatusGroup }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, group.items.length - PREVIEW_COUNT);
  const visible = expanded
    ? group.items
    : group.items.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-emerald-950">
            {PLANT_STATUS_LABELS[group.status]}
            <span className="ml-2 text-sm font-medium text-emerald-800/70">
              ({group.items.length})
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-emerald-900/60">
            {STATUS_BLURBS[group.status]}
          </p>
        </div>
        <PlantStatusBadge status={group.status} />
      </div>

      {group.items.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-900/60">Ninguna</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/plants/${item.id}`}
                  className="flex overflow-hidden rounded-xl border border-emerald-900/10 bg-emerald-50/80 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <div className="relative w-20 shrink-0 self-stretch min-h-[4.5rem] bg-emerald-100">
                    {item.coverPhotoPath ? (
                      <Image
                        src={withBasePath(item.coverPhotoPath)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full min-h-[4.5rem] items-center justify-center text-2xl">
                        🌿
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3">
                    <span className="truncate text-sm font-medium text-emerald-950">
                      {item.name}
                    </span>
                    {item.quantity > 1 ? (
                      <span className="shrink-0 text-xs font-semibold text-emerald-800/70">
                        ×{item.quantity}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-3 w-full rounded-xl border border-emerald-900/10 bg-emerald-50/50 px-3 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              {expanded
                ? "Ver menos"
                : `Ver las ${hiddenCount} restantes`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export function StatusGroupsList({ groups }: { groups: StatusGroup[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <StatusGroupSection key={group.status} group={group} />
      ))}
    </div>
  );
}
