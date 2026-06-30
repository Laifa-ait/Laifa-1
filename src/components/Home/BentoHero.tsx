import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const BentoHero: React.FC<{ banners: any[] }> = ({ banners }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || "fr";
  const isRTL = lang === "ar";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const activeBanners = (banners || []).filter(
    (b) => b.is_active !== false && b.isActive !== false
  );

  // Auto-play timer
  useEffect(() => {
    if (activeBanners.length > 1 && !isHovered) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [activeBanners.length, isHovered]);

  if (activeBanners.length === 0) {
    return null;
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const currentBanner = activeBanners[currentIndex] || {};

  // Multilingual dynamic translation lookup
  const getTranslatedValue = (banner: any, key: "title" | "subtitle" | "button_text") => {
    if (banner.translations?.[lang]?.[key]) {
      return banner.translations[lang][key];
    }
    const flatKey = `${key}_${lang}`;
    if (banner[flatKey]) {
      return banner[flatKey];
    }
    if (key === "title") return banner.title || banner.name || "";
    if (key === "subtitle") return banner.subtitle || "";
    if (key === "button_text") return banner.button_text || banner.ctaText || banner.buttonText || "";
    return "";
  };

  const title = getTranslatedValue(currentBanner, "title");
  const subtitle = getTranslatedValue(currentBanner, "subtitle");
  const buttonText = getTranslatedValue(currentBanner, "button_text");

  const desktopImageUrl = getOptimizedImageUrl(
    currentBanner.desktop_image || currentBanner.imageUrl,
    1200
  );

  const mobileImageUrl = getOptimizedImageUrl(
    currentBanner.mobile_image || currentBanner.desktop_image || currentBanner.imageUrl,
    800
  );

  const handleBannerClick = () => {
    if (currentBanner.ctaLink) {
      navigate(currentBanner.ctaLink);
    } else {
      navigate("/shop");
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full min-h-[350px] sm:min-h-[450px] md:min-h-[500px] relative rounded-none overflow-hidden group shadow-sm border border-zinc-200 mt-0 bg-white"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full"
        >
          <picture className="absolute inset-0 w-full h-full">
            {currentBanner.mobile_image && (
              <source media="(max-width: 640px)" srcSet={mobileImageUrl} />
            )}
            <img
              loading="eager"
              src={desktopImageUrl}
              alt={title || "Hero Banner"}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
          </picture>
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-slate-900/40 z-0 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-0" />

      {/* Decorative Blur */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      {/* Content wrapper */}
      <div className="absolute inset-0 p-6 sm:p-10 md:p-16 flex flex-col justify-end items-start z-10">
        <motion.div
          key={`tag-${currentIndex}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-md shadow-sm px-3.5 py-1.5 rounded-full border border-white/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="font-sans font-medium text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white">
            {t("home.hero.exclusive_selection")}
          </span>
        </motion.div>

        <motion.h2
          key={`title-${currentIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-sans text-white font-bold tracking-tight mb-4 max-w-4xl leading-[1.1] drop-shadow-sm text-start"
        >
          {title || "VOTRE UNIVERS SHOPPING"}
        </motion.h2>

        {subtitle && (
          <motion.p
            key={`sub-${currentIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base md:text-lg text-slate-100/90 mb-8 max-w-2xl text-start font-sans font-medium leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}

        <motion.button
          key={`btn-${currentIndex}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBannerClick}
          className="bg-white text-slate-900 font-sans font-semibold text-xs sm:text-sm px-7 py-3.5 sm:px-8 sm:py-4 flex items-center gap-3 shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_12px_25px_rgba(0,0,0,0.15)] rounded-full cursor-pointer hover:bg-slate-50"
        >
          <span>{buttonText || t("cat_explore")}</span>
          <ArrowRight className={`w-4 h-4 sm:w-5 sm:h-5 ${isRTL ? "rotate-180" : ""}`} />
        </motion.button>
      </div>

      {/* Chevrons */}
      {activeBanners.length > 1 && (
        <>
          <button
            onClick={isRTL ? handleNext : handlePrev}
            className={`absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100 duration-300 cursor-pointer ${
              isRTL ? "right-6" : "left-6"
            }`}
          >
            {isRTL ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </button>
          <button
            onClick={isRTL ? handlePrev : handleNext}
            className={`absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all opacity-0 group-hover:opacity-100 duration-300 cursor-pointer ${
              isRTL ? "left-6" : "right-6"
            }`}
          >
            {isRTL ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-6 start-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/15 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ${
                currentIndex === idx ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
