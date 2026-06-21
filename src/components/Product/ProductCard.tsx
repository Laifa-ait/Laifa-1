import React from "react";
import { motion } from "motion/react";
import { Heart, Star, Store, TrendingUp, Zap, Eye, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import {
  getCategoryTranslation,
  getTranslatedField,
} from "../../utils/translations";
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
    const isProductFlashActive = !!(product.flashSaleActive && product.flashPrice && (!product.flashEndDate || new Date(product.flashEndDate).getTime() > Date.now()));
    const isFlashSale = (variant === "flash_sale" || isFlashSaleProp === true) && isProductFlashActive;

    const defaultClick = (prod: Product) => {
      if (onClick) {
        onClick(prod);
      } else {
        navigate(`/product/${prod.id}`);
      }
    };

    const getSpelledCorrectly = (str: string) => {
      return str
        .replace(/CHASSURE/gi, "Chaussure")
        .replace(/Chassure/gi, "Chaussure");
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: (index % 10) * 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`group flex flex-col bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer h-full ${sectionStyle || ""}`}
        onClick={() => defaultClick(product)}
      >
        {variant === "premium_immersive" ? (
          <div className="relative aspect-[3/4] bg-stone-900 overflow-hidden shrink-0 flex items-end">
            <img
              loading="lazy"
              src={getOptimizedImageUrl(product.image, 400)}
              alt={getSpelledCorrectly(
                getTranslatedField(product, "name", lang),
              )}
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
                  -
                  {Math.round(
                    ((product.price - product.promoPrice) / product.price) *
                      100,
                  )}
                  %
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
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlist.includes(product.id) ? "fill-[#F37021] text-[#F37021] stroke-[#F37021]" : "stroke-[2]"}`}
                />
              </button>
            </div>

            {/* Content OVER image */}
            <div className="relative z-10 w-full p-4 flex flex-col">
              <span className="font-mono text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal text-zinc-300 mb-0.5">
                {getCategoryTranslation(product.category, t) ||
                  product.category ||
                  "Mode"}
              </span>
              <h3 className="font-sans font-bold text-white text-[14px] sm:text-[16px] leading-tight line-clamp-1 mb-0.5 drop-shadow-md">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>
              <div className="flex items-center gap-1.5 text-zinc-400 mb-2 font-mono text-[9px] rtl:text-[11px] tracking-wider rtl:tracking-normal uppercase">
                <Store className="w-3 h-3 text-[#F37021]" />
                <span className="truncate max-w-[120px]">
                  {product.sellerName || "Olma Seller"}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono font-black text-white text-[15px] sm:text-[17px] drop-shadow-md">
                  {formatPrice(product.promoPrice || product.price)}
                </span>
                {product.promoPrice && product.promoPrice < product.price && (
                  <span className="font-mono text-[11px] text-zinc-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top: Image Section -> Vertical ratio */}
            <div className="relative aspect-[4/5] bg-stone-100 overflow-hidden shrink-0">
              <img
                loading="lazy"
                src={getOptimizedImageUrl(product.image, 400)}
                alt={getSpelledCorrectly(
                  getTranslatedField(product, "name", lang),
                )}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
                }}
              />

              <div className="absolute inset-0 bg-stone-900/[0.02] group-hover:bg-transparent transition-colors duration-300 z-10" />

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
                <div className="flex flex-col gap-2">
                  {product.isSponsored && (
                    <span className="inline-flex items-center gap-1 bg-stone-900 text-white font-mono text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm">
                      <Zap className="w-3 h-3 fill-white" /> {t("SPONSORED")}</span>
                  )}
                  {isProductFlashActive ? (
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-600 to-amber-500 text-white font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm shadow-md animate-pulse">
                      <Flame className="w-3 h-3 fill-current" />
                      {t("VENTE FLASH")} -
                      {Math.round(
                        ((product.price - (product.flashPrice || product.price)) / product.price) *
                          100,
                      )}
                      %
                    </span>
                  ) : (
                    product.promoPrice && product.promoPrice < product.price && (
                      <span className="inline-block bg-[#F37021] text-white font-mono text-[10px] rtl:text-[12px] tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm">
                        -
                        {Math.round(
                          ((product.price - product.promoPrice) / product.price) *
                            100,
                        )}
                        %
                      </span>
                    )
                  )}
                  {product.stock <= 0 ? (
                    <span className="inline-block bg-stone-900 text-white font-mono border border-stone-800 text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm">
                      {t("SOLD OUT")}</span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-block bg-red-50 text-red-600 font-mono border border-red-200 text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm">
                      {t("DROP LIMITÉ")}</span>
                  ) : null}
                </div>

                <button
                  aria-label={wishlist.includes(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-stone-200 flex items-center justify-center text-stone-600 hover:text-[#F37021] hover:bg-white transition-colors shadow-sm"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-[#F37021] text-[#F37021]" : "stroke-[1.5]"}`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom: Content Section */}
            <div className="p-4 sm:p-5 flex flex-col flex-1 bg-white">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2">
                <span className="font-mono text-[9px] rtl:text-[11px] uppercase tracking-widest rtl:tracking-normal text-[#121315]/80">
                  [{" "}
                  {getCategoryTranslation(product.category, t) ||
                    product.category ||
                    "Mode"}{" "}
                  ]
                </span>
              </div>

              <h3 className="font-sans font-bold text-stone-900 text-[13px] sm:text-[14px] leading-tight line-clamp-2 mb-2 group-hover:text-[#F37021] transition-colors">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>

              <div className="flex items-center gap-1.5 text-[#121315]/70 mb-4 font-mono text-[10px] rtl:text-[12px] tracking-wider rtl:tracking-normal uppercase">
                <Store className="w-3 h-3 text-[#F37021]" />
                <span className="truncate max-w-[120px]">
                  {product.sellerName || "Olma Seller"}
                </span>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono font-bold text-stone-900 text-[14px] sm:text-[16px]">
                    {formatPrice(isProductFlashActive ? product.flashPrice : (product.promoPrice || product.price))}
                  </span>
                  {((product.promoPrice && product.promoPrice < product.price) || (isProductFlashActive && product.flashPrice && product.flashPrice < product.price)) && (
                    <span className="font-mono text-[11px] text-stone-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                {isFlashSale && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center justify-between font-mono text-[9px] rtl:text-[11px] uppercase text-[#F37021]">
                      <span className="animate-pulse flex items-center gap-1">
                        {t("⏱️ VITE!")}</span>
                      <span className="flex items-center gap-1 bg-orange-50 px-1 border border-orange-200 rounded-sm">
                        🔥{" "}
                        {Math.min(
                          9,
                          ((parseInt(product.id.slice(-1), 16) || 4) % 6) + 2,
                        )}{" "}
                        {t("RESTANTS")}</span>
                    </div>
                    <div className="h-1 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-[#F37021]"
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
  },
);
