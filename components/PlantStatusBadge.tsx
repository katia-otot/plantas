import {
  PLANT_STATUS_LABELS,
  normalizePlantStatus,
  type PlantStatus,
} from "@/lib/types";

export const PLANT_STATUS_STYLES: Record<PlantStatus, string> = {
  alta: "bg-emerald-100 text-emerald-800",
  baja: "bg-stone-200 text-stone-700",
  posible: "bg-sky-100 text-sky-900",
};

export function PlantStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const resolved = normalizePlantStatus(status);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PLANT_STATUS_STYLES[resolved]}`}
    >
      {PLANT_STATUS_LABELS[resolved]}
    </span>
  );
}
