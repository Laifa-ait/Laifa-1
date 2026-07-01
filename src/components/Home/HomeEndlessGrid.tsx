import React, { useState, useEffect } from "react";
import { collection, query, getDocs, limit, orderBy, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Product } from "../../types";
import { ProductCard } from "../Product/ProductCard";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export const HomeEndlessGrid: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const INITIAL_FETCH_LIMIT = 20;
  const LOAD_MORE_LIMIT = 8;

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(INITIAL_FETCH_LIMIT));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Product));
        
        const validDocs = docs.filter(d => d.stock === undefined || d.stock > 0);
        setProducts(validDocs);
        
        if (snap.docs.length > 0) {
          setLastVisible(snap.docs[snap.docs.length - 1]);
        }
        setHasMore(snap.docs.length === INITIAL_FETCH_LIMIT);
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
        limit(LOAD_MORE_LIMIT)
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
      setHasMore(snap.docs.length === LOAD_MORE_LIMIT);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-none bg-slate-200 animate-pulse" />
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
          {t("home.endless_grid.badge") || "COLLECTION INFINIE"}
        </div>
        <h3 className="font-sans text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
          {t("home.endless_grid.title") || "Galerie d'Inspirations"}
        </h3>
        <p className="font-sans text-sm md:text-base text-slate-500 max-w-2xl leading-relaxed mt-4">
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
        <div className="flex justify-center mt-12">
          <button
            onClick={loadMoreProducts}
            disabled={loadingMore}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium tracking-wide uppercase rounded-full transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
              </div>
            ) : (
              <span>{t("home.endless_grid.load_more") || "Afficher plus"}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
