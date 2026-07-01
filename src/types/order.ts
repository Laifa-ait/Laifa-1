import { AppTimestamp } from "../utils/date";

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

export interface CarrierTrackingEvent {
  event_id: string;
  status_key: string;
  raw_status: string;
  severity: "normal" | "success" | "warning" | "error" | string;
  timestamp: AppTimestamp; // Can be string, number, or Firestore Timestamp
  location: string;
  reason: string;
}

export interface ReturnRequest {
  id: string;
  reason: string;
  details?: string;
  status: "pending" | "approved" | "rejected" | "received" | "completed";
  photos?: string[];
  createdAt: AppTimestamp;
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
    selectedVariant?: string;
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
    createdAt: AppTimestamp;
  };

  // Logistics API reference
  trackingNumber?: string;
  trackingId?: string;
  carrier_tracking_events?: CarrierTrackingEvent[];
  deliveryProvider?: 'Yalidine' | 'Maystro' | 'KaziTour' | 'Autre';
  shippingLabelUrl?: string;

  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
}
