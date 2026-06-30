import { describe, it, expect } from 'vitest';
import { formatPrice } from '../utils/format';

describe('formatUtils', () => {
  it('formats price correctly', () => {
    expect(formatPrice(1000)).toBe("\u200E1,000\u00A0DA");
    expect(formatPrice(25000.5)).toBe("\u200E25,000.5\u00A0DA");
    expect(formatPrice(0)).toBe("\u200E0\u00A0DA");
  });
});
