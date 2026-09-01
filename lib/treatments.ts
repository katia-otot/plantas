export type TreatmentType =
  | "fertilizante"
  | "poda"
  | "anti-bichos"
  | "anti-hongos"
  | "otro";

export interface PlantTreatment {
  type: TreatmentType;
  label?: string;
  products: string[];
}

/** @deprecated Legacy flat product shape */
export interface CareProduct {
  name: string;
  type: TreatmentType;
}

export const TREATMENT_TYPES: TreatmentType[] = [
  "fertilizante",
  "poda",
  "anti-bichos",
  "anti-hongos",
  "otro",
];

export const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  fertilizante: "Fertilizante",
  poda: "Poda",
  "anti-bichos": "Anti-bichos",
  "anti-hongos": "Anti-hongos",
  otro: "Otro",
};

/** Treatments that appear in pest/quick-treatment actions (not fertilizer/prune). */
export const PEST_TREATMENT_TYPES: TreatmentType[] = [
  "anti-bichos",
  "anti-hongos",
  "otro",
];

function cleanProductName(name: string): string {
  return name.trim();
}

function isLegacyProduct(value: unknown): value is CareProduct {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "type" in value &&
    !("products" in value)
  );
}

function isValidTreatment(value: unknown): value is PlantTreatment {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const treatment = value as PlantTreatment;
  if (!TREATMENT_TYPES.includes(treatment.type)) {
    return false;
  }

  if (!Array.isArray(treatment.products)) {
    return false;
  }

  return treatment.products.every(
    (product) => typeof product === "string" && product.trim().length > 0,
  );
}

function migrateProductsToTreatments(products: CareProduct[]): PlantTreatment[] {
  const treatments: PlantTreatment[] = [];
  const grouped: Record<"fertilizante" | "anti-bichos" | "anti-hongos", string[]> = {
    fertilizante: [],
    "anti-bichos": [],
    "anti-hongos": [],
  };

  for (const product of products) {
    const name = cleanProductName(product.name);
    if (!name) {
      continue;
    }

    if (product.type === "otro") {
      treatments.push({ type: "otro", label: name, products: [name] });
      continue;
    }

    if (product.type in grouped) {
      grouped[product.type as keyof typeof grouped].push(name);
    }
  }

  for (const type of ["fertilizante", "anti-bichos", "anti-hongos"] as const) {
    if (grouped[type].length > 0) {
      treatments.push({
        type,
        products: grouped[type],
      });
    }
  }

  return treatments;
}

export function parseCareTreatments(
  value: string | null | undefined,
  pestNotes?: string | null,
): PlantTreatment[] {
  if (!value) {
    if (pestNotes?.trim()) {
      return [{ type: "anti-bichos", products: [pestNotes.trim()] }];
    }

    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    if (parsed.length > 0 && isLegacyProduct(parsed[0])) {
      return migrateProductsToTreatments(parsed as CareProduct[]);
    }

    return parsed
      .filter(isValidTreatment)
      .map((treatment) => ({
        type: treatment.type,
        label: treatment.label?.trim() || undefined,
        products: treatment.products.map(cleanProductName).filter(Boolean),
      }))
      .filter((treatment) => treatment.products.length > 0);
  } catch {
    return [];
  }
}

export function serializeCareTreatments(
  treatments: PlantTreatment[],
): string | null {
  const cleaned = treatments
    .map((treatment) => ({
      type: treatment.type,
      label:
        treatment.type === "otro"
          ? treatment.label?.trim() || treatment.products[0]?.trim()
          : undefined,
      products: treatment.products.map(cleanProductName).filter(Boolean),
    }))
    .filter((treatment) => treatment.products.length > 0);

  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

export function getTreatmentByType(
  treatments: PlantTreatment[],
  type: TreatmentType,
): PlantTreatment | null {
  if (type === "otro") {
    return null;
  }

  return treatments.find((treatment) => treatment.type === type) ?? null;
}

export function getTreatmentLabel(treatment: PlantTreatment): string {
  if (treatment.type === "otro") {
    return treatment.label?.trim() || treatment.products[0] || "Otro";
  }

  return TREATMENT_TYPE_LABELS[treatment.type];
}

export function formatTreatmentProducts(treatment: PlantTreatment): string {
  return treatment.products.join(", ");
}

export function formatTreatmentActionNote(
  treatment: PlantTreatment,
  productName?: string | null,
): string {
  const label = getTreatmentLabel(treatment);
  const product =
    productName?.trim() ||
    (treatment.products.length === 1 ? treatment.products[0] : null);

  if (product) {
    return `${label}: ${product}`;
  }

  if (treatment.products.length > 1) {
    return `${label}: ${formatTreatmentProducts(treatment)}`;
  }

  return label;
}

export function findTreatment(
  treatments: PlantTreatment[],
  type: TreatmentType,
  label?: string | null,
): PlantTreatment | null {
  if (type === "otro") {
    if (label?.trim()) {
      const normalized = label.trim().toLowerCase();
      return (
        treatments.find(
          (treatment) =>
            treatment.type === "otro" &&
            getTreatmentLabel(treatment).toLowerCase() === normalized,
        ) ?? null
      );
    }

    return treatments.find((treatment) => treatment.type === "otro") ?? null;
  }

  return getTreatmentByType(treatments, type);
}

export function getDefaultProductForTreatment(
  treatment: PlantTreatment,
): string {
  return treatment.products[0]?.trim() ?? "";
}

export function getDefaultProductName(
  treatments: PlantTreatment[],
  type: TreatmentType,
): string | null {
  const treatment = getTreatmentByType(treatments, type);
  if (!treatment) {
    return null;
  }

  return getDefaultProductForTreatment(treatment) || null;
}

export function ensureTreatmentProduct(
  treatments: PlantTreatment[],
  type: TreatmentType,
  productName: string,
  label?: string,
): PlantTreatment[] {
  const name = cleanProductName(productName);
  if (!name) {
    return treatments;
  }

  if (type === "otro") {
    const treatmentLabel = label?.trim() || name;
    const existing = treatments.find(
      (treatment) =>
        treatment.type === "otro" &&
        getTreatmentLabel(treatment).toLowerCase() ===
          treatmentLabel.toLowerCase(),
    );

    if (existing) {
      if (
        existing.products.some(
          (product) => product.toLowerCase() === name.toLowerCase(),
        )
      ) {
        return treatments;
      }

      return treatments.map((treatment) =>
        treatment === existing
          ? { ...treatment, products: [...treatment.products, name] }
          : treatment,
      );
    }

    return [
      ...treatments,
      { type: "otro", label: treatmentLabel, products: [name] },
    ];
  }

  const existing = getTreatmentByType(treatments, type);
  if (!existing) {
    return [...treatments, { type, products: [name] }];
  }

  if (
    existing.products.some(
      (product) => product.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return treatments;
  }

  return treatments.map((treatment) =>
    treatment.type === type
      ? { ...treatment, products: [...treatment.products, name] }
      : treatment,
  );
}

export function migrateLegacyPestNotesToTreatments(
  careProducts: string | null | undefined,
  pestNotes: string | null | undefined,
): PlantTreatment[] {
  return parseCareTreatments(careProducts, pestNotes);
}

export function emptyTreatment(type: TreatmentType): PlantTreatment {
  if (type === "otro") {
    return { type, label: "", products: [""] };
  }

  if (type === "poda") {
    return { type, products: [""] };
  }

  return { type, products: [""] };
}

export function defaultNewPlantTreatments(): PlantTreatment[] {
  return [emptyTreatment("fertilizante")];
}

/** Inject legacy pruneNotes into treatments when no poda entry exists yet. */
export function withLegacyPruneTreatment(
  treatments: PlantTreatment[],
  pruneNotes?: string | null,
  needsPruning?: boolean,
): PlantTreatment[] {
  if (getTreatmentByType(treatments, "poda")) {
    return treatments;
  }

  const description = pruneNotes?.trim() || "";
  if (!description && !needsPruning) {
    return treatments;
  }

  return [
    ...treatments,
    description
      ? { type: "poda", products: [description] }
      : emptyTreatment("poda"),
  ];
}

export function getPruneDescription(
  treatments: PlantTreatment[],
): string | null {
  const poda = getTreatmentByType(treatments, "poda");
  if (!poda) {
    return null;
  }
  return getDefaultProductForTreatment(poda) || null;
}

export function canAddTreatmentType(
  treatments: PlantTreatment[],
  type: TreatmentType,
): boolean {
  if (type === "otro") {
    return true;
  }

  return !treatments.some((treatment) => treatment.type === type);
}

export function availableTreatmentTypes(
  treatments: PlantTreatment[],
): TreatmentType[] {
  return TREATMENT_TYPES.filter((type) =>
    canAddTreatmentType(treatments, type),
  );
}

export function isPestTreatmentType(type: TreatmentType): boolean {
  return PEST_TREATMENT_TYPES.includes(type);
}

export function isDescriptionTreatmentType(type: TreatmentType): boolean {
  return type === "poda";
}
