export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "buyer" | "seller" | "admin";
  isVerified: boolean;
  onboardingCompleted: boolean;
  velocitySuspended?: boolean;
  bgSuspended_reason?: string;
  createdAt?: Date | any;
  [key: string]: any;
}

export interface GuestUser {
  uid: string;
  isGuest: true;
  role: "guest";
}

export interface CartItem {
  id: string; // usually same as productId
  sellerId: string;
  name: string;
  price: number;
  promoPrice?: number;
  image: string;
  quantity: number;
  selectedVariant?: string;
  variants?: any[]; // optional details
  [key: string]: any; // fallback
}

export type UserRole = "client" | "seller" | "admin";

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  clientType?: "standard" | "vip" | "architect";
  velocitySuspended?: boolean;
  bgSuspended_reason?: string;
  trustScore?: number;
  cashbackBalance?: number;
  phone?: string;
  createdAt: any;
  updatedAt?: any;
}

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
  address?: { wilaya?: string; [key: string]: any };
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

  createdAt: any;
  updatedAt?: any;
}

export interface FlashSaleProduct {
  id: string;
  name: string;
  price: number;
  promoPrice: number;
  image: string;
  category: string;
  sellerName: string;
  sellerId: string;
  remainingStock: number;
  totalStock: number;
}

export interface FlashSaleDocument {
  campaignId: string;
  title: string;
  startTime: any;
  endTime: any;
  products: FlashSaleProduct[];
  isActive: boolean;
  updatedAt: any;
}

export interface Recommendation {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  image: string;
  category: string;
  sellerName: string;
}

export interface RecommendationDocument {
  userId?: string;
  products: Recommendation[];
  updatedAt: any;
}

export interface PremiumProduct {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  image: string;
  category: string;
  sellerName: string;
  premiumTier: "gold" | "silver" | "platinum";
}

export interface SelectionExceptionDocument {
  products: PremiumProduct[];
  updatedAt: any;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  promoPrice?: number;
  originalPrice?: number;
  freeShipping?: boolean;
  salesCount?: number;
  qualityScore?: number;
  condition?: string;
  onSale?: boolean;
  warranty?: string;
  preparationTime?: string;
  returnPolicy?: string | boolean;
  category: string;
  subcategory?: string;
  subSubCategory?: string;
  image: string;
  images?: string[];
  video?: string;
  rating: number;
  description: string;
  stock: number;

  // E-commerce logic
  sku?: string;
  tags?: string[];
  gender?: string;
  materials?: string[];
  otherMaterial?: string;
  season?: string;
  isBannerFeatured?: boolean;
  isSponsored?: boolean;
  sponsoredSince?: any;

  // Legacy fields (restoring to fix build errors)
  colors?: string[];
  sizes?: string[];
  brand?: string;
  type?: string;
  material?: string;
  attributes?: Record<string, string | string[]>;

  // Variants (Dynamic Table)
  variants?: {
    name: string; // e.g., "Rouge - S"
    stock: number;
    sku: string;
    priceDiff: number; // +/- from base price
    priceOverride?: number | string; // Absolute price overriding base price
  }[];

  // Logistics
  weight?: string | number; // kg
  dimensions?: string; // L x l x h

  sellerName?: string;
  sellerId: string;
  wilaya: string;

  status: "pending" | "approved" | "rejected" | "active" | "pending_deletion";
  rejectReason?: string;

  // Flash Sale configuration
  flashSaleActive?: boolean;
  flashPrice?: number;
  flashStartDate?: string;
  flashEndDate?: string;
  flashLimitPerCustomer?: number;
  flashQuantity?: number;

  translations?: Record<
    string,
    {
      name: string;
      description: string;
    }
  >;
  createdAt?: any;
  updatedAt?: any;
}

export interface Address {
  id: string;
  name: string;
  fullName?: string;
  phone: string;
  wilaya: string;
  commune: string;
  street: string;
  isDefault: boolean;
}

export type OrderStatus =
  | "NEW"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "RETURNING"
  | "RETURNED"
  | "REFUNDED"
  | "DISPUTE_OPEN"
  | "DISPUTE_RESOLVED"
  | "CANCELED";

export interface ReturnRequest {
  id: string;
  reason: string;
  details?: string;
  status: "pending" | "approved" | "rejected" | "received" | "completed";
  photos?: string[];
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  sellerIds: string[];
  deliveryBoyId?: string;
  deliveryBoyName?: string;

  // Break down items per seller for multi-seller orders
  items: {
    productId: string;
    variantName?: string;
    quantity: number;
    price: number;
    sellerId: string;
    productName: string;
    name?: string;
    productImage: string;
    selectedVariant?: any;
  }[];

  shippingAddress: Address;
  subtotal: number;
  shippingCost: number;
  total: number;

  status: OrderStatus;

  // Optional return/dispute data
  returnRequest?: ReturnRequest;
  disputeRequest?: {
    reason: string;
    details: string;
    createdAt: string;
  };

  // Logistics API reference
  trackingNumber?: string;
  trackingId?: string;
  deliveryProvider?: 'Yalidine' | 'Maystro' | 'KaziTour' | 'Autre';
  shippingLabelUrl?: string;

  createdAt: any;
  updatedAt?: any;
}

export type WithdrawalMethod = "VIREMENT_BANCAIRE" | "CCP_BARIDIMOB";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "PAID" | "CANCELED";

export interface WithdrawalRequest {
  id: string;
  sellerId: string;
  shopName: string;
  amount: number;
  method: WithdrawalMethod;
  accountDetails: string; // The RIB or CCP number
  status: WithdrawalStatus;

  // Uploaded by admin upon payment
  receiptUrl?: string;

  createdAt: any;
  processedAt?: any;
  paidAt?: any;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  blocks: any[];
  status: "draft" | "sent";
  stats?: {
    opened: number;
    clicked: number;
    totalSent: number;
  };
  createdAt: any;
}

export type View =
  | "shop"
  | "checkout"
  | "thank-you"
  | "product-detail"
  | "profile"
  | "orders"
  | "seller-dashboard"
  | "seller-shop"
  | "auth"
  | "admin-dashboard"
  | "complete-profile"
  | "search";
export type Language = "fr" | "ar" | "en";
// Kept for backward compatibility if used elsewhere
export interface SellerProfile extends Shop {
  uid: string;
}

// Homepage Architecture
export interface HomepageSection {
  id: string;
  name: string;
  type:
    | "top_picks"
    | "flash_sale"
    | "new_arrivals"
    | "trending"
    | "recommended"
    | "brands"
    | "sellers"
    | "collections";
  orderIndex: number;
  isActive: boolean;
  startDate?: any;
  endDate?: any;
  targetAudience?: "all" | "new" | "logged_in" | "vip";
  targetRegions?: string[];
  title?: string;
  subtitle?: string;
  icon?: string;
  layout?: "compact" | "standard" | "large" | "minimal" | "small";
  backgroundColor?: string;
  theme?: string;
  themeName?: string;
  themeImage?: string;
  margin?: string;
  columns?: number;
  limit?: number;
  tag?: string;
  category?: string;
  manualProducts?: string[]; // IDs or URLs of the products to display manually
  style?: string;
  rules?: {
    type: "manual" | "auto";
    category?: string;
    brand?: string;
    seller?: string;
    minRating?: number;
    minDiscount?: number;
    daysSinceAdded?: number;
    maxItems?: number;
  };
  createdAt?: any;
  updatedAt?: any;
  adminId?: string;
}

export interface Banner {
  id: string;
  name: string;
  type: "carousel" | "static" | "video";
  position:
    | "hero"
    | "intermediate"
    | "sidebar"
    | "footer"
    | "top_bar"
    | "popup";
  layout?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  linkedProductIds?: string[];
  backgroundColor?: string;
  textColor?: string;
  orderIndex: number;
  isActive: boolean;
  startDate?: any;
  endDate?: any;
  targetUserType?: "all" | "new" | "logged_in";
  targetRegions?: string[];
  clickCount: number;
  impressionCount: number;
  createdAt?: any;
}
