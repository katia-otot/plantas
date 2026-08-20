"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import { performAction } from "@/lib/client-api";
import {
  getTreatmentLabel,
  type PlantTreatment,
  type TreatmentType,
} from "@/lib/treatments";
import type { CareEventType } from "@/lib/types";

interface QuickActionsProps {
  plantId: string;
  careTreatments?: PlantTreatment[];
  compact?: boolean;
}

type QuickAction =
  | {
      kind: "action";
      action: CareEventType;
      label: string;
      tone: string;
      key: string;
      icon: ActionIconName;
    }
  | {
      kind: "treatment";
      treatmentType: TreatmentType;
      treatmentLabel?: string;
      label: string;
      tone: string;
      key: string;
      icon: ActionIconName;
    };

const baseActions: QuickAction[] = [
  {
    kind: "action",
    action: "watering",
    label: "Regué",
    tone: "bg-sky-600 hover:bg-sky-700",
    key: "action:watering",
    icon: "water-leaf",
  },
  {
    kind: "action",
    action: "fertilizer",
    label: "Fertilicé",
    tone: "bg-amber-600 hover:bg-amber-700",
    key: "action:fertilizer",
    icon: "supply-bag",
  },
  {
    kind: "action",
    action: "prune",
    label: "Podé",
    tone: "bg-emerald-700 hover:bg-emerald-800",
    key: "action:prune",
    icon: "prune",
  },
];

const treatmentTones: Record<TreatmentType, string> = {
  "anti-bichos": "bg-orange-600 hover:bg-orange-700",
  "anti-hongos": "bg-orange-500 hover:bg-orange-600",
  otro: "bg-orange-400 hover:bg-orange-500",
};

const treatmentIcons: Record<TreatmentType, ActionIconName> = {
  "anti-bichos": "inspect",
  "anti-hongos": "flask-leaf",
  otro: "cupped-hands",
};

function buildTreatmentActions(treatments: PlantTreatment[]): QuickAction[] {
  return treatments.map((treatment, index) => {
    const label = getTreatmentLabel(treatment);

    return {
      kind: "treatment",
      treatmentType: treatment.type,
      treatmentLabel: treatment.type === "otro" ? label : undefined,
      label,
      tone: treatmentTones[treatment.type],
      key: `treatment:${treatment.type}:${index}:${label}`,
      icon: treatmentIcons[treatment.type],
    };
  });
}

export function QuickActions({
  plantId,
  careTreatments = [],
  compact = false,
}: QuickActionsProps) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const actions = [...baseActions, ...buildTreatmentActions(careTreatments)];

  async function handleAction(action: CareEventType, key: string) {
    try {
      setLoadingKey(key);
      await performAction(plantId, action);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar la acción");
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleTreatment(
    treatmentType: TreatmentType,
    treatmentLabel: string | undefined,
    key: string,
  ) {
    try {
      setLoadingKey(key);
      await performAction(plantId, "pest", {
        treatmentType,
        treatmentLabel,
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar la acción");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-2"
          : "grid grid-cols-2 gap-2 sm:grid-cols-3"
      }
    >
      {actions.map((item) => {
        const isLoading = loadingKey === item.key;

        return (
          <button
            key={item.key}
            type="button"
            disabled={loadingKey !== null}
            onClick={() =>
              item.kind === "action"
                ? handleAction(item.action, item.key)
                : handleTreatment(
                    item.treatmentType,
                    item.treatmentLabel,
                    item.key,
                  )
            }
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-3.5 text-sm font-semibold text-white transition disabled:opacity-60 ${item.tone}`}
          >
            {isLoading ? (
              "..."
            ) : (
              <>
                <ActionIcon name={item.icon} size={compact ? 32 : 36} />
                <span>{item.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
