import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORECAST_PROBABILITY_THRESHOLD,
  RAIN_SIGNAL_MM,
  shouldAskAboutRain,
  type OpenMeteoForecast,
} from "./open-meteo";

function baseWeather(
  overrides: Partial<OpenMeteoForecast> = {},
): OpenMeteoForecast {
  return {
    latitude: -34.6,
    longitude: -58.4,
    timezone: "America/Argentina/Buenos_Aires",
    targetDate: "2026-09-05",
    fetchedAt: "2026-09-05T16:00:00.000Z",
    current: { rain: 0, showers: 0, weatherCode: 0 },
    hourly: [],
    ...overrides,
  };
}

describe("shouldAskAboutRain", () => {
  it("pregunta si la lluvia actual supera el umbral", () => {
    const decision = shouldAskAboutRain(
      baseWeather({
        current: { rain: RAIN_SIGNAL_MM, showers: 0, weatherCode: 61 },
      }),
      "2026-09-05",
      "2026-09-05T13:45",
    );
    assert.equal(decision.shouldAsk, true);
    assert.equal(decision.reason, "current");
  });

  it("pregunta por hora pasada con lluvia líquida", () => {
    const decision = shouldAskAboutRain(
      baseWeather({
        hourly: [
          {
            time: "2026-09-05T10:00",
            rain: 0.5,
            showers: 0,
            precipitationProbability: 80,
            weatherCode: 61,
          },
        ],
      }),
      "2026-09-05",
      "2026-09-05T13:45",
    );
    assert.equal(decision.shouldAsk, true);
    assert.equal(decision.reason, "past_hour");
  });

  it("pregunta por pronóstico futuro con probabilidad alta", () => {
    const decision = shouldAskAboutRain(
      baseWeather({
        hourly: [
          {
            time: "2026-09-05T18:00",
            rain: 1,
            showers: 0,
            precipitationProbability: FORECAST_PROBABILITY_THRESHOLD,
            weatherCode: 61,
          },
        ],
      }),
      "2026-09-05",
      "2026-09-05T13:45",
    );
    assert.equal(decision.shouldAsk, true);
    assert.equal(decision.reason, "forecast");
  });

  it("no pregunta por lluvia solo de mañana", () => {
    const decision = shouldAskAboutRain(
      baseWeather({
        hourly: [
          {
            time: "2026-09-06T09:00",
            rain: 5,
            showers: 0,
            precipitationProbability: 90,
            weatherCode: 61,
          },
        ],
      }),
      "2026-09-05",
      "2026-09-05T13:45",
    );
    assert.equal(decision.shouldAsk, false);
  });

  it("sin señal no pregunta", () => {
    const decision = shouldAskAboutRain(
      baseWeather({
        hourly: [
          {
            time: "2026-09-05T18:00",
            rain: 0,
            showers: 0,
            precipitationProbability: 10,
            weatherCode: 0,
          },
        ],
      }),
      "2026-09-05",
      "2026-09-05T13:45",
    );
    assert.equal(decision.shouldAsk, false);
    assert.equal(decision.reason, "no_signal");
  });
});
