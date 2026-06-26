import { Request, Response } from 'express';
export interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }

import { Router } from "express";
import { admin, db } from "../config/firebase-admin";
import { authenticateToken, authorizeSeller } from "../middlewares/auth";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../constants";
import { placeOrderSchema } from "../utils/validation";
import { checkSellerVelocityLimit } from "../utils/velocity";
import { orderBreaker } from "../utils/circuitBreaker";
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

  if (idempotencyKey) {
    const existingOrder = await db.collection("orders")
      .where("idempotencyKey", "==", idempotencyKey)
      .where("userId", "==", req.user.uid)
      .limit(1)
      .get();
    
    if (!existingOrder.empty) {
      const existingDoc = existingOrder.docs[0];
      return res.json({ 
        orderId: existingDoc.id, 
        status: "already_processed",
        message: "Commande déjà traitée" 
      });
    }
  }

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
    const shopSnapshots = new Map<string, any>();
    const emailAlerts: {sellerId: string, message: string}[] = [];

    const result = await orderBreaker.execute(() => db.runTransaction(async (t: any) => {
      emailAlerts.length = 0; // Clear on retry
      // --- ÉTAPE 1 : LECTURES TRANSACTIONNELLES PURES ---
      let couponDoc: any = null;
      
      const productSnaps = new Map<string, any>();
      const productRefs = new Map<string, any>();

      const refs = uniqueProductIds.map(pId => db.collection("products").doc(pId));
      const snaps = await t.getAll(...refs);
      
      snaps.forEach((productSnap: any, idx: number) => {
        const pId = uniqueProductIds[idx];
        if (!productSnap.exists) {
          throw new Error(`Produit ${pId} introuvable.`);
        }
        productSnaps.set(pId, productSnap);
        productRefs.set(pId, refs[idx]);

        const sellerId = productSnap.data().sellerId;
        if (sellerId) sellerIdsSet.add(sellerId);
      });

      sellerIdsArray = Array.from(sellerIdsSet);
      if (sellerIdsArray.length > 0) {
        const sellerRefs = sellerIdsArray.map(sId => db.collection("users").doc(sId));
        const sellerSnaps = await t.getAll(...sellerRefs);
        
        sellerSnaps.forEach((shopSnap: any, idx: number) => {
          const sellerId = sellerIdsArray[idx];
          if (shopSnap.exists) {
            const sd = shopSnap.data();
            if (sd && (sd.isActive === false || sd.is_active === false || sd.velocitySuspended)) {
               throw new Error(`La boutique "${sd.shopName || sd.displayName || sellerId}" est fermée temporairement (capacité de commande maximale atteinte).`);
            }
            shopSnapshots.set(sellerId, sd);
          } else {
            shopSnapshots.set(sellerId, {});
          }
        });
      }

      // Reconstruct productDocs array cleanly for downstream seller splits
      const productDocs: any[] = [];
      for (const cartItem of cart) {
        if (!cartItem.id || !cartItem.quantity || typeof cartItem.quantity !== 'number' || !Number.isInteger(cartItem.quantity) || cartItem.quantity < 1) {
          throw new Error(`Article invalide fourni.`);
        }
        const snap = productSnaps.get(cartItem.id);
        const ref = productRefs.get(cartItem.id);
        productDocs.push({ cartItem, productSnap: snap, productRef: ref });
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
      const orderItems: any[] = [];
      
      // Map to track running mutable state of products inside this transaction
      const productInMemoryStates = new Map<string, any>();
      for (const [pId, snap] of productSnaps.entries()) {
        productInMemoryStates.set(pId, JSON.parse(JSON.stringify(snap.data())));
      }

      for (const { cartItem, productSnap } of productDocs) {
        const productId = productSnap.id;
        const productData = productInMemoryStates.get(productId);

        let targetPrice = productData.promoPrice || productData.price;
        let availableStock = productData.stock || 0;

        let variantInfo = null;
        if (cartItem.selectedVariant && productData.variants && Array.isArray(productData.variants)) {
           const variant = productData.variants.find((v: any) => v.name === cartItem.selectedVariant);
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
        if (typeof cartItem.priceSeen === 'number' && cartItem.priceSeen !== targetPrice) {
            const conflictErr: any = new Error(`Le prix de l'article "${productData.name}" a été mis à jour par le vendeur (de ${cartItem.priceSeen} DA à ${targetPrice} DA).`);
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
           productData.variants = productData.variants.map((v: any) => {
              if (v.name === variantInfo.name) {
                 return { ...v, stock: Number(v.stock) - cartItem.quantity };
              }
              return v;
           });
           productData.hasOutOfStockVariants = productData.variants.some((v: any) => Math.max(0, Number(v.stock) || 0) <= 0);
           productData.stock = productData.variants.reduce((acc: number, curr: any) => acc + Math.max(0, Number(curr.stock) || 0), 0);
        } else {
           productData.stock = (productData.stock || 0) - cartItem.quantity;
        }
      }

      // Generate unified consolidated stock updates after iterating all items
      const stockUpdates: any[] = [];
      for (const pId of uniqueProductIds) {
        const finalData = productInMemoryStates.get(pId);
        const ref = productRefs.get(pId);
        const stockThreshold = Number(finalData.lowStockAlert) || 5;
        
        let needsAlert = false;
        let alertMessage = "";
        
        if (finalData.variants) {
           const lowVariants = finalData.variants.filter((v: any) => v.isActive !== false && Number(v.stock) <= stockThreshold);
           if (lowVariants.length > 0) {
              needsAlert = true;
              alertMessage = `Alerte: La(es) variante(s) ${lowVariants.map((v:any)=>v.name).join(', ')} du produit "${finalData.name}" a atteint le stock critique (<= ${stockThreshold}).`;
           }
           stockUpdates.push({ ref, update: { 
              variants: finalData.variants,
              hasOutOfStockVariants: finalData.hasOutOfStockVariants,
              stock: finalData.stock
           }});
        } else {
           if (finalData.stock <= stockThreshold) {
              needsAlert = true;
              alertMessage = `Alerte: Le produit "${finalData.name}" a atteint le stock critique (${finalData.stock} restants, seuil: ${stockThreshold}).`;
           }
           stockUpdates.push({ ref, update: { 
              stock: finalData.stock
           }});
        }

        if (needsAlert) {
           emailAlerts.push({ sellerId: finalData.sellerId, message: alertMessage });
           
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
      let appliedCouponData: any = null;

      if (couponDoc) {
        appliedCouponData = couponDoc.data();
        if (!appliedCouponData.isActive) throw new Error("Code promo inactif.");
        
        let expiryDateObj = null;
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
      if (useCashbackPoints) {
         const userPoints = userData?.cashbackBalance || 0;
         cashbackApplied = Math.min(userPoints, Math.max(0, subtotal - discountAmount));
      }

      // 2.3 Calcul des Frais de Livraison et division en sous-commandes
      const userWilaya = shippingAddress.wilaya;
      const sellerGroups = new Map<string, any[]>();
      for (const item of productDocs) {
        const sId = item.productSnap.data().sellerId;
        if (!sellerGroups.has(sId)) {
          sellerGroups.set(sId, []);
        }
        sellerGroups.get(sId)!.push(item);
      }

      const parentOrderId = db.collection("orders").doc().id;
      const subOrdersToCreate: any[] = [];
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
           const pData = productSnap.data();
           let targetP = pData.promoPrice || pData.price;
           if (cartItem.selectedVariant && pData.variants && Array.isArray(pData.variants)) {
              const variant = pData.variants.find((v: any) => v.name === cartItem.selectedVariant);
              if (variant) {
                 if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                    targetP = Number(variant.priceOverride);
                 } else if (variant.priceDiff) {
                    targetP += parseInt(variant.priceDiff);
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
        const sellerOrderItems: any[] = [];
        
        for (const { cartItem, productSnap } of groupItems) {
           const productData = productSnap.data();
           let targetPrice = productData.promoPrice || productData.price;
           
           if (cartItem.selectedVariant && productData.variants && Array.isArray(productData.variants)) {
              const variant = productData.variants.find((v: any) => v.name === cartItem.selectedVariant);
              if (variant) {
                 if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                    targetPrice = Number(variant.priceOverride);
                 } else if (variant.priceDiff) {
                    targetPrice += parseInt(variant.priceDiff);
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
             sellerName: shop ? (shop.name || shop.shopName || "Boutique") : "Boutique",
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

    res.json({ 
       success: true, 
       orderId: result.orderId, 
       grandTotal: result.total, 
       walletDeducted: result.walletDeducted, 
       codAmount: result.codAmount 
    });
  } catch (error: any) {
    console.error("Place order err:", error);
    if (error.code === 'PRICE_CONFLICT') {
       return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message || "Erreur de la commande." });
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
  } catch (error: any) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ error: "Erreur serveur lors de la validation." });
  }
});

router.post("/webhooks/yalidine", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Vérification de sécurité du Webhook
    const apiKey = process.env.DELIVERY_API_KEY || process.env.YALIDINE_WEBHOOK_SECRET;
    const reqKey = req.headers['x-api-key'] || req.query.token || req.headers['authorization'];
    
    // Si une clé est configurée sur le serveur mais non fournie ou incorrecte dans la requête
    if (apiKey && reqKey !== apiKey && reqKey !== `Bearer ${apiKey}`) {
       return res.status(401).json({ error: "Accès non autorisé au Webhook. Signature invalide." });
    }

    const { order_id, tracking, status } = req.body;
    
    // Simplification webhook: "Delivered", "Returned", "Shipped"
    // Dans Yalidine, les statuts peuvent être "Livre", "Retourne", etc.
    
    if (order_id && status) {
       let targetStatus = "in_transit";
       if (status.toLowerCase().includes("livré")) targetStatus = "delivered";
       if (status.toLowerCase().includes("retour")) targetStatus = "returned";
       if (status.toLowerCase().includes("expédié")) targetStatus = "shipped";
       
       await db.collection("orders").doc(order_id).update({
          status: targetStatus,
          trackingNumber: tracking || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
       });
       
       // Note : les déclencheurs de commissions (walletBalance) sont gérés par les événements db.runTransaction standard. Il est recommandé de mutualiser la logique handleUpdateStatus du vendeur.
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/prepare-shipment", authenticateToken, authorizeSeller, async (req: any, res) => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/calculate-commissions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'Valid orders array required' });
    
    // 1. Role-Based Access Validation Middleware / Integrity Check
    const userRole = req.user?.role;
    const userId = req.user?.uid;
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
        const dbOrder = dbOrdersMap.get(oid);
        
        // If caller is a seller, they can ONLY calculate commission on their own products/orders
        if (userRole === 'seller') {
          const isMyOrder = dbOrder.sellerId === userId || 
                            (dbOrder.sellerIds && dbOrder.sellerIds.includes(userId)) ||
                            (dbOrder.items && dbOrder.items.some((item: any) => item.sellerId === userId));
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
       if (o.sellerIds) o.sellerIds.forEach(id => sellerIds.add(id));
       else if (o.sellerId) sellerIds.add(o.sellerId);
       o.items?.forEach(i => { if (i.sellerId) sellerIds.add(i.sellerId); });
    });
    
    const sellerRates = {};
    let globalRate = 10;
    const commDoc = await db.collection('settings').doc('commission').get();
    if (commDoc.exists) globalRate = commDoc.data().globalRate ?? 10;
    
    // Only fetch if there are sellers
    if (sellerIds.size > 0) {
      const sellersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(sellerIds)).get();
      sellersSnap.forEach(snap => {
         sellerRates[snap.id] = snap.data().commissionRate ?? globalRate;
      });
    }

    const calculatedOrders = validatedOrders.map(order => {
       let orderCommission = 0;
       
       if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
             const sRate = sellerRates[item.sellerId] ?? globalRate;
             const lineTotal = (item.price || 0) * (item.quantity || 1);
             orderCommission += lineTotal * (sRate / 100);
          });
       } else {
          // fallback
          const sRate = sellerRates[order.sellerId] ?? sellerRates[order.sellerIds?.[0]] ?? globalRate;
          orderCommission = (order.subtotal || order.total || 0) * (sRate / 100);
       }
       
       totalVolume += (order.total || 0);
       totalCommission += orderCommission;
       
       return {
          ...order,
          commissionCalc: orderCommission,
          netPayout: (order.total || 0) - orderCommission
       };
    });
    
    return res.json({
       calculatedOrders,
       totalVolume,
       totalCommission,
       sellersNetPayout: totalVolume - totalCommission
    });
  } catch (error: any) {
    console.error('Calculate commissions error:', error);
    res.status(500).json({ error: 'Failed to calculate commissions' });
  }
});

export default router;
