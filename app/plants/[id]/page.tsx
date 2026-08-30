import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import { AddEventForm } from "@/components/AddEventForm";
import { CoverPhotoEditor } from "@/components/CoverPhotoEditor";
import { DeletePlantButton } from "@/components/DeletePlantButton";
import { EventTimeline } from "@/components/EventTimeline";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { QuickActions } from "@/components/QuickActions";
import { toPlantCareSchedule } from "@/lib/care-schedule";
import { getGardenSettings, getPlantById, getPlantCareTreatments, getPlantScheduleSummary } from "@/lib/plants";
import { formatShortWeekdayDay } from "@/lib/format";
import { formatFrostValue, parseFrostValue } from "@/lib/frost";
import { mergeNotesIntoObservations } from "@/lib/plant-text";
import { formatSoilPhValue, parseSoilPhValue } from "@/lib/soil-ph";
import { getTreatmentLabel, TREATMENT_TYPE_LABELS } from "@/lib/treatments";
import {
  formatDueLabel,
  getEffectiveSeason,
  getSeasonLabel,
  getWateringBasis,
  getWaterIntervalDays,
} from "@/lib/schedule";
import { isActivePlantStatus, TASK_LABELS } from "@/lib/types";

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
  const isActive = isActivePlantStatus(plant.status);
  const wateringBasis = getWateringBasis(plant, gardenSettings.lastRainAt);
  const observations = mergeNotesIntoObservations(
    plant.observations,
    plant.notes,
  );

  const scheduleItems = [
    schedule.nextWateredAt && {
      label: TASK_LABELS.water,
      icon: "regar" as ActionIconName,
      date: schedule.nextWateredAt,
      detail: `Cada ${getWaterIntervalDays(plant, today, gardenSettings.seasonOverride)} días (${getSeasonLabel(effectiveSeason).toLowerCase()})`,
    },
    schedule.nextFertilizerAt && {
      label: TASK_LABELS.fertilizer,
      icon: "fertilizante" as ActionIconName,
      date: schedule.nextFertilizerAt,
      detail: plant.fertilizerNotes || "Fertilizante programado",
    },
    schedule.nextPruneAt && {
      label: TASK_LABELS.prune,
      icon: "poda" as ActionIconName,
      date: schedule.nextPruneAt,
      detail: plant.pruneNotes || (plant.needsPruning ? "Poda pendiente" : undefined),
    },
    schedule.nextPestAt && {
      label: TASK_LABELS.pest,
      icon: (plant.treatmentType === "anti-hongos"
        ? "tratamiento-hongos"
        : "tratamiento-plagas") as ActionIconName,
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
    icon: ActionIconName;
    date: Date;
    detail?: string;
  }>;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <CoverPhotoEditor
        name={plant.name}
        coverPhotoPath={plant.coverPhotoPath}
        savePath={`/api/plants/${plant.id}/cover`}
      />

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-emerald-950">
                {plant.name}
                {plant.quantity > 1 ? (
                  <span className="ml-2 text-lg font-semibold text-emerald-800/70">
                    ×{plant.quantity}
                  </span>
                ) : null}
              </h1>
              <PlantStatusBadge status={plant.status} />
            </div>
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

        {!isActive && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Esta planta no aparece en Hoy ni recibe avisos de riego. Cambiá el
            estado a Alta desde Editar si vuelve al patio.
          </p>
        )}
      </header>

      {(plant.frostResistance ||
        plant.soilType ||
        observations) && (
        <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-emerald-950">Ficha de cultivo</h2>
          <dl className="mt-4 divide-y divide-emerald-900/10 text-sm">
            {plant.frostResistance && (
              <div className="py-4 first:pt-0 last:pb-0">
                <dt className="flex items-center gap-2 font-medium text-emerald-800">
                  <ActionIcon name="heladas" size={28} alt="" />
                  Resistencia a heladas
                </dt>
                <dd className="mt-2 text-emerald-900/80">
                  {(() => {
                    const parsed = parseFrostValue(plant.frostResistance);
                    return parsed
                      ? formatFrostValue(parsed)
                      : plant.frostResistance;
                  })()}
                </dd>
              </div>
            )}
            {plant.soilType && (
              <div className="py-4 first:pt-0 last:pb-0">
                <dt className="flex items-center gap-2 font-medium text-emerald-800">
                  <ActionIcon name="ph-suelo" size={28} alt="" />
                  pH del suelo
                </dt>
                <dd className="mt-2 text-emerald-900/80">
                  {(() => {
                    const parsed = parseSoilPhValue(plant.soilType);
                    return parsed
                      ? formatSoilPhValue(parsed)
                      : plant.soilType;
                  })()}
                </dd>
              </div>
            )}
            {observations && (
              <div className="py-4 first:pt-0 last:pb-0">
                <dt className="font-medium text-emerald-800">Observaciones</dt>
                <dd className="mt-2 whitespace-pre-wrap text-emerald-900/80">
                  {observations}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-emerald-950">Próximos cuidados</h2>
        <ul className="mt-3 space-y-3">
          {scheduleItems.map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50/70 px-3 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <ActionIcon name={item.icon} size={40} alt="" />
                <div>
                  <p className="font-medium text-emerald-950">{item.label}</p>
                  {item.detail ? (
                    <p className="text-sm text-emerald-900/70">{item.detail}</p>
                  ) : null}
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-800">
                {formatDueLabel(item.date)}
              </span>
            </li>
          ))}
        </ul>

        {wateringBasis ? (
          <div className="mt-3 space-y-1 text-xs text-emerald-900/60">
            <p>
              {wateringBasis.kind === "rain"
                ? `Última lluvia: ${formatShortWeekdayDay(wateringBasis.date)}`
                : `Último riego: ${formatShortWeekdayDay(wateringBasis.date)}`}
            </p>
          </div>
        ) : null}
      </section>

      {careTreatments.length > 0 && (
        <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-emerald-950">Tratamientos</h2>
          <ul className="mt-3 space-y-3">
            {careTreatments.map((treatment, index) => (
              <li
                key={`${treatment.type}-${index}`}
                className="flex items-start gap-3 rounded-xl bg-emerald-50/70 px-3 py-3 text-sm text-emerald-950"
              >
                <ActionIcon
                  name={
                    treatment.type === "poda"
                      ? "poda"
                      : treatment.type === "fertilizante"
                        ? "fertilizante"
                        : treatment.type === "anti-hongos"
                          ? "tratamiento-hongos"
                          : "tratamiento-plagas"
                  }
                  size={40}
                  alt=""
                />
                <div>
                  <p className="font-medium">{getTreatmentLabel(treatment)}</p>
                  <p className="mt-1 text-emerald-900/70">
                    {treatment.type === "poda"
                      ? treatment.products[0] || "Sin descripción"
                      : `${TREATMENT_TYPE_LABELS[treatment.type]}${
                          treatment.products.length > 0
                            ? ` · ${treatment.products.join(", ")}`
                            : ""
                        }`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-emerald-950">Programar</h2>
        <p className="text-sm text-emerald-900/70">
          Armá recordatorios de fertilizante, poda o tratamiento.
        </p>
        <QuickActions
          plantId={plant.id}
          careTreatments={careTreatments}
          schedule={toPlantCareSchedule(plant)}
        />
      </section>

      <AddEventForm plantId={plant.id} />

      <section className="space-y-3">
        <h2 className="font-semibold text-emerald-950">Historial</h2>
        <EventTimeline
          events={plant.events.filter((event) => event.type !== "rain_skip")}
        />
      </section>

      <DeletePlantButton plantId={plant.id} />
    </main>
  );
}
