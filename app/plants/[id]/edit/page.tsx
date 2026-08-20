import { notFound } from "next/navigation";
import { PlantForm } from "@/components/PlantForm";
import { getPlantById, getPlantCareTreatments } from "@/lib/plants";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPlantPage({ params }: PageProps) {
  const { id } = await params;
  const plant = await getPlantById(id);

  if (!plant) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Editar
        </p>
        <h1 className="text-3xl font-bold text-emerald-950">{plant.name}</h1>
      </header>

      <PlantForm
        submitLabel="Guardar cambios"
        initialValues={{
          id: plant.id,
          name: plant.name,
          species: plant.species,
          location: plant.location,
          notes: plant.notes,
          coverPhotoPath: plant.coverPhotoPath,
          waterSummerDays: plant.waterSummerDays,
          waterWinterDays: plant.waterWinterDays,
          rainPostponeDays: plant.rainPostponeDays,
          isIndoor: plant.isIndoor,
          needsPruning: plant.needsPruning,
          nextPruneAt: plant.nextPruneAt?.toISOString() ?? null,
          pruneNotes: plant.pruneNotes,
          careTreatments: getPlantCareTreatments(plant),
          lastWateredAt: plant.lastWateredAt?.toISOString() ?? null,
        }}
      />
    </main>
  );
}
