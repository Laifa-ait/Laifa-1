import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2, ArrowRight, Clock, Star, TrendingUp, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../../context/ShopContext";
import { collection, query, limit, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { useTrendingSearches } from "../../hooks/useTrendingSearches";
import { getOptimizedImageUrl } from "../../utils/imageUtils";
import { useDebounce } from "../../hooks/useDebounce";

interface AdvancedSearchbarProps {
  className?: string;
  isMobile?: boolean;
  variant?: "default" | "glass";
}

export const AdvancedSearchbar: React.FC<AdvancedSearchbarProps> = ({
  className = "",
  isMobile = false,
  variant = "default",
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const trendingSearches = useTrendingSearches();
  const { setSearchQuery, searchQuery: globalSearchQuery } = useShop();

  const [localQuery, setLocalQuery] = useState("");
  const debouncedQuery = useDebounce(localQuery, 300);
  const [results, setResults] = useState<Product[]>([]);
  const [matchedStores, setMatchedStores] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const isOverlayActive = isFocused || showDropdown;

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  useEffect(() => {
    let resizeTimer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setIsMobileView(window.innerWidth < 768);
      }, 100);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Load recent searches and fallback recommendations on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("olma_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("localStorage loading failed in search-bar:", e);
      setRecentSearches([]);
    }

    // Pre-fetch a few popular/fallback products for zero results or empty state recommendations
    const fetchFallbacks = async () => {
      try {
        const q = query(
          collection(db, "products"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(4)
        );
        const snap = await getDocs(q);
        const prods = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);
        setFallbackProducts(prods);
      } catch (e) {
        console.warn("Error loading fallback products for search-bar:", e);
      }
    };
    fetchFallbacks();
  }, []);

  // Sync with global query if cleared externally
  useEffect(() => {
    if (!globalSearchQuery) {
      setLocalQuery("");
    }
  }, [globalSearchQuery]);

  // Click away listener to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    };

    if (isOverlayActive) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOverlayActive]);

  // Execute Search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setTotalProductsCount(0);
        return;
      }

      setIsSearching(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (!response.ok) {
          throw new Error("HTTP search error");
        }
        const data = await response.json();
        const found = data.products || [];
        setTotalProductsCount(found.length);
        setResults(found.slice(0, 5)); // Show up to 5 visual results
        setMatchedStores(data.stores || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
    setSelectedIndex(-1); // reset selection index on query change
  }, [debouncedQuery]);

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

  const getNavigationItems = () => {
    if (!localQuery.trim()) {
      return [
        ...recentSearches.map(term => ({ type: "recent" as const, value: term })),
        ...trendingSearches.map(term => ({ type: "trending" as const, value: term }))
      ];
    } else {
      return [
        ...matchedStores.map(store => ({ type: "store" as const, value: store.id || store.uid, name: store.shopName || store.displayName })),
        ...results.map(prod => ({ type: "product" as const, value: prod.id, name: prod.name }))
      ];
    }
  };

  const handleSearchSubmit = () => {
    if (localQuery.trim()) {
      saveSearchTerm(localQuery);
      setSearchQuery(localQuery);
      setShowDropdown(false);
      setIsFocused(false);
      navigate("/shop");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = getNavigationItems();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item.type === "recent" || item.type === "trending") {
          selectTrendingOrRecent(item.value);
        } else if (item.type === "store") {
          navigate(`/store/${item.value}`);
          setShowDropdown(false);
          setIsFocused(false);
        } else if (item.type === "product") {
          navigateToProduct(item.value, item.name || "");
        }
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setLocalQuery("");
    setSearchQuery("");
    setResults([]);
  };

  const navigateToProduct = (id: string, name: string) => {
    saveSearchTerm(name);
    setShowDropdown(false);
    setIsFocused(false);
    navigate(`/product/${id}`);
  };

  const selectTrendingOrRecent = (term: string) => {
    setLocalQuery(term);
    saveSearchTerm(term);
    setSearchQuery(term);
    setShowDropdown(false);
    setIsFocused(false);
    navigate("/shop");
  };

  const deleteRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem("olma_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.warn("localStorage recent search delete failed:", err);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const escapedQuery = query.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <strong key={i} className="text-zinc-900 bg-slate-100 font-kinder px-1 rounded">
              {part}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <>
      {/* Mega-Search Dark Glass Backdrop */}
      {isOverlayActive &&
        createPortal(
          <div
            onClick={() => {
              setIsFocused(false);
              setShowDropdown(false);
              inputRef.current?.blur();
            }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[90] transition-opacity duration-300"
          />,
          document.body
        )}

      <div
        ref={containerRef}
        className={`relative w-full transition-all duration-500 ease-out ${isOverlayActive ? "z-[50] sm:scale-[1.02]" : "z-[10]"} ${className}`}
      >
        <div
          className={`flex items-center w-full transition-all duration-300 ease-out group h-10 sm:h-11 rounded-full px-1 ${
            isOverlayActive
              ? "bg-white border border-slate-200 shadow-lg"
              : variant === "glass"
                ? "bg-white/10 backdrop-blur-md border border-white/20 text-white"
                : "bg-slate-100 border border-transparent hover:bg-slate-200/80"
          }`}
        >
          <button
            onClick={handleSearchSubmit}
            className={`ps-3 pe-2 flex items-center justify-center shrink-0 cursor-pointer bg-transparent border-none transition-colors duration-300 ${isOverlayActive ? "text-sky-500" : "text-slate-400 group-hover:text-slate-500"}`}
          >
            <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] stroke-[1.5]" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isMobileView ? t("search") || "Recherche" : t("search_placeholder") || "Recherche..."}
            className={`bg-transparent border-none text-[14px] sm:text-[15px] focus:outline-none w-full h-full px-2 font-medium shadow-none text-slate-800 placeholder:text-slate-400 text-ellipsis whitespace-nowrap`}
          />

          {localQuery && (
            <button
              onClick={clearSearch}
              className="p-1.5 hover:text-sky-500 text-slate-400 transition-colors bg-transparent border-none flex items-center justify-center cursor-pointer me-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4 stroke-[1.5]" />
            </button>
          )}
        </div>

        {/* Predictive & Interactive Mega Search Dropdown Overlay */}
        {isOverlayActive && (
          <div className="fixed inset-x-0 top-[57px] sm:top-[73px] md:absolute md:inset-auto md:top-[calc(100%+0.5rem)] md:left-1/2 md:-translate-x-1/2 md:w-[850px] lg:w-[950px] bg-white border border-slate-200 shadow-2xl z-[150] rounded-b-[1.5rem] rounded-t-none md:rounded-[2rem] overflow-hidden md:backdrop-blur-xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 md:p-8 space-y-4 md:space-y-8">
              {/* Overlay Header for Mobile/Quick Exit */}
              <div className="flex items-center justify-end pb-2 md:hidden">
                <button
                  onClick={() => {
                    setIsFocused(false);
                    setShowDropdown(false);
                    inputRef.current?.blur();
                  }}
                  className="p-1.5 h-8 w-8 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-900 bg-transparent border-none cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>
              </div>

              {/* Case A: Search bar is Empty -> Show History and Trending Categories */}
              {!localQuery.trim() ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {/* 1. Recents searches */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] md:text-xs rtl:text-sm font-semibold uppercase text-slate-500 tracking-[0.1em] rtl:tracking-normal flex items-center gap-2 pb-2 border-b border-slate-200">
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      {t("recent_searches") || "Vos Recherches Récentes"}
                    </h4>
                    {recentSearches.length > 0 ? (
                      <ul className="space-y-0.5">
                        {recentSearches.map((term, i) => (
                          <li
                            key={i}
                            onClick={() => selectTrendingOrRecent(term)}
                            className="flex items-center justify-between py-2 px-2.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-200 text-[13.5px] font-medium text-slate-700 hover:text-zinc-900 hover:shadow-sm transition-all cursor-pointer group"
                          >
                            <span className="truncate">{term}</span>
                            <button
                              onClick={(e) => deleteRecentSearch(term, e)}
                              className="text-slate-400 hover:text-red-500 p-1 bg-transparent border-none cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 text-xs px-2 py-3">
                        {t("no_search_history") || "Aucun historique récent."}
                      </p>
                    )}
                  </div>

                  {/* 2. Trending Searches (Viral of the day) */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] md:text-xs rtl:text-sm font-semibold uppercase text-slate-500 tracking-[0.1em] rtl:tracking-normal flex items-center gap-2 pb-2 border-b border-slate-200">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      {t("trending_searches") || "Tendances du moment"}
                    </h4>
                    <div className="flex flex-wrap gap-2 pt-1 md:pt-2">
                      {trendingSearches.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => selectTrendingOrRecent(tag)}
                          className="px-3.5 py-1.5 md:px-4 md:py-2 text-[12px] md:text-[13px] font-semibold border border-slate-200 bg-white shadow-sm hover:border-zinc-300 text-slate-700 hover:text-zinc-900 hover:shadow-md rounded-full transition-all cursor-pointer"
                        >
                          {t(`trending_tag_${i}`) || tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Case B: Search bar has typing -> Show completion results or fallback recommendations
                <div className="space-y-6">
                  {isSearching ? (
                    <div className="p-12 flex justify-center items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
                    </div>
                  ) : results.length > 0 || matchedStores.length > 0 ? (
                    <div className="space-y-6">
                      {/* Stores Section */}
                      {matchedStores.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-900">
                            {t("matching_stores") || "Boutiques correspondantes"}
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {matchedStores.map((store) => (
                              <li key={store.id || store.uid}>
                                <button
                                  onClick={() => {
                                    navigate(`/store/${store.id || store.uid}`);
                                    setShowDropdown(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-4 group transition-colors rounded-2xl outline-none border border-transparent hover:border-slate-300 hover:shadow-sm cursor-pointer"
                                >
                                  <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-slate-200">
                                    {store.logoUrl ? (
                                      <img
                                        loading="lazy"
                                        src={store.logoUrl}
                                        alt={store.shopName || store.displayName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-slate-400 font-kinder text-xl uppercase">
                                          {(store.shopName || store.displayName || "B").charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 overflow-hidden">
                                    <span className="font-semibold text-[14px] text-slate-900 group-hover:text-zinc-900 truncate transition-colors">
                                      {store.shopName || store.displayName}
                                    </span>
                                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-1 truncate">
                                      {t("Wilaya")} {store.wilaya ? store.wilaya : "58"}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Products Section */}
                      {results.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {t("matching_creations") || "Créations correspondantes"}
                            </h4>
                            {totalProductsCount > 5 && (
                              <span className="text-xs text-slate-500 font-medium">
                                {t("showing_5_of_total", { count: totalProductsCount }) || `Affichage de 5 sur ${totalProductsCount} créations`}
                              </span>
                            )}
                          </div>
                          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {results.map((product) => {
                              return (
                                <li key={product.id}>
                                  <button
                                    onClick={() => navigateToProduct(product.id, product.name)}
                                    className="w-full text-left p-3 hover:bg-white flex items-center gap-4 group transition-colors rounded-2xl outline-none border border-transparent hover:border-slate-300 hover:shadow-sm bg-transparent cursor-pointer"
                                  >
                                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden flex-shrink-0 border border-slate-200 group-hover:border-slate-300">
                                      <img
                                        loading="lazy"
                                        src={getOptimizedImageUrl(product.image, 200)}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      />
                                    </div>
                                    <div className="flex flex-col text-left overflow-hidden min-w-0">
                                      <span className="font-semibold text-[15px] text-slate-900 group-hover:text-zinc-900 transition-colors truncate">
                                        {highlightMatch(product.name, localQuery)}
                                      </span>
                                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider rtl:tracking-normal mt-1 truncate">
                                        {product.category} {t("• Wilaya")}
                                        {product.wilaya ? product.wilaya : "58"}
                                      </span>
                                    </div>
                                    <div className="ml-auto flex items-center gap-4 pl-2 shrink-0">
                                      <span className="text-sm font-bold text-slate-900">
                                        {formatPrice(product.price)}
                                      </span>
                                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleSearchSubmit}
                          className="px-6 py-2.5 text-xs rtl:text-sm font-bold uppercase tracking-wider rtl:tracking-normal text-white bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors cursor-pointer border-none"
                        >
                          {t("see_all_results") || "Voir tous les résultats"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Case C: Absolute Zero Results -> Show orange alert warning AND fallback beautiful creations!
                    <div className="space-y-8">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <Search className="w-6 h-6 text-slate-400" />
                        <span className="text-lg font-semibold text-slate-900">
                          {t("no_results_for") || "Aucun résultat pour"} "{localQuery}"
                        </span>
                        <p className="text-[13px] text-slate-500 max-w-lg mx-auto">
                          {t("no_exact_match_fallback") ||
                            "Nous n'avons pas trouvé de correspondance exacte, mais voici quelques créations qui pourraient vous plaire."}
                        </p>
                      </div>

                      {fallbackProducts.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-900 mb-4">
                            {t("recommended_creations") || "Créations recommandées"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {fallbackProducts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => navigateToProduct(p.id, p.name)}
                                className="p-3 border border-transparent hover:border-slate-200 hover:bg-white rounded-2xl transition-all cursor-pointer flex gap-4 text-left group hover:shadow-sm"
                              >
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0 border border-slate-200 group-hover:border-slate-300">
                                  <img
                                    loading="lazy"
                                    src={getOptimizedImageUrl(p.image, 200)}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                </div>
                                <div className="flex flex-col min-w-0 justify-center">
                                  <span className="font-semibold text-[15px] text-slate-900 group-hover:text-zinc-900 truncate transition-colors">
                                    {p.name}
                                  </span>
                                  <span className="text-[13px] font-medium text-slate-500 mt-1">
                                    {formatPrice(p.price)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
