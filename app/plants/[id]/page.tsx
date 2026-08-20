import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEventForm } from "@/components/AddEventForm";
import { DeletePlantButton } from "@/components/DeletePlantButton";
import { EventTimeline } from "@/components/EventTimeline";
import { QuickActions } from "@/components/QuickActions";
import { ScheduleFertilizerForm } from "@/components/ScheduleFertilizerForm";
import { ScheduleTreatmentForm } from "@/components/ScheduleTreatmentForm";
import { getGardenSettings, getPlantById, getPlantCareTreatments, getPlantScheduleSummary } from "@/lib/plants";
import { formatDate } from "@/lib/format";
import { withBasePath } from "@/lib/base-path";
import { getTreatmentLabel, TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import {
  formatDueLabel,
  getEffectiveSeason,
  getSeasonLabel,
  getWaterIntervalDays,
} from "@/lib/schedule";
import { TASK_LABELS } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const plant = await getPlantById(id);

  if (!plant) {
    notFound();
  }

  const today = new Date();
  const gardenSettings = await getGardenSettings();
  const effectiveSeason = getEffectiveSeason(today, gardenSettings.seasonOverride);
  const schedule = getPlantScheduleSummary(
    plant,
    gardenSettings.lastRainAt,
    gardenSettings.seasonOverride,
  );
  const careTreatments = getPlantCareTreatments(plant);

  const scheduleItems = [
    schedule.nextWateredAt && {
      label: TASK_LABELS.water,
      date: schedule.nextWateredAt,
      detail: `Cada ${getWaterIntervalDays(plant, today, gardenSettings.seasonOverride)} días (${getSeasonLabel(effectiveSeason).toLowerCase()})`,
    },
    schedule.nextFertilizerAt && {
      label: TASK_LABELS.fertilizer,
      date: schedule.nextFertilizerAt,
      detail: plant.fertilizerNotes || "Fertilizante programado",
    },
    schedule.nextPruneAt && {
      label: TASK_LABELS.prune,
      date: schedule.nextPruneAt,
      detail: plant.pruneNotes || (plant.needsPruning ? "Poda pendiente" : undefined),
    },
    schedule.nextPestAt && {
      label: TASK_LABELS.pest,
      date: schedule.nextPestAt,
      detail: [
        plant.treatmentType
          ? TREATMENT_TYPE_LABELS[
              plant.treatmentType as keyof typeof TREATMENT_TYPE_LABELS
            ]
          : null,
        plant.pestNotes,
      ]
        .filter(Boolean)
        .join(" · ") || "Tratamiento programado",
    },
  ].filter(Boolean) as Array<{
    label: string;
    date: Date;
    detail?: string;
  }>;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-emerald-50">
        {plant.coverPhotoPath ? (
          <Image
            src={withBasePath(plant.coverPhotoPath)}
            alt={plant.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 512px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🌿</div>
        )}
      </div>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950">{plant.name}</h1>
            {(plant.species || plant.location || plant.isIndoor) && (
              <p className="mt-1 text-emerald-900/70">
                {[
                  plant.species,
                  plant.location,
                  plant.isIndoor ? "Interior" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <Link
            href={`/plants/${plant.id}/edit`}
            className="rounded-xl border border-emerald-900/15 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            Editar
          </Link>
        </div>

        {plant.notes && (
          <p className="rounded-2xl bg-white p-4 text-sm text-emerald-900/80 shadow-sm">
            {plant.notes}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-emerald-950">Próximos cuidados</h2>
        <ul className="mt-3 space-y-3">
          {scheduleItems.map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50/70 px-3 py-3"
            >
              <div>
                <p className="font-medium text-emerald-950">{item.label}</p>
                <p className="text-sm text-emerald-900/70">
                  {formatDate(item.date)}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800">
                {formatDueLabel(item.date)}
              </span>
            </li>
          ))}
        </ul>

        {plant.lastWateredAt && (
          <p className="mt-3 text-xs text-emerald-900/60">
            Último riego: {formatDate(plant.lastWateredAt)}
          </p>
        )}
      </section>

      {careTreatments.length > 0 && (
        <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-emerald-950">Tratamientos</h2>
          <ul className="mt-3 space-y-3">
            {careTreatments.map((treatment, index) => (
              <li
                key={`${treatment.type}-${index}`}
                className="rounded-xl bg-emerald-50/70 px-3 py-3 text-sm text-emerald-950"
              >
                <p className="font-medium">{getTreatmentLabel(treatment)}</p>
                <p className="mt-1 text-emerald-900/70">
                  {TREATMENT_TYPE_LABELS[treatment.type]}
                  {treatment.products.length > 0
                    ? ` · ${treatment.products.join(", ")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ScheduleFertilizerForm
        plantId={plant.id}
        needsFertilizer={plant.needsFertilizer}
        nextFertilizerAt={plant.nextFertilizerAt}
        fertilizerNotes={plant.fertilizerNotes}
      />

      <ScheduleTreatmentForm
        plantId={plant.id}
        needsPest={plant.needsPest}
        nextPestAt={plant.nextPestAt}
        pestNotes={plant.pestNotes}
        treatmentType={plant.treatmentType}
        careTreatments={careTreatments}
      />

      <section className="space-y-3">
        <h2 className="font-semibold text-emerald-950">Acciones rápidas</h2>
        <QuickActions plantId={plant.id} careTreatments={careTreatments} />
      </section>

      <AddEventForm plantId={plant.id} />

      <section className="space-y-3">
        <h2 className="font-semibold text-emerald-950">Historial</h2>
        <EventTimeline events={plant.events} />
      </section>

      <DeletePlantButton plantId={plant.id} />
    </main>
  );
}
