import { describe, it, expect } from 'vitest';

describe('Order Calculations', () => {
  it('calculates vendor commission accurately', () => {
    const calculateCommission = (total: number, rate: number) => {
      return (total * rate) / 100;
    };

    expect(calculateCommission(1000, 5)).toBe(50);
    expect(calculateCommission(2500, 10)).toBe(250);
  });

  it('determines order status transitions', () => {
    const isValidTransition = (current: string, next: string) => {
      const transitions: Record<string, string[]> = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'returned'],
        'delivered': [],
        'cancelled': []
      };
      return transitions[current]?.includes(next) ?? false;
    };

    expect(isValidTransition('pending', 'confirmed')).toBe(true);
    expect(isValidTransition('pending', 'shipped')).toBe(false);
    expect(isValidTransition('shipped', 'delivered')).toBe(true);
    expect(isValidTransition('delivered', 'cancelled')).toBe(false);
  });
});
