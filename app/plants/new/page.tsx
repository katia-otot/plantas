import { PlantForm } from "@/components/PlantForm";

export default function NewPlantPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <PlantForm
        submitLabel="Crear planta"
        header={{ eyebrow: "Nueva", title: "Agregar planta" }}
      />
    </main>
  );
}
