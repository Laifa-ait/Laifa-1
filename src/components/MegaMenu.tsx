import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useMegaMenu, FeaturedProduct } from "../context/MegaMenuContext";
import { useShop } from "../context/ShopContext";
import { useTranslation } from "react-i18next";
import { CATEGORY_ICONS } from "../constants";
import { Box } from "lucide-react";
import { Product, Language } from "../types";
import { getTranslatedField } from "../utils/translations";

export const MegaMenu: React.FC = () => {
  const { categoriesData } = useMegaMenu();
  const { fetchProductsByIds } = useShop();
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSectionName, setActiveSectionName] = useState<string | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState<FeaturedProduct | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCategoryData = categoriesData.find((c) => c.id === activeCategory);

  // Pre-fetch related products when a category is opened
  useEffect(() => {
    if (!activeCategoryData) return;
    const idsToFetch = new Set<string>();
    if (activeCategoryData.featuredProduct?.productId) {
      idsToFetch.add(activeCategoryData.featuredProduct.productId);
    }
    activeCategoryData.sections.forEach((sec) => {
      sec.links.forEach((link: any) => {
        if (link.featuredProduct?.productId) {
          idsToFetch.add(link.featuredProduct.productId);
        }
      });
    });

    const neededIds = Array.from(idsToFetch).filter((id) => !productCache[id]);
    if (neededIds.length > 0) {
      fetchProductsByIds(neededIds).then((prods) => {
        setProductCache((prev) => {
          const next = { ...prev };
          prods.forEach((p) => {
            next[p.id] = p;
          });
          return next;
        });
      });
    }
  }, [activeCategoryData, fetchProductsByIds, productCache]);

  // Réinitialiser les états de survol lorsqu'on change de catégorie principale
  useEffect(() => {
    if (activeCategoryData && activeCategoryData.sections.length > 0) {
      setActiveSectionName(activeCategoryData.sections[0].name);
    } else {
      setActiveSectionName(null);
    }
    setHoveredProduct(null);
  }, [activeCategory, activeCategoryData]);

  const toggleCategory = (id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  };

  const displayedProductInfo = hoveredProduct || activeCategoryData?.featuredProduct;
  const productToDisplay = displayedProductInfo?.productId ? productCache[displayedProductInfo.productId] : null;

  return (
    <div ref={menuRef} className="relative w-full z-40 bg-slate-50 text-slate-900 font-sans hidden xl:block shadow-sm">
      {/* Barre secondaire des catégories (Clic uniquement) */}
      <div className="max-w-[1600px] mx-auto px-6">
        <ul className="flex items-center justify-between overflow-x-auto scrollbar-hide py-3">
          {categoriesData.map((category) => {
            const IconComponent = CATEGORY_ICONS[category.name] || Box;

            return (
              <li key={category.id} className="relative shrink-0">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`py-3 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center px-1`}
                >
                  <span
                    className={`flex flex-col items-center justify-center gap-1 ${activeCategory === category.id ? "text-orange-600" : "text-slate-600 hover:text-orange-600"}`}
                    title={t(category.name) || category.name}
                  >
                    {category.iconUrl ? (
                      <img
                        src={category.iconUrl}
                        alt={category.name}
                        className="w-8 h-8 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <IconComponent className="w-8 h-8 stroke-[1.5]" />
                    )}
                  </span>
                </button>

                {/* Soulignement pour la catégorie active */}
                {activeCategory === category.id && (
                  <div className="absolute bottom-0 start-0 w-full h-[2px] bg-orange-600 rounded-t-full shadow-[0_0_8px_rgba(234,88,12,0.4)]" />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Panneau Blanc du Mega Menu Déroulant */}
      <AnimatePresence>
        {activeCategoryData && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full start-0 w-full bg-slate-50/98 text-black border-t border-slate-200 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-full max-w-[1600px] mx-auto px-6 py-10">
              <div className="grid grid-cols-12 gap-12">
                {/* 1ère Colonne : Liste des sous-catégories (Sections) */}
                <div className="col-span-3 pe-4">
                  <h3 className="text-xl font-display italic tracking-[0.1em] rtl:tracking-normal text-slate-900 mb-6 uppercase">
                    {t("sub_categories") || "Sous-catégories"}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {activeCategoryData.sections.map((section, idx) => {
                      const isActive = activeSectionName === section.name;
                      return (
                        <li key={idx}>
                          <button
                            onClick={() => setActiveSectionName(section.name)}
                            onMouseEnter={() => {
                              if (!isActive) {
                                setActiveSectionName(section.name);
                              }
                            }}
                            className={`w-full text-start py-3 px-5 rounded-2xl text-[15px] font-semibold transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                              isActive
                                ? "bg-black text-white shadow-md"
                                : "bg-transparent text-zinc-500 hover:text-black hover:bg-zinc-100"
                            }`}
                          >
                            <span className="relative z-10 line-clamp-1">{t(section.name) || section.name}</span>
                            <div className="relative z-10">
                              <svg
                                className={`w-4 h-4 shrink-0 transition-transform duration-300 rtl:-scale-x-100 ${isActive ? "text-white translate-x-1 rtl:-translate-x-1" : "opacity-0 -translate-x-2 rtl:translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* 2ème et 3ème Colonnes : Sous-sous-catégories (Liens) */}
                <div className="col-span-6 ps-4 border-s border-zinc-100/60">
                  <h3 className="text-[10px] rtl:text-[12px] font-kinder tracking-[0.2em] rtl:tracking-normal text-zinc-400 mb-6 uppercase">
                    {activeSectionName ? t(activeSectionName) || activeSectionName : t("explore") || "Explorer"}
                  </h3>
                  {activeCategoryData.sections
                    .filter((sec) => sec.name === activeSectionName)
                    .map((activeSection) => (
                      <div key={activeSection.name} className="grid grid-cols-2 gap-x-8 gap-y-2">
                        {activeSection.links.map((link, linkIdx) => (
                          <div key={linkIdx} className="break-inside-avoid">
                            <Link
                              to={`/shop?category=${encodeURIComponent(activeCategoryData.name)}&subcategory=${encodeURIComponent(activeSection.name.trim())}&subsubcategory=${encodeURIComponent(link.name.trim())}`}
                              className="group flex items-center justify-between py-3 px-5 w-full h-full rounded-2xl transition-all duration-300 hover:bg-zinc-100/80"
                              onMouseEnter={() => {
                                if (link.featuredProduct) {
                                  setHoveredProduct(link.featuredProduct);
                                }
                              }}
                            >
                              <span className="text-[14px] font-medium text-zinc-600 group-hover:text-black transition-colors">
                                {t(link.name) || link.name}
                              </span>
                              <svg
                                className="w-3.5 h-3.5 opacity-0 rtl:-scale-x-100 -translate-x-3 rtl:translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-black"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>

                {/* Colonne 4: Produit mis en avant */}
                <div className="col-span-3 ps-8">
                  <div className="flex flex-col h-full">
                    {productToDisplay ? (
                      <div className="flex flex-col">
                        <h3 className="text-[10px] rtl:text-[12px] font-kinder tracking-[0.2em] rtl:tracking-normal text-zinc-400 mb-6 uppercase">
                          {t("featured_product") || "En vedette"}
                        </h3>
                        <Link
                          to={`/product/${productToDisplay.id}`}
                          className="group flex flex-col relative w-full aspect-[4/5] bg-zinc-50 overflow-hidden rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500"
                        >
                          <img
                            loading="lazy"
                            src={productToDisplay.images?.[0] || productToDisplay.image}
                            alt={getTranslatedField(productToDisplay, "name", i18n.language as Language)}
                            className="w-full h-full object-cover transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:scale-105"
                          />
                          {/* Overlay très subtil sur le bas */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute bottom-6 left-6 right-6 flex flex-col translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <h4 className="text-lg font-bold text-white leading-snug mb-1 line-clamp-2">
                              {getTranslatedField(productToDisplay, "name", i18n.language as Language)}
                            </h4>
                            <p className="text-sm font-semibold text-zinc-200">
                              {productToDisplay.price.toLocaleString("fr-DZ")} {t("DA")}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full items-center justify-center text-center px-4">
                        {/* Empty State, completely clean if nothing provided by admin */}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
