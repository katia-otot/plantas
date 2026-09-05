import { withBasePath } from "@/lib/base-path";

/** Semantic IDs for animated garden SVG icons in /public/icons/garden */
export const GARDEN_ICON_IDS = [
  "poda",
  "regar",
  "fertilizante",
  "tratamiento-plagas",
  "tratamiento-hongos",
  "planta",
  "agenda",
  "lluvia",
  "lluvia-fuerte",
  "ph-suelo",
  "heladas",
  "verano",
  "invierno",
  "sol",
  "trasplante",
  "humedad-suelo",
  "floracion",
  "toxicidad-mascotas",
  "pajarito",
  "notas",
  "importacion",
  "respaldo-datos",
  "mapa-plantas",
] as const;

export type GardenIconId = (typeof GARDEN_ICON_IDS)[number];

export const GARDEN_ICON_LABELS: Record<GardenIconId, string> = {
  poda: "Poda",
  regar: "Regar",
  fertilizante: "Fertilizante",
  "tratamiento-plagas": "Tratamiento contra plagas",
  "tratamiento-hongos": "Tratamiento contra hongos",
  planta: "Planta",
  agenda: "Agenda",
  lluvia: "Lluvia",
  "lluvia-fuerte": "Lluvia fuerte",
  "ph-suelo": "pH del suelo",
  heladas: "Resistencia a heladas",
  verano: "Verano",
  invierno: "Invierno",
  sol: "Exposición solar",
  trasplante: "Trasplante",
  "humedad-suelo": "Humedad del suelo",
  floracion: "Floración",
  "toxicidad-mascotas": "Compatibilidad con mascotas",
  pajarito: "Pájaros",
  notas: "Notas",
  importacion: "Importar",
  "respaldo-datos": "Respaldo",
  "mapa-plantas": "Mapa del patio",
};

export function gardenIconSrc(id: GardenIconId): string {
  return withBasePath(`/icons/garden/${id}.svg`);
}
