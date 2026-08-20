"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TreatmentListEditor } from "@/components/TreatmentListEditor";
import { uploadPhotos } from "@/lib/client-api";
import { withBasePath } from "@/lib/base-path";
import { toInputDate } from "@/lib/format";
import {
  defaultNewPlantTreatments,
  migrateLegacyPestNotesToTreatments,
  type PlantTreatment,
} from "@/lib/treatments";

export interface PlantFormValues {
  id?: string;
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  isIndoor: boolean;
  waterSummerDays: number;
  waterWinterDays: number;
  rainPostponeDays: number;
  needsPruning: boolean;
  nextPruneAt?: string | null;
  pruneNotes?: string | null;
  careTreatments?: PlantTreatment[];
  lastWateredAt?: string | null;
}

interface PlantFormProps {
  initialValues?: Partial<PlantFormValues> & { pestNotes?: string | null };
  submitLabel: string;
}

const defaultValues: PlantFormValues = {
  name: "",
  species: "",
  location: "",
  notes: "",
  coverPhotoPath: null,
  isIndoor: false,
  waterSummerDays: 2,
  waterWinterDays: 5,
  rainPostponeDays: 2,
  needsPruning: false,
  nextPruneAt: "",
  pruneNotes: "",
  careTreatments: defaultNewPlantTreatments(),
  lastWateredAt: "",
};

export function PlantForm({ initialValues, submitLabel }: PlantFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<PlantFormValues>({
    ...defaultValues,
    ...initialValues,
    careTreatments:
      initialValues?.careTreatments ??
      (initialValues?.id
        ? migrateLegacyPestNotesToTreatments(
            null,
            initialValues?.pestNotes ?? null,
          )
        : defaultNewPlantTreatments()),
    nextPruneAt: initialValues?.nextPruneAt
      ? toInputDate(initialValues.nextPruneAt)
      : "",
    lastWateredAt: initialValues?.lastWateredAt
      ? toInputDate(initialValues.lastWateredAt)
      : "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  function updateField<K extends keyof PlantFormValues>(
    key: K,
    value: PlantFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleCoverUpload(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    try {
      setUploadingCover(true);
      const [path] = await uploadPhotos([fileList[0]]);
      updateField("coverPhotoPath", path);
    } catch (error) {
      console.error(error);
      alert("No se pudo subir la foto de portada");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...values,
        species: values.species || null,
        location: values.location || null,
        notes: values.notes || null,
        careTreatments: (values.careTreatments ?? [])
          .map((treatment) => ({
            ...treatment,
            label: treatment.label?.trim() || undefined,
            products: treatment.products.map((product) => product.trim()).filter(Boolean),
          }))
          .filter(
            (treatment) =>
              treatment.products.length > 0 &&
              (treatment.type !== "otro" || treatment.label),
          ),
        nextPruneAt: values.needsPruning ? values.nextPruneAt || null : null,
        pruneNotes: values.needsPruning ? values.pruneNotes?.trim() || null : null,
        lastWateredAt: values.lastWateredAt || null,
      };

      const response = await fetch(
        withBasePath(values.id ? `/api/plants/${values.id}` : "/api/plants"),
        {
          method: values.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Error al guardar");
      }

      const plant = (await response.json()) as { id: string };
      router.push(`/plants/${plant.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la planta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Datos básicos
        </h2>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-emerald-950">Nombre *</span>
            <input
              required
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
              placeholder="Ej. Lavanda del balcón"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-950">Especie</span>
            <input
              value={values.species ?? ""}
              onChange={(event) => updateField("species", event.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
              placeholder="Ej. Lavandula"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-950">Ubicación</span>
            <input
              value={values.location ?? ""}
              onChange={(event) => updateField("location", event.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
              placeholder="Ej. Patio trasero, maceta grande"
            />
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={values.isIndoor}
              onChange={(event) =>
                updateField("isIndoor", event.target.checked)
              }
              className="h-5 w-5 rounded border-emerald-900/20"
            />
            <span className="text-sm font-medium text-emerald-950">
              Planta de interior
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-950">Notas</span>
            <textarea
              value={values.notes ?? ""}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
              placeholder="Observaciones generales"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-emerald-950">
              Foto de portada
            </span>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-emerald-50">
                {values.coverPhotoPath ? (
                  <Image
                    src={withBasePath(values.coverPhotoPath)}
                    alt="Portada"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">
                    🌿
                  </div>
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-emerald-900/15 px-4 py-3 text-sm font-medium text-emerald-900">
                {uploadingCover ? "Subiendo..." : "Elegir foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleCoverUpload(event.target.files)}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Riego
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-emerald-950">
              Verano (días)
            </span>
            <input
              type="number"
              min={1}
              value={values.waterSummerDays}
              onChange={(event) =>
                updateField("waterSummerDays", Number(event.target.value))
              }
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-emerald-950">
              Invierno (días)
            </span>
            <input
              type="number"
              min={1}
              value={values.waterWinterDays}
              onChange={(event) =>
                updateField("waterWinterDays", Number(event.target.value))
              }
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-emerald-950">
              Último riego
            </span>
            <input
              type="date"
              value={values.lastWateredAt ?? ""}
              onChange={(event) =>
                updateField("lastWateredAt", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            />
            <p className="mt-1 text-xs text-emerald-900/60">
              La lluvia se registra sola con el botón Llovió en Hoy.
            </p>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Tratamientos
        </h2>
        <p className="mt-2 text-sm text-emerald-900/70">
          Fertilizante viene precargado. También podés sumar anti-bichos,
          anti-hongos u otro, cada uno con sus productos.
        </p>
        <div className="mt-4">
          <TreatmentListEditor
            treatments={values.careTreatments ?? []}
            onChange={(careTreatments) =>
              updateField("careTreatments", careTreatments)
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Otros cuidados
        </h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={values.needsPruning}
              onChange={(event) =>
                updateField("needsPruning", event.target.checked)
              }
              className="h-5 w-5 rounded border-emerald-900/20"
            />
            <span className="text-sm font-medium text-emerald-950">
              Necesita poda
            </span>
          </label>

          {values.needsPruning && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Próxima poda
                </span>
                <input
                  type="date"
                  value={values.nextPruneAt ?? ""}
                  onChange={(event) =>
                    updateField("nextPruneAt", event.target.value)
                  }
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-emerald-950">
                  Detalle de la poda
                </span>
                <textarea
                  value={values.pruneNotes ?? ""}
                  onChange={(event) =>
                    updateField("pruneNotes", event.target.value)
                  }
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
                  placeholder="Ej. sacar ramas secas, formar copa, bajar altura..."
                />
              </label>
            </>
          )}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-emerald-700 px-4 py-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Guardando..." : submitLabel}
      </button>
    </form>
  );
}
