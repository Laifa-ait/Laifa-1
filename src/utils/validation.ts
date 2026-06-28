import { z } from "zod";
import { ALGERIA_WILAYAS } from "../constants";

// 1. Onboarding Validation Schema
export const onboardingSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères.").max(100, "Nom trop long."),
  phone: z.string().regex(/^(05|06|07)[0-9]{8}$/, "Numéro de téléphone algérien invalide (ex: 0555123456)."),
  wilaya: z.string().refine((val) => ALGERIA_WILAYAS.includes(val), {
    message: "Wilaya invalide. Veuillez sélectionner une wilaya parmi les 58 wilayas d'Algérie."
  }),
  address: z.string().min(5, "L'adresse doit être plus précise (min 5 caractères).").max(300),
  role: z.enum(["buyer", "seller"]),
  interests: z.array(z.string()).optional().default([])
});

// 2. Cart Item Validation Schema (inside Orders)
const cartItemSchema = z.object({
  id: z.string().min(1, "ID du produit requis."),
  sellerId: z.string().min(1, "ID du vendeur requis."),
  quantity: z.number().int().positive("La quantité doit être un entier positif supérieur à 0."),
  selectedVariant: z.string().nullable().optional(),
  name: z.string().optional(),
  price: z.any().optional(),
  promoPrice: z.any().optional()
});

// 3. Address Validation Schema
const shippingAddressSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis.").max(100),
  phone: z.string().regex(/^(05|06|07)[0-9]{8}$/, "Numéro de téléphone algérien invalide."),
  wilaya: z.string().refine((val) => ALGERIA_WILAYAS.includes(val), {
    message: "Wilaya de livraison invalide."
  }),
  commune: z.string().min(2, "Commune requise."),
  address: z.string().min(5, "Adresse de livraison précise requise.")
});

// 4. Place Order Validation Schema
export const placeOrderSchema = z.object({
  cart: z.array(cartItemSchema).min(1, "Votre panier doit contenir au moins un article."),
  shippingAddress: shippingAddressSchema,
  deliveryMethod: z.enum(["domicile", "stopdesk"]),
  couponCode: z.string().nullable().optional(),
  useCashbackPoints: z.boolean().optional().default(false),
  useWallet: z.boolean().optional().default(false),
  walletAmount: z.number().min(0).optional(),
  idempotencyKey: z.string().optional()
});
