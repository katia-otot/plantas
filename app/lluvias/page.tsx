import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { listRainDays } from "@/lib/rain-days";
import { RainHistoryEditor } from "@/components/RainHistoryEditor";

export const dynamic = "force-dynamic";

export default async function RainHistoryPage() {
  const rainDays = (await listRainDays(undefined, 120)).map((day) => ({
    ...day,
    updatedAt: day.updatedAt,
  }));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
          Patio
        </p>
        <h1 className="text-3xl font-bold text-sky-950">Historial de lluvias</h1>
        <p className="text-sm text-sky-900/70">
          Podés corregir o marcar “No cuenta”. Las fechas se recalculan.
        </p>
        <Link
          href={withBasePath("/lluvias/info")}
          className="inline-block text-sm font-medium text-sky-800 underline-offset-2 hover:underline"
        >
          Cómo se cuentan las lluvias
        </Link>
      </header>

      <RainHistoryEditor initialDays={rainDays} />
    </main>
  );
}
