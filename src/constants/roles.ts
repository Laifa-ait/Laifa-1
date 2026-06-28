export const ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];
