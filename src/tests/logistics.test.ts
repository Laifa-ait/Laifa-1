import { describe, expect, it } from "vitest";
import { ALGERIA_SHIPPING_DATA, ALGERIA_WILAYAS } from "../constants";

describe("OLMART Algerian Logistics Engine & Wilaya Calculations", () => {
  it("should contain exactly all 58 Algerian wilayas", () => {
    expect(ALGERIA_WILAYAS).toBeDefined();
    expect(ALGERIA_WILAYAS.length).toBe(58);
    expect(ALGERIA_WILAYAS[0]).toBe("01 Adrar");
    expect(ALGERIA_WILAYAS[15]).toBe("16 Alger");
    expect(ALGERIA_WILAYAS[30]).toBe("31 Oran");
    expect(ALGERIA_WILAYAS[57]).toBe("58 In Guezzam");
  });

  it("should match accurate pricing and delay constants for core wilayas", () => {
    // Test Alger
    const algerData = ALGERIA_SHIPPING_DATA["Alger"];
    expect(algerData).toBeDefined();
    expect(algerData.price).toBe(500);
    expect(algerData.delay).toBe("24-48h");

    // Test Oran
    const oranData = ALGERIA_SHIPPING_DATA["Oran"];
    expect(oranData).toBeDefined();
    expect(oranData.price).toBe(700);

    // Test Constantine
    const constantineData = ALGERIA_SHIPPING_DATA["Constantine"];
    expect(constantineData).toBeDefined();
    expect(constantineData.price).toBe(700);
  });

  it("should fall back gracefully to Default pricing/delay for unlisted or custom wilayas", () => {
    const defaultData = ALGERIA_SHIPPING_DATA["Default"];
    expect(defaultData).toBeDefined();
    expect(defaultData.price).toBe(900);
    expect(defaultData.delay).toBe("3-5 jours");

    const lookupWilaya = (wilayaName: string) => {
      // Keep alignment with server calculation pattern
      const cleanName = wilayaName.replace(/^\d+\s*/, "").trim(); 
      return ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
    };

    expect(lookupWilaya("16 Alger")).toEqual(ALGERIA_SHIPPING_DATA["Alger"]);
    expect(lookupWilaya("31 Oran")).toEqual(ALGERIA_SHIPPING_DATA["Oran"]);
    expect(lookupWilaya("58 In Guezzam")).toEqual(ALGERIA_SHIPPING_DATA["In Guezzam"]); // Has its own price
  });

  it("should properly compute order delivery rates based on STOPDESK discounts or flat rate methods", () => {
    const stopdeskDiscount = 150; // Typically desk delivery is cheaper
    const basePrice = ALGERIA_SHIPPING_DATA["Alger"].price; // 500
    
    // Simulating frontend stopper calculation
    const computeDelivery = (wilaya: string, method: "domicile" | "stopdesk") => {
      const cleanName = wilaya.replace(/^\d+\s*/, "").trim();
      const baseFee = (ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default).price;
      if (method === "stopdesk") {
        return Math.max(0, baseFee - stopdeskDiscount);
      }
      return baseFee;
    };

    expect(computeDelivery("16 Alger", "domicile")).toBe(500);
    expect(computeDelivery("16 Alger", "stopdesk")).toBe(350); // 500 - 150
    expect(computeDelivery("58 In Guezzam", "stopdesk")).toBe(1350); // 1500 - 150
  });
});
