import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Eye, ArrowUp } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const FloatingActionBar: React.FC = () => {
  const { setIsSearchOpen, setIsCartOpen, setIsRecentlyViewedOpen } = useUI();
  const { cart } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navItems = [
    {
      id: "search",
      icon: Search,
      label: t("quick_search") || "Recherche Rapide",
      onClick: () => setIsSearchOpen(true),
    },
    {
      id: "recent",
      icon: Eye,
      label: t("recently_viewed") || "Derniers Vus",
      onClick: () => setIsRecentlyViewedOpen(true),
    },
    {
      id: "cart",
      icon: ShoppingBag,
      label: t("cart") || "Panier",
      onClick: () => setIsCartOpen(true),
      badge: cart.length > 0 ? cart.length : undefined,
    },
  ];

  return (
    <div className="hidden md:flex fixed end-4 md:end-6 top-1/2 -translate-y-1/2 z-[90] flex-col gap-3">
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-2.5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col gap-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="group relative w-12 h-12 flex items-center justify-center rounded-2xl bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-all duration-300"
          >
            <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />

            {item.badge !== undefined && (
              <span className="absolute top-1 end-1 w-4 h-4 bg-red-500 text-white text-[9px] rtl:text-[11px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {item.badge}
              </span>
            )}

            {/* Tooltip */}
            <div className="absolute end-full me-4 pointer-events-none opacity-0 group-hover:opacity-100 translate-x-4 rtl:-translate-x-4 group-hover:translate-x-0 transition-all duration-300">
              <div className="bg-zinc-950 text-white text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
                {item.label}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Separated Scroll to top button */}
      <div
        className={`transition-all duration-500 origin-top ${showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 -translate-y-4 pointer-events-none"}`}
      >
        <button
          onClick={scrollToTop}
          className="group relative w-[68px] h-12 w-full flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-md border border-zinc-200/50 text-zinc-500 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-xl"
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />

          <div className="absolute end-full me-4 pointer-events-none opacity-0 group-hover:opacity-100 translate-x-4 rtl:-translate-x-4 group-hover:translate-x-0 transition-all duration-300">
            <div className="bg-zinc-950 text-white text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
              {t("scroll_up") || "Remonter"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
