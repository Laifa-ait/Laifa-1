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
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ x: isRtl ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className={`fixed top-0 bottom-0 ${isRtl ? "left-0 rounded-r-3xl" : "right-0 rounded-l-3xl"} w-[85vw] max-w-[340px] bg-white z-[110] shadow-2xl flex flex-col overflow-hidden`}
            >
              {/* Header / Top */}
              <div className="flex items-center justify-between px-8 pb-6 pt-10 bg-white">
                <h2 className="text-2xl font-display font-semibold text-slate-900 tracking-tight">
                  {t("menu")}
                </h2>
                <button
                  onClick={closeMenu}
                  className="p-2 -mr-2 bg-transparent border-none text-slate-400 hover:text-slate-900 cursor-pointer transition-colors"
                >
                  <X className="w-6 h-6 stroke-[2]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 space-y-8 scrollbar-hide bg-slate-50/50">
                {/* User Section */}
                <div className="space-y-4">
                  {currentUser ? (
                    <div className="bg-sky-50 rounded-3xl p-6 shadow-sm space-y-5 border border-sky-100/50">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-sm border border-sky-200">
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
                            <h4 className="font-display font-bold text-lg text-slate-900 truncate">
                              {userProfile?.displayName || currentUser.email}
                            </h4>
                          </div>
                          <p className="text-sm text-slate-500 truncate">
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
                          className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-sky-600 text-white text-sm font-medium rounded-2xl text-center transition-colors cursor-pointer border-none shadow-sm"
                        >
                          {t("common.my_space")}
                        </button>
                        {userProfile?.role === "seller" && (
                          <button
                            onClick={() => {
                              handleNav("/dashboard/seller");
                              closeMenu();
                            }}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-2xl text-center transition-colors cursor-pointer border-none shadow-sm"
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
                            className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-2xl border-none text-center transition-colors cursor-pointer shadow-sm"
                          >
                            {t("common.admin")}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-8 shadow-sm relative overflow-hidden">
                      <div className="relative z-10 flex flex-col gap-4 items-center text-center">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg text-slate-900">{t("Rejoignez Olma")}</h4>
                          <p className="text-sm text-slate-500">
                            {t("Connectez-vous pour une expérience personnalisée.")}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleNav("/auth");
                            closeMenu();
                          }}
                          className="w-full bg-zinc-900 hover:bg-sky-600 text-white py-3 rounded-2xl font-medium text-sm transition-colors border-none cursor-pointer shadow-sm"
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
                    className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white hover:bg-slate-50 hover:shadow-md active:scale-95 transition-all text-center gap-2 cursor-pointer border-none shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-1">
                      <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{t("catalog") || "Catalogue"}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleNav("/shop#wishlist");
                      closeMenu();
                    }}
                    className="flex flex-col items-center justify-center p-5 rounded-3xl bg-white hover:bg-pink-50 hover:shadow-md active:scale-95 transition-all text-center gap-2 cursor-pointer border-none shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-1">
                      <Heart className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{t("favorites") || "Favoris"}</span>
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1">
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
                        className="w-full flex items-center gap-5 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer border-none bg-transparent"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-600 shadow-sm">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-base font-medium text-slate-700">{item.label}</span>
                      </button>
                    ))}{" "}
                    <button
                      onClick={handleLanguageToggle}
                      className="w-full flex items-center gap-5 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer border-none bg-transparent"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-600 shadow-sm">
                        <Globe className="w-5 h-5" />
                      </div>
                      <span className="text-base font-medium text-slate-700">
                        {t("nav.language") || "Langue"}:{" "}
                        <span className="uppercase text-sky-500 font-bold">
                          {(i18n.language || "FR").split("-")[0]}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Catégories Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    {t("nav.sections.categories")}
                  </h4>
                  <div className="flex flex-col space-y-2">
                    {categoriesData.map((cat, i) => {
                      const IconComponent = CATEGORY_ICONS[cat.name] || Box;
                      const isExpanded = expandedCat === cat.id;

                      return (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
                          <button
                            onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                            className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer hover:bg-slate-50/80 group transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-sky-50 transition-colors">
                                <IconComponent className="w-5 h-5 text-slate-500 group-hover:text-sky-500 stroke-[1.5] transition-colors" />
                              </div>
                              <span className="font-medium text-sm text-slate-700 group-hover:text-sky-600 transition-colors">
                                {getCategoryTranslation(cat.name, t)}
                              </span>
                            </div>
                            {cat.sections && cat.sections.length > 0 && (
                              <ChevronRight
                                className={`w-4 h-4 transition-transform duration-300 text-slate-400 ${isExpanded ? "rotate-90 text-sky-500" : ""}`}
                              />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && cat.sections && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-slate-50/50"
                              >
                                <div className="px-14 py-4 space-y-4">
                                  {cat.sections.map((sec, j) => (
                                    <button
                                      key={j}
                                      onClick={() => {
                                        handleNav(
                                          `/shop?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sec.name)}`
                                        );
                                        closeMenu();
                                      }}
                                      className="block w-full text-start text-sm text-slate-500 hover:text-sky-500 font-normal border-none bg-transparent cursor-pointer transition-colors"
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
              <div className="p-6 pb-8 bg-white space-y-4 shrink-0 mt-auto shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-10 relative">
                <button
                  onClick={fetchAboutText}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-700 font-medium text-sm transition-colors cursor-pointer border-none shadow-sm"
                >
                  <Info className="w-5 h-5" />
                  <span>{t("about_olma") || "À propos d'Olma"}</span>
                </button>
                {currentUser && (
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:text-red-600 font-medium text-sm transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <LogOut className="w-4 h-4 stroke-[2]" />
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
              className="absolute inset-0 bg-slate-900/40"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl z-10 max-h-[80vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsAboutOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors border-none cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[1.5]" />
              </button>
              <div className="mb-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl justify-center items-center flex bg-sky-50 text-sky-500">
                  <Info className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h3 className="font-semibold text-2xl text-slate-900">{t("about_olma") || "À propos d'Olma"}</h3>
              </div>
              {isLoadingAbout ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                  <div className="h-4 bg-slate-100 rounded w-4/6" />
                </div>
              ) : (
                <div className="prose prose-slate prose-sm font-normal text-[15px] leading-relaxed text-slate-600 whitespace-pre-wrap">
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
