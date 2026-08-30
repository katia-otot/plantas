import type { Season } from "@/lib/types";

export function seasonToEstacionParam(season: Season): "verano" | "invierno" {
  return season === "summer" ? "verano" : "invierno";
}

export function estacionParamToSeason(
  value: string | string[] | undefined,
): Season | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "verano" || raw === "summer") {
    return "summer";
  }
  if (raw === "invierno" || raw === "winter") {
    return "winter";
  }
  return null;
}
