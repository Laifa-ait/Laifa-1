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
  stickyRef?: React.RefObject<HTMLDivElement>;
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
      className={`z-40 ${isSticky ? "fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(30,67,86,0.08)] border-t border-stone-200/50 animate-in slide-in-from-bottom-12 duration-300" : "relative"}`}
    >
      <div className={`flex gap-3 sm:gap-4 max-w-7xl mx-auto ${isSticky ? "justify-center" : ""}`}>
        <button
          disabled={isCurrentSelectionOutOfStock}
          onClick={onAddToCart}
          className={`flex-1 sm:flex-[3] rounded-2xl py-4 sm:py-5 flex items-center justify-center gap-3 transition-all duration-200 shadow-xl group border border-transparent ${
            isCurrentSelectionOutOfStock
              ? "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
              : "bg-[#3C2B22] text-white hover:bg-[#FF5C00] hover:-translate-y-1 hover:shadow-lg shadow-[#3C2B22]/20 hover:shadow-[#FF5C00]/30 active:translate-y-0 active:scale-95 border-b-2 border-b-black/20"
          }`}
        >
          <ShoppingBag className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
          <span className="font-bold uppercase tracking-widest rtl:tracking-normal text-[11px] sm:text-xs rtl:text-sm">
            {isCurrentSelectionOutOfStock ? t("out_of_stock") || "En rupture" : t("add_to_cart") || "Ajouter au Panier"}
          </span>
        </button>

        <button
          onClick={onToggleWishlist}
          className={`w-14 sm:w-16 rounded-2xl border-2 transition-all flex items-center justify-center shrink-0 ${
            wishlist.includes(product.id)
              ? "border-red-500 bg-red-50 text-red-500"
              : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
          }`}
          aria-label={t("Add to wishlist") || "Add to wishlist"}
        >
          <Heart className={`w-5 h-5 ${wishlist.includes(product.id) ? "fill-current" : ""}`} />
        </button>

        <button
          onClick={onShare}
          className="w-14 sm:w-16 rounded-2xl bg-white border-2 border-stone-200 text-[#3C2B22] flex items-center justify-center hover:border-stone-300 transition-colors"
          aria-label={t("Share product") || "Share product"}
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {isSticky && (
        <div className="hidden sm:flex max-w-7xl mx-auto mt-2 items-center justify-center gap-1.5 text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("secured_cash_on_delivery") || "Paiement à la livraison sécurisé"}
        </div>
      )}
    </div>
  );
};
