import React, { useState, useEffect } from "react";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";

interface SearchbarProps {
  className?: string;
  isMobile?: boolean;
}

export const Searchbar: React.FC<SearchbarProps> = ({ className = "", isMobile = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSearchQuery, searchQuery: globalSearchQuery } = useShop();

  const [localQuery, setLocalQuery] = useState("");

  useEffect(() => {
    if (!globalSearchQuery) {
        setLocalQuery("");
    }
  }, [globalSearchQuery]);

  const handleSearchSubmit = () => {
    if (localQuery.trim()) {
      setSearchQuery(localQuery);
      navigate("/shop");
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
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className={`flex items-center w-full transition-colors duration-300 focus-within:border-[#ea580c] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#ea580c]/10 group shadow-sm h-11 ${
          isMobile ? "bg-[#fdfaf5] border-2 border-zinc-950 rounded-2xl" : "bg-zinc-50/80 border border-zinc-200/80 rounded-2xl"
      }`}>
        <div className={`ps-4 pe-3.5 py-2.5 flex items-center justify-center shrink-0 self-stretch min-w-[50px] ${
            isMobile ? "border-e-2 border-zinc-950 bg-zinc-100/80" : "border-e border-zinc-200 bg-zinc-100/60 rounded-s-2xl"
        }`}>
           <Search className="w-4.5 h-4.5 text-zinc-400 group-focus-within:text-[#ea580c] transition-colors duration-200" />
        </div>
        
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
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
    </div>
  );
};
