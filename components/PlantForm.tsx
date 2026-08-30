"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FrostSoilFields } from "@/components/FrostSoilFields";
import { PLANT_STATUS_STYLES } from "@/components/PlantStatusBadge";
import { TreatmentListEditor } from "@/components/TreatmentListEditor";
import { PhotoPickerButtons } from "@/components/PhotoPickerButtons";
import { uploadPhotos } from "@/lib/client-api";
import { withBasePath } from "@/lib/base-path";
import { toInputDate } from "@/lib/format";
import {
  defaultNewPlantTreatments,
  migrateLegacyPestNotesToTreatments,
  type PlantTreatment,
} from "@/lib/treatments";
import {
  PLANT_STATUSES,
  PLANT_STATUS_LABELS,
  type PlantStatus,
} from "@/lib/types";

export interface PlantFormValues {
  id?: string;
  name: string;
  species?: string | null;
  location?: string | null;
  notes?: string | null;
  coverPhotoPath?: string | null;
  status: PlantStatus;
  isIndoor: boolean;
  quantity: number;
  waterSummerDays: number;
  waterWinterDays: number;
  rainPostponeDays: number;
  careTreatments?: PlantTreatment[];
  lastWateredAt?: string | null;
  frostResistance?: string | null;
  soilType?: string | null;
  observations?: string | null;
}

interface PlantFormProps {
  initialValues?: Partial<PlantFormValues> & { pestNotes?: string | null };
  submitLabel: string;
  header?: {
    eyebrow: string;
    title: string;
  };
}

const defaultValues: PlantFormValues = {
  name: "",
  species: "",
  location: "",
  notes: "",
  coverPhotoPath: null,
  status: "alta",
  isIndoor: false,
  quantity: 1,
  waterSummerDays: 2,
  waterWinterDays: 5,
  rainPostponeDays: 2,
  careTreatments: defaultNewPlantTreatments(),
  lastWateredAt: "",
  frostResistance: "",
  soilType: "",
  observations: "",
};

function normalizeFormPayload(values: PlantFormValues) {
  const careTreatments = (values.careTreatments ?? [])
    .map((treatment) => ({
      ...treatment,
      label: treatment.label?.trim() || undefined,
      products: treatment.products.map((product) => product.trim()).filter(Boolean),
    }))
    .filter(
      (treatment) =>
        treatment.products.length > 0 &&
        (treatment.type !== "otro" || treatment.label),
    );

  return {
    name: values.name.trim(),
    species: values.species?.trim() || null,
    notes: null,
    coverPhotoPath: values.coverPhotoPath || null,
    status: values.status,
    isIndoor: values.isIndoor,
    quantity: values.quantity,
    waterSummerDays: values.waterSummerDays,
    waterWinterDays: values.waterWinterDays,
    rainPostponeDays: values.rainPostponeDays,
    careTreatments,
    lastWateredAt: values.lastWateredAt || null,
    frostResistance: values.frostResistance?.trim() || null,
    soilType: values.soilType?.trim() || null,
    observations: values.observations?.trim() || null,
  };
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildInitialForm(
  initialValues?: Partial<PlantFormValues> & { pestNotes?: string | null },
): PlantFormValues {
  return {
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
    lastWateredAt: initialValues?.lastWateredAt
      ? toInputDate(initialValues.lastWateredAt)
      : "",
  };
}

export function PlantForm({
  initialValues,
  submitLabel,
  header,
}: PlantFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => buildInitialForm(initialValues));
  const [baseline] = useState(() =>
    normalizeFormPayload(buildInitialForm(initialValues)),
  );
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
      const next = normalizeFormPayload(values);

      if (!values.id) {
        const response = await fetch(withBasePath("/api/plants"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) {
          throw new Error("Error al guardar");
        }
        const plant = (await response.json()) as { id: string };
        router.push(`/plants/${plant.id}`);
        router.refresh();
        return;
      }

      const patch: Record<string, unknown> = {};
      for (const key of Object.keys(next) as Array<keyof typeof next>) {
        if (!sameValue(next[key], baseline[key])) {
          patch[key] = next[key];
        }
      }

      if (Object.keys(patch).length === 0) {
        router.push(`/plants/${values.id}`);
        return;
      }

      const response = await fetch(
        withBasePath(`/api/plants/${values.id}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Error al guardar");
      }

      const plant = (await response.json()) as { id: string };
      router.push(`/plants/${plant.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "No se pudo guardar la planta",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {header ? (
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            {header.eyebrow}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-3xl font-bold leading-tight text-emerald-950">
              {header.title}
            </h1>
            <label className="shrink-0">
              <span className="sr-only">Estado</span>
              <select
                value={values.status}
                aria-label="Estado de la planta"
                title="Estado de la planta"
                onChange={(event) =>
                  updateField("status", event.target.value as PlantStatus)
                }
                className={`appearance-none rounded-xl border-0 px-3 py-2 text-sm font-semibold outline-none ring-emerald-500 focus:ring-2 ${PLANT_STATUS_STYLES[values.status]}`}
              >
                {PLANT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PLANT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
          Datos básicos
        </h2>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-emerald-950">
              Nombre *
            </span>
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
            <span className="text-sm font-medium text-emerald-950">Cantidad</span>
            <input
              type="number"
              min={1}
              value={values.quantity}
              onChange={(event) =>
                updateField("quantity", Number(event.target.value) || 1)
              }
              className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            />
            <p className="mt-1 text-xs text-emerald-900/60">
              Cuántas plantas iguales hay (columna V del Excel).
            </p>
          </label>

          <FrostSoilFields
            frostResistance={values.frostResistance ?? ""}
            soilType={values.soilType ?? ""}
            observations={values.observations ?? ""}
            onFrostChange={(value) => updateField("frostResistance", value)}
            onSoilChange={(value) => updateField("soilType", value)}
            onObservationsChange={(value) => updateField("observations", value)}
          />

          <div>
            <span className="text-sm font-medium text-emerald-950">
              Foto de portada
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
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
              <PhotoPickerButtons
                disabled={uploadingCover}
                galleryLabel={uploadingCover ? "Subiendo..." : "Galería"}
                cameraLabel={uploadingCover ? "Subiendo..." : "Cámara"}
                onFiles={(files) => void handleCoverUpload(files)}
              />
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
          <label className="col-span-2 block">
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
          Fertilizante viene precargado. También podés sumar poda, anti-bichos,
          anti-hongos u otro.
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

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-emerald-700 px-4 py-4 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Guardando..." : submitLabel}
      </button>
    </form>
    </div>
  );
}
