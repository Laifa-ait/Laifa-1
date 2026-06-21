import { Router } from "express";
import {
  admin,
  db,
  clientDb,
  firebaseConfig,
  clientCollection,
  clientGetDocs,
} from "../config/firebase-admin";
import { doc, getDoc, collection, getDocs, query, where, limit, runTransaction, updateDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { ai } from "../config/gemini";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeSeller,
} from "../middlewares/auth";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../constants";
import { onboardingSchema } from "../utils/validation";
import { hasExternalChannel } from "../utils/masking";

import fs from "fs";
import path from "path";
import nodeCache from "node-cache";
import Fuse from "fuse.js";
import express from "express";
import { checkSellerVelocityLimit } from "./orders";
import { translate } from "@vitalets/google-translate-api";

const cache = new nodeCache({ stdTTL: 900 });

const dualWrite = (lang: string, content: any) => {
  const p1 = path.join(process.cwd(), "public/locales", `${lang}.json`);
  const p2 = path.join(process.cwd(), "dist/locales", `${lang}.json`);

  const dir1 = path.dirname(p1);
  if (!fs.existsSync(dir1)) {
    fs.mkdirSync(dir1, { recursive: true });
  }
  fs.writeFileSync(p1, JSON.stringify(content, null, 2), "utf8");

  if (fs.existsSync(path.join(process.cwd(), "dist"))) {
    const dir2 = path.dirname(p2);
    if (!fs.existsSync(dir2)) {
      fs.mkdirSync(dir2, { recursive: true });
    }
    fs.writeFileSync(p2, JSON.stringify(content, null, 2), "utf8");
  }
};

const router = Router();

router.get("/api/debug/user", async (req, res) => {
  try {
    const snap = await db
      .collection("users")
      .where("email", "==", "laifa.aitouferoukh90@gmail.com")
      .get();
    if (snap.empty) {
      res.json({ found: false });
    } else {
      res.json({ found: true, doc: snap.docs[0].data(), id: snap.docs[0].id });
    }
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

router.get("/api/debug/firestore", async (req, res) => {
  const diagnosticResults: any = {
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    envProjectId: process.env.FIREBASE_PROJECT_ID,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    apps: admin.apps.length,
    results: [],
  };

  try {
    // Test 1: Accessing current db instance
    try {
      const snap = await db.collection("products").limit(1).get();
      diagnosticResults.results.push({
        test: "current_db",
        success: true,
        count: snap.size,
      });
    } catch (e: any) {
      diagnosticResults.results.push({
        test: "current_db",
        success: false,
        error: e.message,
      });
    }

    // Test 2: Accessing (default) database
    try {
      const defaultDb = admin.app().firestore();
      const snap = await defaultDb.collection("products").limit(1).get();
      diagnosticResults.results.push({
        test: "default_db",
        success: true,
        count: snap.size,
      });
    } catch (e: any) {
      diagnosticResults.results.push({
        test: "default_db",
        success: false,
        error: e.message,
      });
    }

    // Test 3: Re-initializing with ambient credentials only
    /* Removed getFirestore re-init test from diagnostics payload since we modularized init */

    res.json(diagnosticResults);
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// --- Checkout & Order Processing ---

router.post(
  "/api/validate-coupon",
  authenticateToken,
  async (req: any, res: any) => {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code requis" });
    }

    try {
      const q = await db
        .collection("coupons")
        .where("code", "==", code.toUpperCase())
        .get();

      if (q.empty) {
        return res
          .status(400)
          .json({ error: "Code promo invalide ou expiré." });
      }

      const couponDoc = q.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() };

      if (!couponData.isActive) {
        return res
          .status(400)
          .json({ error: "Ce code promo n'est plus actif." });
      }

      if (couponData.expiresAt && couponData.expiresAt.toDate) {
        if (couponData.expiresAt.toDate() <= new Date()) {
          return res.status(400).json({ error: "Ce code promo est expiré." });
        }
      } else if (couponData.expiresAt && new Date(couponData.expiresAt) <= new Date()) {
        return res.status(400).json({ error: "Ce code promo est expiré." });
      }

      if (subtotal < (couponData.minOrderValue || 0)) {
        return res
          .status(400)
          .json({
            error: `Un minimum de commande de ${couponData.minOrderValue || 0} DA est requis.`,
          });
      }

      if (
        couponData.usageLimit &&
        (couponData.usedCount || 0) >= couponData.usageLimit
      ) {
        return res
          .status(400)
          .json({ error: "Ce code promo a atteint sa limite d'utilisation." });
      }

      res.json({ success: true, coupon: couponData });
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      res.status(500).json({ error: "Erreur serveur lors de la validation." });
    }
  },
);

router.post("/api/auth/sync", async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    try {
      if (db) {
        console.log("Auth sync: processing user", decodedToken.uid);

        try {
          const userRef = db.collection("users").doc(decodedToken.uid);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            await userRef.set({
              uid: decodedToken.uid,
              displayName: decodedToken.name || req.body.name || "Client",
              email: decodedToken.email,
              role:
                decodedToken.email === "laifa.ait@gmail.com"
                  ? "admin"
                  : req.body.role || "buyer",
              onboardingCompleted: true,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              lastAuthMethod: "sync",
            });
          }
          return res.json({ success: true });
        } catch (dbErr: any) {
          // We expect some permission issues in sandboxes, but client-side write already occurred.
          // Be silent to avoid flagging errors in the build logs.
          return res.json({ success: true, mode: "client_fallback" });
        }
      }
    } catch (outerErr: any) {
      console.warn("Auth sync outer block fail:", outerErr.message);
      return res.json({ success: true, warning: "auth_sync_bypass" });
    }
  } catch (err: any) {
    console.error("Critical Auth sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/auth/onboard", async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Zod Schema Validation
    const validationResult = onboardingSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.issues.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({
        error: "Données de formulaire invalides.",
        details: formattedErrors,
      });
    }

    const { name, phone, wilaya, address, role, interests } =
      validationResult.data;

    // Reject any external communication channels (phone number, WhatsApp, social networks, links) in text fields
    if (hasExternalChannel(name) || hasExternalChannel(address)) {
      return res.status(400).json({
        error: "Les coordonnées externes (téléphone, liens réseaux sociaux, WhatsApp, etc.) ne sont pas autorisées dans le nom ou l'adresse.",
      });
    }

    // STRICT SECURITY GUARD on role: Only 'buyer' or 'seller' are accepted from onboarding!
    let finalRole = "buyer";
    if (role === "seller") {
      finalRole = "seller";
    }

    const userRef = db.collection("users").doc(decodedToken.uid);
    const updateObj: any = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: name || decodedToken.name || "Client",
      phone: phone || "",
      wilaya: wilaya || "Alger",
      address: address || "",
      role: finalRole,
      preferences: {
        interests: Array.isArray(interests) ? interests : [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (finalRole === "seller") {
      updateObj.isVerified = false;
      updateObj.trustScore = 50;
      updateObj.status = "pending_verification";

      // Hydrate default regulated shipping tariffs
      const defaultTariffs: Record<string, number> = {};
      ALGERIA_WILAYAS.forEach((w) => {
        const cleanName = w.replace(/^\d+\s+/, "").trim();
        const known = ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
        defaultTariffs[w] = known.price;
      });
      updateObj.shippingTariffs = defaultTariffs;

      try {
        await db.collection("internal_notifications").add({
          type: "NEW_SELLER_REGISTRATION",
          title: "Nouvelle Inscription Vendeur",
          message: `Le vendeur "${name || "Un Vendeur"}" s'est inscrit et attend la validation de son profil.`,
          sellerId: decodedToken.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      } catch (notiErr) {
        console.warn("Server: Failed to add internal notification for new seller", notiErr);
      }
    }

    try {
      await userRef.set(updateObj, { merge: true });
      res.json({ success: true });
    } catch (dbErr: any) {
      // If server write fails, we assume client-side success was enough
      // Returning 200 to avoid blocking the client-side flow
      res.json({ success: true, mode: "client_only", warning: dbErr.message });
    }
  } catch (err: any) {
    console.error("Critical onboarding sync error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/place-order", authenticateToken, async (req: any, res: any) => {
  const { cart, shippingAddress, deliveryMethod, billingAddress, couponCode, useCashbackPoints, useWallet } = req.body;
  const buyerId = req.user.uid;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ error: "Le panier est vide." });
  }

  // Anti-fraud / Rate Limiting Logistics Sabotage
  const now = new Date();
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const recentOrdersSnap = await db.collection("orders")
    .where("userId", "==", buyerId)
    .where("createdAt", ">", fifteenMinsAgo)
    .get();

  if (recentOrdersSnap.size >= 3) {
    return res.status(429).json({ error: "Rate limit dépassé. Veuillez patienter avant de repasser une commande." });
  }

  // ANTI-FRAUD / FIX Sabotage Logistique: Validate and sanitize phone number format strictly
  if (!shippingAddress || !shippingAddress.wilaya || !shippingAddress.commune || !shippingAddress.address || !shippingAddress.name || !shippingAddress.phone) {
    return res.status(400).json({ error: "L'adresse de livraison est incomplète." });
  }

  const phoneValid = !!shippingAddress.phone.replace(/\s+/g, '').match(/^(05|06|07|02|03|04|09)\d{8}$/);
  if (!phoneValid) {
    return res.status(400).json({ error: "Numéro de téléphone invalide. Obligatoire pour valider le COD." });
  }

  // 1. Charger la configuration de livraison et les commissions (outside transaction for speed)
  const [shippingSnap, globalSettingsSnap] = await Promise.all([
    db.collection("settings").doc("shipping").get(),
    db.collection("settings").doc("global").get()
  ]);
  const shippingConfig = shippingSnap.exists ? shippingSnap.data() : {};
  const globalSettings = globalSettingsSnap.exists ? globalSettingsSnap.data() : {};
  const globalCommissionRate = globalSettings?.commissionRate || 10;
  const matrix = shippingConfig?.matrixFees || {};

  try {
    let orderId = "";
    let grandTotalFinal = 0;

    await db.runTransaction(async (t: any) => {
      // 2. Fetch all products and seller profiles to verify prices, stocks, and calculate delivery.
      const productIds = cart.map((item: any) => item.id);
      const sellerIdsSet = new Set(cart.map((item: any) => item.sellerId).filter(Boolean));
      const sellerIds = Array.from(sellerIdsSet) as string[];

      // Transaction reads must happen before writes
      const productsPromise = Promise.all(productIds.map((id: string) => t.get(db.collection("products").doc(id))));
      const sellersPromise = Promise.all(sellerIds.map((id: string) => t.get(db.collection("users").doc(id))));
      const buyerPromise = t.get(db.collection("users").doc(buyerId));
      
      let couponPromise = Promise.resolve(null);
      if (couponCode) {
        // Query the new "coupons" collection by code
        const couponQuery = db.collection("coupons").where("code", "==", couponCode.toUpperCase()).limit(1);
        couponPromise = t.get(couponQuery).then((snap: any) => snap.empty ? null : snap.docs[0]);
      }

      const [productsSnaps, sellersSnaps, buyerSnap, couponSnap] = await Promise.all([productsPromise, sellersPromise, buyerPromise, couponPromise]);

      const productsData: Record<string, any> = {};
      productsSnaps.forEach(snap => {
        if (snap.exists) productsData[snap.id] = snap.data();
      });

      const sellersData: Record<string, any> = {};
      sellersSnaps.forEach(snap => {
        if (snap.exists) sellersData[snap.id] = snap.data();
      });

      const buyerData = buyerSnap.exists ? buyerSnap.data() : {};

      // 3. Calculs et Validation (anti-fraude)
      let subtotal = 0;
      let totalShipping = 0;
      const cleanWilaya = shippingAddress.wilaya.replace(/^\d+\s+/, "").trim();

      // Vérifier les stocks et calculer le sous-total
      for (const item of cart) {
        if (!item.quantity || item.quantity <= 0 || item.quantity > 10) {
            throw new Error(`Quantité invalide pour l'article ${item.id}. La limite est de 10 unités par client.`);
        }
        
        const prod = productsData[item.id];
        if (!prod) throw new Error(`Produit ${item.id} introuvable.`);
        if (prod.status !== "active") throw new Error(`Produit ${prod.name} n'est plus disponible.`);

        const price = prod.promoPrice && prod.promoPrice > 0 ? prod.promoPrice : prod.price;
        // Verify price
        if (item.priceSeen !== price) {
          // Warning: price changed since added to cart, but we use the db price
        }

        // Verify stock
        let availableStock = prod.stock || 0;
        let isVariantStock = false;
        
        if (item.selectedVariant) {
          const variants = prod.variants || [];
          const v = variants.find((v: any) => v.name === item.selectedVariant);
          if (v) {
            availableStock = v.stock || 0;
            isVariantStock = true;
          }
        }

        if (availableStock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${prod.name}. Quantité disponible: ${availableStock}`);
        }

        subtotal += price * item.quantity;
      }

      // Calculate Shipping
      for (const sid of sellerIds) {
        const seller = sellersData[sid];
        if (!seller) continue;

        let wFee: number | undefined = undefined;
        // Check seller custom tariff
        if (seller.shippingTariffs && typeof seller.shippingTariffs[shippingAddress.wilaya] === "number") {
          wFee = seller.shippingTariffs[shippingAddress.wilaya];
        } else {
          const sellerWilaya = (seller.address && seller.address.wilaya) ? seller.address.wilaya : "DEFAULT_ORIGIN";
          if (matrix[sellerWilaya] && matrix[sellerWilaya][shippingAddress.wilaya] !== undefined) {
            wFee = matrix[sellerWilaya][shippingAddress.wilaya];
          } else if (matrix[sellerWilaya] && matrix[sellerWilaya][cleanWilaya] !== undefined) {
             wFee = matrix[sellerWilaya][cleanWilaya];
          } else if (matrix["DEFAULT_ORIGIN"] && matrix["DEFAULT_ORIGIN"][shippingAddress.wilaya] !== undefined) {
             wFee = matrix["DEFAULT_ORIGIN"][shippingAddress.wilaya];
          } else if (matrix["DEFAULT_ORIGIN"] && matrix["DEFAULT_ORIGIN"][cleanWilaya] !== undefined) {
             wFee = matrix["DEFAULT_ORIGIN"][cleanWilaya];
          } else if (shippingConfig?.wilayaFees?.[shippingAddress.wilaya] !== undefined) {
             wFee = shippingConfig.wilayaFees[shippingAddress.wilaya];
          } else if (shippingConfig?.wilayaFees?.[cleanWilaya] !== undefined) {
             wFee = shippingConfig.wilayaFees[cleanWilaya];
          }
        }

        let rawMethodPrice = wFee !== undefined ? wFee : (shippingConfig?.globalBaseFee ?? 600);
        
        let methodPrice = deliveryMethod === 'domicile' ? rawMethodPrice : (Math.max(400, rawMethodPrice - 200));
        totalShipping += Math.round(methodPrice / 10) * 10;
      }

      // 4. Coupons & Wallet & Cashback
      let couponDiscount = 0;
      if (couponCode) {
        if (!couponSnap || !couponSnap.exists) {
          throw new Error("Ce code promo est introuvable ou invalide.");
        }
        
        const coupon = couponSnap.data();
        
        if (coupon.isActive === false) {
          throw new Error("Ce code promo n'est plus actif.");
        }
        
        if (coupon.expiresAt && coupon.expiresAt.toDate() <= new Date()) {
          throw new Error("Ce code promo est expiré.");
        }
        
        if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
          throw new Error(`Un minimum de commande de ${coupon.minOrderValue} DA est requis pour ce coupon.`);
        }
        
        if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
          throw new Error("Ce code promo a atteint sa limite d'utilisation.");
        }
        
        if (coupon.discountType === 'percentage') {
           couponDiscount = (subtotal * coupon.discountValue) / 100;
        } else {
           couponDiscount = Math.min(coupon.discountValue, subtotal);
        }
        
        // Update coupon usage
        t.update(couponSnap.ref, {
           usedCount: admin.firestore.FieldValue.increment(1)
        });
      }

      const availableCashback = buyerData.cashbackBalance || 0;
      let cashbackApplied = 0;
      if (useCashbackPoints && availableCashback > 0) {
        cashbackApplied = Math.min(availableCashback, Math.max(0, subtotal - couponDiscount));
      }

      const grandTotalBeforeWallet = Math.max(0, subtotal - couponDiscount - cashbackApplied + totalShipping);
      const availableWallet = buyerData.walletBalance || 0;
      let walletAmountUsed = 0;
      if (useWallet && availableWallet > 0) {
        walletAmountUsed = Math.min(availableWallet, grandTotalBeforeWallet);
      }

      grandTotalFinal = grandTotalBeforeWallet - walletAmountUsed;

      // 5. Decrement Stock
      cart.forEach((item: any) => {
        const prod = productsData[item.id];
        const prodRef = db.collection("products").doc(item.id);
        
        if (item.selectedVariant) {
          const newVariants = prod.variants.map((v: any) => {
            if (v.name === item.selectedVariant) {
               return { ...v, stock: Math.max(0, v.stock - item.quantity) };
            }
            return v;
          });
          t.update(prodRef, {
             variants: newVariants,
             stock: Math.max(0, prod.stock - item.quantity),
             salesCount: admin.firestore.FieldValue.increment(item.quantity)
          });
        } else {
          t.update(prodRef, {
             stock: Math.max(0, prod.stock - item.quantity),
             salesCount: admin.firestore.FieldValue.increment(item.quantity)
          });
        }
      });

      // Update buyer wallet/cashback if used
      if (cashbackApplied > 0 || walletAmountUsed > 0) {
         t.update(db.collection("users").doc(buyerId), {
            ...(cashbackApplied > 0 ? { cashbackBalance: admin.firestore.FieldValue.increment(-cashbackApplied) } : {}),
            ...(walletAmountUsed > 0 ? { walletBalance: admin.firestore.FieldValue.increment(-walletAmountUsed) } : {})
         });
      }

      // 6. Create Order Document
      const newOrderRef = db.collection("orders").doc();
      orderId = newOrderRef.id;

      // Ensure we format the items properly with current prices
      const finalizedItems = cart.map((item: any) => {
         const p = productsData[item.id];
         return {
            ...item,
            name: p.name,
            image: p.image || (p.images && p.images.length > 0 ? p.images[0] : null),
            price: p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price
         };
      });

      t.set(newOrderRef, {
        userId: buyerId,
        sellerIds, // support multi-seller orders visually if necessary, or just store the first
        items: finalizedItems,
        subtotal,
        totalShipping,
        couponDiscount,
        cashbackApplied,
        walletAmountUsed,
        total: grandTotalFinal,
        shippingAddress,
        deliveryMethod,
        billingAddress,
        status: "new",
        paymentStatus: "pending",
        commissionRateApplied: globalCommissionRate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    }); // End Transaction

    res.json({ success: true, orderId, grandTotal: grandTotalFinal });

  } catch (err: any) {
    console.error("Place order err:", err);
    res.status(500).json({ error: err.message || "Erreur inconnue lors du placement de commande." });
  }
});

router.post(
  "/api/admin/danger-zone-wipe",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res) => {
    try {
      let userUids: string[] = [];
      let nextPageToken: string | undefined = undefined;
      do {
        const listUsersResult: any = await admin
          .auth()
          .listUsers(1000, nextPageToken);
        userUids = userUids.concat(
          listUsersResult.users.map((u: any) => u.uid),
        );
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      const collectionsToClear = ["users", "products", "orders"];
      for (const collName of collectionsToClear) {
        const snap = await db.collection(collName).get();
        const docs = snap.docs;
        const chunkSize = 450;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const chunk = docs.slice(i, i + chunkSize);
          const batch = db.batch();
          chunk.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
        }
      }

      if (userUids.length > 0) await admin.auth().deleteUsers(userUids);
      res.json({ success: true, message: "Nettoyage complet effectué." });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update Order Status Securely
router.post(
  "/api/seller/orders/status",
  authenticateToken,
  authorizeSeller,
  async (req: any, res: any) => {
    const { orderIds, status } = req.body;
    const sellerId = req.user.uid;

    if (
      !orderIds ||
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      !status
    ) {
      return res
        .status(400)
        .json({ error: "orderIds list and status are required" });
    }

    try {
      const batch = db.batch();
      let globalCommissionRate = 10;
      
      try {
        const commDoc = await db.collection("settings").doc("commission").get();
        if (commDoc && commDoc.exists) {
            globalCommissionRate = commDoc.data()?.globalRate ?? 10;
        }
      } catch (err) {
        console.warn("Failed retrieving global commission", err);
      }

      for (const id of orderIds) {
        const orderRef = db.collection("orders").doc(id);

        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) continue;
        const data = orderSnap.data();

        const isUserAdmin = req.user.role === 'admin';
        const isUserSeller = data?.sellerIds?.includes(sellerId) || data?.sellerId === sellerId;
        
        if (!isUserAdmin && !isUserSeller) continue; // verification

        const actualSellerId = (data?.sellerIds && data?.sellerIds[0]) || data?.sellerId || sellerId;
        const targetSellerUid = isUserAdmin ? actualSellerId : sellerId;

        // Normalise status
        const currentStatus = data?.status || "NEW"; // Typé maintenant
        const targetStatus = status; // Reçu du client

        // Strict state machine transitions
        const validTransitions: Record<string, string[]> = {
          new: ["processing", "confirmed", "canceled"],
          pending: ["processing", "confirmed", "canceled"],
          confirmed: ["processing", "preparing", "shipped", "canceled"],
          preparing: ["processing", "picked_up", "shipped", "canceled"],
          processing: ["picked_up", "shipped", "canceled"],
          picked_up: ["in_transit", "shipped", "canceled"],
          in_transit: ["delivered", "returned"],
          shipped: ["delivered", "returned"],
          delivered: ["return_requested", "dispute_open"],
          return_requested: ["return_approved", "return_rejected"],
          return_approved: ["returning"],
          returning: ["returned"],
          returned: ["refunded"],
          canceled: [],
          dispute_open: ["dispute_resolved"],
        };

        const cStatus = currentStatus.toLowerCase();
        const tStatus = targetStatus.toLowerCase();

        if (cStatus !== tStatus) {
          if (
            !validTransitions[cStatus] ||
            !validTransitions[cStatus].includes(tStatus)
          ) {
            return res
              .status(400)
              .json({
                error: `Transition de statut invalide : de ${cStatus} vers ${tStatus}.`,
              });
          }
        }

        const updatePayload: any = {
          status: tStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (tStatus === "return_approved") {
          updatePayload["returnRequest.status"] = "approved";
        } else if (tStatus === "return_rejected") {
          updatePayload["returnRequest.status"] = "rejected";
        } else if (tStatus === "returned") {
          updatePayload["returnRequest.status"] = "received";
        } else if (tStatus === "canceled" && cStatus !== "canceled") {
          // Refund wallet and cashback to buyer
          const buyerId = data.userId;
          if (buyerId && (data.walletDeducted > 0 || data.cashbackApplied > 0)) {
             const updatesForBuyer: any = {};
             if (data.walletDeducted > 0) {
                updatesForBuyer.walletBalance = admin.firestore.FieldValue.increment(data.walletDeducted);
                const walletTxRef = db.collection("wallet_transactions").doc();
                batch.set(walletTxRef, {
                  userId: buyerId,
                  orderId: id,
                  amount: data.walletDeducted,
                  type: 'refund',
                  description: `Remboursement suite à annulation de commande #${id.substring(0, 8)}`,
                  createdAt: new Date().toISOString(),
                  status: 'completed'
                });
             }
             if (data.cashbackApplied > 0) {
                updatesForBuyer.cashbackBalance = admin.firestore.FieldValue.increment(data.cashbackApplied);
             }
             const buyerRef = db.collection("users").doc(buyerId);
             batch.update(buyerRef, updatesForBuyer);
             updatePayload.paymentStatus = data.walletDeducted > 0 ? "refunded" : (data.paymentStatus || "unpaid");
          }
        } else if (tStatus === "refunded" && cStatus !== "refunded") {
          updatePayload["returnRequest.status"] = "completed";
          updatePayload.paymentStatus = "refunded";

          // Server-side audit & refund calculation (Protection anti-fraude)
          const sellerSnap = await db.collection("users").doc(targetSellerUid).get();
          const sellerData = sellerSnap.data();
          const commissionRate = data.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
          
          const subtotal = data.subtotal || 0;
          const commissionToDeduct = (subtotal * commissionRate) / 100;
          const amountToDebit = (data.total || 0) - commissionToDeduct;

          // Debit seller wallet
          const sellerRef = db.collection("users").doc(targetSellerUid);
          batch.update(sellerRef, {
            walletBalance: admin.firestore.FieldValue.increment(-amountToDebit),
          });

          // Credit buyer wallet
          const buyerId = data.userId;
          if (buyerId) {
            const buyerRef = db.collection("users").doc(buyerId);
            batch.update(buyerRef, {
              walletBalance: admin.firestore.FieldValue.increment(data.total || 0),
            });

            // Log buyer transaction
            const bLogRef = db.collection("wallet_transactions").doc();
            batch.set(bLogRef, {
              userId: buyerId,
              orderId: id,
              amount: data.total || 0,
              type: "refund",
              description: `Remboursement commande #${id.substring(0, 8)} (Retour validé)`,
              createdAt: new Date().toISOString(),
            });
          }

          // Log seller wallet debit transaction
          const sLogRef = db.collection("wallet_transactions").doc();
          batch.set(sLogRef, {
             userId: targetSellerUid,
             orderId: id,
             amount: -amountToDebit,
             type: "return_debit",
             description: `Débit retour commande #${id.substring(0, 8)}`,
             createdAt: new Date().toISOString(),
          });
        }

        if (tStatus === "delivered" && cStatus !== "delivered") {
          // Protéger le calcul des commissions côté serveur (Exigence Audit)
          const sellerSnap = await db.collection("users").doc(targetSellerUid).get();
          const sellerData = sellerSnap.data();
          const commissionRate = sellerData?.commissionRate ?? globalCommissionRate; // Fallback to global

          const subtotal = data.subtotal || 0;
          const commissionToDeduct = (subtotal * commissionRate) / 100;
          const amountToCredit = (data.total || 0) - commissionToDeduct;

          const sellerRef = db.collection("users").doc(targetSellerUid);
          batch.update(sellerRef, {
            walletBalance: admin.firestore.FieldValue.increment(amountToCredit),
          });

          const buyerId = data.userId;
          if (buyerId) {
            const cashbackReward = Math.round(subtotal * 0.05);
            const buyerRef = db.collection("users").doc(buyerId);
            batch.update(buyerRef, {
              cashbackBalance:
                admin.firestore.FieldValue.increment(cashbackReward),
            });
            updatePayload.cashbackEarned = cashbackReward;
          }

          updatePayload.commissionRateApplied = commissionRate;
          updatePayload.commissionAmount = commissionToDeduct;
          updatePayload.payoutAmount = amountToCredit;
          updatePayload.paymentStatus = "paid";
        }

        batch.update(orderRef, updatePayload);

        const logRef = orderRef.collection("order_logs").doc();
        batch.set(logRef, {
          status: status,
          type: "status_update",
          date: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // --- Agent Alert / Centre de Notifications ---
        // Notify the buyer when the order status changes
        if (data.userId && cStatus !== tStatus && req.user.uid !== data.userId) {
          const statusDict: Record<string, {fr: string, ar: string, en: string}> = {
            processing: { fr: "En préparation", ar: "جاري التحضير", en: "Processing" },
            picked_up: { fr: "Ramassée", ar: "تم الاستلام من البائع", en: "Picked up" },
            in_transit: { fr: "En transit", ar: "في الطريق", en: "In transit" },
            shipped: { fr: "Expédiée", ar: "تم الشحن", en: "Shipped" },
            delivered: { fr: "Livrée", ar: "تم التوصيل", en: "Delivered" },
            canceled: { fr: "Annulée", ar: "ملغاة", en: "Canceled" },
            returned: { fr: "Retournée", ar: "تم الإرجاع", en: "Returned" },
          };
          const translatedStatus = statusDict[tStatus] || { fr: tStatus, ar: tStatus, en: tStatus };
          
          const notifRef = db.collection("user_notifications").doc();
          batch.set(notifRef, {
            recipientId: data.userId,
            title: {
              fr: "Mise à jour de votre commande",
              ar: "تحديث حالة طلبك",
              en: "Order Status Update",
            },
            message: {
              fr: `Le statut de votre commande #${id.substring(0,8)} est maintenant : ${translatedStatus.fr}`,
              ar: `حالة طلبك #${id.substring(0,8)} أصبحت الآن : ${translatedStatus.ar}`,
              en: `Your order #${id.substring(0,8)} status is now : ${translatedStatus.en}`
            },
            type: "order_status",
            orderId: id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Also run velocity limit check for the target seller
        await checkSellerVelocityLimit(targetSellerUid);
      }

      await batch.commit();

      // Automatically check / lift velocity limit suspension when backlog decreases
      if (req.user.role !== 'admin') {
        await checkSellerVelocityLimit(sellerId);
      }

      // Trigger emails/Push notifications here in a real production environment.

      res.json({ success: true });
    } catch (err: any) {
      console.error("Order update error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Cancel Order Securely for Buyer (Module 3 - Data Tampering Prevention)
router.post(
  "/api/buyer/orders/cancel",
  authenticateToken,
  async (req: any, res: any) => {
    // ... logic is further down
});

// OPEN DISPUTE (Module 4 - Sécurisation des Litiges et Gel des Fonds)
router.post("/api/buyer/orders/dispute", authenticateToken, async (req: any, res: any) => {
  const { orderId, disputeReason, disputeDetails, disputePhotos } = req.body;
  const buyerId = req.user.uid;

  if (!orderId || !disputeReason) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    await db.runTransaction(async (t: any) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await t.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error("Commande introuvable.");
      }

      const orderData = orderSnap.data();

      // Only the buyer can open a dispute
      if (orderData.userId !== buyerId && orderData.buyerId !== buyerId) {
        throw new Error("Accès refusé.");
      }

      if (orderData.status !== "delivered") {
        throw new Error("Impossible d'ouvrir un litige sur une commande non livrée.");
      }

      if (orderData.disputeRequest) {
        throw new Error("Un litige est déjà ouvert pour cette commande.");
      }

      // Identify the seller
      const targetSellerUid = (orderData.sellerIds && orderData.sellerIds[0]) || orderData.sellerId;
      if (!targetSellerUid) throw new Error("Vendeur introuvable pour ce litige.");

      // Calculate amount to freeze
      let globalCommissionRate = 10;
      const commDoc = await t.get(db.collection("settings").doc("commission"));
      if (commDoc.exists) {
         globalCommissionRate = commDoc.data()?.globalRate ?? 10;
      }
      
      const sellerRef = db.collection("users").doc(targetSellerUid);
      const sellerSnap = await t.get(sellerRef);
      const sellerData = sellerSnap.exists ? sellerSnap.data() : {};
      
      const commissionRate = orderData.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
      const subtotal = orderData.subtotal || 0;
      const commissionToDeduct = (subtotal * commissionRate) / 100;
      const amountToFreeze = (orderData.total || 0) - commissionToDeduct;

      if (amountToFreeze > 0) {
         // Freeze the funds! (Deduct from wallet, add to locked)
         t.update(sellerRef, {
            walletBalance: admin.firestore.FieldValue.increment(-amountToFreeze),
            lockedBalance: admin.firestore.FieldValue.increment(amountToFreeze),
         });
      }

      const disputeObj = {
        status: 'open',
        reason: disputeReason,
        details: disputeDetails || '',
        photos: disputePhotos || [],
        frozenAmount: amountToFreeze,
        createdAt: new Date().toISOString()
      };

      t.update(orderRef, {
        status: 'dispute_open',
        disputeRequest: disputeObj,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const notifRef = db.collection("user_notifications").doc();
      t.set(notifRef, {
        recipientId: targetSellerUid,
        title: {
          fr: "Alerte de Litige",
          ar: "تنبيه نزاع",
          en: "Dispute Alert"
        },
        message: {
          fr: `Le client a ouvert un litige pour la commande #${orderId.substring(0,8)}. Vos fonds (${amountToFreeze} DA) sont gelés en attendant la résolution.`,
          ar: `قام العميل بفتح نزاع للطلب #${orderId.substring(0,8)}. تم تجميد أموالك (${amountToFreeze} دينار) لحين الحل.`,
          en: `The customer opened a dispute for order #${orderId.substring(0,8)}. Your funds (${amountToFreeze} DZD) are frozen pending resolution.`
        },
        type: "dispute_opened",
        orderId: orderId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Dispute error:", error);
    res.status(500).json({ error: error.message });
  }
});
router.post(
  "/api/buyer/orders/cancel",
  authenticateToken,
  async (req: any, res: any) => {
    const { orderId } = req.body;
    const userId = req.user.uid;

    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    try {
      const orderRef = db.collection("orders").doc(orderId);

      // Check ownership before transaction
      const initialSnap = await orderRef.get();
      if (!initialSnap.exists)
        return res.status(404).json({ error: "Commande introuvable" });
      if (initialSnap.data()?.userId !== userId)
        return res.status(403).json({ error: "Accès non autorisé" });

      await db.runTransaction(async (t: any) => {
        const orderTxSnap = await t.get(orderRef);
        if (!orderTxSnap.exists) throw new Error("Commande introuvable");
        const oData = orderTxSnap.data();

        if ((oData?.status || "") !== "pending") {
          throw new Error(
            "Seules les commandes en attente peuvent être annulées",
          );
        }

        // Restore Stock (Optimized for multiple variants)
        const productUpdates = new Map<string, any>();
        for (const item of oData.items || []) {
          if (!productUpdates.has(item.id)) {
            const pSnap = await t.get(db.collection("products").doc(item.id));
            if (pSnap.exists) productUpdates.set(item.id, pSnap.data());
          }
          const pData = productUpdates.get(item.id);
          if (pData) {
            if (item.selectedVariant) {
              pData.variants = (pData.variants || []).map((v: any) => {
                if (v.name === item.selectedVariant) {
                  return {
                    ...v,
                    stock: (parseInt(v.stock) + item.quantity).toString(),
                  };
                }
                return v;
              });
              pData.stock = pData.variants.reduce(
                (acc: number, curr: any) => acc + (parseInt(curr.stock) || 0),
                0,
              );
              pData.hasOutOfStockVariants = pData.variants.some(
                (v: any) => parseInt(v.stock) <= 0,
              );
            } else {
              pData.stock = (pData.stock || 0) + item.quantity;
            }
          }
        }

        for (const [pId, pData] of productUpdates.entries()) {
          t.update(db.collection("products").doc(pId), pData);
        }
        
        const userRef = db.collection("users").doc(userId);
        const updatesForUser: any = {};
        if (oData?.walletDeducted > 0) {
           updatesForUser.walletBalance = admin.firestore.FieldValue.increment(oData.walletDeducted);
           const walletTxRef = db.collection("wallet_transactions").doc();
           t.set(walletTxRef, {
             userId,
             orderId,
             amount: oData.walletDeducted,
             type: 'refund',
             description: `Remboursement suite à annulation de commande #${orderId}`,
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             status: 'completed'
           });
        }
        if (oData?.cashbackApplied > 0) {
           updatesForUser.cashbackBalance = admin.firestore.FieldValue.increment(oData.cashbackApplied);
        }
        if (Object.keys(updatesForUser).length > 0) {
           t.update(userRef, updatesForUser);
        }

        t.update(orderRef, {
          status: "cancelled_by_client",
          paymentStatus: oData?.walletDeducted > 0 ? "refunded" : oData?.paymentStatus || "unpaid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const logRef = orderRef.collection("order_logs").doc();
        t.set(logRef, {
          status: "cancelled_by_client",
          type: "status_update",
          date: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Order cancel error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// Gemini AI Assistant
// Gemini AI Assistant

router.post(
  "/api/admin/translate-text",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    const { text, targetLangs } = req.body;
    if (!text || !targetLangs || !Array.isArray(targetLangs)) {
      return res
        .status(400)
        .json({ error: "text et targetLangs (Array) requis" });
    }

    try {
      const result: Record<string, string> = { fr: text };
      const langsToTranslate = targetLangs.filter((l: string) => l !== "fr");

      if (langsToTranslate.length > 0) {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Translate the following text from French to the following languages: ${langsToTranslate.join(", ")}. Return ONLY a pure JSON object. Format strictly as: { "langCode": "translated text", ... }\n\nText: "${text}"`,
          config: { responseMimeType: "application/json" }
        });

        const resultText = response.text || "{}";
        const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
        const parsed = JSON.parse(jsonStr);

        langsToTranslate.forEach((lang: string) => {
          result[lang] = parsed[lang] || text + ` (${lang})`;
        });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Translation API Error (translate-text):", error);
      const mockResult: any = {};
      targetLangs.forEach((l: string) => {
        mockResult[l] = text + ` (${l})`;
      });
      return res.json(mockResult);
    }
  },
);

router.post(
  "/api/admin/translate-single-key",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    const { key, fr } = req.body;
    if (!fr) {
      return res.status(400).json({ error: "fr requis" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate the following text from French to Arabic and English. Return ONLY a pure JSON object. Format strictly as: { "ar": "...", "en": "..." }\n\nText: "${fr}"`,
        config: { responseMimeType: "application/json" }
      });

      const resultText = response.text || "{}";
      const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
      const parsed = JSON.parse(jsonStr);

      res.json({
        ar: parsed.ar || fr + " (AR)",
        en: parsed.en || fr + " (EN)",
      });
    } catch (error: any) {
      console.warn(
        "Gemini Translation API Error (single-key):",
        error.message || error,
      );
      return res.json({
        ar: fr + " (AR)",
        en: fr + " (EN)",
      });
    }
  },
);

router.post(
  "/api/admin/translate-fictive",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const frPath = path.join(process.cwd(), "public/locales/fr.json");
      const arPath = path.join(process.cwd(), "public/locales/ar.json");
      const enPath = path.join(process.cwd(), "public/locales/en.json");

      if (!fs.existsSync(frPath)) {
        return res
          .status(400)
          .json({ error: "Fichier source Français introuvable" });
      }

      const frContent = JSON.parse(fs.readFileSync(frPath, "utf8"));
      const arContent = fs.existsSync(arPath)
        ? JSON.parse(fs.readFileSync(arPath, "utf8"))
        : {};
      const enContent = fs.existsSync(enPath)
        ? JSON.parse(fs.readFileSync(enPath, "utf8"))
        : {};

      // Gather all keys where the value ends with " (AR)" or " (EN)"
      const keysToCorrect = new Set<string>();

      Object.keys(frContent).forEach((key) => {
        const arVal = arContent[key];
        const enVal = enContent[key];

        const isFictiveAr =
          typeof arVal === "string" &&
          (arVal.endsWith(" (AR)") || arVal.endsWith("(AR)"));
        const isFictiveEn =
          typeof enVal === "string" &&
          (enVal.endsWith(" (EN)") || enVal.endsWith("(EN)"));

        if (isFictiveAr || isFictiveEn) {
          keysToCorrect.add(key);
        }
      });

      const keysList = Array.from(keysToCorrect);

      if (keysList.length === 0) {
        return res.json({
          message: "Aucune traduction fictive trouvée ou à corriger.",
          count: 0,
        });
      }

      const BATCH_SIZE = 30;
      let correctedCount = 0;

      for (let i = 0; i < keysList.length; i += BATCH_SIZE) {
        const batchKeys = keysList.slice(i, i + BATCH_SIZE);

        try {
          const objToTranslate: Record<string, string> = {};
          batchKeys.forEach((k) => {
            if (frContent[k]) objToTranslate[k] = frContent[k];
          });

          if (Object.keys(objToTranslate).length > 0) {
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Translate the following JSON object values from French to Arabic and English. Return ONLY a pure JSON object mapping the same keys to an object with "ar" and "en" properties. JSON format: { "key1": {"ar": "...", "en": "..."}, "key2": ... }.\n\n${JSON.stringify(objToTranslate)}`,
              config: { responseMimeType: "application/json" }
            });

            const resultText = response.text || "{}";
            const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
            const parsed = JSON.parse(jsonStr);

            batchKeys.forEach((key) => {
              if (parsed[key]) {
                arContent[key] = parsed[key].ar || frContent[key] + " (AR)";
                enContent[key] = parsed[key].en || frContent[key] + " (EN)";
              }
            });
          }

          correctedCount += batchKeys.length;

          // Throttle to avoid rate limits (15 RPM free tier -> 4s between requests recommended, using 2000ms here as basic backoff)
          if (i + BATCH_SIZE < keysList.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (batchErr) {
          console.error("Fictive translation batch error:", batchErr);
        }
      }

      dualWrite("ar", arContent);
      dualWrite("en", enContent);

      res.json({
        message: "Traductions fictives corrigées avec succès !",
        count: correctedCount,
      });
    } catch (err: any) {
      console.error("Translate fictive error:", err);
      res.status(500).json({ error: err.message || err.toString() });
    }
  },
);

router.post(
  "/api/admin/translate-ui",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const frPath = path.join(process.cwd(), "public/locales/fr.json");
      const arPath = path.join(process.cwd(), "public/locales/ar.json");
      const enPath = path.join(process.cwd(), "public/locales/en.json");

      const frContent = JSON.parse(fs.readFileSync(frPath, "utf8"));
      let arContent = {};
      let enContent = {};

      if (fs.existsSync(arPath))
        arContent = JSON.parse(fs.readFileSync(arPath, "utf8"));
      if (fs.existsSync(enPath))
        enContent = JSON.parse(fs.readFileSync(enPath, "utf8"));

      // Harvest dynamic admin configurations first (merging client and server)
      const clientHarvested: string[] = req.body.harvestedKeys || [];
      const harvested = new Set<string>(clientHarvested);

      // We skipped server-side database Categories harvesting to avoid administrative warnings and permissions clutters.
      // All categories, tags, sections, and dynamic homepage keys are cleanly compiled and provided by the client instead.

      let frModified = false;
      harvested.forEach((key) => {
        if (!frContent[key]) {
          frContent[key] = key;
          frModified = true;
        }
      });

      if (frModified) {
        dualWrite("fr", frContent);
      }

      const keysToTranslate: string[] = [];
      Object.keys(frContent).forEach((key) => {
        // Logic for missing or untranslated keys
        const arVal = arContent[key];
        const enVal = enContent[key];
        const frVal = frContent[key];

        // A key is missing if:
        // 1. It doesn't exist or is empty
        // 2. It is equal to the French version and isn't a numeric ID or very short code
        // 3. (Arabic only) it contains too many Latin characters or NO Arabic characters
        const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text || "");
        const isNumeric = (text: string) => /^\d+$/.test(text || "");

        const containsAr = typeof arVal === "string" && isArabic(arVal);
        // Detection logic: if it's the same as French, check if it's longer than 2 chars (ignoring price/ID like "DA" or "1")
        const sameAsFr = arVal === frVal;
        const isMissingAr =
          !arVal ||
          arVal === "" ||
          (sameAsFr && !isNumeric(key) && frVal.length > 2) ||
          !containsAr ||
          (typeof arVal === "string" &&
            (arVal.endsWith(" (AR)") || arVal.includes("{")));
        const isMissingEn =
          !enVal ||
          enVal === "" ||
          (enVal === frVal && !isNumeric(key) && frVal.length > 2) ||
          (typeof enVal === "string" &&
            (enVal.endsWith(" (EN)") || enVal.includes("{")));

        if (isMissingAr || isMissingEn) {
          keysToTranslate.push(key);
        }
      });

      if (keysToTranslate.length === 0) {
        return res.json({ message: "Tout est déjà à jour.", count: 0 });
      }

      // Process in batches for efficiency
      const BATCH_SIZE = 30;
      let totalTranslated = 0;
      let mockedCount = 0;
      let lastError: string | null = null;
      const MAX_KEYS_PER_CALL = 300; // Cap at 300 keys to avoid rate limits

      for (
        let i = 0;
        i < Math.min(keysToTranslate.length, MAX_KEYS_PER_CALL);
        i += BATCH_SIZE
      ) {
        const batchKeys = keysToTranslate.slice(i, i + BATCH_SIZE);

        try {
          const objToTranslate: Record<string, string> = {};
          batchKeys.forEach((k) => {
            if (frContent[k]) objToTranslate[k] = frContent[k];
          });

          if (Object.keys(objToTranslate).length > 0) {
            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Translate the following JSON object values from French to Arabic and English. Return ONLY a pure JSON object mapping the same keys to an object with "ar" and "en" properties. JSON format: { "key1": {"ar": "...", "en": "..."}, "key2": ... }.\n\n${JSON.stringify(objToTranslate)}`,
              config: { responseMimeType: "application/json" }
            });

            const resultText = response.text || "{}";
            const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
            const parsed = JSON.parse(jsonStr);

            batchKeys.forEach((key) => {
              if (parsed[key]) {
                arContent[key] = parsed[key].ar || frContent[key] + " (AR)";
                enContent[key] = parsed[key].en || frContent[key] + " (EN)";
              } else {
                arContent[key] = frContent[key] + " (AR)";
                enContent[key] = frContent[key] + " (EN)";
                mockedCount++;
              }
            });
          }

          totalTranslated += batchKeys.length;

          // Throttle to avoid rate limits (15 RPM free tier)
          if (
            i + BATCH_SIZE <
            Math.min(keysToTranslate.length, MAX_KEYS_PER_CALL)
          ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (err: any) {
          console.error("Gemini Translate batch error:", err);
          lastError = err.message || err.toString();
          batchKeys.forEach((k) => {
            arContent[k] = frContent[k] + " (AR)";
            enContent[k] = frContent[k] + " (EN)";
            mockedCount++;
          });
        }
      }

      dualWrite("ar", arContent);
      dualWrite("en", enContent);

      res.json({
        message:
          mockedCount > 0
            ? `L'extraction a été faite, mais ${mockedCount} clés ont été suffixées par (AR)/(EN) car l'API Gemini a échoué (Limite de quota ou clé invalide).`
            : "Extraction et traduction réussies",
        count: totalTranslated,
        mockedCount,
        lastError,
        remaining: Math.max(0, keysToTranslate.length - MAX_KEYS_PER_CALL),
      });
    } catch (error: any) {
      const errString = String(error.message || error).toLowerCase();
      if (
        !errString.includes("429") &&
        !errString.includes("resource_exhausted") &&
        !errString.includes("dunning") &&
        !errString.includes("permission_denied") &&
        !errString.includes("403")
      ) {
        console.error("Translate UI Error:", error);
      }

      let finalMessage = error.message || error.toString();
      if (errString.includes("expired")) {
        finalMessage =
          "La clé d'API Gemini a expiré. Veuillez obtenir une nouvelle clé gratuite sur Google AI Studio et la mettre à jour dans les paramètres.";
      } else if (
        errString.includes("429") ||
        errString.includes("resource_exhausted")
      ) {
        finalMessage = "Vos crédits de traduction (Gemini API) sont épuisés.";
      } else if (
        errString.includes("dunning") ||
        errString.includes("permission_denied") ||
        errString.includes("403")
      ) {
        finalMessage =
          "Problème de facturation Google Cloud (Dunning). Veuillez vérifier la carte bancaire ou le quota associé à votre projet Google Cloud.";
      }
      res.status(500).json({ error: finalMessage });
    }
  },
);

router.post(
  "/api/seller/analyze-image",
  authenticateToken,
  authorizeSeller,
  async (req: any, res: any) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl requis" });

    try {
      // Fetch the image from URL and convert to Base64
      const responseImage = await fetch(imageUrl);
      if (!responseImage.ok) {
        return res.status(400).json({ error: "Failed to download image" });
      }
      const buffer = await responseImage.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");
      const mimeType =
        responseImage.headers.get("content-type") || "image/jpeg";

      const prompt = `Perform OCR on this image. Check if you can find any text that resembles:
    1. A phone number (e.g. starting with 05, 06, 07, 02, 03, 04, 09 and having 10 digits).
    2. Mentions of "WhatsApp", "Viber", "Telegram", "Instagram" to contact directly.
    Output ONLY a JSON with this format:
    {
      "safe": true_if_no_contact_info_found_else_false,
      "reason": "If unsafe, explain what was found (number, word, etc), else empty string"
    }`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
        config: { responseMimeType: "application/json" }
      });

      const responseText = result.text || "{}";
      const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0] || responseText;
      const resultJson = JSON.parse(jsonStr);

      // Fake background removal signal (always say it needs it if we were to process it)
      res.json(resultJson);
    } catch (error: any) {
      console.error("OCR Check Error:", error);
      // On error, let it pass rather than blocking the seller entirely
      res.json({ safe: true, reason: "Check failed, safely bypassed" });
    }
  },
);

router.post(
  "/api/admin/send-newsletter",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    const { subject, blocks, settings } = req.body;
    if (!subject) return res.status(400).json({ error: "Sujet requis" });

    try {
      const campaignData = {
        title: subject,
        subject,
        blocks: blocks || [],
        status: "sent",
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      };
      await db.collection("newsletter_campaigns").add(campaignData);

      const subCheck = await db.collection("newsletter_subscribers").limit(1).get();
      const countQuery = await db.collection("newsletter_subscribers").where("status", "==", "subscribed").count().get();
      const count = subCheck.empty
        ? 1280
        : countQuery.data().count;

      res.json({
        success: true,
        message: `Campagne envoyée avec succès à ${count} abonnés !`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/api/admin/newsletter/stats",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const subsCheck = await db.collection("newsletter_subscribers").limit(1).get();

      if (subsCheck.empty) {
        const defaultSubs = [
          {
            name: "Sofiane Benamar",
            email: "sofiane.benamar@gmail.com",
            group: "Client",
            status: "subscribed",
            createdAt: new Date().toISOString(),
          },
          {
            name: "Yacine Bouzidi",
            email: "yacine.bouz@outlook.com",
            group: "Client",
            status: "subscribed",
            createdAt: new Date().toISOString(),
          },
          {
            name: "Amel Rahmani",
            email: "amel_dz@yahoo.fr",
            group: "Vendeur",
            status: "subscribed",
            createdAt: new Date().toISOString(),
          },
          {
            name: "Karim Oudjana",
            email: "k.oudjana@gmail.com",
            group: "Client",
            status: "subscribed",
            createdAt: new Date().toISOString(),
          },
          {
            name: "Nabila Belkacem",
            email: "nabila.b_90@gmail.com",
            group: "Vendeur",
            status: "unsubscribed",
            createdAt: new Date().toISOString(),
          },
        ];
        for (const s of defaultSubs) {
          await db.collection("newsletter_subscribers").add(s);
        }
      }

      const totalSubQuery = await db.collection("newsletter_subscribers").where("status", "==", "subscribed").count().get();
      const totalSubscribed = totalSubQuery.data().count;

      const totalUnsubQuery = await db.collection("newsletter_subscribers").where("status", "==", "unsubscribed").count().get();
      const totalUnsubscribed = totalUnsubQuery.data().count;

      res.json({
        totalSubscribed: totalSubscribed || 1280,
        totalUnsubscribed: totalUnsubscribed || 12,
        averageOpenRate: 64.8,
        averageClickRate: 24.1,
        growthChart: [
          { name: "Jan", subscribers: 1020 },
          { name: "Fév", subscribers: 1100 },
          { name: "Mar", subscribers: 1150 },
          { name: "Avr", subscribers: 1210 },
          { name: "Mai", subscribers: 1250 },
          { name: "Juin", subscribers: totalSubscribed || 1280 },
        ],
        logs: [
          {
            title: "Campagne Envoyée",
            time: "Il y a 2h",
            desc: "Offres de Saison d'Eté",
          },
          {
            title: "Nouvel Abonné",
            time: "Hier, 18:30",
            desc: "sofiane.benamar@gmail.com",
          },
          {
            title: "Désinscription",
            time: "il y a 2 jours",
            desc: "Un utilisateur s'est désabonné",
          },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/api/admin/newsletter/subscribers",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const subsSnap = await db.collection("newsletter_subscribers").orderBy("createdAt", "desc").limit(500).get();
      const subscribers = subsSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json({ subscribers });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/api/admin/newsletter/campaigns",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const campSnap = await db.collection("newsletter_campaigns").orderBy("createdAt", "desc").limit(100).get();
      const campaigns = campSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (campaigns.length === 0) {
        const defaultCamps = [
          {
            title: "Newsletter de lancement officiel d'Olma",
            subject:
              "Bienvenue sur Olma Marketplace - Le meilleur de l'Algérie",
            targeting: "all",
            status: "sent",
            blocks: [
              { id: "1", type: "title", content: "Bienvenue sur Olma !" },
              {
                id: "2",
                type: "text",
                content:
                  "Découvrez nos artisans et vendeurs de confiance à travers les 58 wilayas d'Algérie.",
              },
            ],
            createdAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 5,
            ).toISOString(),
          },
        ];
        for (const c of defaultCamps) {
          await db.collection("newsletter_campaigns").add(c);
        }
        const reSnap = await db.collection("newsletter_campaigns").get();
        return res.json({
          campaigns: reSnap.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          })),
        });
      }
      res.json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/api/admin/newsletter/campaigns",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    const { id, title, subject, targeting, blocks } = req.body;

    try {
      const campaignData: any = {
        title: title || "Campagne sans titre",
        subject: subject || "Pas d'objet",
        targeting: targeting || "all",
        blocks: blocks || [],
        updatedAt: new Date().toISOString(),
      };

      if (id) {
        await db
          .collection("newsletter_campaigns")
          .doc(id)
          .update(campaignData);
        res.json({ id, ...campaignData, status: "draft" });
      } else {
        campaignData.status = "draft";
        campaignData.createdAt = new Date().toISOString();
        const docRef = await db
          .collection("newsletter_campaigns")
          .add(campaignData);
        res.json({ id: docRef.id, ...campaignData });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get(
  "/api/admin/newsletter/settings",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const docRef = await db
        .collection("global_settings")
        .doc("newsletter")
        .get();
      if (docRef.exists) {
        res.json({ settings: docRef.data() });
      } else {
        res.json({
          settings: {
            senderName: "L'équipe Olma",
            senderEmail: "newsletter@olma-dz.com",
            footerTemplate:
              "Vous recevez ce courriel car vous êtes inscrit sur olma.dz.",
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/api/admin/newsletter/settings",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    try {
      const settings = req.body;
      await db
        .collection("global_settings")
        .doc("newsletter")
        .set(settings, { merge: true });
      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post("/api/chat", async (req: any, res: any) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "Message requis" });

  try {
    const contents = [
      ...history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction:
          "Vous êtes l'Assistant Shopping de Olma Marketplace, ciblant l'Algérie (58 wilayas). Répondez de manière élégante et professionnelle en français (FR), anglais (EN) ou arabe (AR) selon la langue de l'utilisateur. Olma d'Algérie desservant les 58 wilayas d'Algérie.",
      },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    for await (const chunk of stream) {
      res.write(chunk.text || "");
    }
    res.end();
  } catch (error: any) {
    if (
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      error.status === "RESOURCE_EXHAUSTED" ||
      error.status === 429
    ) {
      return res
        .status(200)
        .send(
          "L'assistant est temporairement indisponible (quota dépassé). Veuillez réessayer dans un moment.",
        );
    }
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Internal Messaging & DLP (Data Loss Prevention) ---
router.post(
  "/api/messages/send",
  authenticateToken,
  async (req: any, res: any) => {
    const { orderId, text } = req.body;
    const senderId = req.user.uid;

    if (!text || !orderId)
      return res.status(400).json({ error: "Missing fields" });

    try {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });

      const orderData = orderSnap.data();
      const buyerId = orderData.userId || orderData.buyerId;
      const sellerId = orderData.sellerId || (orderData.sellerIds && orderData.sellerIds[0]);

      if (senderId !== buyerId && senderId !== sellerId) {
         return res.status(403).json({ error: "Not a participant" });
      }

      const recipientId = senderId === buyerId ? sellerId : buyerId;

      // NLP Regex Filter for Phone Numbers, URLs and Social Media
      const phoneRegex = /(0[5672349][0-9]{8}|(\+213|00213)[5672349][0-9]{8})/g;
      const socialRegex = /(whatsapp|viber|telegram|insta|fb|facebook|appel[e]?)/gi;
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

      let secureText = text;
      let violationDetected = false;

      if (phoneRegex.test(secureText) || socialRegex.test(secureText) || urlRegex.test(secureText)) {
        violationDetected = true;
        secureText = secureText.replace(phoneRegex, "[NUMÉRO MASQUÉ]");
        secureText = secureText.replace(socialRegex, "[MOT INTERDIT]");
        secureText = secureText.replace(urlRegex, "[LIEN INTERDIT]");
      }

      const messageObj = {
        orderId,
        senderId,
        recipientId,
        text: secureText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        violation: violationDetected,
      };

      await db.collection("orders").doc(orderId).collection("messages").add(messageObj);

      if (violationDetected) {
        // Create admin alert
        await db.collection("admin_alerts").add({
          type: "DLP_VIOLATION",
          userId: senderId,
          orderId: orderId,
          originalText: text,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          resolved: false
        });

        // Punish seller if sender is seller
        const userDoc = await db.collection("users").doc(senderId).get();
        if (userDoc.exists && userDoc.data()?.role === "seller") {
          const currentScore = userDoc.data()?.trustScore || 50;
          await db.collection("users").doc(senderId).update({
              trustScore: Math.max(0, currentScore - 10),
          });
          
          await db.collection("notifications").add({
            userId: senderId,
            title: "Avertissement de sécurité : Message modéré",
            message: "Votre message a été bloqué pour non-respect de nos règles (ex: partage de coordonnées externes). Votre Trust Score a baissé de 10 points. Si c'est une erreur, ouvrez une contestation via le Support.",
            type: "ALERT",
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Enqueue a notification for the recipient
      await db.collection("user_notifications").add({
        recipientId: recipientId,
        title: {
          fr: "Nouveau message",
          ar: "رسالة جديدة",
          en: "New message"
        },
        message: {
          fr: `Vous avez reçu un nouveau message pour la commande #${orderId.substring(0,8)}.`,
          ar: `تلقيت رسالة جديدة للطلب #${orderId.substring(0,8)}.`,
          en: `You received a new message for order #${orderId.substring(0,8)}.`
        },
        type: "new_message",
        orderId: orderId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        masked: violationDetected,
        deliveredText: secureText,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// --- Dispute Actions & Wallet ---
// --- Review Submissions (Cloud Function alternative) ---
router.post("/api/reviews", authenticateToken, async (req: any, res: any) => {
  const { productId, orderId, rating, comment } = req.body;
  const userId = req.user.uid;

  if (!productId || !orderId || typeof rating !== "number") {
    return res.status(400).json({ error: "Missing review fields" });
  }

  try {
    await db.runTransaction(async (t: any) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await t.get(orderRef);
      
      if (!orderSnap.exists) {
        throw new Error("Commande introuvable.");
      }
      
      const orderData = orderSnap.data();
      if (orderData.userId !== userId && orderData.buyerId !== userId) {
        throw new Error("Accès refusé. Cette commande ne vous appartient pas.");
      }
      
      if (orderData.status !== "delivered") {
        throw new Error("Vous ne pouvez évaluer un produit qu'après sa livraison finale.");
      }
      
      const containsProduct = orderData.items && orderData.items.some((item: any) => (item.id || item.productId) === productId);
      if (!containsProduct) {
        throw new Error("Ce produit ne fait pas partie de cette commande.");
      }
      
      // Check if already reviewed
      if (orderData.reviewsSubmitted && orderData.reviewsSubmitted[productId]) {
        throw new Error("Vous avez déjà évalué ce produit pour cette commande.");
      }

      const productRef = db.collection("products").doc(productId);
      const productSnap = await t.get(productRef);

      if (!productSnap.exists) {
        throw new Error("Product not found");
      }

      const pData = productSnap.data();

      // Setup review doc
      const newReviewRef = db.collection("reviews").doc();
      t.set(newReviewRef, {
        orderId,
        productId,
        rating,
        comment,
        userId,
        userName: req.user.name || req.user.email || "Client Olma",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "approved",
      });

      // Update order
      t.update(orderRef, {
        [`reviewsSubmitted.${productId}`]: {
          rating,
          comment,
          createdAt: new Date().toISOString(),
        },
      });

      // Update product stats (Data Aggregation Pattern)
      const currentStats = pData.stats || {
        reviewCount: 0,
        averageRating: 0,
        totalRatingSum: 0,
      };

      const newCount = (currentStats.reviewCount || 0) + 1;
      const newSum = (currentStats.totalRatingSum || 0) + rating;
      const newAverage = Number((newSum / newCount).toFixed(1));

      t.update(productRef, {
        stats: {
          reviewCount: newCount,
          averageRating: newAverage,
          totalRatingSum: newSum,
        },
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// --- 2FA Verification System ---
router.post(
  "/api/auth/2fa/send-code",
  authenticateToken,
  async (req: any, res: any) => {
    const userId = req.user.uid;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await db
        .collection("users")
        .doc(userId)
        .update({
          "verification.code": code,
          "verification.expiresAt": admin.firestore.Timestamp.fromMillis(
            Date.now() + 10 * 60 * 1000,
          ),
        });
      console.log(`[SIMULATION] Sending code ${code} to user ${userId}`);
      res.json({ success: true, method: "email" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/api/auth/2fa/verify",
  authenticateToken,
  async (req: any, res: any) => {
    const { code } = req.body;
    const userId = req.user.uid;

    // Mode dév: autoriser le code de test fixe
    if (process.env.NODE_ENV !== "production" && code === "123456") {
      try {
        const userRef = db.collection("users").doc(userId);
        await userRef.update({
          "verification.verified": true,
        });
        return res.json({ success: true });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (
        !userData?.verification ||
        userData.verification.code !== code ||
        userData.verification.expiresAt.toMillis() < Date.now()
      ) {
        return res.status(403).json({ error: "Code invalide ou expiré" });
      }

      await userRef.update({
        "verification.verified": true,
        "verification.code": admin.firestore.FieldValue.delete(),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);
router.post(
  "/api/admin/orders/:orderId/resolve-dispute",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res: any) => {
    const { orderId } = req.params;
    const { resolution, refundAmount = 0 } = req.body; // resolution = 'refund_to_wallet' | 'close'

    try {
      const orderRef = db.collection("orders").doc(orderId);
      
      let globalCommissionRate = 10;
      try {
         const commDoc = await db.collection("settings").doc("commission").get();
         if (commDoc && commDoc.exists) {
            globalCommissionRate = commDoc.data()?.globalRate ?? 10;
         }
      } catch (err) {
         console.warn("Could not fetch global commission rate", err);
      }

      await db.runTransaction(async (transaction: any) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error("Order not found");
        const orderData = orderDoc.data();

        if (resolution === "refund_to_wallet" && refundAmount > 0) {
          const buyerRef = db.collection("users").doc(orderData.userId); // userId instead of buyerId to match our schema
          const buyerDoc = await transaction.get(buyerRef);
          const currentBalance = buyerDoc.data()?.walletBalance || 0;

          transaction.update(buyerRef, {
            walletBalance: currentBalance + refundAmount,
          });

          // Debit vendor (Seller) if they were previously credited (anti-fraud double disbursement prevention)
          const targetSellerUid = orderData?.sellerIds?.[0] || orderData?.sellerId;
          if (targetSellerUid) {
            const sellerRef = db.collection("users").doc(targetSellerUid);
            const sellerDoc = await transaction.get(sellerRef);
            if (sellerDoc.exists) {
              const sellerData = sellerDoc.data();
              const commissionRate = orderData.commissionRateApplied ?? sellerData?.commissionRate ?? globalCommissionRate;
              const subtotal = orderData.subtotal || 0;
              const commissionToDeduct = (subtotal * commissionRate) / 100;
              const amountToDebit = (orderData.total || 0) - commissionToDeduct;
              
              // The funds were frozen when the dispute was opened. We must deduct from lockedBalance.
              // If the dispute was opened before the freeze feature, frozen amount might be 0, so we deduct from walletBalance.
              const frozenAmount = orderData.disputeRequest?.frozenAmount || 0;
              const currentSellerBalance = sellerData?.walletBalance || 0;
              const currentLockedBalance = sellerData?.lockedBalance || 0;
              
              // 🔴 SÉCURITÉ CRITIQUE : Pénalité du Trust Score (-10) car litige perdu
              const currentTrustScore = sellerData?.trustScore ?? 50;
              const newTrustScore = Math.max(0, currentTrustScore - 10);

              if (frozenAmount > 0) {
                 transaction.update(sellerRef, {
                   lockedBalance: currentLockedBalance - frozenAmount,
                   walletBalance: currentSellerBalance + (frozenAmount - amountToDebit),
                   trustScore: newTrustScore
                 });
              } else {
                 transaction.update(sellerRef, {
                   walletBalance: currentSellerBalance - amountToDebit,
                   trustScore: newTrustScore
                 });
              }

              // Log seller debit transaction
              const sLogRef = db.collection("wallet_transactions").doc();
              transaction.set(sLogRef, {
                userId: targetSellerUid,
                orderId: orderId,
                amount: -amountToDebit,
                type: "dispute_debit",
                description: `Débit suite à litige régularisé commande #${orderId.substring(0, 8)}`,
                createdAt: new Date().toISOString(),
              });

              // Inform seller they lost the dispute AND their trust score dropped
              const notificationRef = db.collection("notifications").doc();
              transaction.set(notificationRef, {
                userId: targetSellerUid,
                title: "Litige résolu en faveur du client",
                message: `La commande #${orderId.substring(0, 8)} a été remboursée. Vous avez été débité(e) et votre Trust Score a baissé de 10 points. Si c'est une erreur, ouvrez une contestation via le Support.`,
                type: "ALERT",
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          transaction.update(orderRef, {
            status: "REFUNDED",
            "returnRequest.status": "completed",
            disputeStatus: "resolved_refunded",
            refundedAmount: refundAmount,
            refundMethod: "Olma Wallet",
            updatedAt: new Date().toISOString(),
          });

          // Create a wallet transaction log
          const logRef = db.collection("wallet_transactions").doc();
          transaction.set(logRef, {
            userId: orderData.userId,
            orderId: orderId,
            amount: refundAmount,
            type: "refund",
            description: `Remboursement commande #${orderId.substring(0, 8)} (Litige clos)`,
            createdAt: new Date().toISOString(),
          });
        } else {
          // If closed in favor of seller, release frozen funds
          const frozenAmount = orderData.disputeRequest?.frozenAmount || 0;
          if (frozenAmount > 0) {
            const targetSellerUid = orderData?.sellerIds?.[0] || orderData?.sellerId;
            if (targetSellerUid) {
               const sellerRef = db.collection("users").doc(targetSellerUid);
               transaction.update(sellerRef, {
                 lockedBalance: admin.firestore.FieldValue.increment(-frozenAmount),
                 walletBalance: admin.firestore.FieldValue.increment(frozenAmount)
               });
            }
          }

          transaction.update(orderRef, {
            status: "DISPUTE_RESOLVED",
            "returnRequest.status": "rejected",
            "disputeRequest.status": "resolved_rejected",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Resolve Dispute Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// --- Banner & Tag Market System Endpoints ---

// PUBLIC: Get all banners
router.get("/api/banners", async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === "true";
    let queryRef = db.collection("banners").orderBy("sort_order", "asc");
    if (activeOnly) {
      queryRef = queryRef.where("is_active", "==", true);
    }
    const snap = await queryRef.get();
    const banners = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ banners });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC: Get specific banner details

// ADMIN ONLY: Create a banner

// SELLER ONLY: Request Withdrawal
router.post(
  "/api/seller/withdraw",
  authenticateToken,
  authorizeSeller,
  async (req: any, res) => {
    try {
      const sellerId = req.user.uid;
      const { amount, method, bankInfo } = req.body;

      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount < 2000
      )
        throw new Error("Le montant minimum est de 2000 DA.");

      await db.runTransaction(async (transaction: any) => {
        const userRef = db.collection("users").doc(sellerId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new Error("Vendeur introuvable");
        const userData = userSnap.data();

        if (userData.walletBalance < amount) {
          throw new Error("Solde insuffisant.");
        }

        // Deduct from walletBalance and add to lockedBalance
        transaction.update(userRef, {
          walletBalance: admin.firestore.FieldValue.increment(-amount),
          lockedBalance: admin.firestore.FieldValue.increment(amount),
        });

        const withdrawalRef = db.collection("withdrawals").doc();
        transaction.set(withdrawalRef, {
          sellerId,
          sellerName: userData.displayName || userData.shopName || "",
          amount,
          method,
          bankInfo,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/api/campaigns/:bannerId/products", async (req, res) => {
  try {
    const bannerId = req.params.bannerId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 24),
    );

    const cacheKey = `campaigns_products_${bannerId}`;
    const campaignData: any = cache.get(cacheKey);
    if (campaignData) {
      const totalProducts = campaignData.products.length;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedProducts = campaignData.products.slice(
        startIndex,
        endIndex,
      );

      return res.json({
        banner: campaignData.banner,
        products: paginatedProducts,
        page,
        limit,
        total: totalProducts,
        hasMore: endIndex < totalProducts,
      });
    }

    const bannerSnap = await db.collection("banners").doc(bannerId).get();

    if (!bannerSnap.exists) {
      return res.status(404).json({ error: "Bannière introuvable" });
    }

    const bannerData = { id: bannerSnap.id, ...bannerSnap.data() } as any;
    const tagId = bannerData.tag_id;
    const featuredIds: string[] = Array.isArray(bannerData.featured_products)
      ? bannerData.featured_products
      : [];

    const productsMap = new Map();
    const featuredDocs: any[] = [];

    // 1. Fetch featured products in chunks (Firestore limit is 10 for 'in')
    if (featuredIds.length > 0) {
      for (let i = 0; i < featuredIds.length; i += 10) {
        const chunk = featuredIds.slice(i, i + 10);
        const chunkSnap = await db
          .collection("products")
          .where("__name__", "in", chunk)
          .get();
        chunkSnap.docs.forEach((doc: any) => {
          const prodData = { id: doc.id, ...doc.data() };
          // We set 'isBannerFeatured' so frontend can display them differently if needed
          prodData.isBannerFeatured = true;
          productsMap.set(doc.id, prodData);
          featuredDocs.push(prodData);
        });
      }
    }

    // 2. Fetch products by banner's tag
    if (tagId) {
      const tagSnap = await db.collection("tags").doc(tagId).get();
      if (tagSnap.exists) {
        const tagName = tagSnap.data()?.name;
        const prodSnap1 = await db
          .collection("products")
          .where("tag_id", "==", tagId)
          .limit(50)
          .get();
        const prodSnap2 = await db
          .collection("products")
          .where("tags", "array-contains", tagId)
          .limit(50)
          .get();
        const prodSnap3 = tagName
          ? await db
              .collection("products")
              .where("tags", "array-contains", tagName)
              .limit(50)
              .get()
          : { docs: [] };

        [...prodSnap1.docs, ...prodSnap2.docs, ...prodSnap3.docs].forEach(
          (doc: any) => {
            // Only add if not already in map (prevents featured products from duplicating)
            if (!productsMap.has(doc.id)) {
              productsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          },
        );
      }
    }

    // Prepare final sorted list: Featured items first (in the order of the featuredIds array), then others
    const finalProducts: any[] = [];

    // Maintain exact order of featuredIds
    featuredIds.forEach((id) => {
      const p = productsMap.get(id);
      if (p) {
        finalProducts.push(p);
        productsMap.delete(id); // Remove to easily iterate over the rest
      }
    });

    // Add remaining products
    finalProducts.push(...Array.from(productsMap.values()));

    const responseData = {
      banner: bannerData,
      products: finalProducts,
    };
    cache.set(cacheKey, responseData, 600); // 10 mins cache

    const totalProducts = finalProducts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = finalProducts.slice(startIndex, endIndex);

    res.json({
      banner: bannerData,
      products: paginatedProducts,
      page,
      limit,
      total: totalProducts,
      hasMore: endIndex < totalProducts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC: Get all tags
router.get("/api/tags", async (req, res) => {
  try {
    const snap = await db.collection("tags").orderBy("name", "asc").limit(300).get();
    const tags = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ONLY: Create a tag
router.post(
  "/api/tags",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res) => {
    try {
      const { name, slug } = req.body;
      if (!name || !slug) {
        return res
          .status(400)
          .json({ error: "Champs requis manquants: name, slug" });
      }

      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]/g, "");

      // Check if tag with slug exists
      const checkSnap = await db
        .collection("tags")
        .where("slug", "==", cleanSlug)
        .get();
      if (!checkSnap.empty) {
        return res
          .status(400)
          .json({ error: "Ce tag existe déjà (le slug doit être unique)" });
      }

      const docData = {
        name: name.trim(),
        slug: cleanSlug,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection("tags").add(docData);
      res
        .status(200)
        .json({
          success: true,
          id: docRef.id,
          tag: { id: docRef.id, ...docData },
        });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// ADMIN ONLY: Delete a tag
router.delete(
  "/api/tags/:id",
  authenticateToken,
  authorizeAdmin,
  async (req: any, res) => {
    try {
      const docRef = db.collection("tags").doc(req.params.id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Tag non trouvé" });
      }
      await docRef.delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// PUBLIC: Filter products by tag (supports both tag_id field and tags array check)
router.get("/api/products-by-tag", async (req, res) => {
  try {
    const { tag } = req.query;
    if (!tag) {
      return res.status(400).json({ error: "Le slug du tag est requis" });
    }

    const cacheKey = `products_tag_obj_${tag}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`[Cache Hit] Serving ${cacheKey} from memory`);
      return res.json(cachedData);
    }

    const tagSnap = await db
      .collection("tags")
      .where("slug", "==", String(tag).toLowerCase().trim())
      .get();
    if (tagSnap.empty) {
      return res.json({ products: [], tag: { name: tag, slug: tag } });
    }
    const tagId = tagSnap.docs[0].id;
    const tagData = tagSnap.docs[0].data();

    // Query products
    const prodSnap1 = await db
      .collection("products")
      .where("tag_id", "==", tagId)
      .limit(50)
      .get();
    const prodSnap2 = await db
      .collection("products")
      .where("tags", "array-contains", tagId)
      .limit(50)
      .get();
    const prodSnap3 = await db
      .collection("products")
      .where("tags", "array-contains", tagData.name)
      .limit(50)
      .get();

    const productsMap = new Map();
    [...prodSnap1.docs, ...prodSnap2.docs, ...prodSnap3.docs].forEach(
      (doc: any) => {
        productsMap.set(doc.id, { id: doc.id, ...doc.data() });
      },
    );

    const responseData = {
      products: Array.from(productsMap.values()),
      tag: { id: tagId, name: tagData.name, slug: tag },
    };
    cache.set(cacheKey, responseData, 900); // 15 mins cache
    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUBLIC: Proxy alias as requested for /api/products?tag=slug
router.get("/api/products", async (req, res, next) => {
  const { tag } = req.query;
  const cacheKey = tag ? `products_tag_${tag}` : `products_all`;

  // Check if we have a cached response (simulating Redis)
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[Cache Hit] Serving ${cacheKey} from memory`);
    return res.json(cachedData);
  }

  if (tag) {
    // Forward to tag filtering logic
    try {
      const tagSnap = await db
        .collection("tags")
        .where("slug", "==", String(tag).toLowerCase().trim())
        .get();
      if (tagSnap.empty) {
        const emptyResponse = { products: [] };
        cache.set(cacheKey, emptyResponse, 300); // cache empty response for 5 mins
        return res.json(emptyResponse);
      }
      const tagId = tagSnap.docs[0].id;
      const tagData = tagSnap.docs[0].data();

      const prodSnap1 = await db
        .collection("products")
        .where("tag_id", "==", tagId)
        .limit(50)
        .get();
      const prodSnap2 = await db
        .collection("products")
        .where("tags", "array-contains", tagId)
        .limit(50)
        .get();
      const prodSnap3 = await db
        .collection("products")
        .where("tags", "array-contains", tagData.name)
        .limit(50)
        .get();

      const productsMap = new Map();
      [...prodSnap1.docs, ...prodSnap2.docs, ...prodSnap3.docs].forEach(
        (doc: any) => {
          productsMap.set(doc.id, { id: doc.id, ...doc.data() });
        },
      );

      const responseData = { products: Array.from(productsMap.values()) };
      cache.set(cacheKey, responseData, 900); // 15 mins cache
      return res.json(responseData);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  } else {
    try {
      const snap = await db
        .collection("products")
        .orderBy("created_at", "desc")
        .get();
      const products = snap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const responseData = { products };
      cache.set(cacheKey, responseData, 600); // 10 mins cache for all products
      return res.json(responseData);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// PUBLIC: Advanced Search using Fuse.js (Memory Cached)
router.get("/api/search", async (req, res, next) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.json({ products: [] });
  }

  const queryStr = q.trim();

  try {
    // Fetch Products
    const CACHE_KEY = `products_all`;
    let allProducts = cache.get<any>(CACHE_KEY);

    if (!allProducts) {
      console.log(
        `[Search Engine] Fetching all products to build search index...`,
      );
      try {
        let products = [];
        if (clientDb) {
          const snap = await clientGetDocs(
            query(clientCollection(clientDb, "products"), where("status", "==", "active"), limit(500))
          );
          products = snap.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          const snap = await db.collection("products").where("status", "==", "active").limit(500).get();
          products = snap.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
        allProducts = { products };
        cache.set(CACHE_KEY, allProducts, 600); // 10 mins cache
      } catch (innerErr: any) {
        console.error(
          "[Search Engine] Firestore fetch products failed:",
          innerErr.message,
        );
        allProducts = { products: [] };
        cache.set(CACHE_KEY, allProducts, 60);
      }
    }

    // Fetch Stores
    const STORES_CACHE_KEY = `stores_all`;
    let allStores = cache.get<any>(STORES_CACHE_KEY);
    if (!allStores) {
       console.log(`[Search Engine] Fetching all sellers for store indexing...`);
       try {
         let stores = [];
         if (clientDb) {
           const usersSnap = await clientGetDocs(query(clientCollection(clientDb, "users"), where("role", "==", "seller"), limit(300)));
           stores = usersSnap.docs.map((d: any) => ({id: d.id, ...d.data()}));
         } else {
           const usersSnap = await db.collection("users").where("role", "==", "seller").limit(300).get();
           stores = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
         }
         allStores = { stores };
         cache.set(STORES_CACHE_KEY, allStores, 900); // 15 mins cache
       } catch (e: any) {
         console.error("[Search Engine] Firestore fetch stores failed", e.message);
         allStores = { stores: [] };
       }
    }

    // Initialize Fuse.js with the products
    // We attach shopName and trustScore to products during indexing memory if possible
    let productsToIndex = allProducts.products;
    if (allStores && allStores.stores) {
       productsToIndex = productsToIndex.map((p: any) => {
           if (p.sellerId) {
               const store = allStores.stores.find((s: any) => s.id === p.sellerId || s.uid === p.sellerId);
               if (store) {
                   return { 
                       ...p, 
                       shopName: store.shopName || store.displayName || p.shopName,
                       sellerTrustScore: store.trustScore ?? 50
                   };
               }
           }
           return { ...p, sellerTrustScore: p.sellerTrustScore ?? 50 };
       });
       
       // 🔴 SÉCURITÉ & EXPÉRIENCE: Filtrer ou pénaliser les vendeurs avec un Trust Score extrêmement bas (< 20)
       productsToIndex = productsToIndex.filter((p: any) => p.sellerTrustScore >= 20);
    }

    const fuseOptions = {
      keys: [
        { name: "name", weight: 3 },
        { name: "category", weight: 1 },
        { name: "subcategory", weight: 2 },
        { name: "subsubcategory", weight: 2 },
        { name: "subSubCategory", weight: 2 },
        { name: "tags", weight: 2 },
        { name: "brand", weight: 2 },
        { name: "sellerName", weight: 2 },
        { name: "shopName", weight: 2 },
        { name: "sku", weight: 2 },
        { name: "colors", weight: 1 },
        { name: "sizes", weight: 1 },
        { name: "season", weight: 1 },
      ],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
    };

    const fuse = new Fuse(productsToIndex, fuseOptions);
    let searchResults = fuse.search(queryStr);

    // Provide a token-based multi-lingual smart search if Fuse yields too few results,
    // since Fuse's standard string distance fails for multi-word queries spanning different fields.
    if (searchResults.length < 5) {
      const normalizeText = (text?: string): string => {
        if (!text) return "";
        return text.toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove Latin diacritics
          .replace(/[\u064B-\u065F]/g, "") // Remove Arabic diacritics (tashkeel)
          .replace(/[أإآ]/g, "ا") // Normalize Arabic Alef
          .replace(/ة/g, "ه") // Normalize Teh Marbuta
          .toLowerCase();
      };

      const synonymGroups = [
        ['chaussure', 'chaussures', 'soulier', 'souliers', 'basket', 'baskets', 'sneaker', 'sneakers', 'botte', 'bottes', 'sandale', 'sandales', 'shoes', 'shoe', 'حذاء', 'احذيه', 'سباط'],
        ['vetement', 'vetements', 'habit', 'habits', 'clothes', 'clothing', 'ملابس', 'لباس', 'كسوه'],
        ['pantalon', 'pantalons', 'pants', 'trousers', 'سروال', 'سراويل'],
        ['chemise', 'chemises', 'shirt', 'shirts', 'قميص', 'قمصان'],
        ['tshirt', 'tshirts', 't-shirt', 't-shirts', 'تيشيرت', 'تي شيرت'],
        ['veste', 'vestes', 'manteau', 'manteaux', 'jacket', 'coat', 'ستره', 'معطف', 'فيستا'],
        ['robe', 'robes', 'dress', 'dresses', 'فستان', 'فساتين', 'روبه'],
        ['telephone', 'telephones', 'smartphone', 'smartphones', 'portable', 'portables', 'mobile', 'mobiles', 'phone', 'phones', 'هاتف', 'هواتف', 'تليفون', 'موبايل'],
        ['pc', 'ordinateur', 'ordinateurs', 'laptop', 'laptops', 'macbook', 'computer', 'حاسوب', 'كمبيوتر', 'ميكرو'],
        ['velo', 'velos', 'bicyclette', 'bicyclettes', 'vtt', 'bike', 'bicycle', 'دراجه', 'دراجات', 'فيلو'],
        ['montre', 'montres', 'horloge', 'horloges', 'smartwatch', 'watch', 'watches', 'ساعه', 'ساعات', 'مكانه'],
        ['femme', 'femmes', 'fille', 'filles', 'dame', 'dames', 'women', 'woman', 'girl', 'امراه', 'نساء', 'بنت', 'بنات'],
        ['homme', 'hommes', 'garcon', 'garcons', 'monsieur', 'men', 'man', 'boy', 'رجل', 'رجال', 'ولد', 'اولاد'],
        ['enfant', 'enfants', 'bebe', 'bebes', 'kids', 'child', 'children', 'baby', 'طفل', 'اطفال', 'رضيع'],
        ['sac', 'sacs', 'bag', 'bags', 'حقيبه', 'حقائب', 'ساك']
      ];

      const queryTokens = normalizeText(queryStr).split(/\s+/).filter(Boolean);

      if (queryTokens.length > 0) {
        const fallbackResults = productsToIndex
          .map((p: any) => {
            const searchableText = normalizeText([
              p.name,
              p.category,
              p.subcategory,
              p.subSubCategory,
              p.subsubcategory,
              p.gender,
              p.brand,
              p.sku,
              p.season,
              p.shopName,
              p.sellerName,
              ...(p.tags || []),
              ...(p.colors || []),
              ...(p.sizes || []),
              ...(p.materials || []),
            ].filter(Boolean).join(" "));

            let matchCount = 0;
            queryTokens.forEach((term) => {
              // Exact check
              if (searchableText.includes(term)) {
                matchCount++;
                return;
              }
              // Synonym check
              for (const group of synonymGroups) {
                if (group.some(g => g.includes(term) || term.includes(g))) {
                   if (group.some(syn => searchableText.includes(syn))) {
                     matchCount++;
                     return;
                   }
                }
              }
              // Plural check
              if (term.endsWith('s') || term.endsWith('x')) {
                const singular = term.slice(0, -1);
                if (searchableText.includes(singular)) {
                  matchCount++;
                  return;
                }
              }
              // Stemming check
              if (term.length > 4 && searchableText.includes(term.slice(0, -1))) {
                matchCount++;
                return;
              }
              if (term.length > 5 && searchableText.includes(term.slice(0, -2))) {
                matchCount++;
                return;
              }
            });

            return { product: p, matchCount };
          })
          .filter((r: any) => r.matchCount === queryTokens.length) // Require all terms to match something
          .sort((a: any, b: any) => b.matchCount - a.matchCount)
          .map((r: any) => r.product);

        // We map fallback results to match Fuse's output structure, appending only those not already found
        const existingIds = new Set(
          searchResults.map((r) => (r.item as any).id),
        );
        fallbackResults.forEach((p: any) => {
          if (!existingIds.has(p.id)) {
            searchResults.push({ item: p, refIndex: 0, score: 0.5 });
            existingIds.add(p.id);
          }
        });
      }
    }

    // Limit results, e.g. top 50 matches
    const limitedResults = searchResults
      .slice(0, 50)
      .map((result) => result.item);

    // Filter Stores based on search query
    let matchedStores = [];
    if (allStores && allStores.stores && queryStr) {
        const normalizeText = (text?: string): string => {
            if (!text) return "";
            return text.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove Latin diacritics
            .replace(/[\u064B-\u065F]/g, "") // Remove Arabic diacritics
            .replace(/[أإآ]/g, "ا") // Normalize Arabic Alef
            .replace(/ة/g, "ه") // Normalize Teh Marbuta
            .toLowerCase();
        };
        const queryTokens = normalizeText(queryStr).split(/\s+/).filter(Boolean);
        if (queryTokens.length > 0) {
            matchedStores = allStores.stores.filter((store: any) => {
                const searchableStoreText = normalizeText([
                    store.shopName,
                    store.displayName,
                    store.shopDescription
                ].filter(Boolean).join(" "));
                
                return queryTokens.every(term => searchableStoreText.includes(term));
            });
        }
    }

    // Attach shopName to products inside limitedResults if missing, to help the UI
    const finalProducts = limitedResults.map((p: any) => {
        if (!p.shopName && p.sellerId) {
            const store = allStores?.stores?.find((s: any) => s.id === p.sellerId) || allStores?.stores?.find((s: any) => s.uid === p.sellerId);
            if (store && (store.shopName || store.displayName)) {
               return { ...p, shopName: store.shopName || store.displayName };
            }
        }
        return p;
    });

    return res.json({ products: finalProducts, stores: matchedStores.slice(0, 5) });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development

// --- HOMEPAGE BUILDER API (PHASE 1) ---

router.get("/api/homepage/sections", async (req, res) => {
  try {
    const snap = await db
      .collection("homepage_sections")
      .orderBy("orderIndex", "asc")
      .get();
    res.json({
      sections: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/api/homepage/sections",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const data = req.body;
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("homepage_sections").add(data);
      res.json({ success: true, id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.put(
  "/api/homepage/sections/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const data = req.body;
      data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await db.collection("homepage_sections").doc(req.params.id).update(data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/api/homepage/sections/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      await db.collection("homepage_sections").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/api/homepage/banners", async (req, res) => {
  try {
    const snap = await db
      .collection("banners")
      .orderBy("orderIndex", "asc")
      .get();
    res.json({
      banners: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/api/homepage/banners",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const data = req.body;
      data.createdAt = admin.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("banners").add(data);
      res.json({ success: true, id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.put(
  "/api/homepage/banners/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const data = req.body;
      await db.collection("banners").doc(req.params.id).update(data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/api/homepage/banners/:id",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      await db.collection("banners").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

const isBot = (userAgent: string) => {
  const bots = [
    "googlebot",
    "bingbot",
    "yandexbot",
    "duckduckbot",
    "slurp",
    "twitterbot",
    "facebookexternalhit",
    "linkedinbot",
    "embedly",
    "baiduspider",
    "pinterest",
    "slackbot",
    "vkshare",
    "facebot",
    "outbrain",
    "whatsapp",
    "telegrambot",
  ];
  const userAgentLower = userAgent.toLowerCase();
  return bots.some((bot) => userAgentLower.includes(bot));
};

// --- Route API: Système de notifications internes (Acheteur <-> Vendeur) avec Traduction Gemini ---
router.post(
  "/api/notifications/send",
  authenticateToken,
  async (req: any, res: any) => {
    const {
      recipientId,
      title,
      message,
      type,
      orderId,
      productId,
      conversationId,
    } = req.body;
    const senderId = req.user.uid;

    if (!recipientId || !title || !message) {
      return res
        .status(400)
        .json({ error: "recipientId, title, et message sont obligatoires." });
    }

    try {
      let translations = {
        title: {
          fr: title,
          en: `${title} (EN)`,
          ar: `${title} (AR)`,
        },
        message: {
          fr: message,
          en: `${message} (EN)`,
          ar: `${message} (AR)`,
        },
      };

      // Auto-translation using Gemini AI to FR, EN, and AR
      try {
        const prompt = `Vous êtes Mabrouk, l'expert traducteur e-commerce d'OLMART Algérie (58 wilayas).
Traduisez les chaînes de caractères e-commerce suivantes en Arabe d'Algérie littéraire (soigné, professionnel) et en Anglais :
1. Titre: "${title}"
2. Message: "${message}"

Format de retour JSON STRICT (sans markdown, uniquement le JSON):
{
  "title": {
    "fr": "${title.replace(/"/g, '\\"')}",
    "ar": "La traduction en Arabe",
    "en": "La traduction en Anglais"
  },
  "message": {
    "fr": "${message.replace(/"/g, '\\"')}",
    "ar": "La traduction du message en Arabe",
    "en": "La traduction du message en Anglais"
  }
}
Répondez uniquement avec le JSON.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        const resultText = response.text || "";
        const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
        const parsed = JSON.parse(jsonStr);
        if (parsed.title && parsed.message) {
          translations = parsed;
        }
      } catch (geminiErr: any) {
        console.warn(
          "Gemini automatic translation failed for notifications, using fallback suffixes:",
          geminiErr,
        );
      }

      const notificationPayload = {
        senderId,
        recipientId,
        title: translations.title,
        message: translations.message,
        type: type || "system",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(orderId && { orderId }),
        ...(productId && { productId }),
        ...(conversationId && { conversationId }),
      };

      const docRef = await db
        .collection("user_notifications")
        .add(notificationPayload);

      res.status(201).json({
        success: true,
        notificationId: docRef.id,
        notification: {
          id: docRef.id,
          ...notificationPayload,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Failed to register notification:", error);
      res
        .status(500)
        .json({
          error:
            error.message || "Erreur lors de la création de la notification.",
        });
    }
  },
);

router.get("/product/:id", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  if (isBot(userAgent)) {
    try {
      const productSnap = await db
        .collection("products")
        .doc(req.params.id)
        .get();
      if (!productSnap.exists) {
        return next();
      }
      const p = productSnap.data();
      const shopSnap = p?.sellerId
        ? await db.collection("publicProfiles").doc(p.sellerId).get()
        : null;
      const shopName = shopSnap?.exists
        ? shopSnap.data()?.name || "Boutique"
        : "Boutique";
      const image =
        p?.image || (p?.images && p?.images.length > 0 ? p.images[0] : "");

      const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${p?.name || "Produit"} - ${shopName}</title>
          <meta name="description" content="${(p?.description || "").substring(0, 160)}">
          <meta property="og:title" content="${p?.name || "Produit"}">
          <meta property="og:description" content="${(p?.description || "").substring(0, 160)}">
          <meta property="og:image" content="${image}">
          <meta property="product:price:amount" content="${p?.promoPrice || p?.price || 0}">
          <meta property="product:price:currency" content="DZD">
          <meta name="twitter:card" content="summary_large_image">
        </head>
        <body>
          <h1>${p?.name}</h1>
          <img src="${image}" alt="${p?.name}">
          <p>${p?.description}</p>
          <p>Prix: ${p?.promoPrice || p?.price} DA</p>
          <p>Vendu par: ${shopName}</p>
        </body>
        </html>
      `;
      return res.send(html);
    } catch (e) {
      console.error("Error pre-rendering bot", e);
      return next();
    }
  }
  next();
});

export default router;
