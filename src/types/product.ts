import { AppTimestamp } from "../utils/date";

export interface CartItem {
  id: string; // usually same as productId
  sellerId: string;
  name: string;
  price: number;
  promoPrice?: number;
  image: string;
  quantity: number;
  selectedVariant?: string;
  variants?: Record<string, unknown>[]; // optional details
  sellerName?: string;
  shopName?: string;
  addedAt?: AppTimestamp;
  flashSaleActive?: boolean;
  flashPrice?: number;
  flashEndDate?: string;
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
  startTime?: AppTimestamp;
  endTime?: AppTimestamp;
  products: FlashSaleProduct[];
  isActive: boolean;
  updatedAt?: AppTimestamp;
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
  updatedAt?: AppTimestamp;
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
  updatedAt?: AppTimestamp;
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
  sponsoredSince?: AppTimestamp;
  energyClass?: "A" | "B" | "C" | "D" | "E" | "F" | "G";

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
  stats?: {
    reviewCount: number;
    averageRating: number;
    totalRatingSum: number;
  };

  translations?: Record<
    string,
    {
      name: string;
      description: string;
    }
  >;
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
}
