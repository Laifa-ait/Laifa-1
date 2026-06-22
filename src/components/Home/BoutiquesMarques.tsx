import React, { useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { MapPin, BadgeCheck, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Shop } from "../../types";
import { MobileSwipeIndicator } from "../UI/MobileSwipeIndicator";
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
    <section className="py-8 sm:py-12 bg-[#FAF8F5]/20 relative overflow-hidden">
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
        {/* Elegant Design Header with Overline and Bold Main Title */}
        <div className="flex flex-col items-center mb-8 sm:mb-12 text-center relative z-10 px-4 sm:px-6 lg:px-8">
          <span className="text-[10px] rtl:text-[12px] sm:text-[11px] font-black text-[#F37021] uppercase tracking-[0.35em] mb-1.5 select-none animate-pulse">
            {t("home.shops.community_badge") || "Communauté OLMART"}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#121315] uppercase tracking-tighter rtl:tracking-normal">
            {t("home.shops.title") || "Boutiques & Marques Officielles"}
          </h2>
          <div className="h-0.5 sm:h-1 w-12 bg-gradient-to-r from-orange-500 to-amber-500 mt-3 rounded-full shadow-sm" />
        </div>

        {/* Carousel Wrapper containing controls and card container */}
        <div className="relative group/carousel">
          {/* Left Navigation Arrow */}
          <button
            onClick={() => scroll("left")}
            className="hidden lg:flex absolute left-4 sm:left-6 lg:left-10 top-[40%] -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-full bg-white border border-slate-200/90 text-[#121315] hover:bg-[#121315] hover:text-white hover:scale-105 transition-all duration-300 shadow-[0_12px_24px_rgba(30,67,86,0.15)] active:scale-95 cursor-pointer opacity-0 group-hover/carousel:opacity-100"
            aria-label={t("Voir la boutique précédente") || "Voir la boutique précédente"}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Core Horizontal Carousel List */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 sm:px-6 lg:px-8"
          >
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[280px] sm:min-w-[320px] max-w-[360px] h-[320px] bg-white rounded-2xl border border-slate-200/40 shadow-sm animate-pulse flex flex-col overflow-hidden"
                  >
                    <div className="h-32 sm:h-36 bg-slate-200" />
                    <div className="p-5 pt-12 flex-1 flex flex-col gap-3">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="mt-auto h-10 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))
              : listToRender.map((seller, index) => {
                  const coverImage =
                    getOptimizedImageUrl(seller.bannerUrl, 400) || DEFAULT_COVERS[index % DEFAULT_COVERS.length];
                  const avatarImage =
                    getOptimizedImageUrl(seller.logoUrl, 200) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.shopName || "B")}&background=1E4356&color=fff&size=100&bold=true`;

                  return (
                    <motion.div
                      key={`${seller.id}-${index}`}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                      className="min-w-[270px] sm:min-w-[310px] max-w-[340px] snap-start snap-always bg-white rounded-2xl overflow-hidden border border-slate-205/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(30,67,86,0.08)] transition-all duration-500 flex flex-col relative group"
                    >
                      {/* Cover Photo */}
                      <div className="h-32 sm:h-36 w-full overflow-hidden relative bg-stone-100">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-10 opacity-70" />
                        <img
                          src={coverImage}
                          alt={seller.shopName}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Circular Verified Overlap Avatar */}
                      <div className="absolute top-[92px] sm:top-[104px] left-5 z-20">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white shadow-[0_8px_16px_rgba(0,0,0,0.12)] overflow-hidden bg-[#1E3F50] flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
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
                      <div className="p-5 pt-10 sm:pt-11 flex-1 flex flex-col justify-between">
                        <div className="mb-4">
                          {/* Shop Name & Checked Verified */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <h3 className="font-extrabold text-[#121315] text-sm sm:text-base leading-snug tracking-tight rtl:tracking-normal truncate max-w-[85%] uppercase">
                              {seller.shopName}
                            </h3>
                            <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" />
                          </div>

                          {/* Wilaya Geo Tag - Slogan line if exists */}
                          <div className="flex items-center gap-1 text-zinc-400">
                            <MapPin className="w-3.5 h-3.5 text-[#F37021] shrink-0" />
                            <span className="text-[10px] rtl:text-[12px] sm:text-[11px] font-medium tracking-wide uppercase truncate">
                              {formatLocation(seller.wilaya)}
                            </span>
                          </div>
                          {seller.slogan && (
                            <p className="text-[10px] rtl:text-[12px] sm:text-xs rtl:text-sm text-zinc-500 leading-normal line-clamp-1 italic mt-2 border-l-2 border-slate-200 pl-2">
                              "{seller.slogan}"
                            </p>
                          )}
                        </div>

                        {/* Internal Route Visit Shop Call-to-Action (Strict Security: NO external channels etc) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/store/${seller.id}`);
                          }}
                          className="w-full py-2.5 sm:py-3 bg-[#121315] hover:bg-[#F37021] text-white text-[10px] rtl:text-[12px] sm:text-[11px] font-black uppercase tracking-wider rtl:tracking-normal rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 border-none cursor-pointer flex items-center justify-center gap-2 group/btn"
                        >
                          <span>{t("home.shops.visit_boutique") || "Visiter la boutique"}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
          </div>

          {/* Right Navigation Arrow */}
          <button
            onClick={() => scroll("right")}
            className="hidden lg:flex absolute right-4 sm:right-6 lg:right-10 top-[40%] -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-full bg-white border border-slate-200/90 text-[#121315] hover:bg-[#121315] hover:text-white hover:scale-105 transition-all duration-300 shadow-[0_12px_24px_rgba(30,67,86,0.15)] active:scale-95 cursor-pointer opacity-0 group-hover/carousel:opacity-100"
            aria-label={t("Voir la boutique suivante") || "Voir la boutique suivante"}
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Swipe Indication for Mobile */}
          <MobileSwipeIndicator className="-mt-1" />
        </div>
      </div>
    </section>
  );
};
