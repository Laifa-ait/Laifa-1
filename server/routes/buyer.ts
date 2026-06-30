import { Request, Response, Router } from "express";
import validator from "validator";
import {
  admin,
  db,
  clientDb,
  clientCollection,
  clientGetDocs,
} from "../services/firebase-admin";
import { query, where, limit } from "firebase/firestore";
import { authenticateToken } from "../middlewares/auth";
import fs from "fs";
import path from "path";
import nodeCache from "node-cache";
import Fuse from "fuse.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import fetch from "node-fetch";

export interface AuthenticatedRequest extends Request {
  user?: any;
  file?: any;
  files?: any;
}

const cache = new nodeCache({ stdTTL: 900, maxKeys: 200, useClones: false });

const router = Router();

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "127.0.0.1"),
  message: { error: "Trop de requêtes, veuillez réessayer plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

const sanitizeLocales = (data: any): Record<string, string> => {
  if (!data || typeof data !== "object") return {};
  const cleaned: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val !== "string") continue;
    const trimmedVal = val.trim();
    const isPlaceholder = 
      !trimmedVal ||
      trimmedVal === key ||
      trimmedVal === key.toUpperCase() ||
      trimmedVal === key.toLowerCase() ||
      trimmedVal === "EMPTY_WISHLIST_TITLE" ||
      trimmedVal === "empty_wishlist_desc" ||
      trimmedVal === "GO_TO_SHOP" ||
      trimmedVal === "wishlist";
    if (!isPlaceholder) {
      cleaned[key] = trimmedVal;
    }
  }
  return cleaned;
};

// Public Tracking API
router.get("/api/public/tracking/:trackingId", trackingLimiter, async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    if (!trackingId) {
      return res.status(400).json({ error: "Tracking ID missing" });
    }

    const ordersRef = db.collection("orders");
    let snapshot = await ordersRef.where("trackingId", "==", trackingId.toUpperCase()).limit(1).get();

    let orderData: any = null;
    let orderId = "";

    if (!snapshot.empty) {
      orderData = snapshot.docs[0].data();
      orderId = snapshot.docs[0].id;
    } else {
      // Try to match doc ID directly
      const docRef = await ordersRef.doc(trackingId).get();
      if (docRef.exists) {
        orderData = docRef.data();
        orderId = docRef.id;
      } else {
        return res.status(404).json({ error: "Aucun colis trouvé pour ce code de suivi." });
      }
    }
    
    // Only return safe public data
    const publicData = {
      trackingId: orderData?.trackingId || orderId,
      status: orderData?.status,
      carrier_tracking_events: (orderData?.carrier_tracking_events || []).map((e: any) => ({
        status_key: e.status_key,
        timestamp: e.timestamp,
        location: e.location,
      })),
    };

    res.json(publicData);
  } catch (error: any) {
    console.error("Public tracking error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Video proxy handler (prevents CORS and mixed-content issues on client)
router.get("/api/proxy-video", async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Parameter 'url' is required." });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
       return res.status(response.status).json({ error: "Failed to fetch video" });
    }
    
    // Forward video headers
    res.setHeader("Content-Type", response.headers.get("content-type") || "video/mp4");
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache video chunk for 1 day
    
    response.body.pipe(res);
  } catch (err: any) {
    console.error("Video proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Analytics tracking
router.post("/api/analytics/track", async (req: Request, res: Response) => {
  const { event, category, label, value, metadata } = req.body;
  if (!event) return res.status(400).json({ error: "Event name is required." });

  try {
    const geoHeader = req.headers["x-client-geo"] || "DZ"; // fallback to Algeria
    const payload = {
      event,
      category: category || "general",
      label: label || "",
      value: value || 0,
      metadata: metadata || {},
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
      country: geoHeader,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("analytics_events").add(payload);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/api/buyer/orders/cancel",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
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
                    stock: Number(v.stock || 0) + item.quantity,
                  };
                }
                return v;
              });
              pData.stock = pData.variants.reduce(
                (acc: number, curr: any) => acc + Math.max(0, Number(curr.stock) || 0),
                0,
              );
              pData.hasOutOfStockVariants = pData.variants.some(
                (v: any) => Math.max(0, Number(v.stock) || 0) <= 0,
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

router.post("/api/reviews", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Non authentifié" });
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
      
      const orderData = orderSnap.data() as any;
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
        userName: (req.user as any).name || (req.user as any).email || "Client Olma",
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
            if (!productsMap.has(doc.id)) {
              productsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          },
        );
      }
    }

    const finalProducts: any[] = [];

    featuredIds.forEach((id) => {
      const p = productsMap.get(id);
      if (p) {
        finalProducts.push(p);
        productsMap.delete(id);
      }
    });

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
router.get("/api/products", async (req, res) => {
  const { tag } = req.query;
  const cacheKey = tag ? `products_tag_${tag}` : `products_all`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  if (tag) {
    try {
      const tagSnap = await db
        .collection("tags")
        .where("slug", "==", String(tag).toLowerCase().trim())
        .get();
      if (tagSnap.empty) {
        const emptyResponse = { products: [] };
        cache.set(cacheKey, emptyResponse, 300);
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
      cache.set(cacheKey, responseData, 900);
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
      cache.set(cacheKey, responseData, 600);
      return res.json(responseData);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
});

// PUBLIC: Advanced Search using Fuse.js (Memory Cached with pagination, synonyms, and logs)
router.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.json({ products: [], total: 0, page: 1, limit: 10, hasMore: false });
  }

  const queryStr = q.trim();
  const page = parseInt(req.query.page as string) || 1;
  const limitVal = parseInt(req.query.limit as string) || 50;

  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : null;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : null;
  const wilayaFilter = req.query.wilaya ? req.query.wilaya as string : null;
  const categoryFilter = req.query.category ? req.query.category as string : null;

  try {
    const CACHE_KEY = `products_all`;
    let allProducts = cache.get<any>(CACHE_KEY);

    if (!allProducts) {
      try {
        let products: any[] = [];
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
        cache.set(CACHE_KEY, allProducts, 60);
      } catch (innerErr: any) {
        console.error(
          "[Search Engine] Firestore fetch products failed:",
          innerErr.message,
        );
        allProducts = { products: [] };
        cache.set(CACHE_KEY, allProducts, 10);
      }
    }

    // Fetch Stores
    const STORES_CACHE_KEY = `stores_all`;
    let allStores = cache.get<any>(STORES_CACHE_KEY);
    if (!allStores) {
       try {
         let stores: any[] = [];
         if (clientDb) {
           const usersSnap = await clientGetDocs(query(clientCollection(clientDb, "users"), where("role", "==", "seller"), limit(300)));
           stores = usersSnap.docs.map((d: any) => ({id: d.id, ...d.data()}));
         } else {
           const usersSnap = await db.collection("users").where("role", "==", "seller").limit(300).get();
           stores = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
         }
         allStores = { stores };
         cache.set(STORES_CACHE_KEY, allStores, 900);
       } catch (e: any) {
         console.error("[Search Engine] Firestore fetch stores failed", e.message);
         allStores = { stores: [] };
       }
    }

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
        
        productsToIndex = productsToIndex.filter((p: any) => p.sellerTrustScore >= 20);
     }

    let dbSynonymGroups = [];
    try {
      const synDoc = await db.collection("settings").doc("search_synonyms").get();
      if (synDoc.exists && Array.isArray(synDoc.data()?.groups)) {
        dbSynonymGroups = synDoc.data()?.groups;
      }
    } catch (err) {}

    const synonymGroups = dbSynonymGroups.length > 0 ? dbSynonymGroups : [
      ['chaussure', 'chaussures', 'soulier', 'souliers', 'basket', 'baskets', 'sneaker', 'sneakers', 'botte', 'bottes', 'sandale', 'sandales', 'shoes', 'shoe', 'حذاء', 'احذيه', 'سباط'],
      ['vetement', 'vetements', 'habit', 'habits', 'clothes', 'clothing', 'ملابس', 'لباس', 'كسوه'],
      ['pantalon', 'pantalons', 'pants', 'trousers', 'سروال', 'سراويل'],
      ['chemise', 'chemises', 'shirt', 'shirts', 'قميص', 'قمصان'],
      ['tshirt', 'tshirts', 't-shirt', 't-shirts', 'تيشيرت', 'تي شيرت'],
      ['veste', 'vestes', 'manteau', 'manteaux', 'jacket', 'coat', 'ستره', 'معطف', 'فيستا'],
      ['robe', 'robes', 'dress', 'dresses', 'فستان', 'فساتين', 'روبه'],
      ['telephone', 'telephones', 'smartphone', 'smartphones', 'portable', 'portables', 'mobile', 'mobiles', 'phone', 'phones', 'هاتف', 'هواتف', 'تليفون', 'موبايل'],
      ['pc', 'ordinateur', 'ordinateurs', 'laptop', 'laptops', 'macbook', 'computer', 'حاسoub', 'كمبيوتر', 'ميكرو'],
      ['velo', 'velos', 'bicyclette', 'bicyclettes', 'vtt', 'bike', 'bicycle', 'دراجه', 'دراجات', 'فيلو'],
      ['montre', 'montres', 'horloge', 'horloges', 'smartwatch', 'watch', 'watches', 'ساعه', 'ساعات', 'مكانه'],
      ['femme', 'femmes', 'fille', 'filles', 'dame', 'dames', 'women', 'woman', 'girl', 'امراه', 'نساء', 'بنت', 'بنات'],
      ['homme', 'hommes', 'garcon', 'garcons', 'monsieur', 'men', 'man', 'boy', 'رجل', 'رجال', 'ولد', 'اولاد'],
      ['enfant', 'enfants', 'bebe', 'bebes', 'kids', 'child', 'children', 'baby', 'طفل', 'اطفال', 'رضيع'],
      ['sac', 'sacs', 'bag', 'bags', 'حقيبه', 'حقائب', 'ساك']
    ];

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
      includeScore: true
    };
    const fuse = new Fuse(productsToIndex, fuseOptions);
    let searchResults = fuse.search(queryStr);

    const normalizeText = (text?: string): string => {
      if (!text) return "";
      return text.toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u064B-\u065F]/g, "")
        .replace(/[أإآا]/g, "ا")
        .replace(/[ىي]/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "ء")
        .replace(/ئ/g, "ء")
        .toLowerCase();
    };

    const getSoundex = (word: string): string => {
      const w = word.toLowerCase().trim().replace(/[^a-z]/g, "");
      if (w.length === 0) return "";
      const first = w.charAt(0).toUpperCase();
      const codes = {
        b: 1, f: 1, p: 1, v: 1,
        c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
        d: 3, t: 3,
        l: 4,
        m: 5, n: 5,
        r: 6
      } as any;
      let res = first;
      for (let i = 1; i < w.length; i++) {
        const char = w.charAt(i);
        const code = codes[char];
        if (code && code !== codes[w.charAt(i - 1)]) {
          res += code;
        }
      }
      return (res + "0000").slice(0, 4);
    };

    const queryTokens = normalizeText(queryStr).split(/\s+/).filter(Boolean);

    if (queryTokens.length > 0 && searchResults.length < 15) {
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

          let matchScore = 0;
          queryTokens.forEach((term) => {
            if (searchableText.includes(term)) {
              matchScore += 1.0;
              return;
            }
            for (const group of synonymGroups) {
              if (group.some((g: string) => g.includes(term) || term.includes(g))) {
                 if (group.some((syn: string) => searchableText.includes(syn))) {
                   matchScore += 0.7;
                   return;
                 }
              }
            }
            const querySoundex = getSoundex(term);
            if (querySoundex) {
              const productWords = searchableText.split(/\s+/);
              for (const word of productWords) {
                if (getSoundex(word) === querySoundex) {
                  matchScore += 0.6;
                  return;
                 }
              }
            }
            if (term.endsWith('s') || term.endsWith('x')) {
              const singular = term.slice(0, -1);
              if (searchableText.includes(singular)) {
                matchScore += 0.9;
                return;
              }
            }
            if (term.length > 4 && searchableText.includes(term.slice(0, -1))) {
              matchScore += 0.8;
              return;
            }
          });

          return { product: p, score: matchScore };
        })
        .filter((r: any) => r.score >= 0.5)
        .sort((a: any, b: any) => b.score - a.score)
        .map((r: any) => r.product);

      const existingIds = new Set(searchResults.map((r) => (r.item as any).id));
      fallbackResults.forEach((p: any) => {
        if (!existingIds.has(p.id)) {
          searchResults.push({ item: p, refIndex: 0, score: 0.5 });
          existingIds.add(p.id);
        }
      });
    }

    let processedResults = searchResults.map((r) => {
       const p = r.item as any;
       const textScore = 1 - (r.score ?? 0.5);
       
       const salesScore = Math.min((p.salesCount ?? 0) / 100, 1.0);
       const ratingScore = Math.min((p.rating ?? 4.0) / 5.0, 1.0);
       const trustScore = Math.min((p.sellerTrustScore ?? 50) / 100, 1.0);

       const combinedRankingScore = (textScore * 0.6) + ((salesScore * 0.5 + ratingScore * 0.5) * 0.2) + (trustScore * 0.2);

       return { item: p, ranking: combinedRankingScore };
    });

    processedResults.sort((a, b) => b.ranking - a.ranking);

    let finalProducts = processedResults.map((r) => r.item);

    if (minPrice !== null) {
      finalProducts = finalProducts.filter((p: any) => p.price >= minPrice);
    }
    if (maxPrice !== null) {
      finalProducts = finalProducts.filter((p: any) => p.price <= maxPrice);
    }
    if (wilayaFilter) {
      finalProducts = finalProducts.filter((p: any) => p.wilaya === wilayaFilter);
    }
    if (categoryFilter) {
      finalProducts = finalProducts.filter((p: any) => p.category === categoryFilter);
    }

    let matchedStores = [];
    if (allStores && allStores.stores && queryStr) {
        const normalizeTextLocal = (text?: string): string => {
            if (!text) return "";
            return text.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\u064B-\u065F]/g, "")
            .replace(/[أإآا]/g, "ا")
            .replace(/ة/g, "ه")
            .toLowerCase();
        };
        const queryTokensStore = normalizeTextLocal(queryStr).split(/\s+/).filter(Boolean);
        if (queryTokensStore.length > 0) {
            matchedStores = allStores.stores.filter((store: any) => {
                const searchableStoreText = normalizeTextLocal([
                    store.shopName,
                    store.displayName,
                    store.shopDescription
                ].filter(Boolean).join(" "));
                
                return queryTokensStore.every(term => searchableStoreText.includes(term));
            });
        }
    }

    finalProducts = finalProducts.map((p: any) => {
        if (!p.shopName && p.sellerId) {
            const store = allStores?.stores?.find((s: any) => s.id === p.sellerId) || allStores?.stores?.find((s: any) => s.uid === p.sellerId);
            if (store && (store.shopName || store.displayName)) {
               return { ...p, shopName: store.shopName || store.displayName };
            }
        }
        return p;
    });

    // Log search telemetry asynchronously
    try {
      const logData = {
        query: queryStr,
        resultsCount: finalProducts.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: (req as any).user?.uid || "anonymous",
        userAgent: req.headers["user-agent"] || "unknown",
        filters: {
          minPrice,
          maxPrice,
          wilaya: wilayaFilter,
          category: categoryFilter
        }
      };
      admin.firestore().collection("search_logs").add(logData).catch((e) => {
        console.warn("[Search Engine] Log save rejected:", e.message);
      });
    } catch (logErr: any) {
      console.warn("[Search Engine] Logging telemetry failed:", logErr.message);
    }

    const totalCount = finalProducts.length;
    const offset = (page - 1) * limitVal;
    const paginatedProducts = finalProducts.slice(offset, offset + limitVal);
    const hasMore = offset + limitVal < totalCount;

    return res.json({ 
      products: paginatedProducts, 
      stores: matchedStores.slice(0, 5),
      total: totalCount,
      page,
      limit: limitVal,
      hasMore
    });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

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
