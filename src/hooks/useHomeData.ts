import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { HomepageSection, Product } from "../types";
import { cacheEngine } from "../utils/mockProducts";
import { withExponentialBackoff } from "../utils/retry";

export const useHomeData = () => {
  const [dbBanners, setDbBanners] = useState<any[]>([]);
  const [dbTags, setDbTags] = useState<any[]>([]);
  const [isBannersLoading, setIsBannersLoading] = useState(true);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [dbSellers, setDbSellers] = useState<any[]>([]);
  const [isSellersLoading, setIsSellersLoading] = useState(true);

  useEffect(() => {
    // Single effect to fetch all home data using Promise.allSettled for optimal performance
    // and preventing waterfall
    const fetchAllData = async () => {
      // 1. Custom Categories
      const fetchCategories = async () => {
        try {
          const cached = sessionStorage.getItem("home_custom_categories");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {}
          }
          const snap = await withExponentialBackoff(() =>
            getDocs(query(collection(db, "homepage_categories_v2"), limit(100)))
          );
          const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          if (list.length > 0) sessionStorage.setItem("home_custom_categories", JSON.stringify(list));
          (process.env.NODE_ENV === "debug" ? console.log : function () {})(
            "Fetched custom categories length:",
            list.length
          );
          return list;
        } catch (e) {
          console.error("Error fetching custom categories:", e);
          return [];
        }
      };

      // 2. Carousel & Homepage Config
      const fetchCarousel = async () => {
        try {
          const cacheDocSnap = await withExponentialBackoff(() =>
            getDocs(query(collection(db, "public"), where("__name__", "==", "homepage_cache"), limit(1)))
          );
          if (!cacheDocSnap.empty) {
            const data = cacheDocSnap.docs[0].data();
            return { sections: data.sections || [], banners: data.banners || [], tags: data.tags || [] };
          }
        } catch (e) {
          console.error("fetchCarousel public cache error:", e);
        }

        try {
          const snapSections = await withExponentialBackoff(() =>
            getDocs(query(collection(db, "homepage_sections"), orderBy("orderIndex", "asc"), limit(50)))
          );
          const snapBanners = await withExponentialBackoff(() => getDocs(query(collection(db, "banners"), limit(30))));
          const snapTags = await withExponentialBackoff(() => getDocs(query(collection(db, "tags"), limit(100))));

          const activeBanners = snapBanners.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
            .filter((b: any) => b.is_active !== false && b.isActive !== false)
            .sort((a: any, b: any) => (a.sort_order ?? a.orderIndex ?? 0) - (b.sort_order ?? b.orderIndex ?? 0));

          (process.env.NODE_ENV === "debug" ? console.log : function () {})(
            "Fetched banners length:",
            activeBanners.length
          );
          return {
            sections: snapSections.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })),
            banners: activeBanners,
            tags: snapTags.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })),
          };
        } catch (e) {
          console.error("Error fetching carousel config:", e);
          return { sections: [], banners: [], tags: [] };
        }
      };

      // 3. Featured Products
      const fetchProducts = async () => {
        try {
          const cacheKey = "home_featured_products";
          const cached = cacheEngine.get(cacheKey);
          if (cached) return cached;

          const q = query(
            collection(db, "products"),
            where("status", "==", "active"),
            orderBy("createdAt", "desc"),
            limit(24)
          );
          const snap = await withExponentialBackoff(() => getDocs(q));
          let productsLoaded = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product)
            .filter((d) => d && (d.stock === undefined || d.stock > 0));

          // TrustScore Ranking (Admin Requirement)
          productsLoaded = productsLoaded.sort((a, b) => {
            const scoreA = (a as any).sellerTrustScore ?? 50;
            const scoreB = (b as any).sellerTrustScore ?? 50;
            return scoreB - scoreA;
          });

          const topTier = productsLoaded.filter((p) => ((p as any).sellerTrustScore ?? 100) >= 75).slice(0, 8);
          const finalProducts = topTier.length >= 4 ? topTier : productsLoaded.slice(0, 8);

          if (finalProducts.length === 0) {
            // We do not load mock products here as per user request. No fake UI.
          }

          cacheEngine.set(cacheKey, finalProducts);
          (process.env.NODE_ENV === "debug" ? console.log : function () {})(
            "Fetched featured products length:",
            finalProducts.length
          );
          return finalProducts;
        } catch (e) {
          console.error("Error fetching featured products:", e);
          return [];
        }
      };

      // 4. Public Sellers (Vendors)
      const fetchSellers = async () => {
        try {
          // AUDIT FIX: Limit to 20 profiles instead of fetching entire collection on homepage
          const q = query(collection(db, "publicProfiles"), limit(20));
          const snap = await withExponentialBackoff(() => getDocs(q));
          return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
          console.error("Error fetching sellers:", e);
          return [];
        }
      };

      // Run fetches concurrently
      const [catResult, carResult, prodResult, sellResult] = await Promise.allSettled([
        fetchCategories(),
        fetchCarousel(),
        fetchProducts(),
        fetchSellers(),
      ]);

      if (catResult.status === "fulfilled") setCustomCategories(catResult.value || []);

      if (carResult.status === "fulfilled") {
        setHomepageSections(carResult.value?.sections || []);
        setDbBanners(carResult.value?.banners || []);
        setDbTags(carResult.value?.tags || []);
      }
      setIsBannersLoading(false);

      if (prodResult.status === "fulfilled") {
        setFeaturedProducts(prodResult.value || []);
      }
      setIsLoadingProducts(false);

      if (sellResult.status === "fulfilled") {
        setDbSellers(sellResult.value || []);
      }
      setIsSellersLoading(false);
    };

    fetchAllData();
  }, []);

  return {
    dbBanners,
    dbTags,
    isBannersLoading,
    homepageSections,
    featuredProducts,
    isLoadingProducts,
    customCategories,
    dbSellers,
    isSellersLoading,
  };
};
