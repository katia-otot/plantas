/**
 * Migrate existing SQLite patio data onto the shared garden (slug=default).
 * Safe / idempotent: never deletes plants, events, birds, or notes.
 *
 * Usage: npx tsx scripts/migrate-multi-garden.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OWNER_EMAILS = [
  "nechegoyen90529@gmail.com",
  "katiagadea19@gmail.com",
  ...(process.env.AUTH_OWNER_EMAILS?.split(",") ?? []),
]
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type ColumnInfo = { name: string };

async function tableColumns(table: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `PRAGMA table_info("${table}")`,
  );
  return new Set(rows.map((row) => row.name));
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    table,
  );
  return rows.length > 0;
}

async function ensureColumn(
  table: string,
  column: string,
  ddlType: string,
): Promise<boolean> {
  const cols = await tableColumns(table);
  if (cols.has(column)) {
    return false;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN "${column}" ${ddlType}`,
  );
  console.log(`added ${table}.${column}`);
  return true;
}

async function main() {
  const emails = [...new Set(OWNER_EMAILS)];

  let garden = await prisma.garden.findUnique({ where: { slug: "default" } });
  if (!garden) {
    garden = await prisma.garden.create({
      data: { slug: "default", name: "Patio compartido" },
    });
    console.log(`created shared garden ${garden.id}`);
  } else {
    console.log(`shared garden ${garden.id}`);
  }

  for (const email of emails) {
    await prisma.gardenMember.upsert({
      where: { gardenId_email: { gardenId: garden.id, email } },
      create: { gardenId: garden.id, email, role: "owner" },
      update: { role: "owner" },
    });
    console.log(`owner member: ${email}`);
  }

  // Link ownerUserId from first matching User if present
  if (!garden.ownerUserId) {
    for (const email of emails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        garden = await prisma.garden.update({
          where: { id: garden.id },
          data: { ownerUserId: user.id },
        });
        await prisma.gardenMember.updateMany({
          where: { gardenId: garden.id, email },
          data: { userId: user.id },
        });
        console.log(`set ownerUserId from ${email}`);
        break;
      }
    }
  }

  const gardenId = garden.id;

  if (await tableExists("Plant")) {
    await ensureColumn("Plant", "gardenId", "TEXT");
    const plantUpdated = await prisma.$executeRawUnsafe(
      `UPDATE "Plant" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
      gardenId,
    );
    console.log(`Plant gardenId backfill: ${plantUpdated}`);
  }

  if (await tableExists("Bird")) {
    await ensureColumn("Bird", "gardenId", "TEXT");
    const birdUpdated = await prisma.$executeRawUnsafe(
      `UPDATE "Bird" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
      gardenId,
    );
    console.log(`Bird gardenId backfill: ${birdUpdated}`);
  }

  if (await tableExists("GardenNote")) {
    await ensureColumn("GardenNote", "gardenId", "TEXT");
    const noteUpdated = await prisma.$executeRawUnsafe(
      `UPDATE "GardenNote" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
      gardenId,
    );
    console.log(`GardenNote gardenId backfill: ${noteUpdated}`);
  }

  if (await tableExists("CareEvent")) {
    await ensureColumn("CareEvent", "gardenId", "TEXT");
    // Prefer plant's garden when linked
    await prisma.$executeRawUnsafe(
      `UPDATE "CareEvent" SET "gardenId" = (
         SELECT p."gardenId" FROM "Plant" p WHERE p."id" = "CareEvent"."plantId"
       )
       WHERE ("gardenId" IS NULL OR "gardenId" = '')
         AND "plantId" IS NOT NULL
         AND EXISTS (SELECT 1 FROM "Plant" p WHERE p."id" = "CareEvent"."plantId" AND p."gardenId" IS NOT NULL)`,
    );
    const eventUpdated = await prisma.$executeRawUnsafe(
      `UPDATE "CareEvent" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
      gardenId,
    );
    console.log(`CareEvent gardenId backfill: ${eventUpdated}`);
  }

  if (await tableExists("GardenSettings")) {
    await ensureColumn("GardenSettings", "gardenId", "TEXT");
    const settingsCols = await tableColumns("GardenSettings");

    // Legacy singleton → attach to shared garden
    if (settingsCols.has("id")) {
      await prisma.$executeRawUnsafe(
        `UPDATE "GardenSettings" SET "gardenId" = ? WHERE ("gardenId" IS NULL OR "gardenId" = '') AND "id" = 'singleton'`,
        gardenId,
      );
      await prisma.$executeRawUnsafe(
        `UPDATE "GardenSettings" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
        gardenId,
      );
    }

    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "GardenSettings" WHERE "gardenId" = ? LIMIT 1`,
      gardenId,
    );
    if (existing.length === 0) {
      // Insert via Prisma if model is ready; otherwise raw
      try {
        await prisma.gardenSettings.create({
          data: { gardenId },
        });
        console.log("created GardenSettings for shared garden");
      } catch {
        const id = `gs_${Date.now().toString(36)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "GardenSettings" ("id", "gardenId", "updatedAt") VALUES (?, ?, CURRENT_TIMESTAMP)`,
          id,
          gardenId,
        );
        console.log("created GardenSettings via SQL");
      }
    } else {
      console.log(`GardenSettings already linked: ${existing[0].id}`);
    }

    // Drop duplicate singleton rows that still have wrong id uniqueness if any
    // (keep the one with gardenId set)
  }

  if (await tableExists("PushSubscription")) {
    await ensureColumn("PushSubscription", "userId", "TEXT");
    await ensureColumn("PushSubscription", "gardenId", "TEXT");
    await prisma.$executeRawUnsafe(
      `UPDATE "PushSubscription" SET "gardenId" = ? WHERE "gardenId" IS NULL OR "gardenId" = ''`,
      gardenId,
    );
    console.log("PushSubscription gardenId backfilled to shared patio");
  }

  if (await tableExists("Garden")) {
    await ensureColumn("Garden", "ownerUserId", "TEXT");
  }

  const counts = {
    plants: await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*) as c FROM "Plant" WHERE "gardenId" = ?`,
      gardenId,
    ),
    birds: await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*) as c FROM "Bird" WHERE "gardenId" = ?`,
      gardenId,
    ),
    notes: await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*) as c FROM "GardenNote" WHERE "gardenId" = ?`,
      gardenId,
    ),
    events: await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*) as c FROM "CareEvent" WHERE "gardenId" = ?`,
      gardenId,
    ),
  };

  console.log("shared garden counts:", {
    plants: counts.plants[0]?.c,
    birds: counts.birds[0]?.c,
    notes: counts.notes[0]?.c,
    events: counts.events[0]?.c,
  });
  console.log("done — zero data loss expected; new users get empty personal gardens");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
