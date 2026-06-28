import { describe, it, expect, vi } from 'vitest';
import { withExponentialBackoff } from '../utils/retry';

describe('retry utilities', () => {
  describe('withExponentialBackoff', () => {
    it('returns result if successful on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withExponentialBackoff(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable errors and succeeds', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('network error');
          error.code = 'unavailable';
          throw error;
        }
        return 'success on 3';
      });

      const result = await withExponentialBackoff(fn, 3, 10);
      expect(result).toBe('success on 3');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('fails after max retries', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('network error');
        error.code = 'unavailable';
        throw error;
      });

      await expect(withExponentialBackoff(fn, 3, 10)).rejects.toThrow('network error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry non-retryable errors', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        const error: any = new Error('auth failed');
        error.code = 'permission-denied';
        throw error;
      });

      await expect(withExponentialBackoff(fn, 3, 10)).rejects.toThrow('auth failed');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
