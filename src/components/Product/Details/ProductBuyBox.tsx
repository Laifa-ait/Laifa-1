import React from "react";
import { ShoppingBag, Heart, Share2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BuyBoxProps {
  product: any;
  isCurrentSelectionOutOfStock: boolean;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  wishlist: string[];
  onShare: () => void;
  stickyRef?: React.Ref<HTMLDivElement>;
  isSticky?: boolean;
}

export const ProductBuyBox: React.FC<BuyBoxProps> = ({
  product,
  isCurrentSelectionOutOfStock,
  onAddToCart,
  onToggleWishlist,
  wishlist,
  onShare,
  stickyRef,
  isSticky,
}) => {
  const { t } = useTranslation();

  return (
    <div
      ref={stickyRef}
      className={`z-40 ${isSticky ? "fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white border-t border-black/10 animate-in slide-in-from-bottom-12 duration-300" : "relative"}`}
    >
      <div className={`flex gap-2 sm:gap-4 max-w-7xl mx-auto ${isSticky ? "justify-center" : ""}`}>
        <button
          disabled={isCurrentSelectionOutOfStock}
          onClick={onAddToCart}
          className={`flex-1 sm:flex-[3] py-4 sm:py-5 flex items-center justify-center gap-2 sm:gap-3 transition-all duration-200 group border border-transparent ${
            isCurrentSelectionOutOfStock
              ? "bg-black/5 text-black/40 cursor-not-allowed"
              : "bg-black text-white hover:bg-black/80 active:scale-95"
          }`}
        >
          <span className="font-sans font-medium uppercase tracking-widest text-[11px] sm:text-xs whitespace-nowrap">
            {isCurrentSelectionOutOfStock ? t("out_of_stock") || "En rupture" : t("add_to_cart") || "Ajouter au Panier"}
          </span>
        </button>

        <button
          onClick={onToggleWishlist}
          className={`w-14 sm:w-16 h-14 sm:h-auto border transition-all flex items-center justify-center shrink-0 ${
            wishlist.includes(product.id)
              ? "border-black text-black"
              : "border-black/20 bg-white text-black hover:border-black"
          }`}
          aria-label={t("Add to wishlist") || "Add to wishlist"}
        >
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlist.includes(product.id) ? "fill-current" : ""}`} />
        </button>

        <button
          onClick={onShare}
          className={`w-14 sm:w-16 h-14 sm:h-auto bg-white border border-black/20 text-black flex items-center justify-center hover:border-black transition-colors ${
            isSticky ? "hidden sm:flex" : "flex"
          }`}
          aria-label={t("Share product") || "Share product"}
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {isSticky && (
        <div className="hidden sm:flex max-w-7xl mx-auto mt-3 items-center justify-center gap-1.5 text-[10px] rtl:text-[12px] font-medium text-black/60 uppercase tracking-widest rtl:tracking-normal">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("secured_cash_on_delivery") || "Paiement à la livraison sécurisé"}
        </div>
      )}
    </div>
  );
};
