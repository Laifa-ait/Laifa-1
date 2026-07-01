import React from "react";
import { motion } from "motion/react";
import { Heart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { getTranslatedField } from "../../utils/translations";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

interface ProductListCardProps {
  product: Product;
  index?: number;
  onClick?: (product: Product) => void;
}

export const ProductListCard = React.memo(
  ({ product, index = 0, onClick }: ProductListCardProps) => {
    const { t, i18n } = useTranslation();
    const { wishlist, toggleWishlist } = useCart();
    const navigate = useNavigate();
    const lang = i18n.language as any;

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

    const title = getSpelledCorrectly(getTranslatedField(product, "name", lang));
    const isWishlisted = wishlist.includes(product.id);
    const reviewCount = product.stats?.reviewCount || product.salesCount || 0;
    const rating = product.stats?.averageRating || product.rating || 0;

    const getEnergyColor = (cls: string) => {
      switch(cls) {
        case "A": return "#00A650";
        case "B": return "#50B848";
        case "C": return "#C4D400";
        case "D": return "#FFF200";
        case "E": return "#F7B500";
        case "F": return "#EB690B";
        case "G": return "#E2001A";
        default: return "#00A650";
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: (index % 10) * 0.05, duration: 0.4 }}
        className="group relative flex flex-row bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-300 overflow-hidden cursor-pointer w-full mb-4"
        onClick={() => defaultClick(product)}
      >
        {/* Badges - Top left */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {product.isSponsored && (
            <span className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 rounded text-[9px] sm:text-[10px] text-gray-500 font-medium border border-gray-100 shadow-sm">
              {t("product.sponsored", "Sponsorisé")} <span className="text-[8px] sm:text-[9px] opacity-50 ml-0.5">ⓘ</span>
            </span>
          )}
          {product.brand === "Samsung" && !product.isSponsored && ( // Simulating 'Exclusivité Amazon'
            <span className="bg-slate-900 text-white px-1.5 py-0.5 sm:px-2 rounded text-[9px] sm:text-[10px] font-bold shadow-sm">
              {t("product.exclusive", "Exclusivité Olmart")}
            </span>
          )}
        </div>

        {/* Image Container */}
        <div className="relative w-[130px] sm:w-48 md:w-56 lg:w-64 shrink-0 bg-white p-2 sm:p-4 flex items-center justify-center">
          <img
            loading="lazy"
            src={getOptimizedImageUrl(product.image, 400)}
            alt={title}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 aspect-square"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
            }}
          />
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-7 h-7 sm:w-9 sm:h-9 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center border border-slate-100 shadow-sm hover:bg-white hover:scale-110 transition-all z-20"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-600"
              }`}
            />
          </button>
        </div>

        {/* Details Container */}
        <div className="p-3 sm:p-5 flex flex-col flex-1 border-l border-slate-100">
          {/* Title */}
          <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-3 sm:line-clamp-2 mb-1 leading-snug">
            {title}
          </h3>

          {/* Options (e.g. sizes) */}
          {(product.sizes || product.variants) && (
             <p className="text-[10px] sm:text-[11px] text-gray-500 mb-1">
                {t("product.options", "Options")} : {product.variants?.length || product.sizes?.length} {t("product.sizes", "taille(s)")}
             </p>
          )}

          {/* Ratings */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-2 flex-wrap">
            <span className="text-[11px] sm:text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
            <div className="flex -space-x-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                    star <= Math.round(rating)
                      ? "fill-[#FF9900] text-[#FF9900]"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] sm:text-xs text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">
              ({reviewCount})
            </span>
          </div>

          {/* Monthly Sales context */}
          {product.salesCount && product.salesCount > 50 && (
            <p className="text-[10px] sm:text-xs text-gray-600 mb-2 font-medium leading-tight">
              {t("product.sales_context", "Plus de 50 achetés au cours du mois dernier")}
            </p>
          )}

          {/* Pricing */}
          <div className="flex items-end gap-1.5 sm:gap-2 mb-1 mt-auto">
             <div className="flex items-start">
               <span className="text-lg sm:text-2xl font-bold text-gray-900">{formatPrice(product.promoPrice || product.price)}</span>
             </div>
             {(product.promoPrice || product.originalPrice) && (
               <span className="text-[10px] sm:text-xs text-gray-500 line-through mb-1">
                 {t("product.recommended_price", "Conseillé")} : {formatPrice(product.originalPrice || product.price)}
               </span>
             )}
          </div>

          {/* Delivery */}
          <p className="text-[10px] sm:text-xs text-gray-700 mb-2">
             {t("product.delivery_to", "Livraison à partir de 500 DZD")}
          </p>

          {/* Energy / Badge & Variations */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1 sm:mt-2">
             {/* Product Link Badge & Energy */}
             <div className="flex items-center gap-2">
                {product.energyClass && (
                  <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                     <div 
                        className="text-white font-bold text-[10px] sm:text-[11px] px-2 py-0.5 border-r border-gray-300"
                        style={{ backgroundColor: getEnergyColor(product.energyClass) }}
                     >
                        {product.energyClass}
                     </div>
                     <div className="bg-gray-100 text-[8px] flex flex-col leading-none px-1 py-0.5 font-bold">
                       <span>A</span>
                       <span>↑</span>
                       <span>G</span>
                     </div>
                  </div>
                )}
                <span className="text-[10px] sm:text-[11px] text-[#007185] hover:text-[#C7511F] hover:underline font-medium">
                  {t("product.view_details", "Fiche produit")}
                </span>
             </div>

             {/* Colors */}
             {product.colors && product.colors.length > 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5">
                   <span className="text-[10px] sm:text-[11px] text-gray-600 mr-0.5 sm:mr-1">{t("product.color", "Couleur")}:</span>
                   {product.colors.slice(0, 3).map((color, idx) => (
                      <div key={idx} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-300 shadow-sm" style={{ backgroundColor: color }}></div>
                   ))}
                   {product.colors.length > 3 && (
                      <span className="text-[9px] sm:text-[10px] text-[#007185] underline">+ {product.colors.length - 3}</span>
                   )}
                </div>
             )}
          </div>
        </div>
      </motion.div>
    );
  }
);

ProductListCard.displayName = "ProductListCard";
