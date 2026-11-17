import { ActionIcon } from "@/components/ActionIcon";
import {
  SoilPhGroupsEditor,
  type SoilPhGroupView,
} from "@/components/SoilPhGroupsEditor";
import { resolveGardenId } from "@/lib/garden-access";
import { prisma } from "@/lib/db";
import {
  SOIL_PH_LABELS,
  formatSoilPhValue,
  parseSoilPhValue,
  soilPhGroupCategory,
  soilPhSortKey,
  soilPhStyle,
  type SoilPhValue,
} from "@/lib/soil-ph";

export const dynamic = "force-dynamic";

type GroupItem = {
  id: string;
  name: string;
  status: string;
  detail: string | null;
};

export default async function SoilGuidePage() {
  const gardenId = await resolveGardenId();
  const plants = await prisma.plant.findMany({
    where: { gardenId, status: { in: ["alta", "posible"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      soilType: true,
      status: true,
    },
  });

  const groups = new Map<
    string,
    {
      label: string;
      sort: [number, number, string];
      style: ReturnType<typeof soilPhStyle>;
      items: GroupItem[];
    }
  >();

  for (const plant of plants) {
    const parsed = parseSoilPhValue(plant.soilType);
    const category = soilPhGroupCategory(parsed);
    const key = category ?? "Sin tipificar";
    const label = category ? SOIL_PH_LABELS[category] : "Sin tipificar";
    const representative: SoilPhValue | null = category
      ? { kind: "category", category }
      : null;
    const detail = parsed?.kind === "ph" ? formatSoilPhValue(parsed) : null;
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
        sort: soilPhSortKey(representative ?? parsed),
        style: soilPhStyle(representative ?? parsed),
        items: [item],
      });
    }
  }

  const ordered: SoilPhGroupView[] = [...groups.values()]
    .sort((a, b) => {
      const da = a.sort[0] - b.sort[0];
      if (da !== 0) return da;
      const db = a.sort[1] - b.sort[1];
      if (db !== 0) return db;
      return a.sort[2].localeCompare(b.sort[2], "es");
    })
    .map((group) => ({
      label: group.label,
      sectionClass: group.style.section,
      badgeClass: group.style.badge,
      swatch: group.style.swatch,
      items: group.items,
    }));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Consulta
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="ph-suelo" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">pH del suelo</h1>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          {[
            { label: "Ácido <6.25", color: "#e74c3c" },
            { label: "Lev. ácido <6.75", color: "#f39c12" },
            { label: "Neutro <7.25", color: "#c0ca33" },
            { label: "Lev. alcalino ≥7.25", color: "#1abc9c" },
          ].map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-emerald-950 shadow-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </header>

      <SoilPhGroupsEditor groups={ordered} />
    </main>
  );
}
