import { describe, it, expect } from "vitest";
import { calculateOrderCommission, Order } from "../utils/orderCalculations";

describe("Order Calculations", () => {
  it("should calculate correct commission and net payout for an order with multiple items", () => {
    const order: Order = {
      total: 1000,
      items: [
        { sellerId: "seller1", price: 200, quantity: 2 }, // 400 total
        { sellerId: "seller2", price: 300, quantity: 2 }, // 600 total
      ]
    };

    const sellerRates = {
      "seller1": 10, // 10%
      "seller2": 20, // 20%
    };

    const globalRate = 15;

    const { orderCommission, netPayout } = calculateOrderCommission(order, sellerRates, globalRate);

    // seller1: 400 * 10% = 40
    // seller2: 600 * 20% = 120
    // total commission = 160
    expect(orderCommission).toBe(160);
    expect(netPayout).toBe(1000 - 160);
  });

  it("should use global rate as fallback when seller rate is missing", () => {
    const order: Order = {
      total: 1000,
      items: [
        { sellerId: "seller3", price: 500, quantity: 2 }, // 1000 total
      ]
    };

    const sellerRates = {
      "seller1": 10,
    };

    const globalRate = 15; // 15%

    const { orderCommission, netPayout } = calculateOrderCommission(order, sellerRates, globalRate);

    // seller3: 1000 * 15% = 150
    expect(orderCommission).toBe(150);
    expect(netPayout).toBe(1000 - 150);
  });
});
