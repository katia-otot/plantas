import { ActionIcon } from "@/components/ActionIcon";
import {
  BulkCareEditor,
  type BulkCarePlant,
} from "@/components/BulkCareEditor";
import { resolveGardenId } from "@/lib/garden-access";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BulkCarePage() {
  const gardenId = await resolveGardenId();
  const plants = (await prisma.plant.findMany({
    where: { gardenId, status: { in: ["alta", "posible"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      needsFertilizer: true,
      needsPruning: true,
      needsPest: true,
    },
  })) as BulkCarePlant[];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Consulta
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="fertilizante" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">
            Cuidados en lote
          </h1>
        </div>
        <p className="mt-2 text-sm text-emerald-900/70">
          Seleccioná varias plantas y registrá el mismo fertilizante, poda o
          tratamiento.
        </p>
      </header>

      <BulkCareEditor plants={plants} />
    </main>
  );
}
