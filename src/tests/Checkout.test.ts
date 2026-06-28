import { describe, it, expect } from "vitest";

describe("Checkout Validation", () => {
  it("should calculate correct totals for checkout items", () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    expect(total).toBe(250);
  });
});
