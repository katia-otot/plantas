import { toInputDate } from "@/lib/format";
import {
  getDefaultProductForTreatment,
  type PlantTreatment,
  type TreatmentType,
} from "@/lib/treatments";

export type ScheduleCareKind = "water" | "fertilizer" | "prune" | "treatment";

export type ScheduleCareFormDefaults = {
  nextDate: string;
  notes: string;
  productName: string;
  selectedIndex: number;
  creatingNew: boolean;
  newTreatmentType: TreatmentType;
  newTreatmentLabel: string;
};

export function findInitialTreatmentIndex(
  treatments: PlantTreatment[],
  initialType?: string | null,
  pestNotes?: string | null,
): number {
  if (treatments.length === 0) {
    return 0;
  }

  const normalizedNotes = pestNotes?.trim().toLowerCase();

  if (initialType) {
    const byType = treatments.findIndex((treatment) => {
      if (treatment.type !== initialType) {
        return false;
      }
      if (!normalizedNotes) {
        return true;
      }
      return treatment.products.some(
        (product) => product.toLowerCase() === normalizedNotes,
      );
    });
    if (byType >= 0) {
      return byType;
    }
  }

  return 0;
}

export function buildScheduleCareFormDefaults(
  kind: ScheduleCareKind,
  args: {
    defaultDate: string;
    nextWateredAt?: string | Date | null;
    nextFertilizerAt?: string | Date | null;
    fertilizerNotes?: string | null;
    fertilizerTreatment: PlantTreatment | null | undefined;
    nextPruneAt?: string | Date | null;
    pruneNotes?: string | null;
    pruneTreatment: PlantTreatment | null | undefined;
    nextPestAt?: string | Date | null;
    pestNotes?: string | null;
    treatmentType?: string | null;
    pestTreatments: PlantTreatment[];
  },
): ScheduleCareFormDefaults {
  const base = {
    notes: "",
    newTreatmentType: "anti-bichos" as TreatmentType,
    newTreatmentLabel: "",
  };

  if (kind === "water") {
    return {
      ...base,
      nextDate: args.nextWateredAt
        ? toInputDate(args.nextWateredAt)
        : args.defaultDate,
      productName: "",
      selectedIndex: 0,
      creatingNew: false,
    };
  }

  if (kind === "fertilizer") {
    return {
      ...base,
      nextDate: args.nextFertilizerAt
        ? toInputDate(args.nextFertilizerAt)
        : args.defaultDate,
      productName:
        args.fertilizerNotes?.trim() ||
        (args.fertilizerTreatment
          ? getDefaultProductForTreatment(args.fertilizerTreatment)
          : ""),
      selectedIndex: 0,
      creatingNew: false,
    };
  }

  if (kind === "prune") {
    return {
      ...base,
      nextDate: args.nextPruneAt
        ? toInputDate(args.nextPruneAt)
        : args.defaultDate,
      notes:
        args.pruneNotes?.trim() ||
        (args.pruneTreatment
          ? getDefaultProductForTreatment(args.pruneTreatment)
          : ""),
      productName: "",
      selectedIndex: 0,
      creatingNew: false,
    };
  }

  if (args.pestTreatments.length === 0) {
    return {
      ...base,
      nextDate: args.nextPestAt
        ? toInputDate(args.nextPestAt)
        : args.defaultDate,
      productName: "",
      selectedIndex: 0,
      creatingNew: true,
    };
  }

  const index = findInitialTreatmentIndex(
    args.pestTreatments,
    args.treatmentType,
    args.pestNotes,
  );
  const selected = args.pestTreatments[index] ?? null;

  return {
    ...base,
    nextDate: args.nextPestAt
      ? toInputDate(args.nextPestAt)
      : args.defaultDate,
    productName:
      args.pestNotes?.trim() ||
      (selected ? getDefaultProductForTreatment(selected) : ""),
    selectedIndex: index,
    creatingNew: false,
  };
}
