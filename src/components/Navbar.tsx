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
import { useCart } from "../context/CartContext";
import { useShop } from "../context/ShopContext";
import { useUI } from "../context/UIContext";
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
  const { cart, wishlist } = useCart();
  const { searchQuery, setSearchQuery, setActiveCategory, setIsSaleFilterActive, setActiveTag } = useShop();
  const { setIsCartOpen, setIsWishlistOpen, setIsMobileMenuOpen, setIsSearchOpen } = useUI();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const lang = i18n.language as Language;

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = React.useRef(0);

  const cartCount = React.useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          lastScrollYRef.current = currentScrollY;

          if (currentScrollY > 120 && currentScrollY > lastScrollYRef.current) {
            setIsHeaderVisible(false);
          } else {
            setIsHeaderVisible(true);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
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
        className={`bg-[#1A1410] text-[9px] rtl:text-[11px] sm:text-[10px] rtl:text-[12px] font-medium px-4 sm:px-6 lg:px-12 gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide justify-between items-center text-[#FAF8F5] ${location.pathname === "/" ? "hidden lg:flex" : "hidden"}`}
      >
        <div className="flex items-center mx-auto w-full max-w-[90rem] justify-between">
          <div className="flex items-center gap-6 py-2">
            <span className="flex items-center gap-2 text-[#FAF8F5] uppercase tracking-[0.2em] rtl:tracking-normal">
              <span className="w-1 h-1 bg-[#C75C1A] shrink-0" />
              {t("trust_delivery")}
            </span>
            <span className="text-white/20">|</span>
            <span className="font-normal text-[#FAF8F5] uppercase tracking-[0.2em] rtl:tracking-normal">
              {t("trust_quality")}
            </span>
          </div>
          <div className="flex items-center gap-6 py-2">
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
              className="hover:text-[#00AEEF] transition-colors flex items-center gap-1.5 uppercase tracking-[0.2em] rtl:tracking-normal text-[#FAF8F5] cursor-pointer bg-transparent border-none"
            >
              {t("sell_on_olma")}
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => navigate("/shipping-calculator")}
              className="hover:text-[#00AEEF] transition-colors flex items-center gap-1.5 uppercase tracking-[0.2em] rtl:tracking-normal text-[#FAF8F5] cursor-pointer bg-transparent border-none"
            >
              {t("shipping_calc") || "CALCULATEUR LIVRAISON"}
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => navigate("/delivery-tracking")}
              className="hover:text-[#00AEEF] transition-colors flex items-center gap-1.5 uppercase tracking-[0.2em] rtl:tracking-normal text-[#FAF8F5] cursor-pointer bg-transparent border-none"
            >
              {t("track_package") || "SUIVI DE COLIS"}
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => navigate("/support")}
              className="hover:text-[#00AEEF] transition-colors flex items-center gap-1.5 uppercase tracking-[0.2em] rtl:tracking-normal text-[#FAF8F5] cursor-pointer bg-transparent border-none"
            >
              {t("support") || "SUPPORT"}
            </button>
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-[100] bg-[#FDF9EC]/95 backdrop-blur-md border-b-[3px] border-white/10/20 shadow-md transition-all duration-500 py-3 sm:py-5 relative">
        <div className="absolute top-0 inset-x-0 h-[4px] bg-[#C75C1A] z-10" />
        <div className="flex items-center px-4 sm:px-6 md:px-8 mx-auto w-full max-w-[90rem] justify-between relative">
          {/* Logo on Left */}
          <div className="flex shrink-0 items-center justify-start lg:w-1/4">
            <button
               onClick={handleLogoClick}
               className="flex items-center gap-2 shrink-0 select-none cursor-pointer group bg-transparent border-none"
             >
               <OlmaLogo className="w-8 h-8 sm:w-10 sm:h-10 text-[#00AEEF] group-hover:scale-110 transition-transform duration-300 drop-shadow-sm" />
               <span className="font-sans font-bold font-bold text-2xl sm:text-3xl tracking-tight rtl:tracking-normal text-[#C75C1A] uppercase hidden sm:block">
                 {t("Olma")}
                 <span className="text-[#00AEEF] drop-shadow-sm">{t("rt")}</span>
               </span>
            </button>
          </div>

          <div className="flex-1 flex justify-center w-full px-2 lg:px-8">
            <div className="w-full max-w-3xl">
              <Searchbar variant="default" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 sm:gap-6 relative lg:w-1/4 shrink-0">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center text-[#C75C1A] hover:text-[#00AEEF] transition-all active:scale-95 cursor-pointer relative bg-transparent border-none p-1"
              id="global-search-trigger-btn"
              title={t("search_global") || "Recherche globale"}
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            <NotificationCenter />

            {/* Desktop Language Selector */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#C75C1A] hover:text-[#00AEEF] transition-all duration-300 py-1.5 px-3.5 uppercase tracking-widest rtl:tracking-normal bg-white border border-white/10/80 rounded-full hover:shadow-[0_4px_12px_rgba(44,30,22,0.06)] cursor-pointer"
                title={t("choose_language") || "Choisir la langue / اختر اللغة"}
                id="language-select-desktop-btn"
              >
                <Globe className="w-3.5 h-3.5 text-[#C75C1A]/80" />
                <span>{lang ? lang.split("-")[0] : "fr"}</span>
              </button>
              {isLangDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-50 cursor-default" onClick={() => setIsLangDropdownOpen(false)} />
                  <div className="absolute top-full right-0 mt-3 bg-[#FDF9EC] border border-white/10/80 shadow-[0_20px_40px_rgba(44,30,22,0.12)] z-[60] py-1.5 rounded-2xl min-w-[130px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
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
                        className={`w-full text-left rtl:text-right px-4 py-2.5 text-xs rtl:text-sm font-semibold tracking-wide transition-colors bg-transparent border-none cursor-pointer flex items-center justify-between gap-2 border-b border-white/10/30 last:border-b-0 ${
                          lang === l.code ? "text-[#00AEEF] bg-[#EBE5DF]/20" : "text-[#C75C1A] hover:bg-[#EBE5DF]/40"
                        }`}
                      >
                        <span>{l.name}</span>
                        {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-[#C75C1A]" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsWishlistOpen(true)}
              className="hidden lg:flex items-center justify-center text-[#C75C1A] hover:text-[#00AEEF] transition-all active:scale-95 cursor-pointer relative bg-transparent border-none p-1"
            >
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C75C1A] text-white flex items-center justify-center text-[9px] rtl:text-[11px] font-bold border-2 border-[#FAF8F5]">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Panier - Signature */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center justify-center text-[#C75C1A] hover:text-[#00AEEF] transition-all active:scale-95 cursor-pointer relative bg-transparent border-none p-1"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 w-5 h-5 rounded-full bg-[#C75C1A] text-white flex items-center justify-center text-[10px] rtl:text-[12px] font-bold border-2 border-[#FAF8F5]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown Toggle */}
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center justify-center transition-colors text-[#C75C1A] hover:text-[#00AEEF] active:scale-95 cursor-pointer bg-transparent border-none p-1"
            >
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            {/* Hamburger on Right */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex items-center justify-center transition-colors text-[#C75C1A] hover:text-[#00AEEF] active:scale-95 cursor-pointer bg-transparent border-none p-1"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
            </button>

            {isUserDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsUserDropdownOpen(false)} />
                <div className="absolute top-full right-0 mt-6 bg-[#FDF9EC] border border-white/10 shadow-[0_20px_40px_rgba(44,30,22,0.1)] z-[70] overflow-hidden flex flex-col py-2 animate-in fade-in slide-in-from-top-2 duration-300 min-w-[240px]">
                  {!currentUser ? (
                    <div className="p-4">
                      <button
                        onClick={() => {
                          navigate("/auth", { replace: true });
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full py-3.5 bg-[#1A1410] text-white font-medium text-[11px] uppercase tracking-[0.2em] transition-colors hover:bg-[#C75C1A] border-none cursor-pointer"
                      >
                        {t("auth.signin") || "S'identifier"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="px-5 py-4 border-b border-white/10 flex flex-col gap-1 text-left bg-[#1A1410] text-[#FAF8F5]">
                        <p className="text-sm font-serif italic flex items-center gap-2 tracking-wide">
                          <span className="truncate">{userProfile?.displayName || currentUser.email}</span>
                          {userProfile?.clientType === "architect" && (
                            <span className="bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
                              {t("Pro / Architecte")}
                            </span>
                          )}
                          {userProfile?.clientType === "vip" && (
                            <span className="bg-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
                              {t("VIP")}
                            </span>
                          )}
                        </p>
                        <p className="text-[9px] rtl:text-[11px] font-normal tracking-[0.2em] uppercase text-white/60">
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
                          className="w-full h-11 flex items-center px-5 text-[11px] uppercase tracking-widest rtl:tracking-normal text-[#C75C1A] hover:bg-[#EBE5DF]/50 transition-colors gap-3 bg-transparent border-none cursor-pointer"
                        >
                          {t("buyer_space") || "ESPACE ACHETEUR"}
                        </button>

                        {userProfile?.role === "seller" && (
                          <button
                            onClick={() => {
                              navigate("/dashboard/seller");
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full h-11 flex items-center px-5 text-[11px] uppercase tracking-widest rtl:tracking-normal text-[#00AEEF] hover:bg-[#C75C1A]/5 transition-colors gap-3 bg-transparent border-none cursor-pointer"
                          >
                            {t("seller_dashboard") || "DASHBOARD VENDEUR"}
                          </button>
                        )}

                        {userProfile?.role === "admin" && (
                          <button
                            onClick={() => {
                              navigate("/dashboard/admin");
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full h-11 flex items-center px-5 text-[11px] uppercase tracking-widest rtl:tracking-normal text-red-600 hover:bg-red-50 transition-colors gap-3 bg-transparent border-none cursor-pointer"
                          >
                            {t("administration") || "ADMINISTRATION"}
                          </button>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/10 px-2 mb-2">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full h-10 flex items-center justify-center text-[10px] rtl:text-[12px] font-normal uppercase tracking-[0.2em] text-[#C75C1A]/60 hover:text-[#00AEEF] transition-colors bg-transparent border-none cursor-pointer"
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
