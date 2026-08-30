"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { withBasePath } from "@/lib/base-path";
import type { Season } from "@/lib/types";
import { seasonToEstacionParam } from "@/lib/water-consulta";

export type WaterIntervalPlant = {
  id: string;
  name: string;
  quantity: number;
  coverPhotoPath: string | null;
  waterSummerDays: number;
  waterWinterDays: number;
  isIndoor: boolean;
};

type Props = {
  plants: WaterIntervalPlant[];
  season: Season;
};

const PREVIEW_COUNT = 4;

function groupByDays(plants: WaterIntervalPlant[], season: Season) {
  const map = new Map<number, WaterIntervalPlant[]>();

  for (const plant of plants) {
    const days =
      season === "summer" ? plant.waterSummerDays : plant.waterWinterDays;
    const list = map.get(days);
    if (list) {
      list.push(plant);
    } else {
      map.set(days, [plant]);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([days, items]) => ({
      days,
      items: [...items].sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
      ),
    }));
}

function IntervalGroup({
  days,
  items,
}: {
  days: number;
  items: WaterIntervalPlant[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, items.length - PREVIEW_COUNT);
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <ActionIcon name="regar" size={40} alt="" />
        <div>
          <h2 className="font-semibold text-emerald-950">
            Cada {days} día{days === 1 ? "" : "s"}
            <span className="ml-2 text-sm font-medium text-emerald-800/70">
              ({items.length})
            </span>
          </h2>
        </div>
      </div>

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
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-emerald-950">
                    {item.name}
                  </span>
                  {item.isIndoor ? (
                    <span className="text-xs text-emerald-800/60">Interior</span>
                  ) : null}
                </div>
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
          {expanded ? "Ver menos" : `Ver las ${hiddenCount} restantes`}
        </button>
      ) : null}
    </section>
  );
}

export function WaterIntervalGroups({ plants, season }: Props) {
  const router = useRouter();
  const groups = useMemo(() => groupByDays(plants, season), [plants, season]);

  function selectSeason(next: Season) {
    if (next === season) {
      return;
    }
    router.replace(
      `/consulta/riego?estacion=${seasonToEstacionParam(next)}`,
      { scroll: false },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Consulta
          </p>
          <div className="mt-1 flex items-center gap-3">
            <ActionIcon name="regar" size={56} alt="" />
            <h1 className="text-3xl font-bold text-emerald-950">Por riego</h1>
          </div>
          <p className="mt-1 text-sm text-emerald-900/70">
            Agrupadas por cada cuántos días · {plants.length} planta
            {plants.length === 1 ? "" : "s"}
          </p>
        </div>

        <div
          className="flex shrink-0 rounded-xl border border-emerald-900/15 bg-white p-1 shadow-sm"
          role="group"
          aria-label="Estación del riego"
        >
          <button
            type="button"
            onClick={() => selectSeason("summer")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              season === "summer"
                ? "bg-emerald-700 text-white"
                : "text-emerald-900 hover:bg-emerald-50"
            }`}
          >
            Verano
          </button>
          <button
            type="button"
            onClick={() => selectSeason("winter")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              season === "winter"
                ? "bg-emerald-700 text-white"
                : "text-emerald-900 hover:bg-emerald-50"
            }`}
          >
            Invierno
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <p className="font-semibold text-emerald-950">Todavía no hay plantas</p>
        </section>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <IntervalGroup
              key={group.days}
              days={group.days}
              items={group.items}
            />
          ))}
        </div>
      )}
    </div>
  );
}
