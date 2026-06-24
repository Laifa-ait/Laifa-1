import React from "react";
import { motion } from "motion/react";
import { Heart, Star, Store, TrendingUp, Zap, Eye, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { getCategoryTranslation, getTranslatedField } from "../../utils/translations";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

interface ProductCardProps {
  product: Product;
  index?: number;
  onClick?: (product: Product) => void;
  isFeatured?: boolean;
  variant?: "default" | "flash_sale" | "premium_immersive";
  sectionStyle?: string;
  isFlashSale?: boolean;
}

export const ProductCard = React.memo(
  ({
    product,
    index,
    onClick,
    isFeatured = false,
    variant = "default",
    sectionStyle,
    isFlashSale: isFlashSaleProp,
  }: ProductCardProps) => {
    const { t, i18n } = useTranslation();
    const { wishlist, toggleWishlist } = useCart();
    const navigate = useNavigate();
    const lang = i18n.language as any;
    const isProductFlashActive = !!(
      product.flashSaleActive &&
      product.flashPrice &&
      (!product.flashEndDate || new Date(product.flashEndDate).getTime() > Date.now())
    );
    const isFlashSale = (variant === "flash_sale" || isFlashSaleProp === true) && isProductFlashActive;

    const defaultClick = (prod: Product) => {
      if (onClick) {
        onClick(prod);
      } else {
        navigate(`/product/${prod.id}`);
      }
    };

    const getSpelledCorrectly = (str: string) => {
      return str.replace(/CHASSURE/gi, "Chaussure").replace(/Chassure/gi, "Chaussure");
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: (index % 10) * 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`group flex flex-col bg-[#FFFBF5] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(26,20,16,0.06)] hover:shadow-[0_16px_48px_rgba(26,20,16,0.10)] border border-[#E5DED4] hover:border-[#D4A574]/30 transition-all duration-500 cursor-pointer h-full ${sectionStyle || ""}`}
        onClick={() => defaultClick(product)}
      >
        {variant === "premium_immersive" ? (
          <div className="relative aspect-[3/4] bg-stone-900 overflow-hidden shrink-0 flex items-end">
            <img
              loading="lazy"
              src={getOptimizedImageUrl(product.image, 400)}
              alt={getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
              }}
            />
            {/* Dark gradient so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

            {/* Badges Overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
              {product.promoPrice && product.promoPrice < product.price && (
                <span className="bg-[#C95D3B] text-white px-2 py-1 text-[10px] rtl:text-[12px] font-bold rounded">
                  -{Math.round(((product.price - product.promoPrice) / product.price) * 100)}%
                </span>
              )}
              <button
                aria-label={wishlist.includes(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all shadow-sm hover:bg-white/20 active:scale-90"
              >
                <Heart
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlist.includes(product.id) ? "fill-[#C75C1A] text-[#C75C1A] stroke-[#C75C1A]" : "stroke-[2]"}`}
                />
              </button>
            </div>

            {/* Content OVER image */}
            <div className="relative z-10 w-full p-4 flex flex-col">
              <span className="font-sans font-bold text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal text-zinc-300 mb-0.5">
                {getCategoryTranslation(product.category, t) || product.category || "Mode"}
              </span>
              <h3 className="font-kinder text-white text-[15px] sm:text-[17px] leading-tight line-clamp-1 mb-0.5 drop-shadow-md">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>
              <div className="flex items-center gap-1.5 text-zinc-300 mb-2 font-sans font-bold text-[10px] rtl:text-[12px] tracking-wider rtl:tracking-normal uppercase">
                <Store className="w-3.5 h-3.5 text-[#C75C1A]" />
                <span className="truncate max-w-[120px]">{product.sellerName || "Olma Seller"}</span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="font-kinder text-white text-[18px] sm:text-[20px] drop-shadow-md">
                  {formatPrice(product.promoPrice || product.price)}
                </span>
                {product.promoPrice && product.promoPrice < product.price && (
                  <span className="font-sans font-bold text-[12px] text-[#8B7355] line-through">{formatPrice(product.price)}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top: Image Section -> Vertical ratio */}
            <div className="relative aspect-[4/5] bg-[#F5F0E8] overflow-hidden shrink-0">
              <div className="w-full h-full relative rounded-none overflow-hidden">
                <img
                  loading="lazy"
                  src={getOptimizedImageUrl(product.image, 400)}
                  alt={getSpelledCorrectly(getTranslatedField(product, "name", lang))}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
                  }}
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/5 group-hover:bg-transparent transition-colors duration-300 z-10 pointer-events-none" />

              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
                <div className="flex flex-col gap-2">
                  {product.isSponsored && (
                    <span className="inline-flex items-center gap-1 bg-[#2C2118] text-white font-sans font-bold text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full shadow-sm">
                      <Zap className="w-3 h-3 fill-white" /> {t("SPONSORED")}
                    </span>
                  )}
                  {isProductFlashActive ? (
                    <span className="inline-flex items-center gap-1 bg-[#C75C1A] text-white font-sans text-[9px] sm:text-[10px] font-kinder uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md animate-pulse border border-white">
                      <Flame className="w-3 h-3 fill-current" />
                      {t("VENTE FLASH")} -
                      {Math.round(((product.price - (product.flashPrice || product.price)) / product.price) * 100)}%
                    </span>
                  ) : (
                    product.promoPrice &&
                    product.promoPrice < product.price && (
                      <span className="inline-block bg-[#C75C1A] text-white font-sans font-bold text-[10px] rtl:text-[12px] tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full shadow-sm border border-white">
                        -{Math.round(((product.price - product.promoPrice) / product.price) * 100)}%
                      </span>
                    )
                  )}
                  {product.stock <= 0 ? (
                    <span className="inline-block bg-[#2C2118] text-white font-sans font-bold text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full shadow-sm border border-white">
                      {t("SOLD OUT")}
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-block bg-[#FFF0E5] text-[#C75C1A] font-sans font-kinder text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full shadow-sm border border-white">
                      {t("DROP LIMITÉ")}
                    </span>
                  ) : null}
                </div>

                <button
                  aria-label={wishlist.includes(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="w-9 h-9 rounded-full bg-white backdrop-blur-md border border-[#C75C1A]/60 flex items-center justify-center text-[#2C2118] hover:text-[#C75C1A] hover:bg-[#FDF9EC] transition-colors shadow-md"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-[#C75C1A] text-[#C75C1A]" : "stroke-[2]"}`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom: Content Section */}
            <div className="p-4 sm:p-5 flex flex-col flex-1 bg-white">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2">
                <span className="font-sans font-bold text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal text-[#2C2118]/60 px-2 py-0.5 bg-[#FDF9EC] rounded-full">
                  {getCategoryTranslation(product.category, t) || product.category || "Mode"}
                </span>
              </div>

              <h3 className="font-kinder text-[#2C2118] text-[15px] sm:text-[17px] leading-tight line-clamp-2 mb-2 group-hover:text-[#C75C1A] transition-colors">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>

              <div className="flex items-center gap-1.5 text-[#2C2118]/60 mb-4 font-sans font-bold text-[10px] rtl:text-[12px] tracking-wider rtl:tracking-normal uppercase">
                <Store className="w-3.5 h-3.5 text-[#C75C1A]" />
                <span className="truncate max-w-[120px]">{product.sellerName || "Olma Seller"}</span>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-kinder text-[#2C2118] text-[18px] sm:text-[20px]">
                    {formatPrice(isProductFlashActive ? product.flashPrice : product.promoPrice || product.price)}
                  </span>
                  {((product.promoPrice && product.promoPrice < product.price) ||
                    (isProductFlashActive && product.flashPrice && product.flashPrice < product.price)) && (
                    <span className="font-sans font-bold text-[12px] text-[#2C2118]/40 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                {isFlashSale && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center justify-between font-sans font-kinder text-[9px] rtl:text-[11px] uppercase text-[#C75C1A]">
                      <span className="animate-pulse flex items-center gap-1">{t("⏱️ VITE!")}</span>
                      <span className="flex items-center gap-1 bg-red-50 px-2 py-0.5 border border-red-100 rounded-full">
                        🔥 {Math.min(9, ((parseInt(product.id.slice(-1), 16) || 4) % 6) + 2)} {t("RESTANTS")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#FDF9EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-[#FF5C00]"
                        style={{
                          width: `${Math.max(25, ((parseInt(product.id.slice(0, 2), 16) || 75) % 65) + 20)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }
);
