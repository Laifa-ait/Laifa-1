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

  const translateWithFallback = (key: string, defaultValue: string) => {
    const val = t(key);
    return val === key ? defaultValue : val;
  };

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
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-8">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-hide flex-nowrap">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[180px] sm:w-[240px] md:w-[280px] aspect-[3/4] shrink-0 rounded-3xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-8 pt-8 bg-slate-50 rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] mb-5 border border-slate-200">
          <Sparkles className="w-3.5 h-3.5" />
          {translateWithFallback("home.endless_grid.badge", "COLLECTION INFINIE")}
        </div>
        <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-medium tracking-wide text-slate-900 leading-[1.1]">
          {translateWithFallback("home.endless_grid.title", "Galerie d'Inspirations")}
        </h3>
        <p className="font-sans text-sm md:text-base text-slate-500 max-w-2xl leading-relaxed mt-4">
          {translateWithFallback("home.endless_grid.desc", "Explorez notre collection complète. De nouvelles merveilles s'ajoutent continuellement.")}
        </p>
      </div>

      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 desktop-scrollbar snap-x snap-mandatory flex-nowrap">
        {products.map((product, i) => (
          <div key={product.id} className="w-[180px] sm:w-[240px] md:w-[280px] shrink-0 snap-start">
            <ProductCard product={product} index={i} />
          </div>
        ))}
        {hasMore && (
          <div ref={loaderRef} className="flex-shrink-0 w-32 flex items-center justify-center snap-start h-full self-center">
            {loadingMore ? (
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-zinc-900 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-zinc-900 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-zinc-900 rounded-full animate-bounce"></div>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-sans uppercase tracking-widest">{t("Afficher plus") || "Plus"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
