import { describe, it, expect } from 'vitest';
import { onboardingSchema, placeOrderSchema } from '../utils/validation';

describe('Validation Schemas', () => {
  describe('onboardingSchema', () => {
    it('validates correct buyer data', () => {
      const validData = {
        name: 'John Doe',
        phone: '0555123456',
        wilaya: '16 Alger',
        address: 'Rue de la paix',
        role: 'buyer'
      };
      
      const result = onboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone format', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '0855123456', // Invalid prefix
        wilaya: '16 Alger',
        address: 'Rue de la paix',
        role: 'buyer'
      };
      
      const result = onboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('rejects invalid wilaya', () => {
      const invalidData = {
        name: 'John Doe',
        phone: '0655123456',
        wilaya: '99 Invalid', // Invalid wilaya
        address: 'Rue de la paix',
        role: 'buyer'
      };
      
      const result = onboardingSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('placeOrderSchema', () => {
    it('validates correct order payload', () => {
      const validOrder = {
        cart: [
          { id: 'prod1', sellerId: 'seller1', quantity: 2 }
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '0777123456',
          wilaya: '31 Oran',
          commune: 'Bir El Djir',
          address: 'Cite 1000 logs'
        },
        deliveryMethod: 'domicile'
      };
      
      const result = placeOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });
    
    it('rejects empty cart', () => {
      const invalidOrder = {
        cart: [], // Empty cart
        shippingAddress: {
          fullName: 'John Doe',
          phone: '0777123456',
          wilaya: '31 Oran',
          commune: 'Bir El Djir',
          address: 'Cite 1000 logs'
        },
        deliveryMethod: 'domicile'
      };
      
      const result = placeOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });
  });
});
