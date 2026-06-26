import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  startAfter,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, withTimeout } from "../lib/firebase";
import { Product } from "../types";
import { useShop } from "../context/ShopContext";
import { useDebounce } from "./useDebounce";
import useSWR from "swr";
import { useInfiniteScroll } from "./useInfiniteScroll";

export const PRODUCTS_PER_PAGE = 12;

// Module-level cache to keep QueryDocumentSnapshot objects out of SWR's serialization pipeline
const snapshotCache = new Map<string, QueryDocumentSnapshot<DocumentData>>();

export const useShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    activeWilaya,
    setActiveWilaya,
    sortOption,
    setSortOption,
  } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [queryError, setQueryError] = useState<{ message: string; indexLink?: string } | null>(null);
  const [loadedCacheKey, setLoadedCacheKey] = useState<string>("");

  const urlCategory = searchParams.get("category");
  const urlSubcategory = searchParams.get("subcategory");
  const urlSubsubcategory = searchParams.get("subsubcategory");
  const urlTag = searchParams.get("tag");

  useEffect(() => {
    if (urlCategory) setActiveCategory(urlCategory);
  }, [urlCategory, setActiveCategory]);

  const buildQueryConditions = useCallback(() => {
    const conditions = [];
    conditions.push(where("status", "==", "active"));

    const catToFilter = urlCategory || activeCategory;
    if (catToFilter && catToFilter !== "Tous") conditions.push(where("category", "==", catToFilter));
    if (urlSubcategory) conditions.push(where("subcategory", "==", urlSubcategory));
    if (urlSubsubcategory) conditions.push(where("subsubcategory", "==", urlSubsubcategory));
    if (activeWilaya !== "Tous") conditions.push(where("wilaya", "==", activeWilaya));
    if (urlTag) conditions.push(where("tags", "array-contains", urlTag));

    if (sortOption === "recent") conditions.push(orderBy("createdAt", "desc"));
    else if (sortOption === "quality") conditions.push(orderBy("qualityScore", "desc"));
    else if (sortOption === "price-asc") conditions.push(orderBy("price", "asc"));
    else if (sortOption === "price-desc") conditions.push(orderBy("price", "desc"));
    return conditions;
  }, [urlCategory, activeCategory, urlSubcategory, urlSubsubcategory, activeWilaya, sortOption, urlTag]);

  const cacheKey = useMemo(
    () =>
      `shop_list_${urlCategory || activeCategory}_${urlSubcategory || "none"}_${urlSubsubcategory || "none"}_${activeWilaya}_${sortOption}_${urlTag || "none"}`,
    [urlCategory, activeCategory, urlSubcategory, urlSubsubcategory, activeWilaya, sortOption, urlTag]
  );

  const fetchProductsSWR = async () => {
    const conditions = buildQueryConditions();
    const q = query(collection(db, "products"), ...conditions, limit(PRODUCTS_PER_PAGE));
    const snap = await withTimeout(getDocs(q));
    const productsFetched = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);
    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    if (lastDoc) {
      snapshotCache.set(cacheKey, lastDoc);
    } else {
      snapshotCache.delete(cacheKey);
    }

    return productsFetched;
  };

  const {
    data: swrData,
    error: swrError,
    isLoading: swrIsLoading,
  } = useSWR(cacheKey, fetchProductsSWR, { revalidateOnFocus: true });

  useEffect(() => {
    if (swrIsLoading) {
      if (cacheKey !== loadedCacheKey) {
        setIsLoadingProducts(true);
      }
    } else if (swrError) {
      setQueryError({ message: "Erreur de chargement." });
      setProducts([]);
      setIsLoadingProducts(false);
    } else if (swrData) {
      // Only override products/lastVisible if the cacheKey actually changed
      // This avoids background SWR updates from resetting infinite scroll pages back to page 1!
      if (cacheKey !== loadedCacheKey) {
        setProducts(swrData);
        setLastVisible(snapshotCache.get(cacheKey) || null);
        setLoadedCacheKey(cacheKey);
      }
      setIsLoadingProducts(false);
    }
  }, [swrData, swrError, swrIsLoading, cacheKey, loadedCacheKey]);

  const loadMoreProducts = async () => {
    if (!lastVisible) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "products"),
        ...buildQueryConditions(),
        startAfter(lastVisible),
        limit(PRODUCTS_PER_PAGE)
      );
      const snap = await withTimeout(getDocs(q));
      const newProducts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);
      setProducts((prev) => [...prev, ...newProducts.filter((p) => !prev.some((ep) => ep.id === p.id))]);
      setLastVisible(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
    } finally {
      setLoadingMore(false);
    }
  };

  const { loaderRef } = useInfiniteScroll({
    onLoadMore: loadMoreProducts,
    hasMore: !!lastVisible,
    isLoading: loadingMore,
    threshold: 300,
  });

  return {
    products,
    isLoadingProducts,
    loadingMore,
    queryError,
    lastVisible,
    loaderRef,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    urlSubsubcategory,
  };
};
