"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";
import {
  ScheduleCareSheet,
  type ScheduleCareKind,
} from "@/components/ScheduleCareSheet";
import type { PlantCareSchedule } from "@/lib/care-schedule";
import type { PlantTreatment } from "@/lib/treatments";

export type QuickActionsSchedule = PlantCareSchedule;

interface QuickActionsProps {
  plantId: string;
  careTreatments?: PlantTreatment[];
  schedule?: QuickActionsSchedule | null;
  compact?: boolean;
}

type ScheduleAction = {
  scheduleKind: ScheduleCareKind;
  label: string;
  compactLabel: string;
  tone: string;
  key: string;
  icon: ActionIconName;
};

const scheduleActions: ScheduleAction[] = [
  {
    scheduleKind: "water",
    label: "Riego",
    compactLabel: "Regar",
    tone: "border border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100",
    key: "schedule:water",
    icon: "regar",
  },
  {
    scheduleKind: "fertilizer",
    label: "Fertilizante",
    compactLabel: "Fertilizar",
    tone:
      "border border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    key: "schedule:fertilizer",
    icon: "fertilizante",
  },
  {
    scheduleKind: "prune",
    label: "Poda",
    compactLabel: "Poda",
    tone:
      "border border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
    key: "schedule:prune",
    icon: "poda",
  },
  {
    scheduleKind: "treatment",
    label: "Tratamiento",
    compactLabel: "Tratar",
    tone:
      "border border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100",
    key: "schedule:treatment",
    icon: "tratamiento-plagas",
  },
];

export function QuickActions({
  plantId,
  careTreatments = [],
  schedule = null,
  compact = false,
}: QuickActionsProps) {
  const router = useRouter();
  const [scheduleKind, setScheduleKind] = useState<ScheduleCareKind | null>(
    null,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scheduleActions.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setScheduleKind(item.scheduleKind)}
            className={`flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl font-semibold transition ${
              compact
                ? `gap-1 px-2 py-2.5 text-xs leading-tight ${item.tone}`
                : `gap-2 px-3 py-4 text-sm ${item.tone}`
            }`}
          >
            <ActionIcon name={item.icon} size={compact ? 36 : 56} alt="" />
            <span className="w-full truncate text-center">
              {compact ? item.compactLabel : item.label}
            </span>
          </button>
        ))}
      </div>

      <ScheduleCareSheet
        open={scheduleKind !== null}
        kind={scheduleKind}
        plantId={plantId}
        careTreatments={careTreatments}
        nextWateredAt={schedule?.nextWateredAt}
        needsFertilizer={schedule?.needsFertilizer}
        nextFertilizerAt={schedule?.nextFertilizerAt}
        fertilizerNotes={schedule?.fertilizerNotes}
        needsPruning={schedule?.needsPruning}
        nextPruneAt={schedule?.nextPruneAt}
        pruneNotes={schedule?.pruneNotes}
        needsPest={schedule?.needsPest}
        nextPestAt={schedule?.nextPestAt}
        pestNotes={schedule?.pestNotes}
        treatmentType={schedule?.treatmentType}
        onClose={() => setScheduleKind(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
