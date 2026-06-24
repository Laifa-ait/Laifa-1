import React, { useMemo } from "react";
import { ShoppingBag, Package, ArrowRight, X, Trash2, Plus, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { SideDrawer } from "../SideDrawer";
import { formatPrice } from "../../utils/format";
import { getTranslatedField } from "../../utils/translations";
import { Language } from "../../types";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const CartDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { cart, removeFromCart, updateQuantity, totalPrice, getCartItemPrice } = useCart();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language as Language;

  // Group items by seller
  const groupedCart = useMemo(() => {
    const groups: Record<string, { sellerName: string; items: any[]; total: number }> = {};
    cart.forEach((item, index) => {
      const sellerId = item.sellerId || "unknown";
      const sellerName = item.sellerName || item.shopName || "Boutique Partenaire";
      if (!groups[sellerId]) {
        groups[sellerId] = { sellerName, items: [], total: 0 };
      }
      groups[sellerId].items.push({ ...item, originalIndex: index });
      groups[sellerId].total += getCartItemPrice(item) * item.quantity;
    });
    return groups;
  }, [cart, getCartItemPrice]);

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("Mon Panier") || "Mon Panier"}
      icon={<ShoppingBag className="w-5 h-5" />}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-[#FDF9EC]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
            <div className="w-24 h-24 bg-[#FF5C00]/10 rounded-full flex items-center justify-center text-[#FF5C00] mb-2">
              <Package className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-kinder text-[#3C2B22]">{t("Votre panier est curieusement léger...")}</h3>
              <p className="text-stone-500 font-semibold text-sm">{t("Remplissons-le avec des trésors uniques !")}</p>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate("/shop");
              }}
              className="btn-premium-orange w-full"
            >
              {t("Découvrir les tendances")}
            </button>
          </div>
        ) : (
          Object.values(groupedCart).map((group: any, groupIdx) => {
            // Free shipping threshold logic (example threshold: 5000 DA)
            const threshold = 5000;
            const remaining = Math.max(0, threshold - group.total);
            const progress = Math.min(100, (group.total / threshold) * 100);

            return (
              <div
                key={groupIdx}
                className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-stone-100 flex flex-col gap-4"
              >
                {/* Seller Header */}
                <div className="flex flex-col gap-2 border-b border-stone-100 pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#3C2B22] text-white text-[9px] rtl:text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-full">
                        {t("Sous-colis")}
                        {groupIdx + 1}
                      </span>
                      <h3 className="font-kinder text-sm text-[#3C2B22] uppercase tracking-widest rtl:tracking-normal leading-none">
                        {group.sellerName}
                      </h3>
                    </div>
                    <span className="text-xs rtl:text-sm font-bold text-stone-500">
                      {group.items.length} {t("Article(s)")}
                    </span>
                  </div>

                  {/* Incentive Progress Bar */}
                  {remaining > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] rtl:text-[12px] sm:text-xs rtl:text-sm font-bold text-stone-500">
                        {t("Ajoutez encore")}
                        <span className="text-[#FF5C00]">{formatPrice(remaining)}</span>{" "}
                        {t("pour amortir la livraison !")}
                      </p>
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FF5C00] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[10px] rtl:text-[12px] sm:text-xs rtl:text-sm font-bold text-emerald-600">
                        {t("🎉 Excellent ! Vous optimisez vos frais de livraison chez ce vendeur.")}
                      </p>
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-full" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex gap-4 group/item">
                      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden bg-stone-50 shrink-0 border border-stone-100 relative">
                        <img
                          loading="lazy"
                          src={getOptimizedImageUrl(item.image, 200)}
                          className="w-full h-full object-cover"
                          alt={getTranslatedField(item, "name", lang)}
                        />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-xs rtl:text-sm sm:text-sm text-[#3C2B22] line-clamp-2">
                              {getTranslatedField(item, "name", lang)}
                            </h4>
                            <button
                              onClick={() => removeFromCart(item.originalIndex)}
                              className="text-stone-300 hover:text-red-500 transition-colors p-1 bg-stone-50 rounded-full"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.selectedVariant && (
                            <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-0.5">
                              {item.selectedVariant}
                            </p>
                          )}
                          <p className="text-[10px] rtl:text-[12px] font-bold text-[#FF5C00] uppercase tracking-widest rtl:tracking-normal mt-1">
                            {formatPrice(getCartItemPrice(item))}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-stone-50 rounded-full px-2 py-1 border border-stone-200">
                            <button
                              disabled={item.quantity <= 1}
                              onClick={() => updateQuantity(item.originalIndex, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-[#3C2B22] disabled:text-stone-300 hover:bg-white rounded-full transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs rtl:text-sm font-kinder min-w-[12px] text-center text-[#3C2B22]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.originalIndex, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-[#3C2B22] hover:bg-white rounded-full transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm font-kinder text-[#3C2B22]">
                            {formatPrice(getCartItemPrice(item) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-4 sm:p-6 border-t border-stone-100 space-y-4 bg-white">
          <div className="flex items-center justify-between text-sm sm:text-base font-medium">
            <span className="text-stone-400 font-bold uppercase tracking-widest rtl:tracking-normal text-[10px] rtl:text-[12px] sm:text-xs rtl:text-sm">
              {t("Sous-total")}
            </span>
            <span className="text-xl sm:text-2xl font-kinder text-[#3C2B22]">{formatPrice(totalPrice)}</span>
          </div>
          <button
            onClick={() => {
              onClose();
              navigate("/checkout");
            }}
            className="btn-premium-orange w-full flex items-center justify-center gap-2"
          >
            {t("Passer à la caisse")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </SideDrawer>
  );
};
