import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const BentoHero: React.FC<{ banners: any[] }> = ({ banners }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const heroBanner = banners && banners.length > 0 ? banners[0] : null;

  if (!heroBanner) {
    return (
      <div className="w-full min-h-[400px] bg-stone-200 animate-pulse rounded-3xl border border-[#EBE5DF]/40" />
    );
  }

  return (
    <div className="w-full min-h-[400px] relative rounded-3xl overflow-hidden group shadow-lg border border-stone-200">
      <img loading="lazy"
        src={getOptimizedImageUrl(heroBanner.desktop_image || heroBanner.imageUrl, 1200) || "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800"}
        alt={t("Hero Banner") || "Hero Banner"}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/30 to-transparent" />
      
      <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end items-start z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-4 bg-white/95 backdrop-blur-md px-4 py-2 border border-[#EBE5DF]/80 rounded-full"
        >
          <Sparkles className="w-4 h-4 text-[#121315]" />
          <span className="font-mono text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal text-[#121315]">{t("home.hero.exclusive_selection") || "DROP EXCLUSIF"}</span>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-sans font-bold text-white uppercase tracking-tighter rtl:tracking-normal mb-6 max-w-2xl leading-[0.9]"
        >
           {heroBanner.title || "L'Art de Vivre Algérien"}
        </motion.h2>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/shop')}
          className="bg-white text-stone-900 font-mono font-bold text-sm uppercase px-8 py-4 flex items-center gap-2 border border-stone-200 shadow-md transition-colors hover:bg-stone-50 rounded-full"
        >
          {t("cat_explore") || "EXPLORER"} <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

