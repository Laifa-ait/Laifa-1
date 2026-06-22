import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Home,
  ShoppingBag,
  Heart,
  User,
  Settings,
  Info,
  Box,
  LogOut,
  MapPin,
  Globe,
  ChevronRight,
} from "lucide-react";
import { useMobileMenu } from "../../hooks/useMobileMenu";
import { useMegaMenu } from "../../context/MegaMenuContext";
import { CATEGORY_ICONS } from "../../constants";
import { getRetroAvatar } from "../../utils/avatar";
import { getCategoryTranslation } from "../../utils/translations";

export const MobileMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    currentUser,
    userProfile,
    isMobileMenuOpen,
    isAboutOpen,
    setIsAboutOpen,
    aboutText,
    isLoadingAbout,
    fetchAboutText,
    closeMenu,
    handleNav,
    handleLanguageToggle,
    logout,
  } = useMobileMenu();
  const { categoriesData } = useMegaMenu();
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const menuItems = [
    {
      icon: MapPin,
      label: t("order_tracking") || "Suivi National de Colis",
      path: "/delivery-tracking",
    },
  ];

  const isRtl = i18n.dir() === "rtl" || i18n.language === "ar";

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: isRtl ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className={`fixed top-0 bottom-0 ${isRtl ? "left-0 border-r rounded-r-3xl" : "right-0 border-l rounded-l-3xl"} w-[85vw] max-w-[340px] bg-[#FAF8F5] z-[110] shadow-2xl border-[#EBE5DF]/60 flex flex-col overflow-hidden`}
            >
              {/* Header / Top */}
              <div className="flex items-center justify-between px-6 pb-4 pt-8 border-b border-[#EBE5DF]/60 bg-transparent">
                <h2 className="text-xl font-black text-[#121315] uppercase tracking-widest rtl:tracking-normal font-mono">
                  [ {t("menu")} ]
                </h2>
                <button
                  onClick={closeMenu}
                  className="p-2 -mr-2 bg-transparent border-none text-stone-500 hover:text-[#121315] cursor-pointer transition-colors"
                >
                  <X className="w-6 h-6 stroke-[2]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 space-y-8 scrollbar-hide bg-[#FAF8F5]">
                {/* User Section */}
                <div className="space-y-4">
                  {currentUser ? (
                    <div className="bg-white backdrop-blur-md rounded-3xl p-5 border border-[#EBE5DF]/60 shadow-[0_4px_20px_rgba(44,30,22,0.02)] space-y-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border border-[#EBE5DF]/80 overflow-hidden shrink-0">
                          <img
                            loading="lazy"
                            src={
                              userProfile?.photoURL ||
                              currentUser.photoURL ||
                              getRetroAvatar(currentUser.email || currentUser.uid)
                            }
                            className="w-full h-full object-cover"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-[17px] text-[#121315] truncate">
                              {userProfile?.displayName || currentUser.email}
                            </h4>
                            {userProfile?.clientType === "architect" && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] rtl:text-[11px] font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                                {t("Pro / Architecte")}
                              </span>
                            )}
                            {userProfile?.clientType === "vip" && (
                              <span className="bg-amber-100 text-amber-700 text-[9px] rtl:text-[11px] font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                                {t("VIP")}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-[#121315]/60 truncate">
                            {userProfile?.role === "admin"
                              ? t("common.admin")
                              : userProfile?.role === "seller"
                                ? t("common.seller")
                                : t("common.buyer")}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between gap-3 pt-2">
                        <button
                          onClick={() => {
                            handleNav("/dashboard/buyer");
                            closeMenu();
                          }}
                          className="flex-1 py-2.5 px-3 bg-[#FAF8F5] hover:bg-[#EBE5DF]/50 text-[#121315] text-[13px] font-medium rounded-xl border border-[#EBE5DF]/60 text-center transition-colors cursor-pointer"
                        >
                          {t("common.my_space")}
                        </button>
                        {userProfile?.role === "seller" && (
                          <button
                            onClick={() => {
                              handleNav("/dashboard/seller");
                              closeMenu();
                            }}
                            className="flex-1 py-2.5 px-3 bg-[#F37021]/10 hover:bg-[#F37021]/20 text-[#F37021] text-[13px] font-medium rounded-xl border border-[#F37021]/20 text-center transition-colors cursor-pointer"
                          >
                            {t("seller_dashboard")}
                          </button>
                        )}
                        {userProfile?.role === "admin" && (
                          <button
                            onClick={() => {
                              handleNav("/dashboard/admin");
                              closeMenu();
                            }}
                            className="flex-1 py-2.5 px-3 bg-[#F37021] hover:bg-[#D95B18] text-[#121315] text-[13px] font-medium rounded-xl border-none text-center transition-colors cursor-pointer shadow-sm"
                          >
                            {t("common.admin")}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#121315] rounded-3xl p-6 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl -mr-10 -mt-10" />
                      <div className="relative z-10 flex flex-col gap-4 items-center text-center">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-[18px] text-[#121315]">{t("Rejoignez Olma")}</h4>
                          <p className="text-[14px] text-stone-500">
                            {t("Connectez-vous pour une expérience personnalisée.")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleNav("/auth");
                            closeMenu();
                          }}
                          className="w-full bg-[#F37021] hover:bg-[#D95B18] text-[#121315] py-3 rounded-2xl font-medium text-[15px] transition-colors border-none cursor-pointer shadow-md"
                        >
                          {t("Se connecter")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      handleNav("/shop");
                      closeMenu();
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-[#EBE5DF] hover:border-[#F37021]/40 hover:shadow-sm active:scale-95 transition-all text-center gap-2 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#121315] mb-1">
                      <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#121315]">{t("catalog") || "Catalogue"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNav("/shop#wishlist");
                      closeMenu();
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-[#EBE5DF] hover:border-[#F37021]/40 hover:shadow-sm active:scale-95 transition-all text-center gap-2 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#121315] mb-1">
                      <Heart className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#121315]">{t("favorites") || "Favoris"}</span>
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-[#121315]/40 uppercase tracking-wider rtl:tracking-normal mb-4 px-1">
                    {t("nav.sections.navigation")}
                  </h4>
                  <div className="space-y-1">
                    {menuItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          handleNav(item.path);
                          closeMenu();
                        }}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white border border-transparent hover:border-[#EBE5DF] transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#121315] shadow-sm">
                          <item.icon className="w-5 h-5 stroke-[1.5]" />
                        </div>
                        <span className="text-[16px] font-medium text-[#121315]">{item.label}</span>
                      </button>
                    ))}{" "}
                    <button
                      onClick={handleLanguageToggle}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white border border-transparent hover:border-[#EBE5DF] transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#121315] shadow-sm">
                        <Globe className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <span className="text-[16px] font-medium text-[#121315]">
                        {t("nav.language") || "Langue"}:{" "}
                        <span className="uppercase text-[#F37021] font-bold">
                          {(i18n.language || "FR").split("-")[0]}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Catégories Section */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-[#121315]/40 uppercase tracking-wider rtl:tracking-normal mb-4 px-1">
                    {t("nav.sections.categories")}
                  </h4>
                  <div className="bg-white rounded-3xl border border-[#EBE5DF] overflow-hidden shadow-[0_4px_20_rgba(44,30,22,0.02)]">
                    {categoriesData.map((cat, i) => {
                      const IconComponent = CATEGORY_ICONS[cat.name] || Box;
                      const isExpanded = expandedCat === cat.id;
                      const isLast = i === categoriesData.length - 1;

                      return (
                        <div key={i} className={isLast ? "" : "border-b border-[#EBE5DF]/60"}>
                          <button
                            onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-5 h-5 text-[#121315]/60 stroke-[1.5]" />
                              <span className="font-medium text-[15px] text-[#121315]">
                                {getCategoryTranslation(cat.name, t)}
                              </span>
                            </div>
                            {cat.sections && cat.sections.length > 0 && (
                              <ChevronRight
                                className={`w-5 h-5 transition-transform duration-300 text-[#121315]/40 stroke-[1.5] ${isExpanded ? "rotate-90" : ""}`}
                              />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && cat.sections && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-[#FAF8F5]/50"
                              >
                                <div className="px-12 py-3 space-y-3">
                                  {cat.sections.map((sec, j) => (
                                    <button
                                      key={j}
                                      onClick={() => {
                                        handleNav(
                                          `/shop?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sec.name)}`
                                        );
                                        closeMenu();
                                      }}
                                      className="block w-full text-start text-[14px] text-[#121315]/70 hover:text-[#F37021] font-medium border-none bg-transparent cursor-pointer transition-colors"
                                    >
                                      {getCategoryTranslation(sec.name, t)}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sticky/Fixed Bottom Footer */}
              <div className="p-6 pb-8 bg-white border-t border-[#EBE5DF]/60 space-y-4 shrink-0 mt-auto">
                <button
                  onClick={fetchAboutText}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-[#FAF8F5] hover:bg-[#EBE5DF] rounded-2xl text-[#121315] font-medium text-[15px] transition-colors cursor-pointer border-none shadow-sm"
                >
                  <Info className="w-5 h-5 stroke-[1.5]" />
                  <span>{t("about_olma") || "À propos d'Olma"}</span>
                </button>
                {currentUser && (
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100/80 rounded-2xl text-red-600 font-medium text-[15px] transition-colors cursor-pointer border-none"
                  >
                    <LogOut className="w-5 h-5 stroke-[1.5]" />
                    <span>{t("logout") || "Se déconnecter"}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutOpen(false)}
              className="absolute inset-0 bg-white backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl z-10 max-h-[80vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-[#FAF8F5] text-[#121315] rounded-full hover:bg-[#EBE5DF] transition-colors border-none cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[1.5]" />
              </button>
              <div className="mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl justify-center items-center flex bg-[#F37021]/10 text-[#F37021]">
                  <Info className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="font-semibold text-2xl text-[#121315]">{t("about_olma") || "À propos d'Olma"}</h3>
              </div>
              {isLoadingAbout ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-[#EBE5DF] rounded w-full" />
                  <div className="h-4 bg-[#EBE5DF] rounded w-5/6" />
                  <div className="h-4 bg-[#EBE5DF] rounded w-4/6" />
                </div>
              ) : (
                <div className="prose prose-stone prose-sm font-normal text-[15px] leading-relaxed text-[#121315]/80 whitespace-pre-wrap">
                  {aboutText}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
