import { describe, it, expect } from 'vitest';
import { formatPrice } from '../utils/format';

describe('format utilities', () => {
  describe('formatPrice', () => {
    it('formats price correctly with DA and LRM', () => {
      const formatted = formatPrice(1500.5);
      expect(formatted).toBe("\u200E1,500.5\u00A0DA");
    });
    
    it('handles zero correctly', () => {
      expect(formatPrice(0)).toBe("\u200E0\u00A0DA");
    });
    
    it('formats large numbers correctly', () => {
      expect(formatPrice(1000000)).toBe("\u200E1,000,000\u00A0DA");
    });
  });
});
