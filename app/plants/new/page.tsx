import { PlantForm } from "@/components/PlantForm";

export default function NewPlantPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Nueva
        </p>
        <h1 className="text-3xl font-bold text-emerald-950">Agregar planta</h1>
      </header>

      <PlantForm submitLabel="Crear planta" />
    </main>
  );
}
