import { AppTimestamp } from "../utils/date";

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
  startDate?: AppTimestamp;
  endDate?: AppTimestamp;
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
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
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
  startDate?: AppTimestamp;
  endDate?: AppTimestamp;
  targetUserType?: "all" | "new" | "logged_in";
  targetRegions?: string[];
  clickCount: number;
  impressionCount: number;
  createdAt?: AppTimestamp;
}
