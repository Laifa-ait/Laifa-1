import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, SlidersHorizontal, SearchX, Grid, List, ChevronDown, MapPin, X, MessageCircle, Sparkles, Truck, Star, ArrowDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { ProductCard } from '../../components/Product/ProductCard';
import { ALGERIA_WILAYAS, CATEGORY_ICONS } from '../../constants';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { collection, query, where, getDocs, limit, startAfter, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Product } from '../../types';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useDebounce } from '../../hooks/useDebounce';
import useSWR from 'swr';
import { getCategoryTranslation } from '../../utils/translations';
import { withExponentialBackoff } from '../../utils/retry';

// ... (keep necessary imports)
import { analyticsEngine } from '../../utils/analyticsEngine';
import { useFacetedFilters } from '../../hooks/useFacetedFilters';
import { DynamicFilterPanel } from '../../components/Shop/DynamicFilterPanel';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { VirtualizedProductGrid } from '../../components/Shop/VirtualizedProductGrid';
import { AiChatDrawer } from '../../components/Chat/AiChatDrawer';
import { UniversalFilterBar } from '../../components/Shop/UniversalFilterBar';
import { useUIStore } from '../../store/useUIStore';

export const Shop: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const setIsSearchOpen = useUIStore((state) => state.setIsSearchOpen);
  const { 
    activeCategory, 
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    activeWilaya,
    setActiveWilaya,
    sortOption,
    setSortOption
  } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [queryError, setQueryError] = useState<{ message: string, indexLink?: string } | null>(null);
  const INITIAL_LIMIT = typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 10 : window.innerWidth >= 768 ? 8 : 6) : 6;
  const LOAD_MORE_LIMIT = 6;

  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    "Tous",
    "Supermarché",
    "Maison & Déco",
    "Électronique",
    "Électroménager",
    "Scolaire & Bureau",
    "Mode",
    "Beauté & Santé",
    "Auto & Moto",
    "Sport & Loisirs",
    "Bébé & Puériculture",
    "Bricolage & Outillage",
    "Jeux & Jouets"
  ];

  const urlCategory = searchParams.get('category');
  const urlSubcategory = searchParams.get('subcategory');
  const urlSubsubcategory = searchParams.get('subsubcategory');
  const urlTag = searchParams.get('tag');

  useEffect(() => {
    if (urlCategory) {
      setActiveCategory(urlCategory);
    }
  }, [urlCategory, setActiveCategory]);

  const buildQueryConditions = () => {
    const conditions: any[] = [];
    conditions.push(where("status", "==", "active"));
    
    const catToFilter = urlCategory || activeCategory;
    if (catToFilter && catToFilter !== "Tous") {
      conditions.push(where("category", "==", catToFilter));
    }
    if (urlSubcategory) {
      conditions.push(where("subcategory", "==", urlSubcategory));
    }
    if (urlSubsubcategory) {
      conditions.push(where("subsubcategory", "==", urlSubsubcategory));
    }
    if (activeWilaya !== "Tous") {
      conditions.push(where("wilaya", "==", activeWilaya));
    }
    if (urlTag) {
      conditions.push(where("tags", "array-contains", urlTag));
    }
    
    // We remove server-side orderBy to prevent missing index errors and missing fields exclusion
    // Sorting will be done client-side.
    
    return conditions;
  };

  const cacheKey = `shop_list_${urlCategory || activeCategory}_${urlSubcategory || "none"}_${activeWilaya}_${sortOption}_${urlTag || "none"}`;

  const fetchProductsSWR = async () => {
    const conditions = buildQueryConditions();
    const q = query(collection(db, "products"), ...conditions, limit(INITIAL_LIMIT));
    
    // FINOPS FIX: Wrapping direct query in exponential backoff to absorb transient errors
    const snap = await withExponentialBackoff(() => getDocs(q));
    let productsFetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Product);
    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    const catFilter = urlCategory || activeCategory;
    if (catFilter && catFilter !== "Tous") {
      try {
        let customCats: any[] = [];
        const cachedCatsStr = sessionStorage.getItem("home_custom_categories");
        if (cachedCatsStr) {
          customCats = JSON.parse(cachedCatsStr);
        }
        const catConfig = customCats.find((cc: any) => cc.id === catFilter);
        if (catConfig && catConfig.featuredProductIds && catConfig.featuredProductIds.length > 0) {
          const pinnedIds = catConfig.featuredProductIds;
          productsFetched = [...productsFetched].sort((a, b) => {
            const aPinnedIndex = Array.isArray(pinnedIds) ? pinnedIds.indexOf(a.id) : -1;
            const bPinnedIndex = Array.isArray(pinnedIds) ? pinnedIds.indexOf(b.id) : -1;
            const aIsPinned = aPinnedIndex !== -1;
            const bIsPinned = bPinnedIndex !== -1;
            if (aIsPinned && bIsPinned) return aPinnedIndex - bPinnedIndex;
            if (aIsPinned) return -1;
            if (bIsPinned) return 1;
            return 0;
          });
        }
      } catch (sortErr) {
        console.warn("Exception sorting category products by priorities:", sortErr);
      }
    }
    return {
       products: productsFetched,
       lastVisible: lastDoc
    };
  };

  const { data: swrData, error: swrError, isLoading: swrIsLoading } = useSWR(cacheKey, fetchProductsSWR, {
    revalidateOnFocus: true,
    revalidateIfStale: true
  });

  useEffect(() => {
    if (swrIsLoading) {
       setIsLoadingProducts(true);
       setQueryError(null);
    } else if (swrError) {
        console.error("Firebase Query Error/Quota Exceeded (falling back gracefully):", swrError);
        let indexLink = "";
        if (swrError.message && swrError.message.includes('https://console.firebase.google.com')) {
           const match = swrError.message.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
           if (match) indexLink = match[1];
        }
        setQueryError({ 
          message: "Une erreur est survenue lors du chargement des produits. Veuillez réessayer.",
          indexLink
        });
        setProducts([]);
        setLastVisible(null);
        setIsLoadingProducts(false);
    } else if (swrData) {
        // Only set products if we are not appending for load-more
        // Actually since cacheKey changes on filter changes entirely, we should just overwrite.
        setProducts(swrData.products);
        setLastVisible(swrData.lastVisible);
        setQueryError(null);
        setIsLoadingProducts(false);
    }
  }, [swrData, swrError, swrIsLoading]);

  const loadMoreProducts = async () => {
    if (!lastVisible) return;
    setLoadingMore(true);
    try {
      const conditions = buildQueryConditions();
      const q = query(collection(db, "products"), ...conditions, startAfter(lastVisible), limit(LOAD_MORE_LIMIT));
      const snap = await withExponentialBackoff(() => getDocs(q));
      const newProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Product);
      setProducts(prev => {
        // Prevent duplicate appending
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newProducts.filter(p => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });
      setLastVisible(snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const { loaderRef } = useInfiniteScroll({
    onLoadMore: loadMoreProducts,
    hasMore: !!lastVisible && products.length < 36,
    isLoading: loadingMore,
    threshold: 300,
  });

  // --- RECHERCHE TEXTUELLE (Full-Text avec Fuse.js / Backend) ---
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.trim() === "") {
        setSearchResults(null);
        return;
      }
      setIsLoadingProducts(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`);
        const data = await response.json();
        setSearchResults(data.products || []);
      } catch (err) {
        console.error("Search fetch error", err);
        setSearchResults([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  const finalProductsList = useMemo(() => {
    let result = searchResults !== null ? [...searchResults] : [...products];

    if (urlSubsubcategory) {
      result = result.filter(p => {
        const subSub = p.subSubCategory || (p as any).subsubcategory || "";
        return subSub === urlSubsubcategory || 
               p.name?.toLowerCase().includes(urlSubsubcategory.toLowerCase()) ||
               p.description?.toLowerCase().includes(urlSubsubcategory.toLowerCase());
      });
    }

    // Client-side sorting
    if (sortOption === "recent") {
      result.sort((a, b) => {
        const timeA = (a.createdAt as any)?.seconds || 0;
        const timeB = (b.createdAt as any)?.seconds || 0;
        return timeB - timeA;
      });
    } else if (sortOption === "quality") {
      result.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    } else if (sortOption === "price-asc") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === "price-desc") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    // Always sort sponsored products to the top
    result.sort((a, b) => {
       if (a.isSponsored && !b.isSponsored) return -1;
       if (!a.isSponsored && b.isSponsored) return 1;
       return 0;
    });

    return result;
  }, [products, searchResults, urlSubsubcategory, sortOption]);

  const {
    selectedFacets,
    availableFacets,
    filteredProducts,
    toggleFacet,
    setPriceRange,
    resetFilters,
    totalCount
  } = useFacetedFilters(finalProductsList, activeCategory);

  const finalFilteredProducts = filteredProducts;

  useEffect(() => {
    if (!searchQuery) return;
    const delayDebounceFn = setTimeout(() => {
      analyticsEngine.track('search_query', {
        query: searchQuery,
        resultsCount: filteredProducts.length
      });
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filteredProducts.length]);

  const pageTitle = useMemo(() => {
    let title = "OLMART | Catalogue";
    const currentCat = urlCategory || activeCategory;
    if (currentCat && currentCat !== "Tous") {
      title = `OLMART | ${currentCat}`;
      if (urlSubcategory) {
        title += ` - ${urlSubcategory}`;
      }
    }
    if (searchQuery) {
      title += ` : Recherche "${searchQuery}"`;
    }
    return title;
  }, [urlCategory, activeCategory, urlSubcategory, searchQuery]);

  const pageDescription = useMemo(() => {
    const currentCat = urlCategory || activeCategory;
    let desc = "Explorez notre sélection de produits sur OLMART, la marketplace d'Algérie.";
    if (currentCat && currentCat !== "Tous") {
      desc = `Achetez des articles de la catégorie ${currentCat} sur OLMART.`;
      if (urlSubcategory) {
        desc += ` Découvrez la collection de ${urlSubcategory} avec livraison sécurisée dans les 58 Wilayas.`;
      }
    }
    if (searchQuery) {
      desc = `Découvrez les résultats de recherche pour "${searchQuery}" sur OLMART Algérie.`;
    }
    return desc;
  }, [urlCategory, activeCategory, urlSubcategory, searchQuery]);

  const pageKeywords = useMemo(() => {
    const currentCat = urlCategory || activeCategory;
    const baseKeywords = "olmart, catalogue, algérie, achat en ligne, 58 wilayas, livraison";
    if (currentCat && currentCat !== "Tous") {
      return `${currentCat.toLowerCase()}, ${urlSubcategory ? urlSubcategory.toLowerCase() + ", " : ""}${baseKeywords}`;
    }
    return baseKeywords;
  }, [urlCategory, activeCategory, urlSubcategory]);

  const seoHelmet = usePageMetadata({
    title: pageTitle,
    description: pageDescription,
    keywords: pageKeywords,
  });

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-32 font-sans">
      {seoHelmet}
      {/* Header / Search: White-Lit Premium Architecture */}
      <div className="bg-white border-b border-slate-100 pt-20 sm:pt-24 lg:pt-32 pb-8 sm:pb-10 px-4 sm:px-6 relative shadow-sm">
         <div className="absolute top-0 inset-x-0 h-1 bg-slate-900 z-10" />
         <div className="max-w-[90rem] mx-auto space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
               <div className="space-y-2">
                 {/* Breadcrumbs */}
                 <nav className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest rtl:tracking-normal flex-wrap">
                    <span className="cursor-pointer hover:text-slate-900" onClick={() => navigate('/')}>{t('shop_home_breadcrumb', 'Accueil')}</span>
                    <span>/</span>
                    <span className="cursor-pointer hover:text-slate-900" onClick={() => { setActiveCategory("Tous"); setSearchParams({}); }}>{t('shop_breadcrumb', 'Boutique')}</span>
                    {activeCategory && activeCategory !== "Tous" && (
                      <>
                        <span>/</span>
                        <span className={urlSubcategory ? "cursor-pointer hover:text-slate-900" : "text-slate-900"} onClick={() => { setSearchParams({ category: activeCategory }); }}>
                          {getCategoryTranslation(activeCategory, t)}
                        </span>
                      </>
                    )}
                    {urlSubcategory && (
                      <>
                        <span>/</span>
                        <span className={urlSubsubcategory ? "cursor-pointer hover:text-slate-900" : "text-slate-900"} onClick={() => { setSearchParams({ category: activeCategory, subcategory: urlSubcategory }); }}>
                          {getCategoryTranslation(urlSubcategory, t)}
                        </span>
                      </>
                    )}
                    {urlSubsubcategory && (
                      <>
                        <span>/</span>
                        <span className="text-slate-900">{getCategoryTranslation(urlSubsubcategory, t)}</span>
                      </>
                    )}
                 </nav>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold tracking-tight rtl:tracking-normal text-slate-900 uppercase">
                    {urlTag ? `Tag: ${urlTag}` : (urlSubsubcategory ? getCategoryTranslation(urlSubsubcategory, t) : urlSubcategory ? getCategoryTranslation(urlSubcategory, t) : activeCategory === "Tous" ? t("shop_collections", "Collections") : getCategoryTranslation(activeCategory, t))}
                  </h1>
                  <p className="text-slate-500 text-sm">{t('shop_explore_treasures', "Explorez les trésors uniques des 58 Wilayas d'Algérie.")}</p>
               </div>

               {/* Right side: Modern Unified Compact Actions */}
               <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-xl shrink-0">
                  <div className="relative w-full">
                     <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                     <button 
                       onClick={() => setIsSearchOpen(true)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-full ps-11 pe-4 py-3 text-sm font-medium text-left rtl:text-right text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                     >
                       {searchQuery || t('search_placeholder_olma', 'Rechercher une création Olma...')}
                     </button>
                     {searchQuery && (
                       <button onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }} className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" title={t("Effacer la recherche") || "Effacer la recherche"}>
                         <X className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                  

                  <button 
                    onClick={() => setShowFilters(!showFilters)} 
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                  >
                     <SlidersHorizontal className="w-4 h-4 shrink-0" />
                     <span>{t("filter_filters", "Filtres")}</span>
                  </button>
               </div>
            </div>

            {/* Unified Control Box: Double-Decker categories & express tags */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
               {/* Deck 1: Main Categories */}
               <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 h-6">
                        <span>{t('nav_categories', 'Catégories')}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-900 bg-slate-50 px-3 py-0.5 rounded-full text-[11px] border border-slate-100">
                           {getCategoryTranslation(activeCategory, t)}
                        </span>
                     </span>
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-1.5 desktop-scrollbar shrink-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                     {categories.map((cat) => {
                         
                       const IconComponent = CATEGORY_ICONS[cat] || CATEGORY_ICONS["Tous"];
                       const isSelected = activeCategory === cat;
                       const displayLabel = cat === "Tous" ? (t("all_categories") || "Toutes") : (t(cat) || cat);
                       return (
                         <button 
                           key={cat}
                           title={displayLabel}
                           onClick={() => {
                             setActiveCategory(cat);
                             setSearchParams({});
                           }}
                           className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 select-none cursor-pointer border hover:-translate-y-1 active:translate-y-0 active:scale-95 ${
                             isSelected 
                               ? 'text-white border-transparent bg-slate-900 shadow-md' 
                               : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                           }`}
                         >
                            {isSelected && (
                              <motion.div 
                                layoutId="activeCategoryCircleShop" 
                                className="absolute inset-0 bg-slate-900 rounded-full -z-10" 
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                            {IconComponent && (
                              <IconComponent className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
                            )}
                         </button>
                       );
                     })}
                  </div>
               </div>

            </div>
         </div>
      </div>

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
          {/* Backdrop for Mobile/Tablet Filters */}
          <AnimatePresence>
             {showFilters && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFilters(false)}
                  className="fixed inset-0 bg-stone-900/60 z-[110] lg:hidden backdrop-blur-xs"
                />
             )}
          </AnimatePresence>

         {/* Products Grid */}
         <main className="flex-1">
            {/* Elegant Results & Sorter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-8">
               <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest rtl:tracking-normal bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{filteredProducts.length} {t('articles_found', 'ARTICLES TROUVÉS')}</span>
                  <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-300" />
                  
                  {/* Dynamic Active Badges aligned neatly within summary */}
                  <div className="flex flex-wrap gap-1.5">
                     {(activeCategory !== "Tous" || activeWilaya !== "Tous" || searchQuery || urlSubcategory || urlSubsubcategory || urlTag) ? (
                        <>
                           {activeCategory !== "Tous" && !urlSubcategory && !urlSubsubcategory && !urlTag && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 {getCategoryTranslation(activeCategory, t)}
                                 <button onClick={() => {setActiveCategory("Tous"); setSearchParams({});}} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                           {urlSubcategory && !urlSubsubcategory && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 {getCategoryTranslation(urlSubcategory, t)}
                                 <button onClick={() => setSearchParams({ category: activeCategory })} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                           {urlSubsubcategory && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 {getCategoryTranslation(urlSubsubcategory, t)}
                                 <button onClick={() => setSearchParams({ category: activeCategory, subcategory: urlSubcategory! })} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                           {urlTag && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 #{urlTag}
                                 <button onClick={() => setSearchParams({})} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                           {activeWilaya !== "Tous" && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 {t("Wilaya:")}{activeWilaya}
                                 <button onClick={() => setActiveWilaya("Tous")} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                           {searchQuery && (
                              <span className="inline-flex items-center gap-1 bg-white text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 shadow-sm">
                                 {t("Recherche: \"")}{searchQuery}"
                                 <button onClick={() => setSearchQuery("")} className="hover:text-red-500 ml-1 cursor-pointer"><X className="w-2.5 h-2.5"/></button>
                              </span>
                           )}
                        </>
                     ) : (
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('all_catalog', 'Tout le catalogue')}</span>
                     )}
                  </div>
               </div>

               <div className="flex items-center gap-3 self-end md:self-auto shrink-0 justify-between md:justify-end w-full md:w-auto">
                  {/* Sorting dropdown integrated cleanly */}
                  <div className="relative font-sans min-w-[170px]">
                     <select 
                       className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-full outline-none font-bold text-[11px] uppercase appearance-none cursor-pointer text-slate-700 shadow-sm transition-all"
                       value={sortOption}
                       onChange={(e) => setSortOption(e.target.value)}
                     >
                        <option value="quality">{t('sort_relevance', 'Score de Pertinence')}</option>
                        <option value="recent">{t('newest', 'Nouveautés')}</option>
                        <option value="price-asc">{t('price_asc', 'Prix Croissant')}</option>
                        <option value="price-desc">{t('price_desc', 'Prix Décroissant')}</option>
                     </select>
                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="flex gap-2">
                     <button className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md"><Grid className="w-4 h-4" /></button>
                     <button className="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm transition-all"><List className="w-4 h-4" /></button>
                  </div>
               </div>
            </div>

            {isLoadingProducts ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] rounded-[3rem] bg-zinc-200 animate-pulse" />
                  ))}
               </div>
            ) : queryError ? (
               <div className="py-32 flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 bg-red-50 rounded-[2rem] border border-red-100 flex items-center justify-center text-red-500">
                     <SlidersHorizontal className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-sans font-bold text-zinc-900">{t('filters_not_applicable', 'Filtres non applicables')}</h3>
                  <p className="text-zinc-500 max-w-md font-medium">
                     {t('filters_not_applicable_desc', 'Nous rencontrons des difficultés à appliquer ces filtres précis (Index manquant). Le reste du catalogue est accessible.')}
                  </p>
                  {(import.meta as any).env?.DEV && queryError.indexLink && (
                    <div className="mt-4 p-5 bg-orange-50 border border-orange-200 rounded-xl text-left w-full max-w-lg">
                      <p className="text-xs font-bold text-orange-800 mb-2 uppercase tracking-wide">{t("⚠️ Action Requise (Dev Only)")}</p>
                      <p className="text-sm text-orange-900 mb-4">{t("Un index composite Firestore est requis pour cette combinaison de filtres et de tris.")}</p>
                      <a href={queryError.indexLink} target="_blank" rel="noreferrer" className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl text-[11px] font-sans font-bold uppercase tracking-widest rtl:tracking-normal transition-colors">{t("Créer l'index Firestore")}</a>
                    </div>
                  )}
                  <button 
                    onClick={() => { setActiveCategory("Tous"); setActiveWilaya("Tous"); setSortOption("recent"); setSearchQuery(""); setSearchParams({}); }}
                    className="px-8 py-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl font-sans font-bold text-[11px] uppercase tracking-widest rtl:tracking-normal mt-4 transition-colors"
                  >
                     {t('clear_filters', 'Effacer les filtres')}
                  </button>
               </div>
            ) : finalFilteredProducts.length > 0 ? (
               <div className="flex flex-col gap-10">
                  <VirtualizedProductGrid products={finalFilteredProducts} />
                  
                  {/* Infinite Scroll / Load More */}
                  {lastVisible && !searchQuery && (
                     <div ref={products.length < 36 ? loaderRef : undefined} className="flex justify-center pt-8 border-t border-slate-100 min-h-[100px] items-center">
                        {loadingMore ? (
                           <div className="flex gap-2">
                             <div className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-2.5 h-2.5 bg-slate-900 rounded-full animate-bounce"></div>
                           </div>
                        ) : products.length >= 36 ? (
                           <button onClick={loadMoreProducts} className="border border-slate-200 bg-white text-slate-700 rounded-full px-8 py-3 hover:bg-slate-50 transition-all font-sans font-bold uppercase tracking-widest text-[11px] shadow-sm">
                              {t('discover_more_articles', "Découvrir plus d'articles")}
                           </button>
                        ) : (
                           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest rtl:tracking-normal">{t('scroll_to_see_more', 'Faites défiler pour voir plus')}</span>
                        )}
                     </div>
                  )}
               </div>
            ) : (
                <div className="py-12 space-y-10 w-full">
                   {/* Warm alert banner */}
                   <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 sm:p-8 text-left space-y-3 flex flex-col relative overflow-hidden backdrop-blur-md">
                      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-slate-100/50 rounded-full blur-[80px] pointer-events-none" />
                      <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t('friction_economy_recommendations', 'Économie de friction & Recommandations')}</span>
                      <h3 className="font-sans font-bold text-slate-900 text-xl uppercase">{t('no_exact_creation_available', 'Aucune création exacte disponible')}</h3>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed max-w-3xl">
                         {t('dear_customer_no_exact_match', "Chère cliente, cher client, il n'y a pas d'article exact correspondant à vos critères de recherche ou de filtre actuels. Nous avons élargi la sélection pour vous proposer d'autres inspirations d'exception de la catégorie")} <span className="font-sans font-bold text-slate-900">"{activeCategory}"</span> :
                      </p>
                   </div>

                   {/* Fallback Grid Content */}
                   {products.length > 0 ? (
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold uppercase tracking-widest rtl:tracking-normal text-slate-500 border-b border-slate-100 pb-3">{t('no_exact_match_but_bestsellers', "Nous n'avons pas de correspondance exacte, mais vous allez adorer ces best-sellers")}</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
                            {products.slice(0, 12).map((product, i) => (
                              <ProductCard key={product.id} product={product} index={i} />
                            ))}
                         </div>
                      </div>
                   ) : (
                      <div className="text-center py-10 font-sans font-bold text-slate-500">
                         {t('no_products_listed', "Aucun produit n'est répertorié pour le moment dans cette catégorie.")}
                      </div>
                   )}
                </div>
            )}
         </main>
      </div>

      <DynamicFilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        activeCategory={activeCategory || "Tous"}
        selectedFacets={selectedFacets}
        availableFacets={availableFacets}
        toggleFacet={toggleFacet}
        setPriceRange={setPriceRange}
        resetFilters={resetFilters}
        totalCount={totalCount}
        onApply={() => setShowFilters(false)}
      />

      <AiChatDrawer isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} />
    </div>
  );
};
