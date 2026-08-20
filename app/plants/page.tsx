import Link from "next/link";
import { BackupDownloadButton } from "@/components/BackupDownloadButton";
import { PlantCard } from "@/components/PlantCard";
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
          <h1 className="text-3xl font-bold text-emerald-950">Plantas</h1>
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
          <p className="text-lg font-semibold text-emerald-950">
            Todavía no hay plantas
          </p>
          <p className="mt-2 text-sm text-emerald-900/70">
            Empezá cargando las del patio con sus intervalos de riego.
          </p>
          <Link
            href="/plants/new"
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Agregar primera planta
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              {...plant}
              lastGlobalRainAt={gardenSettings.lastRainAt}
              seasonOverride={gardenSettings.seasonOverride}
            />
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-emerald-950">Respaldo</h2>
        <p className="mt-1 text-sm text-emerald-900/70">
          Descargá una copia con plantas, historial, lluvia y fotos para
          guardarla en el celular o la compu.
        </p>
        <div className="mt-3">
          <BackupDownloadButton />
        </div>
      </section>
    </main>
  );
}
