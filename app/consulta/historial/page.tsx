import { ActionIcon } from "@/components/ActionIcon";
import {
  EventTimeline,
  GLOBAL_INITIAL_VISIBLE,
} from "@/components/EventTimeline";
import { resolveGardenId } from "@/lib/garden-access";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistorialConsultaPage() {
  const gardenId = await resolveGardenId();
  const events = await prisma.careEvent.findMany({
    where: { gardenId },
    orderBy: { happenedAt: "desc" },
    include: {
      plant: {
        select: {
          id: true,
          name: true,
        },
      },
      photos: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Consulta
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="agenda" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">Historial</h1>
        </div>
        <p className="mt-1 text-sm text-emerald-900/70">
          Todas las plantas · {events.length} entrada
          {events.length === 1 ? "" : "s"}
        </p>
      </header>

      <EventTimeline
        events={events}
        initialVisible={GLOBAL_INITIAL_VISIBLE}
      />
    </main>
  );
}
