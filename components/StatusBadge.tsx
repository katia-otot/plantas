import type { DueStatus } from "@/lib/types";

const styles: Record<DueStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  due: "bg-amber-100 text-amber-900",
  overdue: "bg-rose-100 text-rose-900",
};

const labels: Record<DueStatus, string> = {
  ok: "Al día",
  due: "Hoy",
  overdue: "Atrasada",
};

export function StatusBadge({ status }: { status: DueStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
