import { Request, Response } from 'express';
import { UserProfile, CartItem, Product, Shop, Order, CarrierTrackingEvent, Address } from "../../src/types";
import { firestore } from "firebase-admin";

export interface AuthenticatedRequest extends Request { 
  user?: UserProfile | { uid: string; email?: string; role?: string; [key: string]: unknown }; 
  file?: any; 
  files?: any; 
}

import { Router } from "express";
import { admin, db } from "../services/firebase-admin";
import { authenticateToken, authorizeSeller } from "../middlewares/auth";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../../src/constants";
import { placeOrderSchema } from "../../src/utils/validation";
import { checkSellerVelocityLimit } from "../utils/velocity";
import { orderBreaker } from "../../src/utils/circuitBreaker";
import { calculateOrderCommission } from "../../src/utils/orderCalculations";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendLowStockEmail = async (sellerEmail: string, message: string) => {
   try {
     if (!process.env.SMTP_USER) {
        console.log("Mock Email Sent (SMTP not configured). To:", sellerEmail, "Message:", message);
        return;
     }
     await transporter.sendMail({
       from: '"Olmart" <noreply@olmart.dz>',
       to: sellerEmail,
       subject: "⚠️ Alerte Stock Critique - Olmart",
       text: message
     });
   } catch (err) {
     console.error("Failed to send stock alert email", err);
   }
};

const router = Router();

router.post("/place-order", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Non authentifié" });
  // Schema validation
  const validationResult = placeOrderSchema.safeParse(req.body);
  if (!validationResult.success) {
    const formattedErrors = validationResult.error.issues.map(err => ({
      path: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({ 
      error: "Données de la commande invalides ou corrompues.", 
      details: formattedErrors 
    });
  }
  
  const { cart, shippingAddress, couponCode, useCashbackPoints, useWallet, deliveryMethod, idempotencyKey } = validationResult.data;
  const userId = req.user.uid;

  const sellerIdsSet = new Set<string>();
  try {
    let settingsDoc;
    let commDoc;
    let dynWilayaFees: Record<string, number> = {};
    let matrixFees: Record<string, Record<string, number>> = {};
    let globalBaseFee = 600;
    let globalCommissionRate = 10;
    try {
      settingsDoc = await db.collection("settings").doc("shipping").get();
      if (settingsDoc && settingsDoc.exists) {
        const d = settingsDoc.data() || {};
        dynWilayaFees = d.wilayaFees || {};
        matrixFees = d.matrixFees || {};
        globalBaseFee = d.globalBaseFee || 600;
      }
      
      commDoc = await db.collection("settings").doc("commission").get();
      if (commDoc && commDoc.exists) {
         globalCommissionRate = commDoc.data()?.globalRate ?? 10;
      }
    } catch(err) {
      console.warn("Failed to fetch global settings, using fallback", err);
    }

    const uniqueProductIds: string[] = Array.from(new Set(cart.map((item: any) => item.id as string)));
    if (uniqueProductIds.length === 0) throw new Error("Panier vide.");

    let sellerIdsArray: string[] = [];
    const shopSnapshots = new Map<string, Partial<Shop>>();
    const emailAlerts: {sellerId: string, message: string}[] = [];

    const result = await orderBreaker.execute(() => db.runTransaction(async (t: firestore.Transaction) => {
      emailAlerts.length = 0; // Clear on retry
      
      if (idempotencyKey) {
        const idempotencyQuery = await t.get(
          db.collection("orders")
            .where("idempotencyKey", "==", idempotencyKey)
            .where("userId", "==", userId)
            .limit(1)
        );
        if (!idempotencyQuery.empty) {
          const existingDoc = idempotencyQuery.docs[0];
          return {
            alreadyProcessed: true,
            orderId: existingDoc.id,
            status: "already_processed",
            message: "Commande déjà traitée"
          };
        }
      }

      // --- ÉTAPE 1 : LECTURES TRANSACTIONNELLES PURES ---
      let couponDoc: firestore.QueryDocumentSnapshot | null = null;
      
      const productSnaps = new Map<string, firestore.DocumentSnapshot>();
      const productRefs = new Map<string, firestore.DocumentReference>();

      const refs = uniqueProductIds.map(pId => db.collection("products").doc(pId));
      const snaps = await t.getAll(...refs);
      
      snaps.forEach((productSnap: firestore.DocumentSnapshot, idx: number) => {
        const pId = uniqueProductIds[idx];
        if (!productSnap.exists) {
          throw new Error(`Produit ${pId} introuvable.`);
        }
        productSnaps.set(pId, productSnap);
        productRefs.set(pId, refs[idx]);

        const sellerId = productSnap.data()?.sellerId;
        if (sellerId) sellerIdsSet.add(sellerId);
      });

      sellerIdsArray = Array.from(sellerIdsSet);
      if (sellerIdsArray.length > 0) {
        const sellerRefs = sellerIdsArray.map(sId => db.collection("users").doc(sId));
        const sellerSnaps = await t.getAll(...sellerRefs);
        
        sellerSnaps.forEach((shopSnap: firestore.DocumentSnapshot, idx: number) => {
          const sellerId = sellerIdsArray[idx];
          if (shopSnap.exists) {
            const sd = shopSnap.data() as Partial<Shop>;
            if (sd && ((sd as any).isActive === false || (sd as any).is_active === false || (sd as any).velocitySuspended)) {
               throw new Error(`La boutique "${sd.shopName || (sd as any).displayName || sellerId}" est fermée temporairement (capacité de commande maximale atteinte).`);
            }
            shopSnapshots.set(sellerId, sd);
          } else {
            shopSnapshots.set(sellerId, {});
          }
        });
      }

      // Reconstruct productDocs array cleanly for downstream seller splits
      const productDocs: { cartItem: any; productSnap: any; productRef: any }[] = [];
      for (const cartItem of cart) {
        if (!cartItem.id || !cartItem.quantity || typeof cartItem.quantity !== 'number' || !Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
          throw new Error(`Article invalide fourni.`);
        }
        const snap = productSnaps.get(cartItem.id);
        const ref = productRefs.get(cartItem.id);
        productDocs.push({ cartItem, productSnap: snap as any, productRef: ref as any });
      }

      // 1.3 Lire les donnees de l'acheteur
      const userRef = db.collection("users").doc(userId);
      const userSnap = await t.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : {};

      // 1.4 Lire le coupon si fourni
      if (couponCode) {
        const couponQuery = await t.get(db.collection("coupons").where("code", "==", couponCode.toUpperCase()));
        if (!couponQuery.empty) {
          couponDoc = couponQuery.docs[0];
        } else {
          throw new Error("Code promo invalide.");
        }
      }

      // --- ÉTAPE 2 : LOGIQUE MÉTIER ---
      let subtotal = 0;
      const orderItems: { id: string; name: string | undefined; price: number; image: string | undefined; quantity: number; sellerId: string | undefined; selectedVariant: string | null }[] = [];
      
      // Map to track running mutable state of products inside this transaction
      const productInMemoryStates = new Map<string, Partial<Product>>();
      for (const [pId, snap] of productSnaps.entries()) {
        productInMemoryStates.set(pId, JSON.parse(JSON.stringify(snap.data())));
      }

      for (const { cartItem, productSnap } of productDocs) {
        const productId = productSnap.id;
        const productData = productInMemoryStates.get(productId)!;

        let targetPrice = productData.promoPrice || productData.price || 0;
        let availableStock = productData.stock || 0;

        let variantInfo: NonNullable<Product['variants']>[number] | null = null;
        if (cartItem.selectedVariant && productData.variants && Array.isArray(productData.variants)) {
           const variant = productData.variants.find((v: NonNullable<Product['variants']>[number]) => v.name === cartItem.selectedVariant);
           if (!variant) {
             throw new Error(`Variante ${cartItem.selectedVariant} introuvable pour ${productData.name}.`);
           }
           availableStock = Number(variant.stock) || 0;
           if (variant) {
              if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                 targetPrice = Number(variant.priceOverride);
              } else if (variant.priceDiff) {
                 targetPrice += Number(variant.priceDiff);
              }
           }
           variantInfo = variant;
        }

        // PRICE CONFLICT CHECK
        if (typeof (cartItem as any).priceSeen === 'number' && (cartItem as any).priceSeen !== targetPrice) {
            const conflictErr = new Error(`Le prix de l'article "${productData.name}" a été mis à jour par le vendeur (de ${(cartItem as any).priceSeen} DA à ${targetPrice} DA).`) as Error & { code?: string };
            conflictErr.code = 'PRICE_CONFLICT';
            throw conflictErr;
        }

        if (availableStock < cartItem.quantity) {
          throw new Error(`Stock insuffisant pour ${productData.name} (Reste: ${availableStock}).`);
        }

        subtotal += targetPrice * cartItem.quantity;
        const sellerId = productData.sellerId;

        orderItems.push({
          id: productId,
          name: productData.name,
          price: targetPrice,
          image: productData.image,
          quantity: cartItem.quantity,
          sellerId: sellerId,
          selectedVariant: cartItem.selectedVariant || null
        });

        // Mutate the variant stock in memory
        if (variantInfo) {
           productData.variants = productData.variants!.map((v: NonNullable<Product['variants']>[number]) => {
              if (v.name === variantInfo!.name) {
                 return { ...v, stock: Number(v.stock) - cartItem.quantity };
              }
              return v;
           });
           (productData as any).hasOutOfStockVariants = productData.variants.some((v: NonNullable<Product['variants']>[number]) => Math.max(0, Number(v.stock) || 0) <= 0);
           productData.stock = productData.variants.reduce((acc: number, curr: NonNullable<Product['variants']>[number]) => acc + Math.max(0, Number(curr.stock) || 0), 0);
        } else {
           productData.stock = (productData.stock || 0) - cartItem.quantity;
        }
      }

      // Generate unified consolidated stock updates after iterating all items
      const stockUpdates: { ref: firestore.DocumentReference; update: any }[] = [];
      for (const pId of uniqueProductIds) {
        const finalData = productInMemoryStates.get(pId)!;
        const ref = productRefs.get(pId)!;
        const stockThreshold = Number((finalData as any).lowStockAlert) || 5;
        
        let needsAlert = false;
        let alertMessage = "";
        
        if (finalData.variants) {
           const lowVariants = finalData.variants.filter((v: NonNullable<Product['variants']>[number]) => (v as any).isActive !== false && Number(v.stock) <= stockThreshold);
           if (lowVariants.length > 0) {
              needsAlert = true;
              alertMessage = `Alerte: La(es) variante(s) ${lowVariants.map((v: NonNullable<Product['variants']>[number])=>v.name).join(', ')} du produit "${finalData.name}" a atteint le stock critique (<= ${stockThreshold}).`;
           }
           stockUpdates.push({ ref, update: { 
              variants: finalData.variants,
              hasOutOfStockVariants: (finalData as any).hasOutOfStockVariants,
              stock: finalData.stock
           }});
        } else {
           if ((finalData.stock ?? 0) <= stockThreshold) {
              needsAlert = true;
              alertMessage = `Alerte: Le produit "${finalData.name}" a atteint le stock critique (${finalData.stock ?? 0} restants, seuil: ${stockThreshold}).`;
           }
           stockUpdates.push({ ref, update: { 
              stock: finalData.stock
           }});
        }

        if (needsAlert) {
           emailAlerts.push({ sellerId: finalData.sellerId || "", message: alertMessage });
           
           const alertRef = db.collection("internal_notifications").doc();
           t.set(alertRef, {
              type: "LOW_STOCK_ALERT",
              title: "⚠️ Stock Critique",
              message: alertMessage,
              sellerId: finalData.sellerId,
              productId: pId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
              priority: "high"
           });
           
           // Mock trigger for push/email
           const pushRef = db.collection("push_queue").doc();
           t.set(pushRef, {
              userId: finalData.sellerId,
              title: "⚠️ Stock Critique",
              body: alertMessage,
              type: "inventory",
              status: "pending",
              createdAt: admin.firestore.FieldValue.serverTimestamp()
           });
        }
      }

      // 2.2 Validation du Coupon
      let discountAmount = 0;
      let appliedCouponData: firestore.DocumentData | null = null;

      if (couponDoc) {
        appliedCouponData = couponDoc.data();
        if (!appliedCouponData.isActive) throw new Error("Code promo inactif.");
        
        let expiryDateObj: Date | null = null;
        if (appliedCouponData.expiresAt) {
          if (typeof appliedCouponData.expiresAt.toDate === 'function') {
            expiryDateObj = appliedCouponData.expiresAt.toDate();
          } else if (appliedCouponData.expiresAt._seconds) {
            expiryDateObj = new Date(appliedCouponData.expiresAt._seconds * 1000);
          } else if (appliedCouponData.expiresAt.seconds) {
            expiryDateObj = new Date(appliedCouponData.expiresAt.seconds * 1000);
          } else {
            expiryDateObj = new Date(appliedCouponData.expiresAt);
          }
        } else if (appliedCouponData.expiryDate) {
           expiryDateObj = new Date(appliedCouponData.expiryDate);
        }

        if (expiryDateObj && expiryDateObj <= new Date()) throw new Error("Code promo expiré.");

        if (subtotal < (appliedCouponData.minOrderValue || 0)) throw new Error(`Minimum d'achat: ${appliedCouponData.minOrderValue}`);
        if (appliedCouponData.usageLimit && (appliedCouponData.usageCount || 0) >= appliedCouponData.usageLimit) {
           throw new Error("Limite d'utilisation du code pointe.");
        }
        
        // Security constraint against coupon drainage
        const usedByArray = appliedCouponData.usedBy || [];
        if (usedByArray.includes(userId)) {
           throw new Error("Vous avez déjà utilisé ce code promo.");
        }

        if (appliedCouponData.discountType === 'percent') {
          discountAmount = (subtotal * appliedCouponData.discountValue) / 100;
          if (appliedCouponData.maxDiscount && discountAmount > appliedCouponData.maxDiscount) {
             discountAmount = appliedCouponData.maxDiscount;
          }
        } else {
          discountAmount = Math.min(appliedCouponData.discountValue, subtotal);
        }
      }

      // Calculate applied loyalty points (cashback points)
      let cashbackApplied = 0;
      const MAX_CASHBACK_PERCENT = 50; // 50% maximum du sous-total
      if (useCashbackPoints) {
         const userPoints = userData?.cashbackBalance || 0;
         const maxCashbackAllowed = Math.floor((subtotal * MAX_CASHBACK_PERCENT) / 100);
         cashbackApplied = Math.min(userPoints, Math.max(0, subtotal - discountAmount), maxCashbackAllowed);
      }

      // 2.3 Calcul des Frais de Livraison et division en sous-commandes
      const userWilaya = shippingAddress.wilaya;
      const sellerGroups = new Map<string, { cartItem: CartItem; productSnap: firestore.DocumentSnapshot; productRef: firestore.DocumentReference }[]>();
      for (const item of productDocs) {
        const sId = item.productSnap?.data()?.sellerId || "";
        if (!sellerGroups.has(sId)) {
          sellerGroups.set(sId, []);
        }
        sellerGroups.get(sId)!.push(item);
      }

      const parentOrderId = db.collection("orders").doc().id;
      const subOrdersToCreate: { ref: firestore.DocumentReference; data: any }[] = [];
      // sellerIdsArray is already defined and loaded above
      let remainingDiscount = discountAmount;
      let groupIndex = 0;
      let totalShipping = 0;

      // Pre-calculate pro-rata discount breakdown dictionary across all sellers
      const discountBreakdownMap: Record<string, number> = {};
      const cashbackBreakdownMap: Record<string, number> = {};
      let remainingBreakdownDiscount = discountAmount;
      let remainingBreakdownCashback = cashbackApplied;
      let breakdownIdx = 0;
      for (const sId of sellerIdsArray) {
         const items = sellerGroups.get(sId) || [];
         let sSub = 0;
         for (const { cartItem, productSnap } of items) {
           const pData = productSnap?.data() || {};
           let targetP = pData.promoPrice || pData.price;
           if (cartItem.selectedVariant && pData.variants && Array.isArray(pData.variants)) {
              const variant = pData.variants.find((v: NonNullable<Product['variants']>[number]) => v.name === cartItem.selectedVariant);
              if (variant) {
                 if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                    targetP = Number(variant.priceOverride);
                 } else if (variant.priceDiff) {
                    targetP += parseInt(String(variant.priceDiff));
                 }
              }
           }
           sSub += targetP * cartItem.quantity;
         }
         let sDisc = 0;
         if (discountAmount > 0 && subtotal > 0) {
            if (breakdownIdx === sellerIdsArray.length - 1) {
               sDisc = remainingBreakdownDiscount;
            } else {
               sDisc = Math.round(discountAmount * (sSub / subtotal));
               remainingBreakdownDiscount -= sDisc;
            }
         }
         discountBreakdownMap[sId] = sDisc;

         let sCash = 0;
         if (cashbackApplied > 0 && subtotal > 0) {
            if (breakdownIdx === sellerIdsArray.length - 1) {
               sCash = remainingBreakdownCashback;
            } else {
               sCash = Math.round(cashbackApplied * (sSub / subtotal));
               remainingBreakdownCashback -= sCash;
            }
         }
         cashbackBreakdownMap[sId] = sCash;

         breakdownIdx++;
      }

      for (const sellerId of sellerIdsArray) {
        const groupItems = sellerGroups.get(sellerId) || [];
        const shop = shopSnapshots.get(sellerId);
        
        let sellerSubtotal = 0;
        const sellerOrderItems: { id: string; name: string | undefined; price: number; image: string | undefined; quantity: number; sellerId: string | undefined; sellerName: string | undefined; selectedVariant: string | null }[] = [];
        
        for (const { cartItem, productSnap } of groupItems) {
           const productData = productSnap.data() as Product;
           let targetPrice = productData.promoPrice || productData.price;
           
           if (cartItem.selectedVariant && productData.variants && Array.isArray(productData.variants)) {
              const variant = productData.variants.find((v: NonNullable<Product['variants']>[number]) => v.name === cartItem.selectedVariant);
              if (variant) {
                 if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                    targetPrice = Number(variant.priceOverride);
                 } else if (variant.priceDiff) {
                    targetPrice += parseInt(String(variant.priceDiff));
                 }
              }
           }
           
           sellerSubtotal += targetPrice * cartItem.quantity;
           sellerOrderItems.push({
             id: productSnap.id,
             name: productData.name,
             price: targetPrice,
             image: productData.image,
             quantity: cartItem.quantity,
             sellerId: sellerId,
             sellerName: shop ? ((shop as any).name || shop.shopName || "Boutique") : "Boutique",
             selectedVariant: cartItem.selectedVariant || null
           });
        }

        let sellerShippingCost = 0; 
        if (shop && shop.shippingTariffs && shop.shippingTariffs[userWilaya] != null) {
           sellerShippingCost = Number(shop.shippingTariffs[userWilaya]);
        } else {
            const sellerWilaya = shop?.address?.wilaya || "DEFAULT_ORIGIN";
            const cleanWilaya = userWilaya.replace(/^\d+\s*-\s*/, '').trim();
            
            let wFee: number | undefined = undefined;
            // First check matrix for specific seller origin
            if (matrixFees[sellerWilaya] && matrixFees[sellerWilaya][userWilaya] !== undefined) {
               wFee = matrixFees[sellerWilaya][userWilaya];
            } else if (matrixFees[sellerWilaya] && matrixFees[sellerWilaya][cleanWilaya] !== undefined) {
               wFee = matrixFees[sellerWilaya][cleanWilaya];
            } else if (matrixFees["DEFAULT_ORIGIN"] && matrixFees["DEFAULT_ORIGIN"][userWilaya] !== undefined) {
               wFee = matrixFees["DEFAULT_ORIGIN"][userWilaya];
            } else if (matrixFees["DEFAULT_ORIGIN"] && matrixFees["DEFAULT_ORIGIN"][cleanWilaya] !== undefined) {
               wFee = matrixFees["DEFAULT_ORIGIN"][cleanWilaya];
            } else if (dynWilayaFees[userWilaya] !== undefined) {
               wFee = dynWilayaFees[userWilaya];
            } else if (dynWilayaFees[cleanWilaya] !== undefined) {
               wFee = dynWilayaFees[cleanWilaya];
            }
            
            let rawMethodPrice = wFee !== undefined ? wFee : globalBaseFee;
            if (wFee === undefined && ALGERIA_SHIPPING_DATA[cleanWilaya]) {
               rawMethodPrice = ALGERIA_SHIPPING_DATA[cleanWilaya].price;
            }
           const methodPrice = req.body.deliveryMethod === 'domicile' ? rawMethodPrice : (Math.max(400, rawMethodPrice - 200));
           sellerShippingCost = Math.round(methodPrice / 10) * 10;
        }
        totalShipping += sellerShippingCost;

        const sellerDiscount = discountBreakdownMap[sellerId] || 0;
        const sellerCashbackApp = cashbackBreakdownMap[sellerId] || 0;
        const sellerGrandTotal = Math.max(0, sellerSubtotal - sellerDiscount - sellerCashbackApp) + sellerShippingCost;
        
        // 100% Server-side Commission calculation
        const commissionRate = shop?.commissionRate ?? globalCommissionRate;
        const commissionAmount = (sellerSubtotal * commissionRate) / 100;
        const sellerEarned = sellerGrandTotal - commissionAmount;

        const subOrderRef = db.collection("orders").doc();
        const subOrderData = {
          parentOrderId,
          userId,
          items: sellerOrderItems,
          subtotal: sellerSubtotal,
          shippingTotal: sellerShippingCost,
          discountAmount: sellerDiscount,
          cashbackApplied: sellerCashbackApp,
          couponCode: appliedCouponData ? appliedCouponData.code : null,
          total: sellerGrandTotal,
          commissionRateApplied: commissionRate,
          commissionAmount: commissionAmount,
          sellerEarned: sellerEarned,
          status: 'pending',
          paymentStatus: 'unpaid',
          shippingAddress,
          billingAddress: req.body.billingAddress || shippingAddress,
          sellerIds: [sellerId],
          shippingBreakdown: { [sellerId]: sellerShippingCost },
          discountBreakdown: discountBreakdownMap,
          idempotencyKey: idempotencyKey || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        subOrdersToCreate.push({ ref: subOrderRef, data: subOrderData });
        groupIndex++;
      }

      const grandTotalBeforeWallet = Math.max(0, subtotal - discountAmount - cashbackApplied) + totalShipping;
      
      let walletDeducted = 0;
      if (useWallet) {
         const walletBalanceAvailable = userData?.walletBalance || 0;
         walletDeducted = Math.min(walletBalanceAvailable, grandTotalBeforeWallet);
      }
      const codAmount = grandTotalBeforeWallet - walletDeducted;

      // Split walletDeducted pro-rata among sub-orders
      let remainingWalletToDeduct = walletDeducted;
      let sIdx = 0;
      for (const item of subOrdersToCreate) {
        let sellerWalletDeducted = 0;
        if (walletDeducted > 0 && grandTotalBeforeWallet > 0) {
           if (sIdx === subOrdersToCreate.length - 1) {
              sellerWalletDeducted = remainingWalletToDeduct;
           } else {
              sellerWalletDeducted = Math.round(walletDeducted * (item.data.total / grandTotalBeforeWallet));
              remainingWalletToDeduct -= sellerWalletDeducted;
           }
        }
        item.data.walletDeducted = sellerWalletDeducted;
        item.data.codAmount = item.data.total - sellerWalletDeducted;
        item.data.paymentMethod = sellerWalletDeducted === item.data.total ? 'wallet' : (sellerWalletDeducted > 0 ? 'split_wallet_cod' : 'cod');
        item.data.paymentStatus = item.data.codAmount === 0 ? 'paid' : 'unpaid';
        sIdx++;
      }

      // --- ÉTAPE 3 : ÉCRITURES PURES ---
      
      // 3.1 Mise à jour des stocks
      for (const req of stockUpdates) {
        t.update(req.ref, req.update);
      }

      // 3.2 Utilisation du coupon
      if (couponDoc) {
        t.update(couponDoc.ref, { 
          usageCount: admin.firestore.FieldValue.increment(1),
          usedBy: admin.firestore.FieldValue.arrayUnion(userId)
        });
      }

      // 3.3 Utilisation du cashback de l'acheteur
      if (cashbackApplied > 0) {
         t.update(userRef, {
            cashbackBalance: admin.firestore.FieldValue.increment(-cashbackApplied)
         });
      }

      // 3.4 Utilisation du solde du Wallet
      if (walletDeducted > 0) {
         t.update(userRef, {
            walletBalance: admin.firestore.FieldValue.increment(-walletDeducted)
         });

         const walletTxRef = db.collection("wallet_transactions").doc();
         t.set(walletTxRef, {
           userId,
           orderId: parentOrderId,
           amount: -walletDeducted,
           type: 'purchase',
           description: `Achat partiel/total par Wallet pour la commande #${parentOrderId}`,
           createdAt: admin.firestore.FieldValue.serverTimestamp(),
           status: 'completed'
         });
      }

      // 3.5 Création des sous-commandes
      for (const subOrder of subOrdersToCreate) {
        t.set(subOrder.ref, subOrder.data);
      }

      // 3.6 Création de la commande globale (OrderMaster)
      const masterOrderRef = db.collection("order_masters").doc(parentOrderId);
      const masterOrderData = {
        id: parentOrderId,
        userId,
        subtotal,
        shippingTotal: totalShipping,
        discountAmount,
        cashbackApplied,
        walletDeducted,
        codAmount,
        paymentMethod: walletDeducted === grandTotalBeforeWallet ? 'wallet' : (walletDeducted > 0 ? 'split_wallet_cod' : 'cod'),
        total: grandTotalBeforeWallet,
        status: 'pending',
        shippingAddress,
        billingAddress: req.body.billingAddress || shippingAddress,
        subOrderIds: subOrdersToCreate.map(so => so.ref.id),
        couponCode: appliedCouponData ? appliedCouponData.code : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      t.set(masterOrderRef, masterOrderData);

      return { orderId: subOrdersToCreate[0].ref.id, total: grandTotalBeforeWallet, walletDeducted, codAmount };
    }), userId);

    // Enforce instant velocity limits right after placing the order
    for (const sellerId of sellerIdsSet) {
       await checkSellerVelocityLimit(sellerId);
    }

    // Process out-of-band email alerts asynchronously
    if (emailAlerts.length > 0) {
       Promise.all(emailAlerts.map(async alert => {
          try {
             const userSnap = await db.collection("users").doc(alert.sellerId).get();
             const email = userSnap.data()?.email;
             if (email) {
                await sendLowStockEmail(email, alert.message);
             }
          } catch (e) {
             console.error("Erreur lors de l'envoi de l'email de stock bas", e);
          }
       })).catch(console.error);
    }

    if (result.alreadyProcessed) {
      return res.json({ 
        orderId: result.orderId, 
        status: result.status,
        message: result.message 
      });
    }

    res.json({ 
       success: true, 
       orderId: result.orderId, 
       grandTotal: result.total, 
       walletDeducted: result.walletDeducted, 
       codAmount: result.codAmount 
    });
  } catch (error: unknown) {
    console.error("Place order err:", error);
    if ((error as any).code === 'PRICE_CONFLICT') {
       return res.status(409).json({ error: (error as Error).message });
    }
    res.status(400).json({ error: (error as Error).message || "Erreur de la commande." });
  }
});

router.post("/validate-coupon", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { code, subtotal } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: "Code requis" });
  }

  try {
    const q = await db.collection("coupons").where("code", "==", code.toUpperCase()).limit(1).get();
    
    if (q.empty) {
      return res.status(400).json({ error: "Code promo invalide ou expiré." });
    }
    
    const couponDoc = q.docs[0];
    const couponData = { id: couponDoc.id, ...couponDoc.data() } as any;
    
    if (!couponData.isActive) {
      return res.status(400).json({ error: "Ce code promo n'est plus actif." });
    }
    
    const now = new Date();
    const expiryDateRaw = couponData.expiresAt || couponData.expiryDate;
    const expiresAt = expiryDateRaw?.toDate ? expiryDateRaw.toDate() : (expiryDateRaw ? new Date(expiryDateRaw) : undefined);
    
    if (expiresAt && expiresAt < now) {
      return res.status(400).json({ error: "Ce code promo a expiré." });
    }
    
    if (subtotal < (couponData.minOrderValue || 0)) {
      return res.status(400).json({ error: `Un minimum de commande de ${couponData.minOrderValue || 0} DA est requis.` });
    }
    
    const currentUses = Number(couponData.usedCount || couponData.usageCount || 0);
    const maxUsesLimit = Number(couponData.maxUses || couponData.usageLimit || 0);
    if (maxUsesLimit > 0 && currentUses >= maxUsesLimit) {
      return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation." });
    }
    
    res.json({ success: true, coupon: couponData });
  } catch (error: unknown) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ error: "Erreur serveur lors de la validation." });
  }
});

router.post("/webhooks/yalidine", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Sécurisation et Validation de l'Endpoint Webhook
    const apiKey = process.env.DELIVERY_API_KEY || process.env.YALIDINE_WEBHOOK_SECRET;
    const reqKey = req.headers['x-api-key'] || req.query.token || req.headers['authorization'];
    
    if (apiKey && reqKey !== apiKey && reqKey !== `Bearer ${apiKey}`) {
       return res.status(401).json({ error: "Accès non autorisé au Webhook. Signature invalide." });
    }

    const payload = req.body;
    // Supposons que Yalidine envoie { order_id, tracking, status, event_id, timestamp, location, reason }
    // ou un tableau d'événements.
    const order_id = payload.order_id || payload.tracking; // Fallback
    const tracking = payload.tracking;
    const rawStatus = payload.status;
    const event_id = payload.event_id || `${rawStatus}_${payload.timestamp || Date.now()}`;
    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

    if (!order_id || !rawStatus) {
      return res.status(400).json({ error: "Missing order_id or status" });
    }

    // 2. Matrice de Mapping Standardisée
    let targetStatus = "TRACKING_STATUS_IN_TRANSIT";
    let statusSeverity = "normal";
    let orderStatus = "in_transit";
    
    const s = rawStatus.toLowerCase();
    if (s.includes("livré") || s.includes("delivered")) {
      targetStatus = "TRACKING_STATUS_DELIVERED";
      statusSeverity = "success";
      orderStatus = "delivered";
    } else if (s.includes("retour") || s.includes("returned")) {
      targetStatus = "TRACKING_STATUS_RETURNED";
      statusSeverity = "error";
      orderStatus = "returned";
    } else if (s.includes("expédié") || s.includes("shipped")) {
      targetStatus = "TRACKING_STATUS_SHIPPED";
      statusSeverity = "normal";
      orderStatus = "shipped";
    } else if (s.includes("annulé") || s.includes("canceled")) {
      targetStatus = "TRACKING_STATUS_CANCELED";
      statusSeverity = "error";
      orderStatus = "cancelled";
    } else if (s.includes("anomalie") || s.includes("échec")) {
      targetStatus = "TRACKING_STATUS_ALERT";
      statusSeverity = "warning";
      orderStatus = "in_transit";
    }

    const newEvent = {
      event_id,
      status_key: targetStatus,
      raw_status: rawStatus,
      severity: statusSeverity,
      timestamp: admin.firestore.Timestamp.fromDate(timestamp),
      location: payload.location || "",
      reason: payload.reason || ""
    };

    // 3. Garantie d'Idempotence avec Transaction
    const orderRef = db.collection("orders").doc(order_id);
    
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        // Optionnel : chercher par trackingId si order_id n'est pas l'ID Firestore
        const querySnapshot = await db.collection("orders").where("trackingId", "==", order_id).limit(1).get();
        if (querySnapshot.empty) {
          throw new Error("Order not found");
        }
        const realOrderRef = querySnapshot.docs[0].ref;
        const realOrderDoc = await transaction.get(realOrderRef);
        
        const existingEvents = realOrderDoc.data()?.carrier_tracking_events || [];
        const eventExists = existingEvents.some((e: CarrierTrackingEvent) => e.event_id === event_id);
        
        if (!eventExists) {
          const updatePayload: any = {
            status: orderStatus,
            carrier_tracking_events: admin.firestore.FieldValue.arrayUnion(newEvent),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          const data = realOrderDoc.data() || {};
          const cStatus = data.status;

          // Si c'est un échec de livraison (retourné avant d'être livré)
          if (orderStatus === "returned" && cStatus !== "returned" && cStatus !== "returning" && cStatus !== "refunded") {
             const buyerId = data.userId || data.buyerId;
             if (buyerId && (data.walletDeducted > 0 || data.cashbackApplied > 0)) {
                const buyerRef = db.collection("users").doc(buyerId);
                const updatesForBuyer: any = {};
                if (data.walletDeducted > 0) {
                   updatesForBuyer.walletBalance = admin.firestore.FieldValue.increment(data.walletDeducted);
                   const walletTxRef = db.collection("wallet_transactions").doc();
                   transaction.set(walletTxRef, {
                     userId: buyerId,
                     orderId: realOrderRef.id,
                     amount: data.walletDeducted,
                     type: 'refund',
                     description: `Remboursement suite à échec de livraison #${realOrderRef.id.substring(0, 8)}`,
                     createdAt: new Date().toISOString(),
                     status: 'completed'
                   });
                }
                if (data.cashbackApplied > 0) {
                   updatesForBuyer.cashbackBalance = admin.firestore.FieldValue.increment(data.cashbackApplied);
                }
                transaction.update(buyerRef, updatesForBuyer);
                updatePayload.paymentStatus = data.walletDeducted > 0 ? "refunded" : (data.paymentStatus || "unpaid");
             }
          }

          transaction.update(realOrderRef, updatePayload);
        }
      } else {
        const existingEvents = orderDoc.data()?.carrier_tracking_events || [];
        const eventExists = existingEvents.some((e: CarrierTrackingEvent) => e.event_id === event_id);
        
        if (!eventExists) {
          const updatePayload: any = {
            status: orderStatus,
            carrier_tracking_events: admin.firestore.FieldValue.arrayUnion(newEvent),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          const data = orderDoc.data() || {};
          const cStatus = data.status;

          if (orderStatus === "returned" && cStatus !== "returned" && cStatus !== "returning" && cStatus !== "refunded") {
             const buyerId = data.userId || data.buyerId;
             if (buyerId && (data.walletDeducted > 0 || data.cashbackApplied > 0)) {
                const buyerRef = db.collection("users").doc(buyerId);
                const updatesForBuyer: any = {};
                if (data.walletDeducted > 0) {
                   updatesForBuyer.walletBalance = admin.firestore.FieldValue.increment(data.walletDeducted);
                   const walletTxRef = db.collection("wallet_transactions").doc();
                   transaction.set(walletTxRef, {
                     userId: buyerId,
                     orderId: orderRef.id,
                     amount: data.walletDeducted,
                     type: 'refund',
                     description: `Remboursement suite à échec de livraison #${orderRef.id.substring(0, 8)}`,
                     createdAt: new Date().toISOString(),
                     status: 'completed'
                   });
                }
                if (data.cashbackApplied > 0) {
                   updatesForBuyer.cashbackBalance = admin.firestore.FieldValue.increment(data.cashbackApplied);
                }
                transaction.update(buyerRef, updatesForBuyer);
                updatePayload.paymentStatus = data.walletDeducted > 0 ? "refunded" : (data.paymentStatus || "unpaid");
             }
          }

          transaction.update(orderRef, updatePayload);
        }
      }
    });

    res.json({ success: true, message: "Webhook processed securely" });
  } catch (err: unknown) {
    console.error("Yalidine Webhook Error:", err);
    res.status((err as Error).message === "Order not found" ? 404 : 500).json({ error: (err as Error).message });
  }
});

router.post("/prepare-shipment", authenticateToken, authorizeSeller, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Non authentifié" });
  const { orderId, orderIds } = req.body;
  const sellerId = req.user.uid;
  const idsToProcess = orderIds || (orderId ? [orderId] : []);

  if (idsToProcess.length === 0) return res.status(400).json({ error: "orderId ou orderIds requis" });

  try {
    const trackingNumbers: Record<string, string> = {};
    const pdfUrl = "https://api.livreur.com/v1/labels/BULK_BORDEREAU.pdf"; // simulated bulk PDF

    for (const id of idsToProcess) {
      const orderDoc = await db.collection("orders").doc(id).get();
      const orderData = orderDoc.data();
      const isUserAdmin = req.user.role === 'admin';
      const isUserSeller = orderData?.sellerIds?.includes(sellerId) || orderData?.sellerId === sellerId;
      if (!orderDoc.exists || (!isUserAdmin && !isUserSeller)) {
        continue;
      }

      const mockResponse = {
        tracking_id: `YAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        pdf_label_url: orderIds ? pdfUrl : `https://api.yalidine.com/v1/labels/${id}.pdf`,
      };

      await db.collection("orders").doc(id).update({
        trackingId: mockResponse.tracking_id,
        labelUrl: mockResponse.pdf_label_url,
        status: "shipped", // Update status to shipped directly so it's ready for delivery
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Log event
      await db.collection("orders").doc(id).collection("order_logs").add({
         status: "shipped",
         type: "label_generated",
         date: admin.firestore.FieldValue.serverTimestamp(),
         trackingId: mockResponse.tracking_id
      });

      trackingNumbers[id] = mockResponse.tracking_id;
    }

    if (orderId && !orderIds) {
      res.json({
        tracking_id: trackingNumbers[orderId],
        pdf_label_url: `https://api.livreur.com/v1/labels/${orderId}.pdf`,
        status: "success"
      });
    } else {
      res.json({ trackingNumbers, pdfUrl, status: "success" });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
});


router.post("/cron/sync-tracking", async (req: Request, res: Response) => {
  try {
    // Vérifier un secret Cron
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized cron access" });
    }

    const apiId = process.env.YALIDINE_API_ID;
    const apiToken = process.env.YALIDINE_API_TOKEN;

    if (!apiId || !apiToken) {
       console.log("Yalidine API credentials missing. Skipping sync.");
       return res.json({ success: true, syncedCount: 0, message: "Credentials missing" });
    }

    const snapshot = await db.collection("orders")
      .where("status", "in", ["processing", "shipped", "in_transit"])
      .get();

    let syncedCount = 0;
    
    // Pour ne pas dépasser le rate limit, on requête Yalidine par batchs si nécessaire.
    // L'API Yalidine /v1/histories/ supporte de multiples tracking_numbers séparés par virgule.
    const trackingIds = snapshot.docs.map(d => d.data().trackingId).filter(Boolean);
    
    if (trackingIds.length === 0) {
       return res.json({ success: true, syncedCount: 0, message: "No active orders to sync" });
    }

    // On découpe en paquets de 50 pour l'URL
    const chunkSize = 50;
    for (let i = 0; i < trackingIds.length; i += chunkSize) {
      const chunk = trackingIds.slice(i, i + chunkSize);
      try {
        const response = await fetch(`https://api.yalidine.com/v1/histories/?tracking=${chunk.join(',')}`, {
          headers: { 
             "X-API-ID": apiId, 
             "X-API-TOKEN": apiToken 
          }
        });

        if (!response.ok) {
           console.error("Yalidine sync failed for chunk", chunk, await response.text());
           continue;
        }

        const json = await response.json();
        const dataArray = json.data || [];

        // Grouper par trackingId
        const trackingEventsMap = new Map<string, any[]>();
        for (const item of dataArray) {
           const trc = item.tracking;
           if (!trackingEventsMap.has(trc)) trackingEventsMap.set(trc, []);
           trackingEventsMap.get(trc)!.push(item);
        }

        for (const [trackingNumber, events] of trackingEventsMap.entries()) {
           // Trouver la commande
           const orderQuery = await db.collection("orders").where("trackingId", "==", trackingNumber).limit(1).get();
           if (orderQuery.empty) continue;
           
           const orderRef = orderQuery.docs[0].ref;
           
           await db.runTransaction(async (transaction) => {
             const doc = await transaction.get(orderRef);
             const orderData = doc.data() || {};
             const existingEvents = orderData.carrier_tracking_events || [];
             
             let hasNewEvents = false;
             const updatedEvents = [...existingEvents];
             let latestOrderStatus = orderData.status;

             // Trier les événements Yalidine par date
             events.sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime());

             for (const evt of events) {
                const rawStatus = evt.status;
                const event_id = evt.id ? String(evt.id) : `${rawStatus}_${evt.date_heure}`;
                
                const exists = updatedEvents.some((e: CarrierTrackingEvent) => e.event_id === event_id);
                if (exists) continue;

                let targetStatus = "TRACKING_STATUS_IN_TRANSIT";
                let statusSeverity = "normal";
                let computedOrderStatus = "in_transit";
                
                const s = rawStatus.toLowerCase();
                if (s.includes("livré") || s.includes("delivered") || s.includes("livre")) {
                  targetStatus = "TRACKING_STATUS_DELIVERED";
                  statusSeverity = "success";
                  computedOrderStatus = "delivered";
                } else if (s.includes("retour") || s.includes("returned")) {
                  targetStatus = "TRACKING_STATUS_RETURNED";
                  statusSeverity = "error";
                  computedOrderStatus = "returned";
                } else if (s.includes("expédié") || s.includes("shipped")) {
                  targetStatus = "TRACKING_STATUS_SHIPPED";
                  statusSeverity = "normal";
                  computedOrderStatus = "shipped";
                } else if (s.includes("annulé") || s.includes("canceled")) {
                  targetStatus = "TRACKING_STATUS_CANCELED";
                  statusSeverity = "error";
                  computedOrderStatus = "cancelled";
                } else if (s.includes("anomalie") || s.includes("échec")) {
                  targetStatus = "TRACKING_STATUS_ALERT";
                  statusSeverity = "warning";
                }

                updatedEvents.push({
                  event_id,
                  status_key: targetStatus,
                  raw_status: rawStatus,
                  severity: statusSeverity,
                  timestamp: admin.firestore.Timestamp.fromDate(new Date(evt.date_heure)),
                  location: evt.wilaya || evt.commune || "",
                  reason: evt.motif || ""
                });
                
                latestOrderStatus = computedOrderStatus;
                hasNewEvents = true;
             }

             if (hasNewEvents) {
                const updatePayload: any = {
                  status: latestOrderStatus,
                  carrier_tracking_events: updatedEvents,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                const cStatus = orderData.status;

                // Refund logic
                if (latestOrderStatus === "returned" && cStatus !== "returned" && cStatus !== "returning" && cStatus !== "refunded") {
                   const buyerId = orderData.userId || orderData.buyerId;
                   if (buyerId && (orderData.walletDeducted > 0 || orderData.cashbackApplied > 0)) {
                      const buyerRef = db.collection("users").doc(buyerId);
                      const updatesForBuyer: any = {};
                      if (orderData.walletDeducted > 0) {
                         updatesForBuyer.walletBalance = admin.firestore.FieldValue.increment(orderData.walletDeducted);
                         const walletTxRef = db.collection("wallet_transactions").doc();
                         transaction.set(walletTxRef, {
                           userId: buyerId,
                           orderId: orderRef.id,
                           amount: orderData.walletDeducted,
                           type: 'refund',
                           description: `Remboursement suite à échec de livraison #${orderRef.id.substring(0, 8)}`,
                           createdAt: new Date().toISOString(),
                           status: 'completed'
                         });
                      }
                      if (orderData.cashbackApplied > 0) {
                         updatesForBuyer.cashbackBalance = admin.firestore.FieldValue.increment(orderData.cashbackApplied);
                      }
                      transaction.update(buyerRef, updatesForBuyer);
                      updatePayload.paymentStatus = orderData.walletDeducted > 0 ? "refunded" : (orderData.paymentStatus || "unpaid");
                   }
                }

                transaction.update(orderRef, updatePayload);
                syncedCount++;
             }
           });
        }
      } catch (err) {
        console.error(`Error syncing tracking chunk:`, err);
      }
    }

    res.json({ success: true, syncedCount, message: "Tracking sync completed" });
  } catch (error: unknown) {
    console.error("Cron sync tracking error:", error);
    res.status(500).json({ error: "Internal server error during sync" });
  }
});

router.post('/calculate-commissions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'Valid orders array required' });
    
    // 1. Role-Based Access Validation Middleware / Integrity Check
    const userRole = req.user?.role;
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (userRole !== 'admin' && userRole !== 'seller') {
      return res.status(403).json({ error: 'Accès refusé. Autorisation insuffisante pour calculer les commissions.' });
    }

    // 2. Fetch authentic order data from Firestore DB to override incoming client data
    const incomingOrderIds = orders.map(o => o.id || o.orderId).filter(Boolean);
    const dbOrdersMap = new Map<string, any>();
    
    if (incomingOrderIds.length > 0) {
      // Chunk size of 30 due to Firestore "in" operator limits
      const chunks: string[][] = [];
      for (let i = 0; i < incomingOrderIds.length; i += 30) {
        chunks.push(incomingOrderIds.slice(i, i + 30));
      }
      for (const chunk of chunks) {
        const snap = await db.collection('orders').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snap.docs.forEach(doc => {
          dbOrdersMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      }
    }

    // 3. Absolute Integrity Sanitization: Overwrite parameters with values from DB, and filter out unauthorized data
    const validatedOrders: any[] = [];
    for (const o of orders) {
      const oid = o.id || o.orderId;
      if (oid && dbOrdersMap.has(oid)) {
        const dbOrder = dbOrdersMap.get(oid)!;
        
        // If caller is a seller, they can ONLY calculate commission on their own products/orders
        if (userRole === 'seller') {
          const isMyOrder = dbOrder.sellerId === userId || 
                            (dbOrder.sellerIds && (dbOrder.sellerIds as string[]).includes(userId)) ||
                            (dbOrder.items && (dbOrder.items as Order['items']).some((item) => item.sellerId === userId));
          if (!isMyOrder) {
            continue; // Silently filter out other seller data to protect client VIP database
          }
        }
        validatedOrders.push(dbOrder);
      } else {
        // Fallback for mock/simulation if and only if caller is Admin (debugging/diagnostics)
        if (userRole === 'admin') {
          validatedOrders.push(o);
        }
      }
    }

    let totalVolume = 0;
    let totalCommission = 0;
    
    // Fetch all sellers in one go to minimize DB calls
    const sellerIds = new Set<string>();
    validatedOrders.forEach(o => {
       if (o.sellerIds) o.sellerIds.forEach((id: any) => sellerIds.add(id));
       else if (o.sellerId) sellerIds.add(o.sellerId);
       o.items?.forEach((i: any) => { if (i.sellerId) sellerIds.add(i.sellerId); });
    });
    
    const sellerRates: Record<string, number> = {};
    let globalRate = 10;
    const commDoc = await db.collection('settings').doc('commission').get();
    if (commDoc.exists) globalRate = commDoc.data()?.globalRate ?? 10;
    
    // Only fetch if there are sellers
    if (sellerIds.size > 0) {
      const sellersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(sellerIds)).get();
      sellersSnap.forEach(snap => {
         sellerRates[snap.id] = snap.data().commissionRate ?? globalRate;
      });
    }

    const calculatedOrders = validatedOrders.map(order => {
       const { orderCommission, netPayout } = calculateOrderCommission(order, sellerRates, globalRate);
       
       totalVolume += (order.total || 0);
       totalCommission += orderCommission;
       
       return {
          ...order,
          commissionCalc: orderCommission,
          netPayout
       };
    });
    
    return res.json({
       calculatedOrders,
       totalVolume,
       totalCommission,
       sellersNetPayout: totalVolume - totalCommission
    });
  } catch (error: unknown) {
    console.error('Calculate commissions error:', error);
    res.status(500).json({ error: 'Failed to calculate commissions' });
  }
});

export default router;
