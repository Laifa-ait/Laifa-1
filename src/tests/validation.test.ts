import { describe, expect, it } from "vitest";
import { onboardingSchema, placeOrderSchema } from "../utils/validation";

describe("OLMART Data Scheme Validation & Zod Guardrails", () => {
  describe("Onboarding Schema Check", () => {
    it("should accept valid onboarding details with a proper Algerian phone format", () => {
      const validData = {
        name: "Amine Daoudi",
        phone: "0555123456", // Valid Djezzy format
        wilaya: "16 Alger",
        address: "Rue Didouche Mourad, Alger Centre",
        role: "buyer" as const,
        interests: ["Smartphone", "Mode"]
      };

      const parsed = onboardingSchema.safeParse(validData);
      expect(parsed.success).toBe(true);
    });

    it("should reject invalid Algerian phone formats and trigger clean error", () => {
      const badPhoneData = {
        name: "Yacine",
        phone: "021456789", // Landline / wrong prefix (must be 05, 06, 07)
        wilaya: "31 Oran",
        address: "Blvd de la Soummam, Oran",
        role: "buyer" as const
      };

      const parsed = onboardingSchema.safeParse(badPhoneData);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.message).toContain("Numéro de téléphone algérien invalide");
      }
    });

    it("should reject names that are too short", () => {
      const shortNameData = {
        name: "A", // too short
        phone: "0661123456",
        wilaya: "19 Sétif",
        address: "Cité 1000 logts, Sétif",
        role: "buyer" as const
      };

      const parsed = onboardingSchema.safeParse(shortNameData);
      expect(parsed.success).toBe(false);
    });

    it("should reject invalid wilayas outside the official 58 matrix", () => {
      const badWilayaData = {
        name: "Kamel",
        phone: "0770123456",
        wilaya: "99 Kabylie", // Not an official numbered wilaya
        address: "Downtown",
        role: "seller" as const
      };

      const parsed = onboardingSchema.safeParse(badWilayaData);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Place Order Schema Check", () => {
    it("should reject an empty cart", () => {
      const emptyCartData = {
        cart: [], // Forbidden to place an order on empty cart
        shippingAddress: {
          fullName: "Larbi Benmhidi",
          phone: "0550123456",
          wilaya: "23 Annaba",
          commune: "Annaba Centre",
          address: "Rue de l'ALN"
        },
        deliveryMethod: "domicile" as const,
        couponCode: null,
        useCashbackPoints: false,
        useWallet: false
      };

      const parsed = placeOrderSchema.safeParse(emptyCartData);
      expect(parsed.success).toBe(false);
    });

    it("should reject non-positive quantities in the cart items", () => {
      const badQtyCartData = {
        cart: [
          {
            id: "prod-1",
            sellerId: "vendeur-abc",
            quantity: -5, // Negative quantity
            selectedVariant: "Noir",
            name: "Casque Bluetooth"
          }
        ],
        shippingAddress: {
          fullName: "Larbi Benmhidi",
          phone: "0550123456",
          wilaya: "23 Annaba",
          commune: "Annaba Centre",
          address: "Rue de l'ALN"
        },
        deliveryMethod: "domicile" as const
      };

      const parsed = placeOrderSchema.safeParse(badQtyCartData);
      expect(parsed.success).toBe(false);
    });

    it("should accept valid cart items and valid shipping addresses complete details", () => {
      const perfectOrderData = {
        cart: [
          {
            id: "prod-1",
            sellerId: "vendeur2",
            quantity: 2,
            selectedVariant: "Argent",
            name: "Bague Homme Argent"
          }
        ],
        shippingAddress: {
          fullName: "Sidahmed Larbi",
          phone: "0663456789",
          wilaya: "13 Tlemcen",
          commune: "Mansourah",
          address: "Cité 500 Logements"
        },
        deliveryMethod: "stopdesk" as const,
        useWallet: true
      };

      const parsed = placeOrderSchema.safeParse(perfectOrderData);
      expect(parsed.success).toBe(true);
    });
  });
});
