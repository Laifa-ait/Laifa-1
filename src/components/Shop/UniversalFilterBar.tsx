import React from "react";
import { motion } from "motion/react";
import { Sparkles, Truck, Star, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UniversalFilterBarProps {
  activeFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
}

export const UniversalFilterBar: React.FC<UniversalFilterBarProps> = ({ activeFilter, onSelectFilter }) => {
  const { t } = useTranslation();

  const filters = [
    {
      id: "promo",
      label: t("on_sale", "Promotions"),
      icon: Sparkles,
      color: "text-amber-500 bg-amber-50 border-amber-200",
    },
    {
      id: "free_shipping",
      label: t("free_shipping", "Livraison Gratuite"),
      icon: Truck,
      color: "text-sky-500 bg-sky-50 border-sky-200",
    },
    {
      id: "rating",
      label: t("top_rated", "Mieux Notés"),
      icon: Star,
      color: "text-yellow-500 bg-yellow-50 border-yellow-200",
    },
    {
      id: "price_down",
      label: t("price_down", "Prix ⬇"),
      icon: ArrowDown,
      color: "text-emerald-500 bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div className="w-full bg-white/70 backdrop-blur-md border-b border-[#FF5C00]/40 sticky top-16 z-30 py-3 px-4 sm:px-6 md:px-8">
      <div className="max-w-[1850px] mx-auto flex items-center justify-between gap-4">
        {/* Horizontal scrollable capsule bar */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide w-full -mx-4 px-4 sm:mx-0 sm:px-0">
          <span className="text-[9px] rtl:text-[11px] font-kinder uppercase text-stone-400 tracking-wider rtl:tracking-normal shrink-0 mr-1.5 hidden sm:inline-block">
            {t("express_filter_colon", "Filtre express :")}
          </span>

          {filters.map((f) => {
            const IconComponent = f.icon;
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFilter(isSelected ? null : f.id)}
                className={`relative px-4 py-2.5 rounded-full text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all duration-300 flex items-center gap-1.5 shrink-0 select-none cursor-pointer border ${
                  isSelected
                    ? "text-white border-transparent bg-[#FF5C00] shadow-sm"
                    : "bg-white text-stone-600 border-[#FF5C00]/60 hover:border-[#3C2B22]/40"
                }`}
              >
                {!isSelected && <IconComponent className="w-3.5 h-3.5 text-[#FF5C00]" />}
                <span>{f.label}</span>
                {isSelected && (
                  <motion.div
                    layoutId="activeExpressFilter"
                    className="absolute inset-0 bg-[#FF5C00] rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeFilter && (
          <button
            onClick={() => onSelectFilter(null)}
            className="text-[9px] rtl:text-[11px] font-kinder uppercase tracking-wider rtl:tracking-normal text-[#FF5C00] hover:text-[#3C2B22] transition-colors shrink-0 cursor-pointer underline cursor-pointer bg-transparent border-none"
          >
            {t("reset", "Réinitialiser")}
          </button>
        )}
      </div>
    </div>
  );
};
