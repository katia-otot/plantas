import Link from "next/link";
import { ActionIcon } from "@/components/ActionIcon";
import { PlantsList } from "@/components/PlantsList";
import { getGardenSettings, listPlants } from "@/lib/plants";

export const dynamic = "force-dynamic";

export default async function PlantsPage() {
  const [plants, gardenSettings] = await Promise.all([
    listPlants(),
    getGardenSettings(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Colección
          </p>
          <div className="mt-1 flex items-center gap-3">
            <ActionIcon name="planta" size={48} alt="" />
            <h1 className="text-3xl font-bold text-emerald-950">Plantas</h1>
          </div>
        </div>
        <Link
          href="/plants/new"
          className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Nueva
        </Link>
      </header>

      {plants.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <div className="flex justify-center">
            <ActionIcon name="planta" size={64} alt="" />
          </div>
          <p className="mt-3 text-lg font-semibold text-emerald-950">
            Todavía no hay plantas
          </p>
          <p className="mt-2 text-sm text-emerald-900/70">
            Empezá cargando las del patio, o importá un Excel desde el menú.
          </p>
          <Link
            href="/plants/new"
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Agregar primera planta
          </Link>
        </section>
      ) : (
        <PlantsList
          plants={plants}
          lastGlobalRainAt={gardenSettings.lastRainAt}
          seasonOverride={gardenSettings.seasonOverride}
        />
      )}
    </main>
  );
}
