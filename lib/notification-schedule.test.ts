import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_NOTIFY_WEEKDAY_TIME,
  DEFAULT_NOTIFY_WEEKEND_TIME,
  argentinaLocalToDate,
  formatScheduleLabel,
  getNextNotificationAt,
  isNotificationDue,
  parseNotifyTime,
} from "./notification-schedule";

const schedule = {
  weekdayTime: DEFAULT_NOTIFY_WEEKDAY_TIME,
  weekendTime: DEFAULT_NOTIFY_WEEKEND_TIME,
};

/** Argentina local time → UTC Date (ART = UTC-3). */
function art(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return argentinaLocalToDate(year, month, day, hour, minute);
}

describe("parseNotifyTime", () => {
  it("accepts valid HH:MM values", () => {
    assert.equal(parseNotifyTime("15:00"), "15:00");
    assert.equal(parseNotifyTime("9:05"), "09:05");
    assert.equal(parseNotifyTime(" 23:59 "), "23:59");
  });

  it("rejects invalid values", () => {
    assert.equal(parseNotifyTime(""), null);
    assert.equal(parseNotifyTime("25:00"), null);
    assert.equal(parseNotifyTime("12:60"), null);
    assert.equal(parseNotifyTime("noon"), null);
    assert.equal(parseNotifyTime(1500), null);
  });
});

describe("formatScheduleLabel", () => {
  it("formats weekday and weekend times", () => {
    assert.equal(
      formatScheduleLabel(schedule),
      "lun–vie 15:00 · sáb–dom 10:30 (Argentina)",
    );
  });
});

describe("argentinaLocalToDate", () => {
  it("converts ART to UTC (+3 hours)", () => {
    const utc = art(2026, 9, 1, 15, 0);
    assert.equal(utc.toISOString(), "2026-09-01T18:00:00.000Z");
  });
});

describe("isNotificationDue", () => {
  it("is true at the configured weekday time without prior send", () => {
    const now = art(2026, 9, 1, 15, 0); // Tuesday
    assert.equal(isNotificationDue(schedule, null, now), true);
  });

  it("is false before the configured weekday time", () => {
    const now = art(2026, 9, 1, 14, 59);
    assert.equal(isNotificationDue(schedule, null, now), false);
  });

  it("is false if already sent the same calendar day", () => {
    const now = art(2026, 9, 1, 15, 0);
    const lastSent = art(2026, 9, 1, 15, 0);
    assert.equal(isNotificationDue(schedule, lastSent, now), false);
  });

  it("is true on weekend at the configured weekend time", () => {
    const now = art(2026, 9, 6, 10, 30); // Saturday
    assert.equal(isNotificationDue(schedule, null, now), true);
  });

  it("uses weekend schedule on Saturday, not weekday", () => {
    const now = art(2026, 9, 6, 15, 0); // Saturday 15:00
    assert.equal(isNotificationDue(schedule, null, now), false);
  });
});

describe("getNextNotificationAt", () => {
  it("returns later today when weekday time has not passed", () => {
    const from = art(2026, 9, 1, 10, 0); // Tuesday morning
    const next = getNextNotificationAt(schedule, from);
    assert.equal(next.toISOString(), art(2026, 9, 1, 15, 0).toISOString());
  });

  it("returns next weekday after today's slot passed", () => {
    const from = art(2026, 9, 1, 15, 30); // Tuesday afternoon
    const next = getNextNotificationAt(schedule, from);
    assert.equal(next.toISOString(), art(2026, 9, 2, 15, 0).toISOString());
  });

  it("returns Saturday morning after Friday afternoon", () => {
    const from = art(2026, 9, 5, 16, 0); // Friday
    const next = getNextNotificationAt(schedule, from);
    assert.equal(next.toISOString(), art(2026, 9, 6, 10, 30).toISOString());
  });

  it("returns Sunday morning after Saturday slot passed", () => {
    const from = art(2026, 9, 5, 11, 0); // Saturday late morning
    const next = getNextNotificationAt(schedule, from);
    assert.equal(next.toISOString(), art(2026, 9, 6, 10, 30).toISOString());
  });

  it("respects updated schedule from the menu", () => {
    const custom = { weekdayTime: "08:15", weekendTime: "18:45" };
    const from = art(2026, 9, 1, 7, 0);
    const next = getNextNotificationAt(custom, from);
    assert.equal(next.toISOString(), art(2026, 9, 1, 8, 15).toISOString());
  });
});
