import { ActionIcon } from "@/components/ActionIcon";
import { StatusGroupsList } from "@/components/StatusGroupsList";
import { resolveGardenId } from "@/lib/garden-access";
import { prisma } from "@/lib/db";
import {
  normalizePlantStatus,
  PLANT_STATUSES,
  type PlantStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatusGuidePage() {
  const gardenId = await resolveGardenId();
  const plants = await prisma.plant.findMany({
    where: { gardenId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      quantity: true,
      coverPhotoPath: true,
    },
  });

  const groups = PLANT_STATUSES.map((status: PlantStatus) => ({
    status,
    items: plants
      .filter((plant) => normalizePlantStatus(plant.status) === status)
      .map((plant) => ({
        id: plant.id,
        name: plant.name,
        quantity: plant.quantity,
        coverPhotoPath: plant.coverPhotoPath,
      })),
  }));

  const total = plants.length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Consulta
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="planta" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">Por estado</h1>
        </div>
        <p className="mt-1 text-sm text-emerald-900/70">
          Alta, baja y posible · {total} planta{total === 1 ? "" : "s"}
        </p>
      </header>

      {total === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <p className="font-semibold text-emerald-950">Todavía no hay plantas</p>
        </section>
      ) : (
        <StatusGroupsList groups={groups} />
      )}
    </main>
  );
}
