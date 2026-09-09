/**
 * Restore local DB from a JSON backup, preserving nextWateredAt from the file.
 * Usage: npx tsx scripts/restore-local-backup.ts [path-to-json]
 *
 * Optional: --with-rain-rebuild marks historical rains as heavy and rebuilds
 * outdoor schedules (can clear "Hoy" compared to the backup dates).
 */
import { readFileSync } from "fs";
import { parseBackupJson, restoreBackup } from "../lib/backup";
import { prisma } from "../lib/db";
import { ensureDefaultGarden } from "../lib/garden-access";
import {
  toCalendarDateString,
  calendarDateToDate,
} from "../lib/calendar-date";
import { rebuildOutdoorWaterSchedules } from "../lib/rain-days";

async function main() {
  const args = process.argv.slice(2);
  const withRainRebuild = args.includes("--with-rain-rebuild");
  const backupPath =
    args.find((arg) => !arg.startsWith("--")) ||
    "C:/Users/katia/Downloads/anthos-respaldo-2026-09-09.json";

  const garden = await ensureDefaultGarden();
  const gid = garden.id;

  // Keep local climate location across restore (backup may not include it).
  const before = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
    select: {
      latitude: true,
      longitude: true,
      locationLabel: true,
      timezone: true,
    },
  });

  const raw = readFileSync(backupPath, "utf8");
  const backup = parseBackupJson(raw);
  console.log("Restoring", backupPath);
  console.log("exportedAt", backup.exportedAt);
  console.log(
    "plants",
    backup.plants?.length,
    "files",
    Object.keys(backup.files ?? {}).length,
    "patioEvents",
    backup.patioEvents?.length,
  );

  const result = await restoreBackup(backup, gid);
  console.log("restore result", result);

  // RainDay is not in the backup JSON; clear local rows so they don't diverge
  // from the restored nextWateredAt unless the caller asks to rebuild.
  await prisma.rainDay.deleteMany({ where: { gardenId: gid } });
  console.log("Cleared local RainDay rows");

  // Restore climate location if we had one.
  const settings = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
  });
  if (before?.latitude != null && before?.longitude != null) {
    await prisma.gardenSettings.upsert({
      where: { gardenId: gid },
      create: {
        gardenId: gid,
        latitude: before.latitude,
        longitude: before.longitude,
        locationLabel: before.locationLabel,
        timezone: before.timezone ?? "America/Argentina/Buenos_Aires",
        lastRainAt: settings?.lastRainAt ?? null,
      },
      update: {
        latitude: before.latitude,
        longitude: before.longitude,
        locationLabel: before.locationLabel,
        timezone: before.timezone ?? undefined,
      },
    });
    console.log(
      "Kept location:",
      before.locationLabel,
      before.latitude,
      before.longitude,
    );
  }

  if (withRainRebuild) {
    const rainEvents = await prisma.careEvent.findMany({
      where: { gardenId: gid, type: "rain_skip", plantId: null },
      orderBy: { happenedAt: "asc" },
    });

    const dates = new Set<string>();
    for (const event of rainEvents) {
      dates.add(toCalendarDateString(event.happenedAt));
    }
    if (settings?.lastRainAt) {
      dates.add(toCalendarDateString(settings.lastRainAt));
    }

    for (const rainDate of dates) {
      await prisma.rainDay.upsert({
        where: { gardenId_rainDate: { gardenId: gid, rainDate } },
        create: {
          gardenId: gid,
          rainDate,
          intensity: "heavy",
          source: "legacy_migration",
        },
        update: {
          intensity: "heavy",
          source: "legacy_migration",
        },
      });
    }
    console.log("RainDay heavy rows:", dates.size, [...dates]);

    const latestRain = [...dates].sort().at(-1);
    if (latestRain) {
      await prisma.gardenSettings.update({
        where: { gardenId: gid },
        data: { lastRainAt: calendarDateToDate(latestRain) },
      });
    }

    const rebuilt = await rebuildOutdoorWaterSchedules(gid);
    console.log("schedules rebuilt", rebuilt);
  } else {
    console.log(
      "Preserved nextWateredAt from backup (no rain rebuild). Pass --with-rain-rebuild to recalculate.",
    );
  }

  const plants = await prisma.plant.count({ where: { gardenId: gid } });
  const withMap = await prisma.plant.count({
    where: { gardenId: gid, mapX: { not: null } },
  });
  const withPhoto = await prisma.plant.count({
    where: {
      gardenId: gid,
      coverPhotoPath: { not: null },
    },
  });
  const dueToday = await prisma.plant.count({
    where: {
      gardenId: gid,
      status: "alta",
      isIndoor: false,
      nextWateredAt: { lte: new Date() },
    },
  });
  console.log({ plants, withMap, withPhoto, dueTodayApprox: dueToday });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
