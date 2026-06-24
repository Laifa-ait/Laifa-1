import React, { useState, useEffect } from "react";
import { collection, query, getDocs, limit, orderBy, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Product } from "../../types";
import { ProductCard } from "../Product/ProductCard";
import { useTranslation } from "react-i18next";
import { Sparkles, Grid } from "lucide-react";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";

export const HomeEndlessGrid: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const FETCH_LIMIT = 18;

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(FETCH_LIMIT));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Product));
        
        const validDocs = docs.filter(d => d.stock === undefined || d.stock > 0);
        setProducts(validDocs);
        
        if (snap.docs.length > 0) {
          setLastVisible(snap.docs[snap.docs.length - 1]);
        }
        setHasMore(snap.docs.length === FETCH_LIMIT);
      } catch (err) {
        console.error("Error fetching endless grid:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  const loadMoreProducts = async () => {
    if (!lastVisible || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "products"), 
        orderBy("createdAt", "desc"), 
        startAfter(lastVisible), 
        limit(FETCH_LIMIT)
      );
      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Product));
      const validNewDocs = newDocs.filter(d => d.stock === undefined || d.stock > 0);
      
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = validNewDocs.filter(p => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });
      
      if (snap.docs.length > 0) {
        setLastVisible(snap.docs[snap.docs.length - 1]);
      }
      setHasMore(snap.docs.length === FETCH_LIMIT);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const { loaderRef } = useInfiniteScroll({
    onLoadMore: loadMoreProducts,
    hasMore: hasMore,
    isLoading: loadingMore,
    threshold: 300,
  });

  if (loading) {
    return (
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-[2rem] bg-zinc-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-[#F5F0E8]">
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C75C1A]/10 text-[#C75C1A] font-mono text-[9px] font-black uppercase tracking-[0.2em] mb-4">
          <Sparkles className="w-4 h-4" />
          {t("home.endless_grid.badge") || "COLLECTION INFINIE"}
        </div>
        <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#2C2118] uppercase">
          {t("home.endless_grid.title") || "Galerie d'Inspirations"}
        </h3>
        <p className="font-sans text-sm md:text-base text-[#8B7355] uppercase tracking-[0.15em] max-w-2xl leading-relaxed mt-4">
          {t("home.endless_grid.desc") || "Explorez notre collection complète. De nouvelles merveilles s'ajoutent continuellement."}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
        {products.map((product, i) => (
          <div key={product.id}>
            <ProductCard product={product} index={i} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={loaderRef} className="flex justify-center pt-12 min-h-[100px] items-center">
          {loadingMore && (
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 bg-[#C75C1A] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2.5 h-2.5 bg-[#C75C1A] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2.5 h-2.5 bg-[#C75C1A] rounded-full animate-bounce"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
