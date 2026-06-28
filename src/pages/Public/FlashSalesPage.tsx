import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, limit, getDocs, where, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ProductCard } from '../../components/Product/ProductCard';
import { ArrowLeft, Loader2, SlidersHorizontal, ChevronDown, SearchX, Timer, Zap, Flame, Activity } from 'lucide-react';
import { Product } from '../../types';
import { useFacetedFilters } from '../../hooks/useFacetedFilters';
import { DynamicFilterPanel } from '../../components/Shop/DynamicFilterPanel';
import { UniversalFilterBar } from '../../components/Shop/UniversalFilterBar';
import { useTranslation } from "react-i18next";

// Local Gadget: Live Countdown Timer
const CountdownTimer = () => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );
      const difference = endOfDay.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ h: 0, m: 0, s: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const { h, m, s } = timeLeft;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#3C2B22] rounded-xl flex items-center justify-center border border-stone-800 shadow-md">
            <span className="text-lg sm:text-xl font-kinder text-white tabular-nums tracking-tighter rtl:tracking-normal">{h.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Heures")}</span>
        </div>
        <span className="text-lg sm:text-xl font-kinder text-[#FF5C00] animate-pulse pb-4">:</span>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#3C2B22] rounded-xl flex items-center justify-center border border-stone-800 shadow-md">
            <span className="text-lg sm:text-xl font-kinder text-white tabular-nums tracking-tighter rtl:tracking-normal">{m.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Min")}</span>
        </div>
        <span className="text-lg sm:text-xl font-kinder text-[#FF5C00] animate-pulse pb-4">:</span>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 rounded-xl flex items-center justify-center border border-red-500 shadow-lg shadow-red-600/20">
            <span className="text-lg sm:text-xl font-kinder text-white tabular-nums tracking-tighter rtl:tracking-normal">{s.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold text-red-600 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Sec")}</span>
        </div>
      </div>
      <p className="text-[10px] font-bold text-red-600 leading-tight border-t border-stone-200/50 pt-1.5 animate-pulse">
        {isAr 
          ? "⚠️ بمجرد انتهاء الوقت، ستعود جميع المنتجات تلقائيًا إلى السعر الأصلي!"
          : "⚠️ Prix d'origine restitué automatiquement après compte à rebours !"}
      </p>
    </div>
  );
};

export const FlashSalesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [error, setError] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState("price-asc");

  const [limitState, setLimitState] = useState(10);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) setLimitState(10);
      else if (window.innerWidth >= 768) setLimitState(8);
      else setLimitState(6);
    }
  }, []);

  const fetchFlashSales = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      const fetchLimit = isLoadMore ? 6 : limitState;

      // 1. Fetch active Flash Sale products
      let qFlash = query(
        collection(db, "products"), 
        where("status", "==", "active"), 
        where("flashSaleActive", "==", true),
        limit(fetchLimit)
      );
      if (isLoadMore && lastDoc) {
        qFlash = query(
          collection(db, "products"), 
          where("status", "==", "active"), 
          where("flashSaleActive", "==", true),
          startAfter(lastDoc),
          limit(fetchLimit)
        );
      }
      const flashSnap = await getDocs(qFlash);
      const flashList = flashSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

      // 2. Fetch active Promo products
      let qPromo = query(
        collection(db, "products"), 
        where("status", "==", "active"), 
        where("isPromo", "==", true),
        limit(fetchLimit)
      );
      if (isLoadMore && lastDoc) {
        qPromo = query(
          collection(db, "products"), 
          where("status", "==", "active"), 
          where("isPromo", "==", true),
          startAfter(lastDoc),
          limit(fetchLimit)
        );
      }
      const promoSnap = await getDocs(qPromo);
      const promoList = promoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

      // Combine unique products, prioritizing flashSaleActive
      const combinedList: Product[] = [...flashList];
      const seenIds = new Set(flashList.map(p => p.id));

      promoList.forEach(p => {
        if (!seenIds.has(p.id)) {
          combinedList.push(p);
          seenIds.add(p.id);
        }
      });

      if (isLoadMore) setProducts(prev => {
        const uniquePrev = prev.filter(p => !seenIds.has(p.id));
        return [...uniquePrev, ...combinedList];
      });
      else setProducts(combinedList);

      const lastSnapshotDoc = flashSnap.docs[flashSnap.docs.length - 1] || promoSnap.docs[promoSnap.docs.length - 1] || null;
      setLastDoc(lastSnapshotDoc);
      setHasMore(flashSnap.docs.length === fetchLimit || promoSnap.docs.length === fetchLimit);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    if (limitState > 0) fetchFlashSales();
  }, [limitState]);

  const sortedProducts = useMemo(() => {
    let sorted = [...products];
    if (sortOption === "recent") {
      sorted.sort((a, b) => ((b.createdAt as any)?.toMillis?.() || 0) - ((a.createdAt as any)?.toMillis?.() || 0));
    } else if (sortOption === "price-asc") {
      sorted.sort((a, b) => (a.promoPrice || a.price) - (b.promoPrice || b.price));
    } else if (sortOption === "price-desc") {
      sorted.sort((a, b) => (b.promoPrice || b.price) - (a.promoPrice || a.price));
    }
    return sorted;
  }, [products, sortOption]);

  const {
    selectedFacets,
    availableFacets,
    filteredProducts,
    toggleFacet,
    setPriceRange,
    resetFilters,
    totalCount
  } = useFacetedFilters(sortedProducts, "Tous");

  const finalFilteredProducts = useMemo(() => {
    let list = [...filteredProducts];
    if (activeQuickFilter === 'promo') {
      list = list.filter(p => (p.promoPrice && p.promoPrice > 0) || (p.originalPrice && p.originalPrice > p.price));
    } else if (activeQuickFilter === 'free_shipping') {
      list = list.filter(p => p.freeShipping === true || p.tags?.some((t: string) => t.toLowerCase().includes('gratuit')) || p.description?.toLowerCase().includes('gratuit'));
    } else if (activeQuickFilter === 'rating') {
      list = list.filter(p => p.rating && p.rating >= 4.5);
    } else if (activeQuickFilter === 'price_down') {
      list.sort((a, b) => a.price - b.price);
    }
    return list;
  }, [filteredProducts, activeQuickFilter]);

  return (
    <div className="relative min-h-screen bg-[#FCF9F1] overflow-hidden">
      {/* Dynamic Light Background Wallpaper */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-red-400 blur-[130px] opacity-[0.15] rounded-full"></div>
        <div className="absolute top-[20%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-orange-400 blur-[130px] opacity-[0.15] rounded-full"></div>
        {/* Abstract shapes or texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-textile.png')] opacity-30 mix-blend-multiply"></div>
      </div>

      {/* Ticker Tape */}
      <div className="relative z-10 w-full overflow-hidden bg-[#B81830] text-white py-2 flex items-center shadow-md">
        <div className="animate-[marquee_20s_linear_infinite] whitespace-nowrap flex items-center font-kinder uppercase text-[10px] sm:text-xs tracking-widest rtl:tracking-normal gap-8">
          {[...Array(10)].map((_, i) => {
            const hasLowStock = filteredProducts.some(p => p.stock && p.stock > 0 && p.stock <= 20);
            const maxDiscount = filteredProducts.length > 0 ? Math.max(...filteredProducts.map(p => (p.originalPrice && p.price < p.originalPrice) ? Math.round((1 - p.price / p.originalPrice) * 100) : 0)) : 0;
            return (
                      <React.Fragment key={i}>
                        <span className="flex items-center gap-2 text-[#FFCC00]"><Zap className="w-3.5 h-3.5 fill-current" /> {t("VENTES FLASH")}</span>
                        <span>•</span>
                        {maxDiscount > 0 && (
                          <>
                            <span>-{maxDiscount}% {t("MAXIMAL")}</span>
                            <span>•</span>
                          </>
                        )}
                        {hasLowStock && (
                          <>
                            <span className="text-[#FFCC00]">{t("STOCK LIMITÉ")}</span>
                            <span>•</span>
                          </>
                        )}
                      </React.Fragment>
                    );
          })}
        </div>
      </div>

      <div className="relative z-10 max-w-[1850px] mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        
        {/* Header Dashboard Area */}
        <div className="mb-8 sm:mb-12 bg-white/70 backdrop-blur-2xl border border-red-100 rounded-[2rem] p-5 sm:p-8 lg:p-10 shadow-xl shadow-red-900/5 relative overflow-hidden">
          {/* Subtle Shine */}
          <div className="absolute top-0 right-0 w-[200%] h-[200%] -rotate-45 translate-x-[50%] -translate-y-[50%] bg-gradient-to-b from-transparent via-white/40 to-transparent pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between relative z-10">
            <div className="flex flex-col items-start gap-4 flex-1">
              <button 
                onClick={() => navigate(-1)} 
                className="text-stone-500 hover:text-stone-800 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest rtl:tracking-normal transition-colors bg-white px-4 py-2 rounded-full border border-stone-200 shadow-sm hover:bg-stone-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t("Retour")}</button>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#B81830] to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 rotate-3">
                  <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-kinder tracking-tighter rtl:tracking-normal text-[#3C2B22]">
                    {t("VENTES FLASH")}</h1>
                </div>
              </div>
              <p className="text-stone-600 font-medium text-sm sm:text-base max-w-xl">
                {t("Des offres éphémères sur une sélection exclusive de produits. Les stocks disparaissent très vite.")}<strong className="text-[#FF5C00]">{t("Premier arrivé, premier servi.")}</strong>
              </p>

              {/* Status Gadgets */}
              <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] sm:text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t("En direct")}</div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 text-[9px] sm:text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal">
                  <Activity className="w-3.5 h-3.5" />
                  {t("+1.2k acheteurs")}</div>
              </div>
            </div>

            {/* Configurable Countdown Gadget container */}
            <div className="flex-shrink-0 bg-stone-50/80 p-4 sm:p-5 rounded-3xl border border-stone-200/60 shadow-inner w-full lg:w-auto overflow-x-auto">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-red-500" />
                <h3 className="text-[10px] sm:text-xs font-kinder text-red-950 uppercase tracking-[0.2em] whitespace-nowrap">{t("Fin des offres dans")}</h3>
              </div>
              <CountdownTimer />
            </div>
          </div>
        </div>

        {/* Filters Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 bg-white/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-red-100 sticky top-[80px] sm:top-[88px] z-30 shadow-lg shadow-red-900/5">
          <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <div className="flex items-center gap-2">
                {[
                  { id: null, label: 'Tout voir' },
                  { id: 'promo', label: 'Plus grosses réducs', icon: <Flame className="w-3 h-3 text-[#B81830]" /> },
                  { id: 'free_shipping', label: 'Livraison Gratuite' },
                ].map(f => (
                  <button
                    key={f.id || 'all'}
                    onClick={() => setActiveQuickFilter(f.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest rtl:tracking-normal whitespace-nowrap transition-all ${
                      activeQuickFilter === f.id
                        ? 'bg-[#3C2B22] text-white shadow-md shadow-[#3C2B22]/20'
                        : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative shrink-0 flex-1 md:flex-none">
              <select 
                className="w-full md:w-auto pl-4 pr-10 py-2.5 sm:py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none font-bold text-[10px] sm:text-[11px] uppercase tracking-wider rtl:tracking-normal appearance-none cursor-pointer text-[#3C2B22] focus:border-[#B81830] transition-colors"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                 <option value="recent">{t("Nouveautés ⚡")}</option>
                 <option value="price-asc">{t("Prix Bas en premier")}</option>
                 <option value="price-desc">{t("VIP / Luxe")}</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B81830] pointer-events-none" />
            </div>

            <button 
              onClick={() => setShowFilters(true)} 
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-kinder text-[10px] sm:text-[11px] uppercase tracking-widest rtl:tracking-normal bg-white border border-stone-200 text-[#3C2B22] hover:bg-[#3C2B22] hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
            >
               <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               <span className="hidden sm:inline">{t("Affiner")}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[40vh]">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16">
               <div className="absolute inset-0 rounded-full border-t-4 border-red-200 animate-spin"></div>
               <div className="absolute inset-2 rounded-full border-r-4 border-[#B81830] animate-[spin_1.5s_linear_infinite_reverse]"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 sm:py-20 bg-red-50 rounded-2xl border border-red-100">
            <h2 className="text-base sm:text-lg font-bold text-red-600 mb-2">{t("Impossible de charger le terminal des ventes")}</h2>
            <p className="text-red-500 font-medium text-sm sm:text-base">{error}</p>
          </div>
        ) : finalFilteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6 relative z-10">
              {finalFilteredProducts.map((product, index) => {
                const initialStock = product.flashQuantity || product.stock || 0;
                const itemsLeft = product.stock || 0;
                const reservedCount = Math.max(initialStock - itemsLeft, 0);
                const stockPercent = initialStock > 0 ? Math.min((reservedCount / initialStock) * 100, 100) : 0;
                
                const showProgress = initialStock > 0 && itemsLeft > 0;
                const isAr = i18n.language === 'ar';

                return (
                  <div key={product.id} className="h-full bg-white rounded-2xl p-2 border border-orange-100 shadow-sm hover:border-[#FF5C00]/30 transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <ProductCard product={product} index={index} variant="flash_sale" />
                    </div>
                    {/* Live stock scarcity bar - only shown if we have valid logical data */}
                    {showProgress && (
                      <div className="mt-3 px-1 pb-1">
                        <div className="flex justify-between text-[10px] font-kinder leading-none mb-1">
                          <span className="text-red-600 animate-pulse flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-current inline" />
                            {isAr ? `بقي ${itemsLeft} فقط` : `Plus que ${itemsLeft} restants`}
                          </span>
                          <span className="text-stone-400">{Math.round(stockPercent)}% {isAr ? "محجوز" : "réservé"}</span>
                        </div>
                        <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-600 to-[#FF5C00] rounded-full"
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-12 mb-8 relative z-20">
                <button
                  onClick={() => fetchFlashSales(true)}
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
          <div className="py-20 sm:py-24 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-stone-200 shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-stone-50 rounded-3xl flex items-center justify-center text-stone-300 mb-6">
               <SearchX className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-kinder text-stone-800 uppercase tracking-wider rtl:tracking-normal">{t("Stocks épuisés")}</h3>
            <p className="text-sm font-medium text-stone-500 mt-2 max-w-sm px-4">{t("Aucun produit ne correspond à ces critères ou la vente est terminée pour ces articles.")}</p>
            <button 
              onClick={() => { resetFilters(); setActiveQuickFilter(null); }}
              className="mt-6 sm:mt-8 px-6 sm:px-8 py-3 sm:py-4 bg-[#B81830] text-white rounded-xl text-[10px] sm:text-xs font-kinder uppercase tracking-widest rtl:tracking-normal hover:bg-black hover:scale-105 transition-all shadow-md shadow-red-900/20"
            >
              {t("Réinitialiser ma recherche")}</button>
          </div>
        )}
      </div>

      <DynamicFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        activeCategory="Tous"
        selectedFacets={selectedFacets}
        availableFacets={availableFacets}
        toggleFacet={toggleFacet}
        setPriceRange={setPriceRange}
        resetFilters={resetFilters}
        totalCount={totalCount}
        onApply={() => setShowFilters(false)}
      />
    </div>
  );
};


