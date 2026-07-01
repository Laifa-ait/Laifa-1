import { AppTimestamp } from "../utils/date";

export type ShopStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export interface Shop {
  id: string; // usually same as seller uid
  sellerId: string;
  shopName: string;
  slogan?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;

  // Settings & Support
  supportPhone?: string;
  address?: { wilaya?: string; commune?: string; street?: string };
  avgPreparationTime?: string; // e.g. "24h", "48h", "3-5 j"
  returnPolicy?: string;

  // Legal & Verification (KYC)
  legalStatus?: string; // e.g., "Entreprise Individuelle", "EURL", "SARL"
  rcNumber?: string; // Registre de Commerce
  nifNumber?: string; // NIF
  rib?: string; // Compte bancaire ou CCP

  documents?: {
    rcDocument?: string;
    idDocument?: string;
    ribDocument?: string;
  };

  status: ShopStatus;
  rejectionReason?: string; // if REJECTED

  // Logistics
  wilaya: string;
  shippingTariffs?: Record<string, number>;

  // Finance
  walletBalance: number;
  lockedBalance: number; // Funds pending withdrawal
  commissionRate: number; // e.g., 0.10 for 10%

  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
}

// Kept for backward compatibility if used elsewhere
export interface SellerProfile extends Shop {
  uid: string;
}
