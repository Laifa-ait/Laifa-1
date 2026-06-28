import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { normalizeTimestamp } from "../utils/date";

describe("normalizeTimestamp", () => {
  it("should return Timestamp for Timestamp input", () => {
    const ts = Timestamp.now();
    expect(normalizeTimestamp(ts)).toBe(ts);
  });

  it("should return Timestamp for Date input", () => {
    const date = new Date("2026-06-27T20:50:41Z");
    const result = normalizeTimestamp(date);
    expect(result.toMillis()).toBe(date.getTime());
  });

  it("should return Timestamp for ISO string input", () => {
    const dateStr = "2026-06-27T20:50:41Z";
    const result = normalizeTimestamp(dateStr);
    expect(result.toMillis()).toBe(new Date(dateStr).getTime());
  });

  it("should return Timestamp for number input (milliseconds)", () => {
    const millis = 1718000000000;
    const result = normalizeTimestamp(millis);
    expect(result.toMillis()).toBe(millis);
  });

  it("should return Timestamp for object with seconds", () => {
    const obj = { seconds: 1718000000, nanoseconds: 0 };
    const result = normalizeTimestamp(obj);
    expect(result.seconds).toBe(1718000000);
  });

  it("should return current Timestamp for null/undefined", () => {
    const before = Date.now();
    const result = normalizeTimestamp(null as any);
    const after = Date.now();
    expect(result.toMillis()).toBeGreaterThanOrEqual(before);
    expect(result.toMillis()).toBeLessThanOrEqual(after + 10);
  });
});
