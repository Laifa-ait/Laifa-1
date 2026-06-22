import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, SlidersHorizontal, RotateCcw, ShieldCheck, MapPin, Tag, Palette, CheckCircle2, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCategoryTranslation } from "../../utils/translations";
import { AvailableFacets, SelectedFacets } from "../../hooks/useFacetedFilters";
import { formatPrice } from "../../utils/format";

interface DynamicFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: string;
  selectedFacets: SelectedFacets;
  availableFacets: AvailableFacets;
  toggleFacet: (facetKey: keyof Omit<SelectedFacets, "priceRange">, value: string) => void;
  setPriceRange: (range: [number, number]) => void;
  resetFilters: () => void;
  totalCount: number;
  onApply: () => void;
}

export const DynamicFilterPanel: React.FC<DynamicFilterPanelProps> = ({
  isOpen,
  onClose,
  activeCategory,
  selectedFacets,
  availableFacets,
  toggleFacet,
  setPriceRange,
  resetFilters,
  totalCount,
  onApply,
}) => {
  const { t } = useTranslation();
  // Determine which facets are relevant to show based on the active category
  const activeFacetsConfig = useMemo(() => {
    const showSize = activeCategory === "Mode" || activeCategory === "Tous";
    const showColor =
      activeCategory === "Mode" ||
      activeCategory === "Maison & Déco" ||
      activeCategory === "Supermarché" ||
      activeCategory === "Tous";
    const showMaterial =
      activeCategory === "Supermarché" ||
      activeCategory === "Maison & Déco" ||
      activeCategory === "Beauté & Santé" ||
      activeCategory === "Tous";
    const showBrand =
      activeCategory === "Électronique" ||
      activeCategory === "Électroménager" ||
      activeCategory === "Beauté & Santé" ||
      activeCategory === "Scolaire & Bureau" ||
      activeCategory === "Tous";

    return {
      showSize,
      showColor,
      showMaterial,
      showBrand,
    };
  }, [activeCategory]);

  // Handle manual price change inputs safely
  const handlePriceChange = (index: 0 | 1, val: string) => {
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    const currentPriceRange = selectedFacets.priceRange;
    const newRange: [number, number] = index === 0 ? [num, currentPriceRange[1]] : [currentPriceRange[0], num];
    setPriceRange(newRange);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/60 z-[190] backdrop-blur-xs"
          />

          {/* Bottom Sheet for Mobile & Side Sheet for Tablet/Desktop */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 h-[88vh] md:h-full md:left-auto md:right-0 md:w-[460px] bg-[#FAF8F5] md:rounded-l-[2.5rem] rounded-t-[2.5rem] shadow-2xl z-[200] flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-[#EBE5DF]"
          >
            {/* Grab handle for mobile gesture recognition */}
            <div className="w-12 h-1.5 bg-[#EBE5DF] rounded-full mx-auto my-3 shrink-0 md:hidden animate-pulse" />

            {/* Header section with Sandstone off-white and teracotta themes */}
            <div className="px-6 py-4 border-b border-[#EBE5DF] flex items-center justify-between bg-[#FAF8F5]/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#121315]/10 rounded-xl text-[#121315]">
                  <SlidersHorizontal className="w-5 h-5 text-[#F37021]" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight rtl:tracking-normal text-[#121315] uppercase">
                    {t("facet_filtering", "Filtrage par Facettes")}
                  </h3>
                  <p className="text-[10px] rtl:text-[12px] text-stone-500 font-bold">
                    {t("active_category", "Catégorie active")} : {getCategoryTranslation(activeCategory, t)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetFilters}
                  title={t("reset_all_filters", "Réinitialiser tous les filtres")}
                  className="p-2 text-stone-400 hover:text-[#F37021] hover:bg-stone-100 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-[#121315] hover:bg-stone-100 rounded-xl transition-all cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main scrollable body with faceted filters sections */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
              {/* COD Cash On Delivery Safe Layer Info Message */}
              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/70 text-[11px] font-bold text-stone-700 space-y-1">
                <div className="flex items-center gap-1.5 text-[#F37021] uppercase tracking-wider rtl:tracking-normal text-[9px] rtl:text-[11px] font-black">
                  <ShieldCheck className="w-4 h-4 text-[#F37021]" />
                  <span>{t("secure_delivery_cod", "Livraison Sécurisée (COD)")}</span>
                </div>
                <p>
                  {t(
                    "secure_delivery_desc",
                    "Aucun paiement en ligne requis. Commandez simplement avec vos spécifications et réglez l'artisan à la livraison en main propre !"
                  )}
                </p>
              </div>

              {/* SECTION: Price Budget limits */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em] ms-0.5">
                    {t("desired_budget_dzd", "Budget souhaité (DZD)")}
                  </h4>
                  <button
                    onClick={() =>
                      setPriceRange([
                        availableFacets.minPrice,
                        Math.min(availableFacets.maxPrice, Math.max(availableFacets.minPrice + 1000, 45000)),
                      ])
                    }
                    className="text-[9px] rtl:text-[11px] font-black uppercase text-[#F37021] hover:underline cursor-pointer bg-transparent border-none"
                  >
                    {t("under_45k_da", "Moins de 45K DA")}
                  </button>
                </div>

                <div className="space-y-4 bg-white p-5 rounded-3xl border border-[#EBE5DF]/60">
                  <div className="relative pt-2">
                    <input
                      type="range"
                      min={availableFacets.minPrice}
                      max={availableFacets.maxPrice}
                      step={Math.max(100, Math.round((availableFacets.maxPrice - availableFacets.minPrice) / 100))}
                      value={selectedFacets.priceRange[1]}
                      onChange={(e) => setPriceRange([selectedFacets.priceRange[0], Number(e.target.value)])}
                      className="w-full h-1.5 bg-[#EBE5DF] rounded-lg appearance-none cursor-pointer accent-[#F37021]"
                    />
                    <div className="flex justify-between text-[10px] rtl:text-[12px] text-stone-600 font-bold mt-2">
                      <span>{new Intl.NumberFormat("en-US").format(availableFacets.minPrice)}</span>
                      <span>
                        {t("max_orderable", "Max commandable")}:{" "}
                        {new Intl.NumberFormat("en-US").format(selectedFacets.priceRange[1])}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black text-stone-500 uppercase tracking-widest rtl:tracking-normal mb-1">
                        {t("medium_min", "MÉDIUM MIN")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={new Intl.NumberFormat("en-US").format(selectedFacets.priceRange[0])}
                          onChange={(e) => handlePriceChange(0, e.target.value)}
                          className="w-full ps-3.5 pe-12 py-2.5 rounded-xl border border-[#EBE5DF] font-black text-xs rtl:text-sm text-[#121315] focus:border-[#F37021] outline-none bg-white font-sans"
                        />
                        <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[9px] rtl:text-[11px] font-black text-stone-500 bg-stone-100 border border-[#EBE5DF]/80 px-2 py-1 rounded-md">
                          {t("da", "DA")}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-stone-500 uppercase tracking-widest rtl:tracking-normal mb-1">
                        {t("plafond_max", "PLAFOND MAX")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={new Intl.NumberFormat("en-US").format(selectedFacets.priceRange[1])}
                          onChange={(e) => handlePriceChange(1, e.target.value)}
                          className="w-full ps-3.5 pe-12 py-2.5 rounded-xl border border-[#EBE5DF] font-black text-xs rtl:text-sm text-[#121315] focus:border-[#F37021] outline-none bg-white font-sans"
                        />
                        <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-[9px] rtl:text-[11px] font-black text-stone-500 bg-stone-100 border border-[#EBE5DF]/80 px-2 py-1 rounded-md">
                          {t("da", "DA")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Wilayas de provenance list */}
              {availableFacets.wilayas.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-600" />
                    <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em]">
                      {t("region_wilaya", "Région / Wilaya")}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {availableFacets.wilayas.map((opt) => {
                      const isSelected = selectedFacets.wilayas.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFacet("wilayas", opt.value)}
                          className={`px-3.5 py-2 rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#121315] text-white border-[#121315] shadow-sm"
                              : "bg-white text-stone-600 border-[#EBE5DF] hover:bg-[#FAF8F5]/20"
                          }`}
                        >
                          {t(`wilaya_${opt.value}`, opt.value)}{" "}
                          <span
                            className={`ms-1 text-[8px] ${isSelected ? "text-white/80" : "text-stone-500 font-bold"}`}
                          >
                            ({opt.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Tailles (Size facets) matching clothing */}
              {activeFacetsConfig.showSize && availableFacets.sizes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-stone-600" />
                    <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em]">
                      {t("available_sizes", "Tailles disponibles (Variantes)")}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableFacets.sizes.map((opt) => {
                      const isSelected = selectedFacets.sizes.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFacet("sizes", opt.value)}
                          className={`min-w-[42px] h-10 rounded-xl font-black text-[10px] rtl:text-[12px] uppercase transition-all flex items-center justify-center border cursor-pointer ${
                            isSelected
                              ? "bg-[#F37021] text-white border-[#F37021] shadow-md scale-[1.05]"
                              : "bg-white text-stone-600 border-[#EBE5DF] hover:border-stone-400"
                          }`}
                        >
                          {t(opt.value, opt.value)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Matières (Materials) facets */}
              {activeFacetsConfig.showMaterial && availableFacets.materials.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-stone-600" />
                    <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em]">
                      {t("artisanal_materials", "Matières Artisanales")}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {availableFacets.materials.map((opt) => {
                      const isSelected = selectedFacets.materials.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFacet("materials", opt.value)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#F37021] text-white border-[#F37021] shadow-sm"
                              : "bg-white text-stone-600 border-[#EBE5DF] hover:bg-[#FAF8F5]/20"
                          }`}
                        >
                          {t(opt.value, opt.value)} <span className="text-[8px] opacity-75">({opt.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Couleurs facets */}
              {activeFacetsConfig.showColor && availableFacets.colors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-stone-600" />
                    <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em]">
                      {t("shades_colors", "Teintes & Couleurs")}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {availableFacets.colors.map((opt) => {
                      const isSelected = selectedFacets.colors.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFacet("colors", opt.value)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] rtl:text-[12px] font-black transition-all border flex items-center gap-1.5 uppercase tracking-wider rtl:tracking-normal cursor-pointer ${
                            isSelected
                              ? "bg-[#121315] text-white border-[#121315] shadow-sm"
                              : "bg-white text-stone-600 border-[#EBE5DF] hover:bg-[#FAF8F5]/20"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span>{t(opt.value, opt.value)}</span>
                          <span className="text-[8px] opacity-75">({opt.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Marque / Brand facets */}
              {activeFacetsConfig.showBrand && availableFacets.brands.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] rtl:text-[12px] font-black uppercase text-stone-600 tracking-[0.14em] ms-0.5">
                    {t("brand_manufacturer", "Marque / Fabricant")}
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {availableFacets.brands.map((opt) => {
                      const isSelected = selectedFacets.brands.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => toggleFacet("brands", opt.value)}
                          className={`px-4 py-2.5 rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#121315] text-white border-[#121315] shadow-sm"
                              : "bg-white text-stone-600 border-[#EBE5DF] hover:bg-[#FAF8F5]/20"
                          }`}
                        >
                          {t(opt.value, opt.value)} <span className="text-[8px] opacity-75">({opt.count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End of results fallback inside panel */}
              {totalCount === 0 && (
                <div className="py-6 px-4 bg-red-400/5 text-center rounded-2xl border border-red-200/50 space-y-1">
                  <p className="text-xs rtl:text-sm font-black text-rose-700 uppercase tracking-widest rtl:tracking-normal">
                    {t("no_match", "Aucune correspondance")}
                  </p>
                  <p className="text-[10px] rtl:text-[12px] text-stone-500 font-bold">
                    {t("expand_options_desc", "Essayez d'élargir vos options pour débloquer de magnifiques résultats.")}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Action Footer of the Panel */}
            <div className="p-6 bg-white border-t border-[#EBE5DF] shrink-0">
              <button
                onClick={onApply}
                className="w-full py-4 bg-[#F37021] hover:bg-[#A94320] text-white text-[11px] font-black uppercase tracking-widest rtl:tracking-normal transition-all rounded-2rem shadow-xl shadow-[#F37021]/20 flex items-center justify-center gap-3 border-none cursor-pointer"
              >
                <span>
                  {t("apply_filter", "Appliquer le filtre")} ({totalCount}{" "}
                  {totalCount > 1 ? t("articles", "articles") : t("article", "article")})
                </span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
