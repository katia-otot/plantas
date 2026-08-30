/**
 * Mark all plants in status "alta" as watered yesterday.
 * Usage: npx tsx scripts/mark-alta-watered-yesterday.ts
 */
import { PrismaClient } from "@prisma/client";
import { getGardenSettings } from "../lib/plants";
import { markWateredAt, startOfDay } from "../lib/schedule";

const prisma = new PrismaClient();

async function main() {
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);

  const settings = await getGardenSettings();
  const plants = await prisma.plant.findMany({
    where: { status: "alta" },
    select: {
      id: true,
      name: true,
      waterSummerDays: true,
      waterWinterDays: true,
    },
  });

  console.log(
    `Marking ${plants.length} alta plants watered on ${yesterday.toISOString().slice(0, 10)}`,
  );

  for (const plant of plants) {
    const schedule = markWateredAt(
      plant,
      yesterday,
      settings.seasonOverride,
    );

    await prisma.$transaction(async (tx) => {
      await tx.plant.update({
        where: { id: plant.id },
        data: {
          lastWateredAt: schedule.lastWateredAt,
          nextWateredAt: schedule.nextWateredAt,
        },
      });
      await tx.careEvent.create({
        data: {
          plantId: plant.id,
          type: "watering",
          happenedAt: schedule.lastWateredAt,
          notes: "Carga masiva: regadas ayer",
        },
      });
    });
  }

  console.log(`done: ${plants.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
