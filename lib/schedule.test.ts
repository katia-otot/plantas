import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSeason } from "./schedule";

function seasonOn(month: number, day = 15): ReturnType<typeof getSeason> {
  return getSeason(new Date(2026, month - 1, day));
}

describe("getSeason (hemisferio sur)", () => {
  it("verano en diciembre, enero y febrero", () => {
    assert.equal(seasonOn(12), "summer");
    assert.equal(seasonOn(1), "summer");
    assert.equal(seasonOn(2), "summer");
  });

  it("invierno en junio, julio y agosto", () => {
    assert.equal(seasonOn(6), "winter");
    assert.equal(seasonOn(7), "winter");
    assert.equal(seasonOn(8), "winter");
  });

  it("primavera y otoño usan intervalos de invierno", () => {
    assert.equal(seasonOn(9, 1), "winter");
    assert.equal(seasonOn(10), "winter");
    assert.equal(seasonOn(11), "winter");
    assert.equal(seasonOn(3), "winter");
    assert.equal(seasonOn(4), "winter");
    assert.equal(seasonOn(5), "winter");
  });
});
