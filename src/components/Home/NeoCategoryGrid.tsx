import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShop } from "../../context/ShopContext";
import { MobileSwipeIndicator } from "../ui/MobileSwipeIndicator";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const NeoCategoryGrid: React.FC<{
  categories: any[];
  favoriteCategory: string | null;
}> = ({ categories, favoriteCategory }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setActiveCategory } = useShop();

  return (
    <section className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mb-16 pt-8">
      <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-6 md:gap-8 overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActiveCategory(card.key);
              navigate("/shop");
            }}
            className={`relative shrink-0 snap-center w-[85vw] sm:w-[400px] md:w-auto rounded-3xl overflow-hidden cursor-pointer shadow-sm border border-slate-200 group ${
              index === 0 ? "md:col-span-2 md:row-span-2 h-[260px] md:h-[624px]" : "h-[260px] md:h-[300px]"
            }`}
          >
            <img
              loading="lazy"
              src={getOptimizedImageUrl(card.image, 800)}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
              referrerPolicy="no-referrer"
            />
            
            {/* Uniform dark filter for contrast + Playful color gradient overlay */}
            <div className="absolute inset-0 bg-black/30 transition-colors duration-500 group-hover:bg-black/40 z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500 z-0" />

            <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end items-start z-10">
              {card.key === favoriteCategory && (
                <span className="mb-4 bg-sky-50/20 px-4 py-1.5 rounded-full font-sans text-[11px] rtl:text-[12px] font-bold uppercase tracking-widest rtl:tracking-normal text-sky-400 border border-sky-400/30 backdrop-blur-sm">
                  {t("home.category.recommended_star")} 
                </span>
              )}
              <h3 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter rtl:tracking-normal mb-2 uppercase drop-shadow-sm group-hover:text-slate-100 transition-colors leading-none">
                {card.title}
              </h3>
              <span className="font-sans font-medium text-slate-200 text-xs rtl:text-sm tracking-widest rtl:tracking-normal uppercase mt-1">
                {card.subtitle}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Swipe Indication for Mobile */}
      <MobileSwipeIndicator className="-mt-1" />
    </section>
  );
};
