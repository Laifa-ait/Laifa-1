import { normalizeTimestamp } from '../utils/date';
import { describe, it, expect } from 'vitest';

describe('normalizeTimestamp', () => {
  it('should handle Date input', () => {
    const result = normalizeTimestamp(new Date());
    expect(result).toBeDefined();
  });
});
