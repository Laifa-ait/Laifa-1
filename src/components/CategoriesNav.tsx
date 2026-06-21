import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Box } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShop } from "../context/ShopContext";
import { CATEGORY_ICONS } from "../constants";
import { getCategoryTranslation } from "../utils/translations";

interface CategoriesNavProps {
  categoriesList: string[];
  setActiveTag: (tag: string | null) => void;
  setIsSaleFilterActive: (active: boolean) => void;
  setActiveWilaya: (wilaya: string) => void;
}

export const CategoriesNav: React.FC<CategoriesNavProps> = ({
  categoriesList,
  setActiveTag,
  setIsSaleFilterActive,
  setActiveWilaya,
}) => {
  const { activeCategory, setActiveCategory, setSearchQuery } = useShop();
  const { t } = useTranslation();
  
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = useState(false);

  const handleCategoriesScroll = () => {
    if (categoriesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesScrollRef.current;
      setCanScrollCategoriesLeft(scrollLeft > 20);
      setCanScrollCategoriesRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    let resizeTimer: any;
    const scrollHandler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleCategoriesScroll();
      }, 100);
    };
    handleCategoriesScroll();
    window.addEventListener("resize", scrollHandler, { passive: true });
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", scrollHandler);
    };
  }, []);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 400;
      categoriesScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="hidden lg:flex relative mb-8 group/categories items-center max-w-[1850px] mx-auto w-full">
      {/* Dynamic Left Gradient Fade */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-16 lg:w-32 bg-gradient-to-r from-[#faf9f8] via-[#faf9f8]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollCategoriesLeft ? 'opacity-100' : 'opacity-0'}`} 
      />

      <button
        onClick={() => scrollCategories("left")}
        disabled={!canScrollCategoriesLeft}
        className="hidden lg:flex absolute left-2 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-white/90 opacity-0 group-hover/categories:opacity-100 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
        aria-label={t("Scroll left") || "Scroll left"}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div
        ref={categoriesScrollRef}
        onScroll={handleCategoriesScroll}
        className="flex flex-row items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap sm:overflow-x-auto desktop-scrollbar scrollbar-hide sm:snap-x sm:snap-mandatory px-4 sm:px-6 lg:px-20 bg-transparent py-3 scroll-smooth w-full justify-center sm:justify-start"
      >
        {categoriesList.map((category) => {
          const isSelected = activeCategory === category;
          const isTous = category === "Tous";

          const IconComponent = CATEGORY_ICONS[category] || Box;
          const icon = (
            <IconComponent 
                className={`w-4.5 h-4.5 lg:w-6 lg:h-6 transition-colors duration-200 ${
                    isSelected ? "!text-white" : "text-zinc-600 group-hover:text-zinc-950"
                }`}
            />
          );

          return (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                if (isTous) {
                  setSearchQuery("");
                  setActiveTag(null);
                  setIsSaleFilterActive(false);
                  setActiveWilaya("Tous");
                } else {
                  setIsSaleFilterActive(false);
                  setActiveTag(null);
                }
                window.scrollTo({
                  top: window.innerHeight * 0.7,
                  behavior: "smooth",
                });
              }}
              className={`group relative snap-center flex items-center px-5 py-2.5 lg:px-12 lg:py-6.5 rounded-full text-sm lg:text-2xl font-black transition-transform duration-200 shrink-0 select-none cursor-pointer border-2 active:scale-[0.98] transform-gpu ${
                isSelected
                  ? "bg-zinc-950 text-white border-transparent shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)]"
                  : "bg-white text-zinc-700 border-zinc-200/60 hover:bg-zinc-50 hover:text-zinc-950 hover:shadow-md hover:border-zinc-300"
              }`}
            >
              <span className={`flex items-center justify-center shrink-0 me-3.5 lg:me-4.5 ${isSelected ? "text-white" : ""}`}>
                {icon}
              </span>
              <span className={`uppercase tracking-tighter rtl:tracking-normal ${isSelected ? "!text-white" : "text-zinc-700 group-hover:text-zinc-950"}`}>
                {getCategoryTranslation(category, t)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Right Gradient Fade */}
      <div 
        className={`absolute right-0 top-0 bottom-0 w-16 lg:w-32 bg-gradient-to-l from-[#faf9f8] via-[#faf9f8]/80 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollCategoriesRight ? 'opacity-100' : 'opacity-0'}`} 
      />

      <button
        onClick={() => scrollCategories("right")}
        disabled={!canScrollCategoriesRight}
        className="hidden lg:flex absolute right-2 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-white/90 opacity-0 group-hover/categories:opacity-100 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
        aria-label={t("Scroll right") || "Scroll right"}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
