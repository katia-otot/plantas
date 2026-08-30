/**
 * Move free-text frost/soil fields into observations; keep only typed values.
 * Usage: npx tsx scripts/migrate-frost-soil-typing.ts
 */
import { PrismaClient } from "@prisma/client";
import { parseFrostValue, serializeFrostValue } from "../lib/frost";
import { parseSoilPhValue, serializeSoilPhValue } from "../lib/soil-ph";

const prisma = new PrismaClient();

function appendBlock(
  existing: string | null | undefined,
  title: string,
  body: string,
): string {
  const trimmed = body.trim();
  const block = `${title}:\n${trimmed}`;
  const current = existing?.trim() || "";
  if (!current) {
    return block;
  }
  if (current.includes(trimmed)) {
    return current;
  }
  return `${current}\n\n${block}`;
}

async function main() {
  const plants = await prisma.plant.findMany({
    select: {
      id: true,
      name: true,
      frostResistance: true,
      soilType: true,
      observations: true,
    },
  });

  let updated = 0;

  for (const plant of plants) {
    let observations = plant.observations ?? null;
    let nextFrost = plant.frostResistance ?? null;
    let nextSoil = plant.soilType ?? null;

    const frostRaw = plant.frostResistance?.trim() || "";
    if (frostRaw) {
      const typed = parseFrostValue(frostRaw);
      if (typed) {
        nextFrost = serializeFrostValue(typed);
      } else {
        observations = appendBlock(
          observations,
          "Heladas (texto original)",
          frostRaw,
        );
        nextFrost = null;
      }
    }

    const soilRaw = plant.soilType?.trim() || "";
    if (soilRaw) {
      const typed = parseSoilPhValue(soilRaw);
      if (typed) {
        nextSoil = serializeSoilPhValue(typed);
      } else {
        observations = appendBlock(
          observations,
          "pH / suelo (texto original)",
          soilRaw,
        );
        nextSoil = null;
      }
    }

    if (
      nextFrost === (plant.frostResistance ?? null) &&
      nextSoil === (plant.soilType ?? null) &&
      (observations ?? null) === (plant.observations ?? null)
    ) {
      continue;
    }

    await prisma.plant.update({
      where: { id: plant.id },
      data: {
        frostResistance: nextFrost,
        soilType: nextSoil,
        observations,
      },
    });
    updated += 1;
    console.log(`updated ${plant.name}`);
  }

  console.log(`done, updated ${updated}/${plants.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
