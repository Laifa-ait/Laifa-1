import React, { useState, useEffect } from "react";
import {
  Menu,
  ChevronDown,
  User as UserIcon,
  Heart,
  ShoppingBag,
  Grid,
  Home,
  Search,
  Settings,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";
import { useShop } from "../context/ShopContext";
import { useUIStore } from "../store/useUIStore";
import { Language } from "../types";
import { MegaMenu } from "./MegaMenu";
import { AdvancedSearchbar as Searchbar } from "./Search/AdvancedSearchbar";
import { NotificationCenter } from "./NotificationCenter";

export interface OlmaLogoProps {
  className?: string;
}

export const OlmaLogo: React.FC<OlmaLogoProps> = ({ className }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <ellipse cx="60" cy="70" rx="30" ry="34" stroke="currentColor" strokeWidth="8" />
    <path
      d="M60 40C60 40 52 20 60 15C68 20 60 40 60 40Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M55 42C55 42 35 38 40 25C48 25 55 35 55 42Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M65 42C65 42 85 38 80 25C72 25 65 35 65 42Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

export const Navbar: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const cart = useCartStore((state) => state.cart);
  const wishlist = useWishlistStore((state) => state.wishlist);
  const { searchQuery, setSearchQuery, setActiveCategory, setIsSaleFilterActive, setActiveTag } = useShop();
  const setIsCartOpen = useUIStore((state) => state.setIsCartOpen);
  const setIsWishlistOpen = useUIStore((state) => state.setIsWishlistOpen);
  const setIsMobileMenuOpen = useUIStore((state) => state.setIsMobileMenuOpen);
  const setIsSearchOpen = useUIStore((state) => state.setIsSearchOpen);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const lang = i18n.language as Language;

  const [isScrolled, setIsScrolled] = useState(false);

  const cartCount = React.useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const setLang = (l: string) => {
    i18n.changeLanguage(l);
  };

  const handleLogoClick = () => {
    navigate("/");
    setSearchQuery("");
    setActiveCategory("Tous");
    setIsSaleFilterActive(false);
    setActiveTag(null);
  };

  return (
    <>
      <div
        className={`bg-slate-900 text-slate-300 text-xs font-medium px-4 sm:px-6 lg:px-12 py-2 gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide justify-between items-center ${location.pathname === "/" ? "hidden lg:flex" : "hidden"}`}
      >
        <div className="flex items-center mx-auto w-full max-w-[90rem] justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
              {t("trust_delivery")}
            </span>
            <span className="text-slate-600">|</span>
            <span>{t("trust_quality")}</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                if (currentUser && userProfile?.role === "seller") {
                  navigate("/dashboard/seller");
                } else if (currentUser) {
                  navigate("/dashboard/buyer");
                } else {
                  navigate("/auth?role=seller");
                }
              }}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
            >
              {t("sell_on_olma")}
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => navigate("/shipping-calculator")}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
            >
              {t("shipping_calc") || "Calculateur Livraison"}
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => navigate("/delivery-tracking")}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
            >
              {t("track_package") || "Suivi de colis"}
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => navigate("/support")}
              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
            >
              {t("support") || "Support"}
            </button>
          </div>
        </div>
      </div>

      <nav className={`sticky top-0 z-[100] transition-all duration-300 py-3 sm:py-4 ${isScrolled ? "bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm" : "bg-white border-b border-transparent"}`}>
        <div className="flex items-center px-4 sm:px-6 md:px-8 mx-auto w-full max-w-[90rem] justify-between relative">
          {/* Logo on Left */}
          <div className="flex shrink-0 items-center justify-start lg:w-1/4">
            <button
               onClick={handleLogoClick}
               className="flex items-center gap-2 shrink-0 select-none cursor-pointer group bg-transparent border-none"
             >
               <OlmaLogo className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 group-hover:scale-105 transition-transform duration-300" />
               <span className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-slate-900 uppercase hidden sm:block">
                 {t("Olma")}
                 <span className="text-zinc-900">{t("rt")}</span>
               </span>
            </button>
          </div>

          <div className="flex-1 flex justify-center w-full px-2 lg:px-8">
            <div className="w-full max-w-3xl">
              <Searchbar variant="default" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 sm:gap-5 relative lg:w-1/4 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-none w-9 h-9 sm:w-10 sm:h-10 rounded-full lg:hidden"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            <div className="hidden lg:block">
              <NotificationCenter />
            </div>

            {/* Desktop Language Selector */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 bg-slate-100 rounded-lg cursor-pointer"
              >
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="uppercase">{lang ? lang.split("-")[0] : "fr"}</span>
              </button>
              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-50 cursor-default" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-white border border-slate-100 shadow-xl z-[60] py-2 rounded-none min-w-[140px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {[
                      { code: "fr", name: "Français" },
                      { code: "ar", name: "العربية" },
                      { code: "en", name: "English" },
                    ].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code);
                          setIsLangDropdownOpen(false);
                        }}
                        className={`w-full text-left rtl:text-right px-4 py-2.5 text-sm font-medium transition-colors bg-transparent border-none cursor-pointer flex items-center justify-between gap-2 hover:bg-slate-50 ${
                          lang === l.code ? "text-zinc-900" : "text-slate-700"
                        }`}
                      >
                        <span>{l.name}</span>
                        {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsWishlistOpen(true)}
              className="hidden lg:flex items-center justify-center text-slate-600 hover:bg-pink-50 hover:text-pink-500 transition-colors cursor-pointer relative bg-transparent border-none w-9 h-9 sm:w-10 sm:h-10 rounded-full"
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] font-bold">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Panier */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center justify-center text-slate-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer relative bg-transparent border-none w-9 h-9 sm:w-10 sm:h-10 rounded-full"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown Toggle */}
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-none w-9 h-9 sm:w-10 sm:h-10 rounded-full"
            >
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            {/* Hamburger on Right */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-none w-9 h-9 sm:w-10 sm:h-10 rounded-full lg:hidden"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            {isUserDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsUserDropdownOpen(false)} />
                <div className="absolute top-full right-0 mt-4 bg-white border border-slate-100 shadow-xl rounded-none z-[70] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 min-w-[260px]">
                  {!currentUser ? (
                    <div className="p-4 bg-slate-50">
                      <button
                        onClick={() => {
                          navigate("/auth", { replace: true });
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full py-3 bg-zinc-900 text-white rounded-none font-semibold text-sm hover:bg-zinc-900 transition-colors border-none cursor-pointer"
                      >
                        {t("auth.signin") || "Se connecter"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-5 border-b border-slate-100 flex flex-col gap-1 bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <span className="truncate">{userProfile?.displayName || currentUser.email}</span>
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {userProfile?.role === "admin"
                            ? t("role_admin") || "Administrateur"
                            : userProfile?.role === "seller"
                              ? t("role_seller") || "Vendeur"
                              : t("role_client") || "Client"}
                        </p>
                      </div>

                      <div className="py-2">
                        <button
                          onClick={() => {
                            navigate("/dashboard/buyer");
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-5 py-3 text-sm font-medium text-slate-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors bg-transparent border-none cursor-pointer"
                        >
                          {t("buyer_space") || "Mon Espace"}
                        </button>

                        {userProfile?.role === "seller" && (
                          <button
                            onClick={() => {
                              navigate("/dashboard/seller");
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-5 py-3 text-sm font-medium text-slate-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors bg-transparent border-none cursor-pointer"
                          >
                            {t("seller_dashboard") || "Dashboard Vendeur"}
                          </button>
                        )}

                        {userProfile?.role === "admin" && (
                          <button
                            onClick={() => {
                              navigate("/dashboard/admin");
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center px-5 py-3 text-sm font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 transition-colors bg-transparent border-none cursor-pointer"
                          >
                            {t("administration") || "Administration"}
                          </button>
                        )}
                      </div>

                      <div className="p-2 border-t border-slate-100 bg-slate-50">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-center py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                        >
                          {t("auth.logout") || "Déconnexion"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        {location.pathname === "/" && <MegaMenu />}
      </nav>
    </>
  );
};
