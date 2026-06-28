import { describe, it, expect } from 'vitest';
import { ROLES } from '../constants/roles';

describe('ROLES', () => {
  it('should have buyer, seller, admin', () => {
    expect(ROLES.BUYER).toBe('buyer');
    expect(ROLES.SELLER).toBe('seller');
    expect(ROLES.ADMIN).toBe('admin');
  });
});
