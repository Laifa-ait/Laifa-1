import React, { useEffect, useState } from "react";
import { SideDrawer } from "../SideDrawer";
import { useUIStore } from "../../store/useUIStore";
import { Eye, ArrowRight } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { useNavigate } from "react-router-dom";
import { Product } from "../../types";
import { useTranslation } from "react-i18next";

export const RecentlyViewedDrawer: React.FC = () => {
  const { t } = useTranslation();
  const isRecentlyViewedOpen = useUIStore((state) => state.isRecentlyViewedOpen);
  const setIsRecentlyViewedOpen = useUIStore((state) => state.setIsRecentlyViewedOpen);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const { fetchProductsByIds, fetchFeaturedProducts } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (isRecentlyViewedOpen) {
      const loadRecent = async () => {
        try {
          const stored = localStorage.getItem("olma_recently_viewed");
          if (stored) {
            const ids: string[] = JSON.parse(stored);
            if (ids.length > 0) {
              const recents = await fetchProductsByIds(ids);
              setRecentProducts(recents);
              return;
            }
          }
          // Fallback just for preview if empty
          const fallback = await fetchFeaturedProducts(4);
          setRecentProducts(fallback);
        } catch (e) {
          console.error(e);
        }
      };
      loadRecent();
    }
  }, [isRecentlyViewedOpen, fetchProductsByIds, fetchFeaturedProducts]);

  const handleProductClick = (id: string) => {
    setIsRecentlyViewedOpen(false);
    navigate(`/product/${id}`);
  };

  return (
    <SideDrawer
      isOpen={isRecentlyViewedOpen}
      onClose={() => setIsRecentlyViewedOpen(false)}
      title={t("Derniers Vus") || "Derniers Vus"}
      icon={<Eye className="w-5 h-5" />}
    >
      <div className="p-6 h-full overflow-y-auto bg-zinc-50/30">
        {recentProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <Eye className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-semibold">{t("Aucun produit consulté récemment.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentProducts.map((product) => {
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="group flex gap-4 bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-all cursor-pointer items-center"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-50 shrink-0">
                    <img
                      loading="lazy"
                      src={product.images?.[0] || product.image || undefined}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] rtl:text-[11px] font-kinder uppercase text-[#ea580c] tracking-wider rtl:tracking-normal mb-1">
                      {product.category}
                    </p>
                    <h4 className="text-sm font-kinder text-zinc-900 truncate mb-1">{product.name}</h4>
                    <p className="text-xs rtl:text-sm font-bold text-zinc-500">
                      {product.price.toLocaleString()} {t("DA")}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-950 group-hover:text-white transition-colors shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SideDrawer>
  );
};
