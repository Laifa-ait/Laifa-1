import React, { createContext, useContext, useState, ReactNode } from "react";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product } from "../types";
import { PRODUCT_HIERARCHY } from "../constants";

class LocalMemoryCache {
  private cache: Record<string, { data: any; expiry: number }> = {};
  set(key: string, data: any, durationMs = 300000) {
    this.cache[key] = { data, expiry: Date.now() + durationMs };
  }
  get(key: string): any | null {
    const item = this.cache[key];
    if (item && Date.now() < item.expiry) {
      return item.data;
    }
    if (item) delete this.cache[key];
    return null;
  }
  clear() {
    this.cache = {};
  }
}
const cacheEngine = new LocalMemoryCache();

function handleDevQuotaLogger(context: string, isFromCache: boolean) {
  if (import.meta.env.DEV) {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `%c[Olma Dev-Safe Layer] %c${context} %c${isFromCache ? "⚡ SWR CACHED" : "📦 LIVE (Firestore)"}`,
        "color: #C95D3B; font-weight: bold;",
        "color: inherit;",
        isFromCache ? "color: #38bdf8; font-weight: bold;" : "color: #34d399; font-weight: bold;"
      );
    }
  }
}

interface ShopContextType {
  fetchFeaturedProducts: (nbLimit?: number) => Promise<Product[]>;
  fetchProductsByCategory: (category: string, nbLimit?: number) => Promise<Product[]>;
  fetchProductsByIds: (ids: string[]) => Promise<Product[]>;
  fetchRecommendedProducts: (nbLimit?: number) => Promise<Product[]>;
  fetchCrossSellProducts: (product: Product, nbLimit?: number) => Promise<Product[]>;
  // Category Hierarchy
  categoryHierarchy: Record<string, Record<string, string[]>>;
  refreshHierarchy: () => Promise<void>;
  // keep remaining for UI state
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSaleFilterActive: boolean;
  setIsSaleFilterActive: (active: boolean) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  activeWilaya: string;
  setActiveWilaya: (wilaya: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaleFilterActive, setIsSaleFilterActive] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("quality");
  const [activeWilaya, setActiveWilaya] = useState("Tous");
  const [categoryHierarchy, setCategoryHierarchy] =
    useState<Record<string, Record<string, string[]>>>(PRODUCT_HIERARCHY);

  const refreshHierarchy = async () => {
    try {
      const docRef = doc(db, "settings", "categories");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().hierarchy) {
        const rawHierarchy = docSnap.data().hierarchy;
        const sortOrder = docSnap.data().sortOrder || [];
        
        // Sort rawHierarchy keys based on sortOrder
        const sortedHierarchy: Record<string, Record<string, string[]>> = {};
        
        // First add categories in sortOrder that exist in rawHierarchy
        sortOrder.forEach((key: string) => {
          if (rawHierarchy[key]) {
            sortedHierarchy[key] = rawHierarchy[key];
          }
        });
        
        // Then append any extra categories not in sortOrder
        Object.keys(rawHierarchy).forEach((key) => {
          if (!sortedHierarchy[key]) {
            sortedHierarchy[key] = rawHierarchy[key];
          }
        });
        
        setCategoryHierarchy(sortedHierarchy);
      }
    } catch (err) {
      console.error("Error refreshing hierarchy:", err);
    }
  };

  React.useEffect(() => {
    refreshHierarchy();
  }, []);

  const fetchFeaturedProducts = async (nbLimit = 20): Promise<Product[]> => {
    // 2. Optimization: Memory caching
    const cacheKey = `featured_products_${nbLimit}`;
    const cached = cacheEngine.get(cacheKey);
    if (cached) {
      handleDevQuotaLogger("fetchFeaturedProducts (CACHE)", true);
      return cached;
    }

    try {
      const q = query(
        collection(db, "products"),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(nbLimit)
      );
      const snap = await getDocs(q);
      const res = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
      cacheEngine.set(cacheKey, res);
      return res;
    } catch (err) {
      console.error("Quota Exceeded or Error", err);
      return [];
    }
  };

  const fetchProductsByCategory = async (category: string, nbLimit = 20): Promise<Product[]> => {
    // 2. Optimization: Caching
    const cacheKey = `products_category_${category}_${nbLimit}`;
    const cached = cacheEngine.get(cacheKey);
    if (cached) {
      handleDevQuotaLogger(`fetchProductsByCategory [${category}] (CACHE)`, true);
      return cached;
    }

    try {
      let q;
      if (category === "Tous") {
        q = query(
          collection(db, "products"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(nbLimit)
        );
      } else {
        q = query(
          collection(db, "products"),
          where("category", "==", category),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(nbLimit)
        );
      }
      const snap = await getDocs(q);
      const res = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
      cacheEngine.set(cacheKey, res);
      return res;
    } catch (err) {
      console.error("Quota Exceeded or Error", err);
      return [];
    }
  };



  const fetchProductsByIds = async (ids: string[]): Promise<Product[]> => {
    if (!ids || ids.length === 0) return [];

    // 2. Caching
    const cacheKey = `products_ids_${ids.sort().join("_")}`;
    const cached = cacheEngine.get(cacheKey);
    if (cached) {
      handleDevQuotaLogger("fetchProductsByIds (CACHE)", true);
      return cached;
    }

    try {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
      }

      let allProducts: Product[] = [];
      for (const chunk of chunks) {
        const q = query(collection(db, "products"), where("__name__", "in", chunk));
        const snap = await getDocs(q);
        allProducts = [...allProducts, ...snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }) as Product)];
      }
      cacheEngine.set(cacheKey, allProducts);
      return allProducts;
    } catch (err) {
      console.error("Quota Exceeded or Error", err);
      return [];
    }
  };

  const fetchCrossSellProducts = React.useCallback(async (currentProduct: Product, nbLimit = 4): Promise<Product[]> => {
    // Advanced Cross-Selling Logic
    let targetCategory = "Accessoires"; // Default fallback
    const catLower = (currentProduct.category || "").toLowerCase();

    if (catLower.includes("mode") || catLower.includes("vêtement")) targetCategory = "Accessoires";
    else if (catLower.includes("téléphone") || catLower.includes("smartphone"))
      targetCategory = "Accessoires Téléphonie";
    else if (catLower.includes("pc") || catLower.includes("ordinateur")) targetCategory = "Périphériques";

    try {
      // Query same seller, but different (complementary) category
      const q1 = query(
        collection(db, "products"),
        where("sellerId", "==", currentProduct.sellerId),
        where("category", "==", targetCategory),
        where("status", "==", "active"),
        limit(nbLimit)
      );
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return snap1.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
      }

      // Fallback 1: Just other products from the SAME seller to mutualize shipping
      const q2 = query(
        collection(db, "products"),
        where("sellerId", "==", currentProduct.sellerId),
        where("status", "==", "active"),
        limit(nbLimit + 1)
      );
      const snap2 = await getDocs(q2);
      let results = snap2.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
      results = results.filter((p) => p.id !== currentProduct.id).slice(0, nbLimit);
      if (results.length > 0) return results;

      // Fallback 2: General recommended
      return fetchRecommendedProducts(nbLimit);
    } catch {
      return [];
    }
  }, []);

  const fetchRecommendedProducts = async (nbLimit = 8): Promise<Product[]> => {
    const cacheKey = `recommended_products_${nbLimit}`;
    const cached = cacheEngine.get(cacheKey);
    if (cached) {
      handleDevQuotaLogger("fetchRecommendedProducts (CACHE)", true);
      return cached;
    }

    try {
      const metadataRef = doc(db, "metadata", "recommendations");
      const metadataSnap = await getDoc(metadataRef);

      let recommendedIds: string[] = [];
      if (metadataSnap.exists()) {
        const data = metadataSnap.data();
        recommendedIds = data.productIds || [];
      }

      if (recommendedIds.length > 0) {
        const slicedIds = recommendedIds.slice(0, nbLimit);
        const resolved = await fetchProductsByIds(slicedIds);
        cacheEngine.set(cacheKey, resolved);
        return resolved;
      }

      const fallback = await fetchFeaturedProducts(nbLimit);
      cacheEngine.set(cacheKey, fallback);
      return fallback;
    } catch (err) {
      console.error("Error fetching recommended products:", err);
      return fetchFeaturedProducts(nbLimit);
    }
  };

  const value = React.useMemo(() => ({
    fetchFeaturedProducts,
    fetchProductsByCategory,
    fetchProductsByIds,
    fetchRecommendedProducts,
    fetchCrossSellProducts,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    isSaleFilterActive,
    setIsSaleFilterActive,
    activeTag,
    setActiveTag,
    sortOption,
    setSortOption,
    activeWilaya,
    setActiveWilaya,
    categoryHierarchy,
    refreshHierarchy,
  }), [
    activeCategory,
    searchQuery,
    isSaleFilterActive,
    activeTag,
    sortOption,
    activeWilaya,
    categoryHierarchy,
    fetchCrossSellProducts
  ]);

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};
