import { describe, it, expect, vi } from 'vitest';
import { normalizeTimestamp } from '../utils/date';
import { Timestamp } from 'firebase/firestore';

describe('normalizeTimestamp', () => {
  it('should return a Timestamp when given a Date', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    const result = normalizeTimestamp(date);
    expect(result).toBeInstanceOf(Timestamp);
    expect(result.toDate().toISOString()).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should return the same Timestamp if given a Timestamp', () => {
    const ts = Timestamp.fromDate(new Date('2024-01-01T12:00:00Z'));
    const result = normalizeTimestamp(ts);
    expect(result).toBe(ts);
  });

  it('should parse ISO strings into Timestamps', () => {
    const str = '2024-01-01T12:00:00.000Z';
    const result = normalizeTimestamp(str);
    expect(result).toBeInstanceOf(Timestamp);
    expect(result.toDate().toISOString()).toBe(str);
  });

  it('should parse milliseconds into Timestamps', () => {
    const ms = 1704110400000; // 2024-01-01T12:00:00.000Z
    const result = normalizeTimestamp(ms);
    expect(result).toBeInstanceOf(Timestamp);
    expect(result.toMillis()).toBe(ms);
  });

  it('should parse objects with seconds and nanoseconds', () => {
    const obj = { seconds: 1704110400, nanoseconds: 0 };
    const result = normalizeTimestamp(obj);
    expect(result).toBeInstanceOf(Timestamp);
    expect(result.seconds).toBe(1704110400);
  });

  it('should return current time for falsy values', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(now);
    
    const result = normalizeTimestamp(null as any);
    expect(result.toMillis()).toBe(now.getTime());
    
    vi.useRealTimers();
  });
});
