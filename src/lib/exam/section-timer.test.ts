import { describe, expect, it } from "vitest";
import { isSectionExpired, remainingSeconds } from "./section-timer";

const section = { time_limit_minutes: 40 };
const start = new Date("2026-10-25T10:00:00Z");

describe("remainingSeconds", () => {
  it("returns the full limit at the start", () => {
    expect(remainingSeconds(section, start, start)).toBe(40 * 60);
  });

  it("counts down from the configured limit", () => {
    expect(remainingSeconds(section, start, new Date("2026-10-25T10:05:30Z"))).toBe(40 * 60 - 330);
  });

  it("never goes below zero", () => {
    expect(remainingSeconds(section, start, new Date("2026-10-25T11:30:00Z"))).toBe(0);
  });

  it("returns the full limit if the clock says the start is in the future", () => {
    expect(remainingSeconds(section, start, new Date("2026-10-25T09:59:00Z"))).toBe(40 * 60);
  });

  it("uses whatever limit the config gives, not a fixed value", () => {
    expect(remainingSeconds({ time_limit_minutes: 25 }, start, start)).toBe(25 * 60);
  });
});

describe("isSectionExpired", () => {
  it("is false while time is left and true once it runs out", () => {
    expect(isSectionExpired(section, start, new Date("2026-10-25T10:39:59Z"))).toBe(false);
    expect(isSectionExpired(section, start, new Date("2026-10-25T10:40:00Z"))).toBe(true);
  });
});
