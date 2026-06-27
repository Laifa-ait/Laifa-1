import React, { useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { MapPin, BadgeCheck, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Shop } from "../../types";
import { MobileSwipeIndicator } from "../ui/MobileSwipeIndicator";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

interface BoutiquesMarquesProps {
  sellers: Shop[];
  isLoading: boolean;
}

const DEFAULT_COVERS = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800", // Craft store layout
  "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800", // Artisanal pottery/ceramics
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800", // Elegant clothing atelier
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800", // Leather crafts
  "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&q=80&w=800", // Textiles workshop
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800", // Design concept room
];

const FALLBACK_SELLERS = [
  {
    id: "maison-kabyle",
    shopName: "Maison Kabyle",
    wilaya: "15 Tizi Ouzou - Algérie",
    logoUrl: "https://ui-avatars.com/api/?name=Maison+Kabyle&background=1E4356&color=fff&size=80&bold=true",
    bannerUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "art-biskra",
    shopName: "Art de Biskra",
    wilaya: "07 Biskra - Algérie",
    logoUrl: "https://ui-avatars.com/api/?name=Art+de+Biskra&background=1E4356&color=fff&size=80&bold=true",
    bannerUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "cuir-algerois",
    shopName: "Cuir Algérois",
    wilaya: "16 Alger - Algérie",
    logoUrl: "https://ui-avatars.com/api/?name=Cuir+Algerois&background=1E4356&color=fff&size=80&bold=true",
    bannerUrl: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "bijoux-touareg",
    shopName: "Bijoux Touareg",
    wilaya: "11 Tamanrasset - Algérie",
    logoUrl: "https://ui-avatars.com/api/?name=Bijoux+Touareg&background=1E4356&color=fff&size=80&bold=true",
    bannerUrl: "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "tapis-ghardaia",
    shopName: "Tapis Ghardaïa",
    wilaya: "47 Ghardaïa - Algérie",
    logoUrl: "https://ui-avatars.com/api/?name=Tapis+Ghardaia&background=1E4356&color=fff&size=80&bold=true",
    bannerUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800",
  },
];

export const BoutiquesMarques: React.FC<BoutiquesMarquesProps> = ({ sellers, isLoading }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll carousel with left & right buttons
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 350;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getSellersList = () => {
    return sellers;
  };

  const formatLocation = (wilaya: string) => {
    if (!wilaya) return "Algérie";
    if (wilaya.toUpperCase().includes("ALGÉRIE") || wilaya.toUpperCase().includes("ALGERIE")) {
      return wilaya;
    }
    const code = parseInt(wilaya);
    if (!isNaN(code)) {
      return `${String(code).padStart(2, "0")} - Algérie`;
    }
    return `${wilaya} - Algérie`;
  };

  const listToRender = getSellersList();

  if (!isLoading && listToRender.length === 0) {
    return null; // Do not show fallback fake sellers
  }

  return (
    <section className="mb-4 sm:mb-6 pt-4 sm:pt-6 bg-white relative overflow-hidden border-t border-slate-100">
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
        {/* Elegant Design Header with Overline and Bold Main Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-10 text-center relative z-10 px-4 sm:px-6 lg:px-8">
          <span className="text-[10px] sm:text-[11px] font-sans font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3 select-none">
            {t("home.shops.community_badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-slate-900 tracking-tight leading-[1.1]">
            {t("home.shops.title")}
          </h2>
        </div>

        {/* Carousel Wrapper containing controls and card container */}
        <div className="relative group/carousel">
          {/* Left Navigation Arrow */}
          <button
            onClick={() => scroll("left")}
            className="hidden lg:flex absolute left-4 sm:left-6 lg:left-10 top-[40%] -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.05)] active:scale-95 cursor-pointer opacity-0 group-hover/carousel:opacity-100"
            aria-label={t("Voir la boutique précédente")}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Core Horizontal Carousel List */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-2 snap-x snap-mandatory desktop-scrollbar px-2 sm:px-6 lg:px-8 scroll-smooth"
          >
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[280px] sm:min-w-[320px] max-w-[360px] h-[340px] bg-slate-50 rounded-3xl border border-slate-100 shadow-sm animate-pulse flex flex-col overflow-hidden"
                  >
                    <div className="h-32 sm:h-36 bg-slate-200" />
                    <div className="p-5 pt-12 flex-1 flex flex-col gap-3">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="mt-auto h-11 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                ))
              : listToRender.map((seller, index) => {
                  const coverImage =
                    getOptimizedImageUrl(seller.bannerUrl, 400) || DEFAULT_COVERS[index % DEFAULT_COVERS.length];
                  const avatarImage =
                    getOptimizedImageUrl(seller.logoUrl, 200) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.shopName || "B")}&background=0F172A&color=fff&size=100&bold=true`;

                  return (
                    <motion.div
                      key={`${seller.id}-${index}`}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -4 }}
                      className="min-w-[240px] sm:min-w-[300px] max-w-[240px] sm:max-w-[300px] snap-start snap-always bg-slate-50 rounded-3xl overflow-hidden border border-slate-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col relative group"
                    >
                      {/* Cover Photo */}
                      <div className="h-28 sm:h-32 w-full overflow-hidden relative bg-slate-100">
                        <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply group-hover:bg-transparent transition-colors duration-500 z-10" />
                        <img
                          src={coverImage}
                          alt={seller.shopName}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Circular Verified Overlap Avatar */}
                      <div className="absolute top-[80px] sm:top-[96px] left-5 sm:left-6 z-20">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-slate-50 shadow-sm overflow-hidden bg-white flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                          <img
                            src={avatarImage}
                            alt={seller.shopName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>

                      {/* Content Details Area */}
                      <div className="p-5 sm:p-6 pt-10 flex-1 flex flex-col justify-between">
                        <div className="mb-5">
                          {/* Shop Name & Checked Verified */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-sans font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate max-w-[85%]">
                              {seller.shopName}
                            </h3>
                            <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 fill-blue-50 shrink-0" />
                          </div>

                          {/* Wilaya Geo Tag */}
                          <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="text-[11px] sm:text-xs font-medium tracking-wide uppercase truncate">
                              {formatLocation(seller.wilaya)}
                            </span>
                          </div>
                        </div>

                        {/* Internal Route Visit Shop Call-to-Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/store/${seller.id}`);
                          }}
                          className="w-full py-3 bg-white hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-200 text-xs sm:text-sm font-sans font-semibold rounded-full transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] active:scale-95 cursor-pointer flex items-center justify-center gap-2 group/btn"
                        >
                          <span>{t("home.shops.visit_boutique")}</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
          </div>

          {/* Right Navigation Arrow */}
          <button
            onClick={() => scroll("right")}
            className="hidden lg:flex absolute right-4 sm:right-6 lg:right-10 top-[40%] -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.05)] active:scale-95 cursor-pointer opacity-0 group-hover/carousel:opacity-100"
            aria-label={t("Voir la boutique suivante")}
          >
            <ChevronRight className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Swipe Indication for Mobile */}
          <MobileSwipeIndicator className="-mt-2" />
        </div>
      </div>
    </section>
  );
};
