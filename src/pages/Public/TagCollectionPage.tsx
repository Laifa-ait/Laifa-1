import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ProductCard } from '../../components/Product/ProductCard';
import { ArrowLeft, Loader2, Tag } from 'lucide-react';
import { Product } from '../../types';
import { useTranslation } from "react-i18next";

export const TagCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const [limitState, setLimitState] = useState(10);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) setLimitState(10);
      else if (window.innerWidth >= 768) setLimitState(8);
      else setLimitState(6);
    }
  }, []);

  const fetchTagProducts = async (isLoadMore = false) => {
    try {
      if (!tagId) return;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const fetchLimit = isLoadMore ? 6 : limitState;

      let q = query(
        collection(db, "products"),
        where("tags", "array-contains", tagId),
        where("status", "==", "active"),
        limit(fetchLimit)
      );

      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, "products"),
          where("tags", "array-contains", tagId),
          where("status", "==", "active"),
          startAfter(lastDoc),
          limit(fetchLimit)
        );
      }

      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      
      if (isLoadMore) setProducts(prev => [...prev, ...productsData]);
      else setProducts(productsData);

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === fetchLimit);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    if (limitState > 0) fetchTagProducts();
  }, [tagId, limitState]);

  return (
    <div className="pt-24 pb-20 max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="text-[#3C2B22]/60 hover:text-[#3C2B22] flex items-center gap-2 text-sm font-bold mb-6 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Retour")}</button>

          <h1 className="text-3xl md:text-5xl font-kinder tracking-tighter rtl:tracking-normal text-[#3C2B22] flex items-center gap-3">
            <Tag className="w-8 h-8 md:w-10 md:h-10 text-[#FF5C00]" />
            {t("Collection:")}<span className="text-[#FF5C00] capitalize">{tagId}</span>
          </h1>
          <p className="mt-3 text-[#3C2B22]/70 font-semibold max-w-2xl">
            {t("Découvrez tous les produits associés à cette sélection spéciale.")}</p>
        </div>
        
        {!loading && !error && (
          <div className="bg-[#FDF9EC] text-[#3C2B22] px-4 py-2 rounded-xl text-xs uppercase tracking-widest rtl:tracking-normal font-kinder inline-flex items-center shadow-sm w-fit">
            {products.length} {products.length > 1 ? 'Articles' : 'Article'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <Loader2 className="w-10 h-10 text-[#FF5C00] animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
          <h2 className="text-lg font-bold text-red-600 mb-2">{t("Erreur de chargement")}</h2>
          <p className="text-red-500/80 font-medium">{error}</p>
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-12 mb-8 relative z-20">
              <button
                onClick={() => fetchTagProducts(true)}
                disabled={loadingMore}
                className="px-8 py-3.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {t("Afficher plus")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
          <p className="text-zinc-400 font-medium">{t("Aucun produit disponible pour cette collection pour le moment.")}</p>
        </div>
      )}
    </div>
  );
};
