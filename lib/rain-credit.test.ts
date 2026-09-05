import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRainToNextWaterDate,
  rainCreditDays,
  rebuildNextWaterDate,
} from "./rain-credit";

describe("rainCreditDays", () => {
  it("ceil(I/3) para moderada en intervalos clave", () => {
    assert.equal(rainCreditDays(2, "moderate"), 1);
    assert.equal(rainCreditDays(3, "moderate"), 1);
    assert.equal(rainCreditDays(4, "moderate"), 2);
    assert.equal(rainCreditDays(7, "moderate"), 3);
    assert.equal(rainCreditDays(10, "moderate"), 4);
    assert.equal(rainCreditDays(14, "moderate"), 5);
  });

  it("fuerte = intervalo completo; none = 0", () => {
    assert.equal(rainCreditDays(14, "heavy"), 14);
    assert.equal(rainCreditDays(14, "none"), 0);
  });
});

describe("planta sin riego base (next vencido + lluvia moderada)", () => {
  it("I=14, next 2026-09-04, lluvia 2026-09-05 → 2026-09-10", () => {
    // Caso cactus nuevos: sin lastWateredAt, next viejo; no deben quedar en Hoy.
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: "2026-09-04",
        rainDate: "2026-09-05",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-09-10",
    );
  });
});

describe("applyRainToNextWaterDate I=14 con fechas relativas claras", () => {
  // Riego en 2026-03-01 → next 2026-03-15
  const next0 = "2026-03-15";

  it("día 2: faltaban 12 → quedan 14 desde lluvia → 16 desde riego", () => {
    const next = applyRainToNextWaterDate({
      nextWaterDate: next0,
      rainDate: "2026-03-03",
      intervalDays: 14,
      intensity: "moderate",
    });
    assert.equal(next, "2026-03-17");
  });

  it("día 4 → día 18", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-05",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-03-19",
    );
  });

  it("día 7 → día 19", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-08",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-03-20",
    );
  });

  it("día 13 → día 19", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-14",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-03-20",
    );
  });

  it("día 14 → día 19", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-15",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-03-20",
    );
  });

  it("día 20 vencido → día 25", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-21",
        intervalDays: 14,
        intensity: "moderate",
      }),
      "2026-03-26",
    );
  });

  it("fuerte deja T+I; postergación manual más lejana se conserva", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-08",
        intervalDays: 14,
        intensity: "heavy",
      }),
      "2026-03-22",
    );
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: "2026-04-01",
        rainDate: "2026-03-08",
        intervalDays: 14,
        intensity: "heavy",
      }),
      "2026-04-01",
    );
  });

  it("none e indoor no cambian N (incluso vencida)", () => {
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: "2026-03-01",
        rainDate: "2026-03-10",
        intervalDays: 14,
        intensity: "none",
      }),
      "2026-03-01",
    );
    assert.equal(
      applyRainToNextWaterDate({
        nextWaterDate: next0,
        rainDate: "2026-03-08",
        intervalDays: 14,
        intensity: "moderate",
        isIndoor: true,
      }),
      next0,
    );
  });
});

describe("rebuildNextWaterDate ejemplo obligatorio", () => {
  it("fuerte día 7 + moderada día 13 → día 26; correcciones 24 y 19", () => {
    const intervalForDate = () => 14;
    const waterDate = "2026-03-01";
    const initialNext = "2026-03-15";

    const withHeavy = rebuildNextWaterDate({
      initialNextWaterDate: initialNext,
      intervalForDate,
      events: [
        { kind: "rain", date: "2026-03-08", intensity: "heavy" },
        { kind: "rain", date: "2026-03-14", intensity: "moderate" },
      ],
    });
    assert.equal(withHeavy, "2026-03-27"); // day 0=Mar1 → day 26 = Mar27

    const heavyToModerate = rebuildNextWaterDate({
      initialNextWaterDate: initialNext,
      intervalForDate,
      events: [
        { kind: "rain", date: "2026-03-08", intensity: "moderate" },
        { kind: "rain", date: "2026-03-14", intensity: "moderate" },
      ],
    });
    assert.equal(heavyToModerate, "2026-03-25"); // day 24

    const heavyToNone = rebuildNextWaterDate({
      initialNextWaterDate: initialNext,
      intervalForDate,
      events: [
        { kind: "rain", date: "2026-03-08", intensity: "none" },
        { kind: "rain", date: "2026-03-14", intensity: "moderate" },
      ],
    });
    assert.equal(heavyToNone, "2026-03-20"); // day 19

    // riego real día 15 corta influencia de lluvia día 7
    const afterRealWater = rebuildNextWaterDate({
      initialNextWaterDate: initialNext,
      intervalForDate,
      events: [
        { kind: "rain", date: "2026-03-08", intensity: "heavy" },
        { kind: "watering", date: "2026-03-16", intervalDays: 14 },
        { kind: "rain", date: "2026-03-17", intensity: "moderate" },
      ],
    });
    // water day 15 relative = Mar16 → next Mar30; rain Mar17 R=13, +5 → min(14,18)=14 → Mar31
    assert.equal(afterRealWater, "2026-03-31");

    void waterDate;
  });
});
