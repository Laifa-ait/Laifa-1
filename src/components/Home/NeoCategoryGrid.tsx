import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useShop } from "../../context/ShopContext";
import { MobileSwipeIndicator } from "../UI/MobileSwipeIndicator";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const NeoCategoryGrid: React.FC<{
    categories: any[],
    favoriteCategory: string | null
}> = ({ categories, favoriteCategory }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setActiveCategory } = useShop();

    return (
        <section className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mb-16">
            <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible scrollbar-hide snap-x snap-mandatory pb-4 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
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
                        className={`relative shrink-0 snap-center w-[85vw] sm:w-[400px] md:w-auto rounded-3xl overflow-hidden cursor-pointer shadow-[0_12px_25px_rgba(30,67,86,0.05)] border border-[#EBE5DF]/60 group ${
                            index === 0 ? "md:col-span-2 md:row-span-2 h-[260px] md:h-[624px]" : "h-[260px] md:h-[300px]"
                        }`}
                    >
                        <img loading="lazy"
                            src={getOptimizedImageUrl(card.image, 800)}
                            alt={card.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end items-start z-10">
                            {card.key === favoriteCategory && (
                                <span className="mb-4 bg-[#121315] px-3 py-1 rounded-sm font-mono text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-white shadow-xl">
                                    [ {t("home.category.recommended_star") || "RECOMMANDÉ ⭐"} ]
                                </span>
                            )}
                            <h3 className="text-3xl md:text-5xl font-sans font-bold text-[#121315] tracking-tighter rtl:tracking-normal mb-2 uppercase drop-shadow-xl">
                                {card.title}
                            </h3>
                            <span className="font-mono text-stone-500 text-xs rtl:text-sm tracking-widest rtl:tracking-normal uppercase">
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
