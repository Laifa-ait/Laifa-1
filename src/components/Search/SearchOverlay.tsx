import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  History,
  TrendingUp,
  ArrowRight,
  Loader2,
  Star,
  ShieldCheck,
  Compass,
  Info,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useShop } from "../../context/ShopContext";
import { useTranslation } from "react-i18next";
import { useTrendingSearches } from "../../hooks/useTrendingSearches";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const SearchOverlay: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen } = useUI();
  const { setSearchQuery } = useShop();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [matchedStores, setMatchedStores] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(9);
  const [apiError, setApiError] = useState(false);
  const trendingSearches = useTrendingSearches();

  const inputRef = useRef<HTMLInputElement>(null);
  const isRtl = i18n.language === "ar";

  // Global '/' listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        // Prevent opening if user is already typing in an input/textarea/contenteditable
        const activeEl = document.activeElement;
        const isInput = activeEl && (
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable
        );
        if (!isInput) {
          e.preventDefault();
          setIsSearchOpen(true);
        }
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSearchOpen]);

  // Handle opening state, scroll lock, and autofocus
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 150);

      // Load recent searches
      try {
        const saved = localStorage.getItem("olma_recent_searches");
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("localStorage loading failed in search-overlay:", e);
        setRecentSearches([]);
      }

      // Load recommended / trending creations as fallbacks
      const fetchRecommendations = async () => {
        try {
          const q = query(collection(db, "products"), limit(4));
          const snap = await getDocs(q);
          const prods = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);
          setRecommendedProducts(prods);
        } catch (err) {
          console.warn("Failed to load search overlay recommendations:", err);
        }
      };

      fetchRecommendations();
    } else {
      document.body.style.overflow = "";
      setLocalSearch("");
      setResults([]);
      setApiError(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

  // Debounced live typing search with AbortController
  useEffect(() => {
    if (!localSearch.trim()) {
      setResults([]);
      setMatchedStores([]);
      setApiError(false);
      return;
    }

    const controller = new AbortController();

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setApiError(false);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(localSearch)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setResults(data.products || []);
          setMatchedStores(data.stores || []);
          setVisibleCount(9); // Reset visible products count on new query
        } else {
          throw new Error("HTTP search error");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Live search overlay error:", err);
          setApiError(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [localSearch]);

  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem("olma_recent_searches", JSON.stringify(updated));
    } catch (e) {
      console.warn("localStorage item set failed:", e);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (localSearch.trim()) {
      saveSearchTerm(localSearch);
      setSearchQuery(localSearch.trim());
      setIsSearchOpen(false);
      navigate("/shop");
    }
  };

  const selectSearchTerm = (term: string) => {
    setLocalSearch(term);
    saveSearchTerm(term);
    setSearchQuery(term);
    setIsSearchOpen(false);
    navigate("/shop");
  };

  const handleDeleteRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem("olma_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.warn("localStorage recent search delete failed:", err);
    }
  };

  const navigateToProduct = (id: string, name: string) => {
    saveSearchTerm(name);
    setIsSearchOpen(false);
    navigate(`/product/${id}`);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <b key={i} className="text-[#FF5C00] font-extrabold bg-[#FF5C00]/15 px-1 rounded">
              {part}
            </b>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] bg-stone-50/95 backdrop-blur-xl overflow-y-auto flex flex-col justify-start min-h-screen text-[#3C2B22] pb-16"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Header Bar */}
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between border-b border-[#FF5C00] shrink-0">
            <div className="flex items-center gap-3">
              <Compass className="w-6 h-6 text-[#FF5C00] animate-pulse" />
              <span className="font-display italic text-lg tracking-wide uppercase text-[#3C2B22]/90">
                {t("search_global") || "Recherche globale"}
              </span>
              <div className="hidden sm:flex items-center gap-1 bg-[#3C2B22]/5 border border-[#3C2B22]/10 px-2 py-0.5 rounded-lg text-[10px] rtl:text-[12px] text-zinc-500 font-mono">
                <span>{t("common.shortcut_prefix", "Appuyer sur")}</span>
                <span className="font-bold text-[#FF5C00]">/</span>
              </div>
            </div>

            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-3 bg-white hover:bg-[#3C2B22]/5 border border-[#FF5C00] hover:border-[#FF5C00]/30 text-[#3C2B22] rounded-full transition-all duration-300 hover:rotate-90 cursor-pointer flex items-center justify-center shadow-sm hover:shadow-md"
            >
              <X className="w-6 h-6 stroke-[1.5]" />
            </button>
          </div>

          <div className="w-full max-w-5xl mx-auto px-4 md:px-8 mt-10 md:mt-16 flex-grow space-y-10">
            {/* Embedded Search Input */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="w-full"
            >
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div
                  className={`absolute inset-y-0 ${isRtl ? "right-4 sm:right-6" : "left-4 sm:left-6"} flex items-center pointer-events-none text-zinc-400 group-focus-within:text-[#FF5C00] transition-all`}
                >
                  {isSearching ? (
                    <Loader2 className="w-7 h-7 animate-spin text-[#FF5C00]" />
                  ) : (
                    <Search className="w-7 h-7" />
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder={t("search_today_prompt") || "Que recherchez-vous aujourd'hui ?"}
                  className={`w-full bg-white hover:bg-stone-50 border border-[#FF5C00] focus:border-[#FF5C00]/60 text-[#3C2B22] placeholder-zinc-400 rounded-3xl py-4 sm:py-6 ${isRtl ? "pr-12 sm:pr-16 pl-24 sm:pl-36" : "pl-12 sm:pl-16 pr-24 sm:pr-36"} text-base sm:text-2xl font-medium outline-none focus:bg-white transition-all duration-300 shadow-xl`}
                />

                <div className={`absolute inset-y-2 ${isRtl ? "left-2" : "right-2"} flex items-center`}>
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => setLocalSearch("")}
                      className="p-2 text-zinc-400 hover:text-[#FF5C00] bg-transparent border-none cursor-pointer me-1 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-full px-4 sm:px-6 bg-[#3C2B22] hover:bg-[#FF5C00] text-white hover:text-white font-bold text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-2xl transition-all duration-300 cursor-pointer shadow-md"
                  >
                    {t("search") || "Rechercher"}
                  </button>
                </div>
              </form>

              <p className="mt-3 text-xs rtl:text-sm text-zinc-500 text-center flex items-center justify-center gap-1.5 font-sans">
                <Info className="w-3.5 h-3.5 text-[#FF5C00]/70" />
                {t("search_shortcut_slash") || "Appuyez sur la touche / (slash) pour orienter vos recherches"}
              </p>
            </motion.div>

            {/* Content Container (Animate transitions smoothly) */}
            <div className="w-full">
              {!localSearch.trim() ? (
                /* Dynamic Zero-State: History + Trending */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pt-2"
                >
                  {/* Recent Searches */}
                  <div className="space-y-4">
                    <h4 className="text-xs rtl:text-sm font-semibold uppercase text-zinc-500 tracking-wider rtl:tracking-normal flex items-center gap-2 pb-3 border-b border-[#FF5C00]">
                      <History className="w-4 h-4 text-[#FF5C00]" />
                      {t("search_recent") || "Vos Recherches Récentes"}
                    </h4>
                    {recentSearches.length > 0 ? (
                      <ul className="space-y-1">
                        {recentSearches.map((term, i) => (
                          <li
                            key={i}
                            onClick={() => selectSearchTerm(term)}
                            className="flex items-center justify-between py-2.5 px-4 rounded-xl border border-[#FF5C00] hover:border-[#FF5C00]/30 bg-white hover:bg-stone-50 text-[14px] font-medium text-[#3C2B22] hover:text-[#FF5C00] transition-all cursor-pointer group shadow-sm hover:shadow"
                          >
                            <span className="truncate">{term}</span>
                            <button
                              onClick={(e) => handleDeleteRecent(term, e)}
                              className="text-zinc-400 hover:text-red-500 p-1 bg-transparent border-none cursor-pointer transition-colors opacity-80 md:opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-zinc-500 text-xs rtl:text-sm px-2 py-4 italic">
                        {t("Aucun historique de recherche.")}
                      </p>
                    )}
                  </div>

                  {/* Trending Tags */}
                  <div className="space-y-4">
                    <h4 className="text-xs rtl:text-sm font-semibold uppercase text-zinc-500 tracking-wider rtl:tracking-normal flex items-center gap-2 pb-3 border-b border-[#FF5C00]">
                      <TrendingUp className="w-4 h-4 text-[#FF5C00]" />
                      {t("search_trending") || "Suggestions Populaires / Tendances"}
                    </h4>
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {trendingSearches.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => selectSearchTerm(tag)}
                          className="px-4 py-2.5 text-[13px] font-medium border border-[#FF5C00] bg-white hover:border-[#FF5C00] hover:bg-[#FF5C00]/10 text-zinc-600 hover:text-[#FF5C00] rounded-full transition-all cursor-pointer shadow-sm hover:shadow"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Interactive Searching Mode */
                <div className="space-y-8">
                  {isSearching ? (
                    <div className="py-24 flex flex-col justify-center items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-[#FF5C00]" />
                      <span className="text-sm text-zinc-400 font-medium">
                        {t("Recherche en cours dans les 58 wilayas...")}
                      </span>
                    </div>
                  ) : results.length > 0 || matchedStores.length > 0 ? (
                    <div className="space-y-8">
                      {/* Stores Section */}
                      {matchedStores.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 pb-2 border-b border-[#FF5C00]">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#FF5C00]" />
                              {t("matching_stores") || "Boutiques correspondantes"}
                            </h4>
                          </div>
                          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {matchedStores.map((store) => (
                              <li key={store.id || store.uid}>
                                <button
                                  onClick={() => {
                                    navigate(`/store/${store.id || store.uid}`);
                                    setIsSearchOpen(false);
                                  }}
                                  className="w-full text-left p-4 hover:bg-orange-50/50 flex items-center gap-4 group transition-colors rounded-2xl outline-none border border-transparent hover:border-[#FF5C00]/30 hover:shadow-sm cursor-pointer"
                                >
                                  <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-[#FF5C00]">
                                    {store.logoUrl ? (
                                      <img
                                        loading="lazy"
                                        src={store.logoUrl}
                                        alt={store.shopName || store.displayName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-slate-400 font-kinder text-2xl uppercase">
                                          {(store.shopName || store.displayName || "B").charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="font-semibold text-[15px] text-[#3C2B22] group-hover:text-[#FF5C00] truncate transition-colors">
                                      {store.shopName || store.displayName}
                                    </span>
                                    <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider mt-1 truncate">
                                      {t("Wilaya")} {store.wilaya ? store.wilaya : "58"}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-[#FF5C00] group-hover:translate-x-1 transition-all" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Products Section */}
                      {results.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center gap-4 pb-2 border-b border-[#FF5C00]">
                            <h4 className="text-sm font-semibold uppercase tracking-wider rtl:tracking-normal text-zinc-800 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#FF5C00]" />
                              {t("search_matching_title") || "Créations correspondantes"}
                            </h4>
                            <span className="text-xs rtl:text-sm font-medium text-zinc-500">
                              {results.length} {t("articles") || "articles"}
                            </span>
                          </div>

                          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.slice(0, visibleCount).map((product) => {
                              return (
                                <li key={product.id}>
                                  <button
                                    onClick={() => navigateToProduct(product.id, product.name)}
                                    className="w-full text-start p-4 bg-white hover:bg-stone-50 flex items-center gap-4 group transition-all rounded-2xl outline-none border border-[#FF5C00] hover:border-[#FF5C00]/30 cursor-pointer shadow-sm hover:shadow-md"
                                  >
                                    <div className="w-16 h-16 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-[#FF5C00] group-hover:border-[#FF5C00]/50 shadow-inner">
                                      <img
                                        loading="lazy"
                                        src={getOptimizedImageUrl(product.image, 200)}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="flex flex-col text-start overflow-hidden min-w-0 flex-grow">
                                      <span className="font-semibold text-[15px] text-[#3C2B22] group-hover:text-[#FF5C00] transition-all truncate">
                                        {highlightMatch(product.name, localSearch)}
                                      </span>
                                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-1 truncate">
                                        {product.category} {t("• Wilaya")}
                                        {product.wilaya ? product.wilaya : "58"}
                                      </span>
                                      <span className="text-sm font-display italic text-stone-700 mt-1 font-bold">
                                        {formatPrice(product.price)}
                                      </span>
                                    </div>
                                    <div className="shrink-0 p-2 bg-stone-100 rounded-full group-hover:bg-[#FF5C00] group-hover:text-white text-zinc-400 transition-all">
                                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>

                          {results.length > visibleCount && (
                            <div className="pt-4 flex justify-center">
                              <button
                                type="button"
                                onClick={() => setVisibleCount((prev) => prev + 9)}
                                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#3C2B22] border border-[#FF5C00] hover:bg-[#FF5C00] hover:text-white rounded-full transition-all cursor-pointer bg-white"
                              >
                                {t("load_more") || "Charger plus de créations"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* API Error Live Alert (R19) */}
                      {apiError && (
                        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-3 max-w-lg mx-auto">
                          <span className="text-red-800 font-semibold">{t("service_unavailable") || "Service de recherche temporairement indisponible"}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setApiError(false);
                              const temp = localSearch;
                              setLocalSearch("");
                              setTimeout(() => setLocalSearch(temp), 50);
                            }}
                            className="px-4 py-2 text-xs bg-red-800 text-white rounded-full font-bold cursor-pointer transition-colors hover:bg-red-900 border-none"
                          >
                            {t("retry") || "Réessayer"}
                          </button>
                        </div>
                      )}

                      <div className="pt-6 flex justify-center">
                        <button
                          onClick={handleSearchSubmit}
                          className="px-8 py-3.5 text-xs rtl:text-sm font-bold uppercase tracking-[0.2em] text-white bg-[#3C2B22] hover:bg-[#FF5C00] hover:text-white rounded-full transition-all duration-300 cursor-pointer border-none shadow-md hover:shadow-lg active:scale-95"
                        >
                          {t("search_see_all") || "Voir tous les résultats"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Zero results found fallback alert + recommended carousel items */
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                      <div className="bg-white border border-[#FF5C00]/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xl max-w-2xl mx-auto backdrop-blur-md">
                        <div className="w-14 h-14 bg-[#FF5C00]/10 rounded-full flex items-center justify-center text-[#FF5C00]">
                          <Search className="w-7 h-7" />
                        </div>
                        <span className="text-xl font-semibold text-[#3C2B22]">
                          {t("search_no_results") || "Aucun résultat pour"} "{localSearch}"
                        </span>
                        <p className="text-sm text-zinc-500 max-w-md">
                          {t("search_no_results_desc") ||
                            "Nous n'avons pas trouvé de correspondance exacte, mais voici d'autres créations uniques."}
                        </p>
                      </div>

                      {recommendedProducts.length > 0 && (
                        <div className="space-y-5 max-w-5xl mx-auto pt-4">
                          <h4 className="text-xs rtl:text-sm font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-500 flex items-center gap-2 pb-2 border-b border-[#FF5C00]">
                            <Star className="w-4 h-4 text-[#FF5C00] fill-[#FF5C00]" />
                            {t("search_recommended") || "Créations recommandées"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {recommendedProducts.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => navigateToProduct(p.id, p.name)}
                                className="p-4 bg-white hover:bg-stone-50 border border-[#FF5C00] hover:border-[#FF5C00]/30 rounded-2xl transition-all cursor-pointer flex flex-col text-start group shadow-sm hover:shadow-md"
                              >
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white border border-[#FF5C00] relative">
                                  <img
                                    loading="lazy"
                                    src={getOptimizedImageUrl(p.image, 400)}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <span className="font-semibold text-sm text-[#3C2B22] group-hover:text-[#FF5C00] truncate transition-colors mt-3 w-full">
                                  {p.name}
                                </span>
                                <div className="flex items-center justify-between mt-1 w-full">
                                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal truncate">
                                    {p.category}
                                  </span>
                                  <span className="text-xs rtl:text-sm font-bold text-zinc-500">
                                    {p.wilaya ? `${t("wilaya", "Wilaya")} ${p.wilaya}` : t("wilayas_58", "58 Wilayas")}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold text-[#FF5C00] mt-2 font-mono">
                                  {formatPrice(p.price)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
