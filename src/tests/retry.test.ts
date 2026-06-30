import { describe, it, expect, vi } from 'vitest';
import { withExponentialBackoff } from '../utils/retry';

describe('retry utility', () => {
  it('succeeds on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await withExponentialBackoff(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    let attempts = 0;
    const operation = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) throw new Error('network error'); // Need a retryable error message
      return Promise.resolve('success');
    });

    const result = await withExponentialBackoff(operation, 3, 10);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('fails after maximum retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('network fail'));
    await expect(withExponentialBackoff(operation, 3, 10)).rejects.toThrow('network fail');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
