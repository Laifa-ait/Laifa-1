import React from "react";
import { motion } from "motion/react";
import { Heart, Zap, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { getTranslatedField } from "../../utils/translations";
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
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: ((index || 0) % 10) * 0.05, duration: 0.4 }}
        whileHover={{ y: -4 }}
        className={`group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-500 cursor-pointer h-full ${sectionStyle || ""}`}
        onClick={() => defaultClick(product)}
      >
        {variant === "premium_immersive" ? (
          <>
            <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full bg-zinc-50 overflow-hidden group">
              <img
                loading="lazy"
                src={getOptimizedImageUrl(product.image, 600)}
                alt={getSpelledCorrectly(getTranslatedField(product, "name", lang))}
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute inset-0 bg-black/[0.02] pointer-events-none" />

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-20">
                {product.promoPrice && product.promoPrice < product.price && !isProductFlashActive && (
                  <span className="bg-zinc-900 text-white px-2.5 py-1 text-[11px] font-bold rounded-md shadow-sm">
                    -{Math.round(((product.price - product.promoPrice) / product.price) * 100)}%
                  </span>
                )}
                {isProductFlashActive && (
                  <span className="flex items-center gap-1.5 bg-rose-500 text-white px-2.5 py-1 text-[11px] font-bold rounded-md shadow-sm animate-pulse">
                    <Flame className="w-3.5 h-3.5" />
                    {t("VENTE FLASH")} -{Math.round(((product.price - (product.flashPrice || product.price)) / product.price) * 100)}%
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  aria-label={wishlist.includes(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur text-slate-400 flex items-center justify-center shadow-sm hover:text-rose-500 hover:bg-white hover:scale-110 active:scale-95 transition-all"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : "stroke-[2]"}`}
                  />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-5 bg-[#0f0f11] flex flex-col flex-1 border-t border-white/5">
              <h3 className="font-sans font-medium text-white/90 text-[15px] sm:text-[16px] leading-snug line-clamp-2 mb-2 group-hover:text-white transition-colors">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>

              <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-sans font-bold text-white text-[18px]">
                  {formatPrice(isProductFlashActive ? product.flashPrice : product.promoPrice || product.price)}
                </span>
                {((product.promoPrice && product.promoPrice < product.price) ||
                  (isProductFlashActive && product.flashPrice && product.flashPrice < product.price)) && (
                  <span className="font-sans font-medium text-[13px] text-zinc-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Default/Flash Sale Variant */}
            <div className="relative aspect-[4/5] w-full bg-slate-50 overflow-hidden group">
              <img
                loading="lazy"
                src={getOptimizedImageUrl(product.image, 400)}
                alt={getSpelledCorrectly(getTranslatedField(product, "name", lang))}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-[0.16,1,0.3,1] group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
                }}
              />
              <div className="absolute inset-0 bg-slate-900/5 mix-blend-multiply group-hover:bg-transparent transition-colors duration-500 pointer-events-none" />

              {/* Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 z-20 pointer-events-none">
                {product.isSponsored && (
                  <span className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-white font-sans font-bold text-[9px] uppercase tracking-wider px-2 py-1 rounded-full shadow-sm border border-white/20">
                    <Zap className="w-3 h-3" /> {t("SPONSORISÉ")}
                  </span>
                )}
                {isProductFlashActive ? (
                  <span className="flex items-center gap-1.5 bg-rose-500 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shadow-sm animate-pulse border border-rose-400">
                    <Flame className="w-3 h-3" />
                    -{Math.round(((product.price - (product.flashPrice || product.price)) / product.price) * 100)}%
                  </span>
                ) : (
                  product.promoPrice &&
                  product.promoPrice < product.price && (
                    <span className="bg-slate-900 text-white font-sans font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm">
                      -{Math.round(((product.price - product.promoPrice) / product.price) * 100)}%
                    </span>
                  )
                )}
              </div>

              {/* Wishlist Button */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  aria-label={wishlist.includes(product.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-sm pointer-events-auto border border-slate-200"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-rose-500 text-rose-500" : "stroke-[2]"}`}
                  />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1 bg-white border-t border-slate-100/60">
              <h3 className="font-sans font-semibold text-slate-800 text-[14px] sm:text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-slate-900 transition-colors">
                {getSpelledCorrectly(getTranslatedField(product, "name", lang))}
              </h3>

              <div className="mt-auto flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-sans font-bold text-slate-900 text-[16px] sm:text-[17px] tracking-tight">
                    {formatPrice(isProductFlashActive ? product.flashPrice : product.promoPrice || product.price)}
                  </span>
                  {((product.promoPrice && product.promoPrice < product.price) ||
                    (isProductFlashActive && product.flashPrice && product.flashPrice < product.price)) && (
                    <span className="font-sans font-medium text-[12px] text-slate-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }
);

