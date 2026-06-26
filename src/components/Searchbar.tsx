import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, ArrowRight, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { useUI } from "../context/UIContext";
import { Product } from "../types";
import { formatPrice } from "../utils/format";
import { getOptimizedImageUrl } from "../utils/imageUtils";

interface SearchbarProps {
  className?: string;
  isMobile?: boolean;
}

// Local debounce hook for consistency
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const Searchbar: React.FC<SearchbarProps> = ({ className = "", isMobile = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSearchQuery, searchQuery: globalSearchQuery } = useShop();
  const { setIsSearchOpen } = useUI();

  const [localQuery, setLocalQuery] = useState("");
  const debouncedQuery = useDebounce(localQuery, 300);

  const [results, setResults] = useState<Product[]>([]);
  const [matchedStores, setMatchedStores] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with global query if cleared
  useEffect(() => {
    if (!globalSearchQuery) {
      setLocalQuery("");
    }
  }, [globalSearchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch live search results
  useEffect(() => {
    const fetchLiveResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setMatchedStores([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setResults((data.products || []).slice(0, 5));
          setMatchedStores((data.stores || []).slice(0, 3));
        }
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchLiveResults();
  }, [debouncedQuery]);

  const handleSearchSubmit = () => {
    if (localQuery.trim()) {
      setSearchQuery(localQuery);
      setShowDropdown(false);
      navigate("/shop");
    } else {
      // If no query, trigger search overlay (R03)
      setIsSearchOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const clearSearch = () => {
    setLocalQuery("");
    setSearchQuery("");
    setResults([]);
    setMatchedStores([]);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className={`flex items-center w-full transition-colors duration-300 focus-within:border-[#ea580c] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#ea580c]/10 group shadow-sm h-11 ${
          isMobile ? "bg-[#fdfaf5] border-2 border-zinc-950 rounded-2xl" : "bg-zinc-50/80 border border-zinc-200/80 rounded-2xl"
      }`}>
        <div className={`ps-4 pe-3.5 py-2.5 flex items-center justify-center shrink-0 self-stretch min-w-[50px] ${
            isMobile ? "border-e-2 border-zinc-950 bg-zinc-100/80" : "border-e border-zinc-200 bg-zinc-100/60 rounded-s-2xl"
        }`}>
          {isSearching ? (
            <Loader2 className="w-4.5 h-4.5 text-[#ea580c] animate-spin" />
          ) : (
            <Search className="w-4.5 h-4.5 text-zinc-400 group-focus-within:text-[#ea580c] transition-colors duration-200" />
          )}
        </div>
        
        <input
          type="text"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search_placeholder") || "Que recherchez-vous ?"}
          className={`bg-transparent border-none text-[14px] focus:outline-none w-full text-zinc-900 placeholder:text-zinc-400 py-2.5 h-11 px-3.5 font-medium tracking-wide rtl:tracking-normal shadow-none`}
        />
        
        {localQuery && (
          <button
            onClick={clearSearch}
            className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-700 transition-colors me-2 border-none bg-transparent flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={handleSearchSubmit}
          className={`${isMobile ? "bg-zinc-950 hover:bg-zinc-800" : "bg-[#ea580c] hover:bg-[#ff6f1f] rounded-e-2xl"} text-white w-12 h-11 transition-colors shrink-0 flex items-center justify-center border-none`}
        >
          <ArrowRight className={`w-5 h-5 text-white stroke-[2.5px] rtl:-scale-x-100`} />
        </button>
      </div>

      {/* Live Search Quick dropdown list (R01) */}
      {showDropdown && localQuery.trim() && (results.length > 0 || matchedStores.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden z-[200] max-h-[380px] overflow-y-auto">
          {matchedStores.length > 0 && (
            <div className="p-3 border-b border-zinc-100">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-2 mb-1">
                {t("Boutiques") || "Boutiques"}
              </span>
              <ul className="space-y-1">
                {matchedStores.map((store) => (
                  <li key={store.id || store.uid}>
                    <button
                      onClick={() => {
                        navigate(`/store/${store.id || store.uid}`);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-50 rounded-xl flex items-center gap-3 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center border border-zinc-200 shrink-0">
                        {store.logoUrl ? (
                          <img src={store.logoUrl} alt={store.shopName} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-zinc-850 truncate">
                          {store.shopName || store.displayName}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate">
                          {store.wilaya ? `${t("Wilaya")} ${store.wilaya}` : "58 Wilayas"}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 rtl:-scale-x-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block px-2 mb-1">
                {t("Produits") || "Produits"}
              </span>
              <ul className="space-y-1">
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      onClick={() => {
                        navigate(`/product/${product.id}`);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-50 rounded-xl flex items-center gap-3 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <div className="w-9 h-11 bg-zinc-100 rounded overflow-hidden shrink-0">
                        <img src={getOptimizedImageUrl(product.image, 100)} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold text-zinc-800 truncate">
                          {product.name}
                        </span>
                        <span className="text-xs font-bold text-[#ea580c]">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-300 rtl:-scale-x-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="p-2.5 bg-zinc-50 text-center border-t border-zinc-100">
            <button
              onClick={handleSearchSubmit}
              className="text-xs font-bold text-[#ea580c] hover:underline bg-transparent border-none cursor-pointer"
            >
              {t("see_all_results") || "Voir tous les résultats"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

