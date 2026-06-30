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
    <section className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mb-6 sm:mb-8 pt-2 sm:pt-4">
      <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible desktop-scrollbar snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActiveCategory(card.key);
              navigate("/shop");
            }}
            className={`relative shrink-0 snap-center w-[85vw] sm:w-[320px] md:w-auto rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 group ${
              index === 0 ? "md:col-span-2 md:row-span-2 h-[340px] md:h-[624px]" : "h-[340px] md:h-[300px]"
            }`}
          >
            <img
              loading="lazy"
              src={getOptimizedImageUrl(card.image, 800)}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
              referrerPolicy="no-referrer"
            />
            
            <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply transition-colors duration-500 group-hover:bg-slate-900/20 z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500 z-0" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end items-start z-10">
              {card.key === favoriteCategory && (
                <span className="mb-3 bg-black/40 px-3 py-1 rounded-full font-sans text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white border border-white/30 shadow-sm">
                  {t("home.category.recommended_star")} 
                </span>
              )}
              <h3 className="text-3xl md:text-4xl font-display font-medium text-white tracking-wide mb-2 drop-shadow-md group-hover:text-slate-50 transition-colors leading-tight">
                {card.title}
              </h3>
              <span className="font-sans font-medium text-slate-200 text-[13px] tracking-wide mt-1 drop-shadow-sm">
                {card.subtitle}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Swipe Indication for Mobile */}
      <MobileSwipeIndicator className="-mt-2" />
    </section>
  );
};
