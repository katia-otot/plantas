import { prisma } from "@/lib/db";
import { ensureDefaultGarden, resolveGardenId } from "@/lib/garden-access";
import { GARDEN_TIMEZONE, todayCalendarDateString } from "@/lib/calendar-date";
import {
  fetchOpenMeteoForecastCached,
  shouldAskAboutRain,
} from "@/lib/open-meteo";
import { getRainDayForDate } from "@/lib/rain-days";

export async function maybeAskAboutRainForGarden(
  gardenId?: string,
  now = new Date(),
): Promise<{
  shouldNotify: boolean;
  targetDate: string;
  reason: string;
}> {
  const gid = gardenId ?? (await ensureDefaultGarden()).id;
  const targetDate = todayCalendarDateString(now);
  const existing = await getRainDayForDate(targetDate, gid);
  if (existing) {
    return {
      shouldNotify: false,
      targetDate,
      reason: "already_decided",
    };
  }

  const settings = await prisma.gardenSettings.findUnique({
    where: { gardenId: gid },
  });

  if (
    settings?.latitude == null ||
    settings?.longitude == null ||
    !Number.isFinite(settings.latitude) ||
    !Number.isFinite(settings.longitude)
  ) {
    return {
      shouldNotify: false,
      targetDate,
      reason: "missing_location",
    };
  }

  const timezone = settings.timezone || GARDEN_TIMEZONE;

  try {
    const forecast = await fetchOpenMeteoForecastCached({
      latitude: settings.latitude,
      longitude: settings.longitude,
      timezone,
      targetDate,
    });

    const nowLocal = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(now)
      .replace(" ", "T");

    const decision = shouldAskAboutRain(forecast, targetDate, nowLocal);
    return {
      shouldNotify: decision.shouldAsk,
      targetDate,
      reason: decision.reason,
    };
  } catch (error) {
    console.error("[rain-ask] falló Open-Meteo", error);
    return {
      shouldNotify: false,
      targetDate,
      reason: "weather_error",
    };
  }
}

export async function setGardenLocation(args: {
  latitude: number;
  longitude: number;
  timezone?: string;
  gardenId?: string;
}): Promise<{ locationLabel: string | null }> {
  const gid = await resolveGardenId(args.gardenId);
  const { reverseGeocodeLabel } = await import("@/lib/reverse-geocode");
  const locationLabel = await reverseGeocodeLabel(
    args.latitude,
    args.longitude,
  );

  await prisma.gardenSettings.upsert({
    where: { gardenId: gid },
    create: {
      gardenId: gid,
      latitude: args.latitude,
      longitude: args.longitude,
      timezone: args.timezone ?? GARDEN_TIMEZONE,
      locationLabel,
    },
    update: {
      latitude: args.latitude,
      longitude: args.longitude,
      timezone: args.timezone ?? GARDEN_TIMEZONE,
      locationLabel,
    },
  });

  return { locationLabel };
}
