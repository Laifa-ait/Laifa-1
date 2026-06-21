import React, { createContext, useContext, useState, ReactNode } from "react";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product } from "../types";
import { PRODUCT_HIERARCHY } from "../constants";
import { cacheEngine, handleDevQuotaLogger } from "../utils/mockProducts";

interface ShopContextType {
  fetchFeaturedProducts: (nbLimit?: number) => Promise<Product[]>;
  fetchProductsByCategory: (category: string, nbLimit?: number) => Promise<Product[]>;
  searchProducts: (searchStr: string, nbLimit?: number) => Promise<Product[]>;
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
  const [categoryHierarchy, setCategoryHierarchy] = useState<Record<string, Record<string, string[]>>>(PRODUCT_HIERARCHY);

  const refreshHierarchy = async () => {
    try {
      const docRef = doc(db, "settings", "categories");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().hierarchy) {
        setCategoryHierarchy(docSnap.data().hierarchy);
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
      const q = query(collection(db, "products"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(nbLimit));
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
        q = query(collection(db, "products"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(nbLimit));
      } else {
        q = query(collection(db, "products"), where("category", "==", category), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(nbLimit));
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

  const searchProducts = async (searchStr: string, nbLimit = 50): Promise<Product[]> => {
    const lower = searchStr.toLowerCase().trim();
    if (!lower) return [];

    // Optimization: Caching
    const cacheKey = `search_products_fuzzy_${lower}_${nbLimit}`;
    const cached = cacheEngine.get(cacheKey);
    if (cached) {
      handleDevQuotaLogger(`searchProducts [${searchStr}] (CACHE)`, true);
      return cached;
    }

    const getLevenshteinDistance = (a: string, b: string): number => {
      const tmp: number[][] = [];
      for (let i = 0; i <= a.length; i++) tmp[i] = [i];
      for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1,
            tmp[i][j - 1] + 1,
            tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return tmp[a.length][b.length];
    };

    const computeFuzzyScore = (queryStr: string, name: string, desc = "", extras = ""): number => {
      const qWords = queryStr.split(/\s+/).filter(Boolean);
      const nameLow = name.toLowerCase();
      const descLow = desc.toLowerCase();
      const extrasLow = extras.toLowerCase();
      const fullText = `${nameLow} ${descLow} ${extrasLow}`;

      if (nameLow.includes(queryStr)) return 200; // Exact match name
      if (fullText.includes(queryStr)) return 150; // Partial phrase match

      let score = 0;
      for (const qWord of qWords) {
        if (fullText.includes(qWord)) {
          score += 50 * (nameLow.includes(qWord) ? 1.5 : 1.0);
          continue;
        }

        const targetWords = fullText.split(/\s+/).filter(Boolean);
        let bestWordScore = 0;
        for (const tWord of targetWords) {
          if (Math.abs(tWord.length - qWord.length) > 2) continue;
          const distance = getLevenshteinDistance(qWord, tWord);
          if (distance <= 2) {
            const wordScore = Math.max(0, 35 - distance * 12);
            if (wordScore > bestWordScore) {
              bestWordScore = wordScore;
            }
          }
        }
        score += bestWordScore;
      }
      return score;
    };

    try {
      // 💡 ARCHITECTURE (OLAP / Faceted Search):
      // Firestore n'est pas conçu pour la recherche full-text et les index composites dynamiques.
      // À l'échelle, synchronisez OLMART avec Typesense / Algolia pour éviter la limite d'index Firestore (200 max)
      // et la facturation par lectures (OLTP vs OLAP).
      
      // Query higher number of products to filter and rank in memory (Search Index emulation)
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(120));
      const snap = await getDocs(q);
      const allDocs = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Product[];

      const scoredProducts = allDocs
        .filter((p: any) => p.status === "active")
        .map((p) => {
          const extras = [
            p.category, 
            p.subcategory, 
            p.subSubCategory, 
            ...(p.tags || []),
            p.brand,
            p.sku
          ].filter(Boolean).join(" ");
          
          return {
            product: p,
            score: computeFuzzyScore(lower, p.name || "", p.description || "", extras),
          };
        })
        .filter((entry) => entry.score > 15) // threshold to filter irrelevant match
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.product);

      const res = scoredProducts.slice(0, nbLimit);
      cacheEngine.set(cacheKey, res);
      return res;
    } catch (err) {
      console.error("Fuzzy Search or Quota Error", err);
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
        const chunks = [];
        for (let i = 0; i < ids.length; i += 10) {
            chunks.push(ids.slice(i, i + 10));
        }

        let allProducts: Product[] = [];
        for (const chunk of chunks) {
             const q = query(collection(db, "products"), where("__name__", "in", chunk));
             const snap = await getDocs(q);
             allProducts = [...allProducts, ...snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Product))];
        }
        cacheEngine.set(cacheKey, allProducts);
        return allProducts;
    } catch (err) {
        console.error("Quota Exceeded or Error", err);
        return [];
    }
  };

  const fetchCrossSellProducts = async (currentProduct: Product, nbLimit = 4): Promise<Product[]> => {
    // Advanced Cross-Selling Logic: Suggest complementary products from the SAME seller to mutualize shipping.
    // If the product is clothing, suggest accessories.
    let targetCategory = "Accessoires"; // Default fallback
    const catLower = (currentProduct.category || "").toLowerCase();
    
    if (catLower.includes("mode") || catLower.includes("vêtement")) targetCategory = "Accessoires";
    else if (catLower.includes("téléphone") || catLower.includes("smartphone")) targetCategory = "Accessoires Téléphonie";
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
          return snap1.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
       }

       // Fallback 1: Just other products from the SAME seller to mutualize shipping
       const q2 = query(
          collection(db, "products"),
          where("sellerId", "==", currentProduct.sellerId),
          where("status", "==", "active"),
          limit(nbLimit + 1)
       );
       const snap2 = await getDocs(q2);
       let results = snap2.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Product[];
       results = results.filter(p => p.id !== currentProduct.id).slice(0, nbLimit);
       if (results.length > 0) return results;

       // Fallback 2: General recommended
       return fetchRecommendedProducts(nbLimit);
    } catch {
       return [];
    }
  };

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

  return (
    <ShopContext.Provider
      value={{
        fetchFeaturedProducts,
        fetchProductsByCategory,
        searchProducts,
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
      }}
    >
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

