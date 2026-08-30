/**
 * Collapse per-plant rain_skip events into one patio-wide entry per day.
 * Usage: npx tsx scripts/migrate-rain-events-global.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatRainDayLabel } from "../lib/format";

const prisma = new PrismaClient();

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function main() {
  const rains = await prisma.careEvent.findMany({
    where: { type: "rain_skip" },
    orderBy: { happenedAt: "asc" },
  });

  const byDay = new Map<string, typeof rains>();
  for (const event of rains) {
    const key = dayKey(event.happenedAt);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  let created = 0;
  let deleted = 0;

  for (const [, events] of byDay) {
    const rainAt = startOfLocalDay(events[0].happenedAt);
    const keepGlobal = events.find((event) => event.plantId == null);

    if (keepGlobal) {
      const extras = events.filter((event) => event.id !== keepGlobal.id);
      if (extras.length > 0) {
        await prisma.careEvent.deleteMany({
          where: { id: { in: extras.map((event) => event.id) } },
        });
        deleted += extras.length;
      }
      if (!keepGlobal.notes?.trim()) {
        await prisma.careEvent.update({
          where: { id: keepGlobal.id },
          data: { notes: formatRainDayLabel(rainAt) },
        });
      }
      continue;
    }

    await prisma.careEvent.create({
      data: {
        plantId: null,
        type: "rain_skip",
        happenedAt: rainAt,
        notes: formatRainDayLabel(rainAt),
      },
    });
    created += 1;

    await prisma.careEvent.deleteMany({
      where: { id: { in: events.map((event) => event.id) } },
    });
    deleted += events.length;
  }

  console.log(
    `done, days=${byDay.size}, createdGlobal=${created}, deletedPerPlant=${deleted}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
