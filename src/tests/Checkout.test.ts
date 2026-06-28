import { describe, it, expect } from 'vitest';

describe('Checkout logic', () => {
  it('calculates total price correctly for basic items', () => {
    const items = [
      { id: '1', price: 100, quantity: 2 },
      { id: '2', price: 50, quantity: 1 }
    ];
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    expect(subtotal).toBe(250);
  });

  it('applies wilaya shipping cost correctly', () => {
    const shippingMatrix: Record<string, number> = {
      '16': 400, // Alger
      '31': 600, // Oran
    };

    const calculateShipping = (wilayaCode: string) => shippingMatrix[wilayaCode] || 800;

    expect(calculateShipping('16')).toBe(400);
    expect(calculateShipping('31')).toBe(600);
    expect(calculateShipping('01')).toBe(800); // Default fallback
  });
});
