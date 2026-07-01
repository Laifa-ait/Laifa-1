import { AppTimestamp } from "../utils/date";
import { UserRole } from "../constants/roles";

export type { UserRole };

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isVerified: boolean;
  onboardingCompleted: boolean;
  velocitySuspended?: boolean;
  bgSuspended_reason?: string;
  createdAt?: AppTimestamp;
  buyerType?: "standard" | "vip" | "architect";
  isVip?: boolean;
  vip?: boolean;
  cashbackBalance?: number;
  
  // Mixed-in Seller & Shop fields
  status?: string;
  shopName?: string;
  shopLogo?: string;
  logoUrl?: string;  
  bannerUrl?: string;
  shopDescription?: string;
  name?: string;
  trustScore?: number;
  rating?: number;
  commissionRate?: number;
  wilaya?: string;
  shippingTariffs?: Record<string, number>;
  storeName?: string;
  brandName?: string;
  designStyle?: string;
  portfolioUrl?: string;
  brandStory?: string;
  rcNumber?: string;
  nifNumber?: string;
  rib?: string;
  legalStatus?: string;
  walletBalance?: number;
  lockedBalance?: number;
  documents?: {
    rcDocument?: string;
    idDocument?: string;
    ribDocument?: string;
    portfolioDocument?: string;
    fileRC?: string;
    fileId?: string;
    fileRib?: string;
  };
}

export interface GuestUser {
  uid: string;
  isGuest: true;
  role: "guest";
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  buyerType?: "standard" | "vip" | "architect";
  velocitySuspended?: boolean;
  bgSuspended_reason?: string;
  trustScore?: number;
  cashbackBalance?: number;
  phone?: string;
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
}
