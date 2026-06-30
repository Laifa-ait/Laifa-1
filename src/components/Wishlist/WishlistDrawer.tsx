import React, { useEffect, useState } from "react";
import { Heart, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useShop } from "../../context/ShopContext";
import { SideDrawer } from "../SideDrawer";
import { formatPrice } from "../../utils/format";
import { getTranslatedField } from "../../utils/translations";
import { Language, Product } from "../../types";

export const WishlistDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { wishlist } = useCart();
  const { fetchProductsByIds } = useShop();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language as Language;

  useEffect(() => {
    if (isOpen) {
      if (wishlist.length > 0) {
        fetchProductsByIds(wishlist).then(setWishlistProducts);
      } else {
        setWishlistProducts([]);
      }
    }
  }, [isOpen, wishlist, fetchProductsByIds]);

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("wishlist") || "Favoris"}
      icon={<Heart className="w-5 h-5" />}
    >
      <div className="flex-1 overflow-y-auto p-6">
        {wishlistProducts.length === 0 ? (
          <div className="h-[75vh] flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-5">
              <Heart className="w-8 h-8 text-[#FF5C00] animate-pulse" fill="#FF5C00" />
            </div>
            <h3 className="text-sm font-kinder text-[#3C2B22] tracking-tight rtl:tracking-normal mb-2 uppercase">
              {t("empty_wishlist_title") || "Votre liste est vide"}
            </h3>
            <p className="text-xs rtl:text-sm text-zinc-400 font-bold max-w-[240px] leading-relaxed mb-8">
              {t("empty_wishlist_desc") ||
                "Explorez nos créations d'artisanat d'exception et sauvegardez vos articles favoris ici."}
            </p>
            <button
              onClick={() => {
                onClose();
                navigate("/shop");
              }}
              className="px-6 py-3.5 bg-[#FF5C00] hover:bg-[#b04f30]/90 text-white font-kinder text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-2xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer border-none"
            >
              <Package className="w-4 h-4" />
              {t("go_to_shop") || "Découvrir la boutique"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {wishlistProducts.map((p) => (
              <div
                key={p.id}
                className="flex gap-4 group cursor-pointer"
                onClick={() => {
                  onClose();
                  navigate(`/product/${p.id}`);
                }}
              >
                <div className="w-16 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                  <img loading="lazy" src={p.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm group-hover:underline">{getTranslatedField(p, "name", lang)}</h4>
                  <p className="text-xs rtl:text-sm text-zinc-500">{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SideDrawer>
  );
};
