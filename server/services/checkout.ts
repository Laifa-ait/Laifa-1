import { ALGERIA_SHIPPING_DATA } from "../../src/constants";

export interface CheckoutCartItem {
  id: string;
  price: number;
  promoPrice?: number;
  quantity: number;
  sellerId: string;
  name: string;
}

export interface CheckoutCalculationInput {
  cart: CheckoutCartItem[];
  userWilaya: string;
  deliveryMethod: "domicile" | "point_relais" | string;
  matrixFees?: Record<string, Record<string, number>>;
  dynWilayaFees?: Record<string, number>;
  globalBaseFee?: number;
  globalCommissionRate?: number;
  sellerRates?: Record<string, number>; // sellerId -> rate %
  sellerWilayas?: Record<string, string>; // sellerId -> wilaya
}

export interface CheckoutCalculationResult {
  subtotal: number;
  totalShipping: number;
  totalCommission: number;
  grandTotal: number;
  sellerDetails: Record<string, {
    subtotal: number;
    shippingCost: number;
    commissionAmount: number;
    grandTotal: number;
  }>;
}

/**
 * Server-authoritative checkout calculator.
 * Holds the Algeria 58 Wilayas shipping matrix and calculates precise shipping fees and Olmart commissions.
 */
export function calculateCheckoutServerSide(input: CheckoutCalculationInput): CheckoutCalculationResult {
  const {
    cart,
    userWilaya,
    deliveryMethod,
    matrixFees = {},
    dynWilayaFees = {},
    globalBaseFee = 600,
    globalCommissionRate = 10,
    sellerRates = {},
    sellerWilayas = {}
  } = input;

  const cleanUserWilaya = userWilaya ? userWilaya.replace(/^\d+\s*-\s*/, "").trim() : "";

  let subtotal = 0;
  let totalShipping = 0;
  let totalCommission = 0;

  const sellerDetails: Record<string, {
    subtotal: number;
    shippingCost: number;
    commissionAmount: number;
    grandTotal: number;
  }> = {};

  // Group by seller
  const cartBySeller: Record<string, CheckoutCartItem[]> = {};
  for (const item of cart) {
    const sId = item.sellerId || "default_seller";
    if (!cartBySeller[sId]) {
      cartBySeller[sId] = [];
    }
    cartBySeller[sId].push(item);
  }

  for (const [sellerId, items] of Object.entries(cartBySeller)) {
    let sellerSubtotal = 0;
    for (const item of items) {
      const price = item.promoPrice || item.price || 0;
      sellerSubtotal += price * item.quantity;
    }

    subtotal += sellerSubtotal;

    // Shipping cost calculation for this seller
    let sellerShippingCost = 0;
    const sellerWilaya = sellerWilayas[sellerId] || "16 Alger"; // fallback to Alger
    const cleanSellerWilaya = sellerWilaya.replace(/^\d+\s*-\s*/, "").trim();

    if (userWilaya && sellerWilaya) {
      let wFee: number | undefined = undefined;

      // Check matrix fees
      if (matrixFees[sellerWilaya] && matrixFees[sellerWilaya][userWilaya] !== undefined) {
        wFee = matrixFees[sellerWilaya][userWilaya];
      } else if (matrixFees[sellerWilaya] && matrixFees[sellerWilaya][cleanUserWilaya] !== undefined) {
        wFee = matrixFees[sellerWilaya][cleanUserWilaya];
      } else if (matrixFees["DEFAULT_ORIGIN"] && matrixFees["DEFAULT_ORIGIN"][userWilaya] !== undefined) {
        wFee = matrixFees["DEFAULT_ORIGIN"][userWilaya];
      } else if (matrixFees["DEFAULT_ORIGIN"] && matrixFees["DEFAULT_ORIGIN"][cleanUserWilaya] !== undefined) {
        wFee = matrixFees["DEFAULT_ORIGIN"][cleanUserWilaya];
      } else if (dynWilayaFees[userWilaya] !== undefined) {
        wFee = dynWilayaFees[userWilaya];
      } else if (dynWilayaFees[cleanUserWilaya] !== undefined) {
        wFee = dynWilayaFees[cleanUserWilaya];
      }

      let rawMethodPrice = wFee !== undefined ? wFee : globalBaseFee;
      if (wFee === undefined && ALGERIA_SHIPPING_DATA[cleanUserWilaya]) {
        rawMethodPrice = ALGERIA_SHIPPING_DATA[cleanUserWilaya].price;
      }

      // Relay point gets 200 DA discount, min 400 DA
      const methodPrice = deliveryMethod === "point_relais" ? Math.max(400, rawMethodPrice - 200) : rawMethodPrice;
      sellerShippingCost = Math.round(methodPrice / 10) * 10;
    }

    totalShipping += sellerShippingCost;

    // Commission rate
    const commissionRate = sellerRates[sellerId] ?? globalCommissionRate;
    const commissionAmount = (sellerSubtotal * commissionRate) / 100;
    totalCommission += commissionAmount;

    const sellerGrandTotal = sellerSubtotal + sellerShippingCost;

    sellerDetails[sellerId] = {
      subtotal: sellerSubtotal,
      shippingCost: sellerShippingCost,
      commissionAmount,
      grandTotal: sellerGrandTotal,
    };
  }

  const grandTotal = subtotal + totalShipping;

  return {
    subtotal,
    totalShipping,
    totalCommission,
    grandTotal,
    sellerDetails,
  };
}
