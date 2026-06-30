import { describe, it, expect } from 'vitest';
import { onboardingSchema, placeOrderSchema } from '../utils/validation';

describe('Validation Schemas', () => {
  describe('onboardingSchema', () => {
    it('validates correct data', () => {
      const validData = {
        name: 'John Doe',
        phone: '0555123456',
        wilaya: '16 Alger',
        address: '123 Main St, Appt 4',
        role: 'buyer'
      };
      const result = onboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '0123456789', // Invalid prefix
        wilaya: '16 Alger',
        address: '123 Main St, Appt 4',
        role: 'buyer'
      };
      const result = onboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('phone');
      }
    });

    it('rejects invalid wilaya', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '0555123456',
        wilaya: 'Paris', // Invalid Wilaya
        address: '123 Main St',
        role: 'buyer'
      };
      const result = onboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('wilaya');
      }
    });
  });

  describe('placeOrderSchema', () => {
    const validAddress = {
      fullName: 'John Doe',
      phone: '0655123456',
      wilaya: '31 Oran',
      commune: 'Es Senia',
      address: 'Route de l aeroport'
    };

    it('validates a correct order', () => {
      const validOrder = {
        cart: [{ id: 'prod1', sellerId: 'seller1', quantity: 2, name: "Product", price: 100, image: "img.jpg" }],
        shippingAddress: validAddress,
        deliveryMethod: 'domicile'
      };
      const result = placeOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('rejects empty cart', () => {
      const invalidOrder = {
        cart: [], // Empty cart
        shippingAddress: validAddress,
        deliveryMethod: 'domicile'
      };
      const result = placeOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('cart');
      }
    });
  });
});
