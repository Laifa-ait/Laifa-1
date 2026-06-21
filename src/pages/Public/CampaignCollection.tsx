import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProductCard } from '../../components/Product/ProductCard';
import { ArrowLeft, Loader2, Star, Sparkles } from 'lucide-react';
import { useTranslation } from "react-i18next";

export const CampaignCollection: React.FC = () => {
    const { t } = useTranslation();
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{banner: any, products: any[]}>({ banner: null, products: [] });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/campaigns/${bannerId}/products?page=1&limit=24`);
        if (!res.ok) {
          throw new Error('Une erreur est survenue lors du chargement de la collection.');
        }
        const json = await res.json();
        setData({
          banner: json.banner,
          products: json.products
        });
        setPage(1);
        setHasMore(json.hasMore);
        setTotalProducts(json.total || 0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (bannerId) fetchCampaign();
  }, [bannerId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await fetch(`/api/campaigns/${bannerId}/products?page=${nextPage}&limit=24`);
      if (!res.ok) {
        throw new Error('Une erreur est survenue lors du chargement.');
      }
      const json = await res.json();
      setData(prev => ({
        banner: prev.banner,
        products: [...prev.products, ...json.products]
      }));
      setPage(nextPage);
      setHasMore(json.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-zinc-300 animate-spin" />
      </div>
    );
  }

  if (error || !data.banner) {
    return (
      <div className="pt-24 pb-12 px-6 max-w-2xl mx-auto text-center min-h-[50vh] flex flex-col justify-center">
        <h2 className="text-xl font-bold text-zinc-800 mb-4">{t("Collection introuvable")}</h2>
        <p className="text-zinc-500 mb-8">{error}</p>
        <button onClick={() => navigate('/')} className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide">
          {t("Retour à l'accueil")}</button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Dynamic Campaign Hero */}
      <div className="relative w-full h-[400px] md:h-[500px] mb-12 flex items-center justify-center overflow-hidden">
        {/* Background Image with Parallax-like effect */}
        <div 
          className="absolute inset-0 z-0 bg-zinc-900"
        >
           <img loading="lazy" 
            src={data.banner.desktop_image} 
            alt={data.banner.title} 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-0"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center pt-16">
          <button 
            onClick={() => navigate('/')} 
            className="absolute top-0 left-6 text-white/70 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Retour")}</button>
          
          <h1 
            className="text-4xl md:text-6xl font-black tracking-tight rtl:tracking-normal mb-4 drop-shadow-xl uppercase"
            style={{ color: data.banner.title_color || '#FFFFFF' }}
          >
            {data.banner.title}
          </h1>
          {data.banner.subtitle && (
            <p 
              className="text-lg md:text-xl font-medium max-w-2xl mx-auto drop-shadow-lg opacity-90 tracking-wide"
              style={{ color: data.banner.subtitle_color || '#E4E4E7' }}
            >
              {data.banner.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 md:px-8">
        
        {/* Section Header */}
        <div className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight rtl:tracking-normal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              {t("Sélection de la collection")}</h2>
            <p className="text-zinc-500 mt-1 font-medium text-sm">
              {t("Découvrez tous les articles liés à cette sélection exclusive.")}</p>
          </div>
          <div className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-full text-xs uppercase tracking-widest rtl:tracking-normal font-bold">
            {data.products.length} {data.products.length > 1 ? 'Articles' : 'Article'} {!loading && totalProducts > data.products.length && `sur ${totalProducts}`}
          </div>
        </div>

        {/* Product Grid */}
        {data.products.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12">
              {data.products.map((product) => {
                
                return (
                              <div key={product.id} className="relative group flex flex-col h-full">
                                {product.isBannerFeatured && (
                                  <div className="absolute -top-3 -left-3 z-20 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] uppercase font-black tracking-wider rtl:tracking-normal px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border-2 border-white">
                                    <Star className="w-3 h-3 fill-current" />
                                    {t("Coup de cœur")}</div>
                                )}
                                {/* The ProductCard doesn't expand height to 100% naturally without a tiny wrapper tweak, but it's okay for grid */}
                                <div className={product.isBannerFeatured ? "ring-2 ring-orange-100 rounded-3xl p-[2px] transition-all duration-300 group-hover:ring-orange-200 shadow-[0_0_15px_rgba(251,146,60,0.15)] bg-white h-full" : "h-full"}>
                                  <ProductCard product={product} />
                                </div>
                              </div>
                            );
              })}
            </div>

            {hasMore && (
              <div className="flex flex-col items-center justify-center pt-8 border-t border-zinc-150 mt-12 gap-4">
                <p className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest rtl:tracking-normal leading-none">
                  {t("Affichage de")}{data.products.length} {t("sur")}{totalProducts} {t("articles")}</p>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-4 bg-zinc-950 text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.98] rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center gap-3 cursor-pointer shadow-lg"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      {t("Chargement...")}</>
                  ) : (
                    "Charger plus d'articles"
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
            <p className="text-zinc-400 font-medium">{t("Aucun produit disponible pour cette collection pour le moment.")}</p>
          </div>
        )}

      </div>
    </div>
  );
};
