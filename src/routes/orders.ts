import { Router } from "express";
import { admin, db } from "../config/firebase-admin";
import { authenticateToken, authorizeSeller } from "../middlewares/auth";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../constants";
import { placeOrderSchema } from "../utils/validation";

const router = Router();

export async function checkSellerVelocityLimit(sellerId: string) {
  try {
    const ordersSnap = await db.collection("orders")
      .where("sellerIds", "array-contains", sellerId)
      .orderBy("createdAt", "desc")
      .limit(300)
      .get();
    
    const pendingStatuses = ['pending', 'confirmed', 'preparing', 'processing'];
    let pendingCount = 0;
    
    for (const doc of ordersSnap.docs) {
      const orderData = doc.data();
      const status = (orderData.status || '').toLowerCase();
      if (pendingStatuses.includes(status)) {
        const paymentMethod = (orderData.paymentMethod || '').toLowerCase();
        const paymentStatus = (orderData.paymentStatus || '').toLowerCase();
        
        // 1. If it's prepaid (Wallet, Card, etc.), it's safe to count towards velocity limit
        if (paymentMethod === 'wallet' || paymentStatus === 'paid') {
          pendingCount++;
          continue;
        }

        // 2. Otherwise (COD or Split COD), check if the buyer is established to prevent competitor spam DoS
        const buyerId = orderData.userId || orderData.buyerId;
        if (buyerId) {
          // Fetch buyer's orders history
          const buyerOrdersSnap = await db.collection("orders")
            .where("userId", "==", buyerId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
          
          const hasSuccessfulPurchase = buyerOrdersSnap.docs.some(d => {
            const dData = d.data();
            const dStatus = (dData.status || '').toLowerCase();
            return ['shipped', 'delivered', 'completed', 'received'].includes(dStatus);
          });

          // Fetch buyer's profile creation date for age check as a fallback
          const buyerSnap = await db.collection("users").doc(buyerId).get();
          const buyerData = buyerSnap.exists ? buyerSnap.data() : null;
          let isOldAccount = false;
          if (buyerData && buyerData.createdAt) {
            const createdAtTime = buyerData.createdAt.toDate 
              ? buyerData.createdAt.toDate().getTime() 
              : new Date(buyerData.createdAt).getTime();
            isOldAccount = (Date.now() - createdAtTime) > 2 * 24 * 60 * 60 * 1000; // Account > 2 days old
          }

          if (hasSuccessfulPurchase || isOldAccount) {
            pendingCount++;
          } else {
            console.log(`[VELOCITY DOS DEFENSE] Ignored unverified/guest/new COD order ${doc.id} for seller ${sellerId} to prevent malicious shutdown attacks.`);
          }
        } else {
          // Anonymous or untracked buyer accounts are ignored from velocity counts to block bots
          console.log(`[VELOCITY DOS DEFENSE] Ignored untracked buyer order ${doc.id} for seller ${sellerId} to prevent malicious shutdowns.`);
        }
      }
    }
    
    const sellerRef = db.collection("users").doc(sellerId);
    const sellerSnap = await sellerRef.get();
    if (!sellerSnap.exists) return;
    const sellerData = sellerSnap.data();
    
    if (pendingCount > 5) {
      await sellerRef.update({
        isActive: false,
        is_active: false,
        velocitySuspended: true,
        bgSuspended_reason: `Alerte Rouge : Limite de vélocité dépassée (${pendingCount} commandes en attente non expédiées).`
      });
      
      await db.collection("admin_alerts").add({
        type: 'velocity_kill_switch',
        sellerId,
        shopName: sellerData?.shopName || sellerData?.displayName || sellerId,
        pendingCount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false
      });
      console.log(`[KILL SWITCH] Suspended seller ${sellerId} (${pendingCount} pending orders).`);
    } else if (pendingCount <= 5 && sellerData?.velocitySuspended) {
      await sellerRef.update({
        isActive: true,
        is_active: true,
        velocitySuspended: false,
        bgSuspended_reason: null
      });
      console.log(`[KILL SWITCH] Realigned seller ${sellerId} (${pendingCount} pending orders).`);
    }
  } catch (err) {
    console.error("Error in checkSellerVelocityLimit:", err);
  }
}

router.post("/place-order", authenticateToken, async (req: any, res: any) => {
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
  
  const { cart, shippingAddress, couponCode, useCashbackPoints, useWallet, deliveryMethod } = validationResult.data;
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

    const result = await db.runTransaction(async (t: any) => {
      // --- ÉTAPE 1 : LECTURES PURES ---
      const shopSnapshots = new Map<string, any>();
      let couponDoc: any = null;

      // Extract unique product IDs to guarantee only one get operation per unique product
      const uniqueProductIds: string[] = Array.from(new Set(cart.map((item: any) => item.id as string)));
      
      const productSnaps = new Map<string, any>();
      const productRefs = new Map<string, any>();

      if (uniqueProductIds.length > 0) {
        const refs = uniqueProductIds.map(pId => {
          if (!pId) throw new Error("ID de produit requis.");
          return db.collection("products").doc(pId);
        });
        
        const snaps = await t.getAll(...refs);
        
        snaps.forEach((productSnap: any, idx: number) => {
          const pId = uniqueProductIds[idx];
          if (!productSnap.exists) {
            throw new Error(`Produit ${pId} introuvable.`);
          }
          productSnaps.set(pId, productSnap);
          productRefs.set(pId, refs[idx]);
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

      // 1.2 Identifier et lire les vendeurs uniques et verifier la suspension
      productDocs.forEach(({ productSnap }) => {
        const sellerId = productSnap.data().sellerId;
        if (sellerId) sellerIdsSet.add(sellerId);
      });

      const sellerIdsArray = Array.from(sellerIdsSet);
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
           availableStock = parseInt(variant.stock) || 0;
           if (variant) {
              if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== '') {
                 targetPrice = Number(variant.priceOverride);
              } else if (variant.priceDiff) {
                 targetPrice += parseInt(variant.priceDiff);
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
                 return { ...v, stock: (parseInt(v.stock) - cartItem.quantity).toString() };
              }
              return v;
           });
           productData.hasOutOfStockVariants = productData.variants.some((v: any) => (parseInt(v.stock) || 0) <= 0);
           productData.stock = productData.variants.reduce((acc: number, curr: any) => acc + (parseInt(curr.stock) || 0), 0);
        } else {
           productData.stock = (productData.stock || 0) - cartItem.quantity;
        }
      }

      // Generate unified consolidated stock updates after iterating all items
      const stockUpdates: any[] = [];
      for (const pId of uniqueProductIds) {
        const finalData = productInMemoryStates.get(pId);
        const ref = productRefs.get(pId);
        if (finalData.variants) {
           stockUpdates.push({ ref, update: { 
              variants: finalData.variants,
              hasOutOfStockVariants: finalData.hasOutOfStockVariants,
              stock: finalData.stock
           }});
        } else {
           stockUpdates.push({ ref, update: { 
              stock: finalData.stock
           }});
        }
      }

      // 2.2 Validation du Coupon
      let discountAmount = 0;
      let appliedCouponData: any = null;

      if (couponDoc) {
        appliedCouponData = couponDoc.data();
        if (!appliedCouponData.isActive) throw new Error("Code promo inactif.");
        if (new Date(appliedCouponData.expiryDate) <= new Date()) throw new Error("Code promo expiré.");
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
    });

    // Enforce instant velocity limits right after placing the order
    for (const sellerId of sellerIdsSet) {
       await checkSellerVelocityLimit(sellerId);
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

router.post("/validate-coupon", authenticateToken, async (req: any, res: any) => {
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
    const couponData = { id: couponDoc.id, ...couponDoc.data() };
    
    if (!couponData.isActive) {
      return res.status(400).json({ error: "Ce code promo n'est plus actif." });
    }
    
    if (new Date(couponData.expiryDate) <= new Date()) {
      return res.status(400).json({ error: "Ce code promo est expiré." });
    }
    
    if (subtotal < (couponData.minOrderValue || 0)) {
      return res.status(400).json({ error: `Un minimum de commande de ${couponData.minOrderValue} DA est requis.` });
    }
    
    if (couponData.usageLimit && (couponData.usageCount || 0) >= couponData.usageLimit) {
      return res.status(400).json({ error: "Ce code promo a atteint sa limite d'utilisation." });
    }
    
    res.json({ success: true, coupon: couponData });
  } catch (error: any) {
    console.error("Coupon validation error:", error);
    res.status(500).json({ error: "Erreur serveur lors de la validation." });
  }
});

router.post("/webhooks/yalidine", async (req: any, res) => {
  try {
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


router.post('/calculate-commissions', authenticateToken, async (req: any, res: any) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'Valid orders array required' });
    
    let totalVolume = 0;
    let totalCommission = 0;
    
    // Fetch all sellers in one go to minimize DB calls
    const sellerIds = new Set();
    orders.forEach(o => {
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

    const calculatedOrders = orders.map(order => {
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
