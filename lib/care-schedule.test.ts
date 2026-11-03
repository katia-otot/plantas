import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDefaultSaturdayInput,
  getTodayInput,
  isScheduleCareDateAlreadyDone,
} from "./care-schedule";

describe("getTodayInput", () => {
  it("formats the calendar day as YYYY-MM-DD", () => {
    assert.equal(getTodayInput(new Date(2026, 10, 3)), "2026-11-03");
  });
});

describe("getDefaultSaturdayInput", () => {
  it("returns the same day when already Saturday", () => {
    // 2026-11-07 is Saturday
    assert.equal(getDefaultSaturdayInput(new Date(2026, 10, 7)), "2026-11-07");
  });

  it("returns the next Saturday from a weekday", () => {
    // 2026-11-03 is Tuesday
    assert.equal(getDefaultSaturdayInput(new Date(2026, 10, 3)), "2026-11-07");
  });
});

describe("isScheduleCareDateAlreadyDone", () => {
  it("treats today and past dates as already done", () => {
    assert.equal(isScheduleCareDateAlreadyDone("2026-11-03", "2026-11-03"), true);
    assert.equal(isScheduleCareDateAlreadyDone("2026-11-02", "2026-11-03"), true);
  });

  it("treats future dates as pending", () => {
    assert.equal(isScheduleCareDateAlreadyDone("2026-11-04", "2026-11-03"), false);
  });
});
