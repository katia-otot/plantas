/**
 * Open-Meteo forecast adapter — only decides whether to ASK about rain.
 * Never converts mm into watering credits.
 */

export const RAIN_SIGNAL_MM = 0.1;
export const FORECAST_PROBABILITY_THRESHOLD = 60;

export type OpenMeteoForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  targetDate: string;
  fetchedAt: string;
  current: {
    rain: number | null;
    showers: number | null;
    weatherCode: number | null;
  };
  hourly: Array<{
    time: string;
    rain: number | null;
    showers: number | null;
    precipitationProbability: number | null;
    weatherCode: number | null;
  }>;
};

export type RainAskDecision = {
  shouldAsk: boolean;
  reason:
    | "current"
    | "past_hour"
    | "forecast"
    | "no_signal"
    | "insufficient_data"
    | "wrong_day";
};

function liquidMm(rain: number | null, showers: number | null): number | null {
  if (rain == null && showers == null) {
    return null;
  }
  return (rain ?? 0) + (showers ?? 0);
}

function hourBelongsToDate(isoLocal: string, targetDate: string): boolean {
  // Open-Meteo with timezone returns "YYYY-MM-DDTHH:MM"
  return isoLocal.startsWith(targetDate);
}

/** Hours of targetDate plus 00:00 of the next calendar day (covers last hour of today). */
function hoursForTargetDay(
  hourly: OpenMeteoForecast["hourly"],
  targetDate: string,
): OpenMeteoForecast["hourly"] {
  const nextDay = (() => {
    const [y, m, d] = targetDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d! + 1));
    return dt.toISOString().slice(0, 10);
  })();

  return hourly.filter((row) => {
    if (hourBelongsToDate(row.time, targetDate)) {
      return true;
    }
    // Include tomorrow 00:00 as the end of today's last hour bucket.
    return row.time === `${nextDay}T00:00`;
  });
}

export function shouldAskAboutRain(
  weather: OpenMeteoForecast,
  targetDate: string,
  nowIsoLocal: string,
): RainAskDecision {
  if (weather.targetDate !== targetDate) {
    return { shouldAsk: false, reason: "wrong_day" };
  }

  const currentLiquid = liquidMm(weather.current.rain, weather.current.showers);
  if (currentLiquid != null && currentLiquid >= RAIN_SIGNAL_MM) {
    return { shouldAsk: true, reason: "current" };
  }

  const dayHours = hoursForTargetDay(weather.hourly, targetDate);
  if (dayHours.length === 0 && currentLiquid == null) {
    return { shouldAsk: false, reason: "insufficient_data" };
  }

  let sawUsableSignal = currentLiquid != null;
  let askForecast = false;
  let askPast = false;

  for (const row of dayHours) {
    const liquid = liquidMm(row.rain, row.showers);
    if (liquid == null) {
      continue;
    }
    sawUsableSignal = true;
    if (liquid < RAIN_SIGNAL_MM) {
      continue;
    }

    const isFuture = row.time > nowIsoLocal;
    if (!isFuture) {
      askPast = true;
      continue;
    }

    const prob = row.precipitationProbability;
    if (prob == null || prob >= FORECAST_PROBABILITY_THRESHOLD) {
      askForecast = true;
    }
  }

  if (askPast) {
    return { shouldAsk: true, reason: "past_hour" };
  }
  if (askForecast) {
    return { shouldAsk: true, reason: "forecast" };
  }
  if (!sawUsableSignal) {
    return { shouldAsk: false, reason: "insufficient_data" };
  }
  return { shouldAsk: false, reason: "no_signal" };
}

type FetchForecastArgs = {
  latitude: number;
  longitude: number;
  timezone: string;
  targetDate: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export async function fetchOpenMeteoForecast(
  args: FetchForecastArgs,
): Promise<OpenMeteoForecast> {
  if (
    !Number.isFinite(args.latitude) ||
    !Number.isFinite(args.longitude) ||
    args.latitude < -90 ||
    args.latitude > 90 ||
    args.longitude < -180 ||
    args.longitude > 180
  ) {
    throw new Error("Coordenadas de jardín inválidas");
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(args.latitude));
  url.searchParams.set("longitude", String(args.longitude));
  url.searchParams.set("timezone", args.timezone);
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("current", "rain,showers,weather_code");
  url.searchParams.set(
    "hourly",
    "rain,showers,precipitation_probability,weather_code",
  );

  const fetchImpl = args.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    args.timeoutMs ?? 12_000,
  );

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      latitude?: number;
      longitude?: number;
      timezone?: string;
      current?: {
        rain?: number | null;
        showers?: number | null;
        weather_code?: number | null;
      };
      hourly?: {
        time?: string[];
        rain?: Array<number | null>;
        showers?: Array<number | null>;
        precipitation_probability?: Array<number | null>;
        weather_code?: Array<number | null>;
      };
    };

    const times = data.hourly?.time ?? [];
    const hourly = times.map((time, index) => ({
      time,
      rain: data.hourly?.rain?.[index] ?? null,
      showers: data.hourly?.showers?.[index] ?? null,
      precipitationProbability:
        data.hourly?.precipitation_probability?.[index] ?? null,
      weatherCode: data.hourly?.weather_code?.[index] ?? null,
    }));

    return {
      latitude: data.latitude ?? args.latitude,
      longitude: data.longitude ?? args.longitude,
      timezone: data.timezone ?? args.timezone,
      targetDate: args.targetDate,
      fetchedAt: new Date().toISOString(),
      current: {
        rain: data.current?.rain ?? null,
        showers: data.current?.showers ?? null,
        weatherCode: data.current?.weather_code ?? null,
      },
      hourly,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const forecastCache = new Map<
  string,
  { expiresAt: number; value: OpenMeteoForecast }
>();

export async function fetchOpenMeteoForecastCached(
  args: FetchForecastArgs,
  ttlMs = 10 * 60_000,
): Promise<OpenMeteoForecast> {
  const key = `${args.latitude.toFixed(3)},${args.longitude.toFixed(3)},${args.timezone},${args.targetDate}`;
  const hit = forecastCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  const value = await fetchOpenMeteoForecast(args);
  forecastCache.set(key, { expiresAt: Date.now() + ttlMs, value });
  return value;
}
