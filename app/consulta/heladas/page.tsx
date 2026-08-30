import Link from "next/link";
import { ActionIcon } from "@/components/ActionIcon";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { resolveGardenId } from "@/lib/garden-access";
import { prisma } from "@/lib/db";
import {
  FROST_CATEGORIES,
  FROST_CATEGORY_STYLE,
  formatFrostValue,
  frostGroupCategory,
  frostSortKey,
  frostStyle,
  parseFrostValue,
  type FrostValue,
} from "@/lib/frost";

export const dynamic = "force-dynamic";

type GroupItem = {
  id: string;
  name: string;
  status: string;
  detail: string | null;
};

export default async function FrostGuidePage() {
  const gardenId = await resolveGardenId();
  const plants = await prisma.plant.findMany({
    where: { gardenId, status: { in: ["alta", "posible"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      frostResistance: true,
      status: true,
    },
  });

  const groups = new Map<
    string,
    {
      label: string;
      style: ReturnType<typeof frostStyle>;
      sort: [number, number, string];
      items: GroupItem[];
    }
  >();

  for (const plant of plants) {
    const parsed = parseFrostValue(plant.frostResistance);
    const category = frostGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ?? "Sin tipificar";
    const representative: FrostValue | null = category
      ? { kind: "category", category }
      : null;
    const detail =
      parsed?.kind === "celsius" ? formatFrostValue(parsed) : null;
    const item: GroupItem = {
      id: plant.id,
      name: plant.name,
      status: plant.status,
      detail,
    };
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(key, {
        label,
        style: frostStyle(representative ?? parsed),
        sort: frostSortKey(representative ?? parsed),
        items: [item],
      });
    }
  }

  const ordered = [...groups.values()].sort((a, b) => {
    const da = a.sort[0] - b.sort[0];
    if (da !== 0) return da;
    const db = a.sort[1] - b.sort[1];
    if (db !== 0) return db;
    return a.sort[2].localeCompare(b.sort[2], "es");
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Consulta
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="heladas" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">
            Resistencia a heladas
          </h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          {FROST_CATEGORIES.map((category) => {
            const style = FROST_CATEGORY_STYLE[category];
            return (
              <span
                key={category}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-emerald-950 shadow-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: style.swatch }}
                />
                {category} {style.threshold}
              </span>
            );
          })}
        </div>
      </header>

      {ordered.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <p className="font-semibold text-emerald-950">Todavía no hay plantas</p>
        </section>
      ) : (
        <div className="space-y-4">
          {ordered.map((group) => (
            <section
              key={group.label}
              className={`rounded-2xl border p-4 shadow-sm ${group.style.section}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-emerald-950">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: group.style.swatch }}
                  />
                  {group.label}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${group.style.badge}`}
                >
                  {group.items.length}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/plants/${item.id}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-3 text-sm font-medium text-emerald-950 hover:bg-white"
                    >
                      <span className="min-w-0">
                        {item.name}
                        {item.detail ? (
                          <span className="ml-1.5 font-normal text-emerald-800/70">
                            ({item.detail})
                          </span>
                        ) : null}
                      </span>
                      {item.status !== "alta" ? (
                        <PlantStatusBadge status={item.status} />
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
