import { notFound } from "next/navigation";
import { PlantForm } from "@/components/PlantForm";
import { toInputDate } from "@/lib/format";
import { mergeNotesIntoObservations } from "@/lib/plant-text";
import { getPlantById, getPlantCareTreatments } from "@/lib/plants";
import { normalizePlantStatus } from "@/lib/types";

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
      <PlantForm
        submitLabel="Guardar cambios"
        header={{ eyebrow: "Editar", title: plant.name }}
        initialValues={{
          id: plant.id,
          name: plant.name,
          species: plant.species,
          location: plant.location,
          coverPhotoPath: plant.coverPhotoPath,
          status: normalizePlantStatus(plant.status),
          quantity: plant.quantity,
          waterSummerDays: plant.waterSummerDays,
          waterWinterDays: plant.waterWinterDays,
          rainPostponeDays: plant.rainPostponeDays,
          isIndoor: plant.isIndoor,
          careTreatments: getPlantCareTreatments(plant),
          lastWateredAt: plant.lastWateredAt
            ? toInputDate(plant.lastWateredAt)
            : null,
          frostResistance: plant.frostResistance,
          soilType: plant.soilType,
          observations: mergeNotesIntoObservations(
            plant.observations,
            plant.notes,
          ),
        }}
      />
    </main>
  );
}
