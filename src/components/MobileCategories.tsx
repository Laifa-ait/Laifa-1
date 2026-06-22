import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, LayoutGrid, ArrowRight, TrendingUp, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { PRODUCT_HIERARCHY, CATEGORY_ICONS } from "../constants";
import { Language } from "../types";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { getCategoryTranslation } from "../utils/translations";
import { getOptimizedImageUrl } from "../utils/imageUtils";

interface CategoryData {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  banner?: string;
  colorTheme?: string;
  subs: { name: string; image: string; subSubs: { name: string; image: string | null }[] }[];
}

export default function MobileCategories(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setActiveCategory, setSearchQuery } = useShop();
  const { categoryHierarchy } = useShop();
  const lang = (i18n.language || "fr") as Language;

  const [activeExpanded, setActiveExpanded] = useState<string | null>("Maison & Déco");
  const [activeExpandedSub, setActiveExpandedSub] = useState<string | null>(null);
  const [customConfigs, setCustomConfigs] = useState<any[]>([]);

  const isRTL = lang === "ar";

  useEffect(() => {
    const q = collection(db, "homepage_categories_v2");

    // Subscribe to changes in real-time
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setCustomConfigs(list);
        sessionStorage.setItem("home_custom_categories", JSON.stringify(list));
      },
      (err) => {
        console.warn("Error loading configs live:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  const categoriesData: CategoryData[] = useMemo(() => {
    return Object.entries(categoryHierarchy).map(([catName, subGroups]) => {
      const customConfig = customConfigs?.find((cc: any) => cc.id === catName);
      // More reliable Unsplash photo IDs that are typically stable
      const ABSTRACT_IDS = [
        "1557672172-298e090bd0f1",
        "1518640467708-62f1f5164f7b",
        "1528459801415-3cb8a5a415ed",
        "1550850839925-58f5bc68f006",
        "1615529851608-f404af362483",
        "1541701494587-cb58502866ab",
        "1498049794561-7780e7231661",
        "1583847268964-b28dc8f51f92",
        "1445205170230-053b83016050",
        "1522335789203-aabd1fc54bc9",
        "1492144534655-ae79c964c9d7",
        "1517836357463-d25dfeac3438",
        "1519689689353-897c1bd303b5",
        "1581244276891-997d6273424a",
        "1533038590840-349c81a285d8",
        "1542838132-92c53300491e",
        "1456513080510-7bf3a84b82f8",
      ];
      const CATEGORY_IMAGES_MAP: Record<string, string> = {
        "Maison & Déco": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace",
        Électronique: "https://images.unsplash.com/photo-1498049794561-7780e7231661",
        Électroménager: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
        Mode: "https://images.unsplash.com/photo-1445205170230-053b83016050",
        "Beauté & Santé": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9",
        "Auto & Moto": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7",
        "Sport & Loisirs": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
        "Bébé & Puériculture": "https://images.unsplash.com/photo-1459682687441-7761439a709d",
        "Bricolage & Outillage": "https://images.unsplash.com/photo-1581244276891-997d6273424a",
        "Jeux & Jouets": "https://images.unsplash.com/photo-1533038590840-349c81a285d8",
        Supermarché: "https://images.unsplash.com/photo-1542838132-92c53300491e",
        "Scolaire & Bureau": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8",
      };

      const allSubs: { name: string; image: string; subSubs: { name: string; image: string | null }[] }[] = [];
      Object.entries(subGroups).forEach(([subName, subSubsArray]) => {
        const customSubImage = customConfig?.subCategoryImages?.[subName];

        const mappedSubSubs = subSubsArray.map((ss) => ({
          name: ss,
          image: customConfig?.subCategoryImages?.[ss] || null,
        }));

        if (customSubImage) {
          allSubs.push({ name: subName, image: customSubImage, subSubs: mappedSubSubs });
        } else {
          const sum = subName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const imgId = ABSTRACT_IDS[sum % ABSTRACT_IDS.length];
          allSubs.push({
            name: subName,
            image: `https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&q=80&w=400`,
            subSubs: mappedSubSubs,
          });
        }
      });

      const fallbackBannerId =
        CATEGORY_IMAGES_MAP[catName] ||
        `https://images.unsplash.com/photo-${ABSTRACT_IDS[catName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % ABSTRACT_IDS.length]}`;

      return {
        id: catName,
        name: catName,
        icon: CATEGORY_ICONS[catName],
        banner: customConfig?.image || `${fallbackBannerId}?auto=format&fit=crop&q=80&w=1200`,
        colorTheme: customConfig?.color_theme || "#ea580c",
        subs: allSubs,
      };
    });
  }, [customConfigs]);

  const selectSubCategoryAndNavigate = (catId: string, subName: string) => {
    setActiveCategory(catId);
    setSearchQuery(subName);
    navigate("/shop");
  };

  const handleToggle = (catId: string) => {
    if (activeExpanded === catId) {
      setActiveExpanded(null);
    } else {
      setActiveExpanded(catId);
      setActiveExpandedSub(null);
    }
  };

  const handleSubToggle = (subName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (activeExpandedSub === subName) {
      setActiveExpandedSub(null);
    } else {
      setActiveExpandedSub(subName);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF9F1] pb-32 overflow-x-hidden pt-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto px-5">
        {/* Superior Header: Abstract & Minimalist */}
        <header className="mb-10 flex flex-col items-start gap-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-orange-600 mb-1"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">
              {t("exploration_premium") || "Exploration Premium"}
            </span>
          </motion.div>
          <h1 className="text-4xl font-black text-[#121315] tracking-tighter rtl:tracking-normal uppercase leading-none">
            {t("univers_olma")?.split(" ")[0] || "Univers"}{" "}
            <span className="text-[#121315]/30">{t("univers_olma")?.split(" ")[1] || "Olma"}</span>
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-2 max-w-[200px] leading-relaxed">
            {t("browse_collections_desc") || "Parcourez nos collections par atmosphère et style de vie."}
          </p>
        </header>

        {/* Categories Stack: The Portal Architecture */}
        <div className="space-y-4">
          {categoriesData.map((cat, idx) => {
            const isExpanded = activeExpanded === cat.id;

            return (
              <div
                key={cat.id}
                className={`relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? "mb-8" : "mb-0"}`}
              >
                {/* Main Category Entry Card */}
                <motion.button
                  layout
                  onClick={() => handleToggle(cat.id)}
                  className={`w-full relative h-40 sm:h-48 rounded-[32px] overflow-hidden group border-none cursor-pointer transition-all duration-500 ${isExpanded ? "ring-2 ring-[#121315] ring-offset-2 ring-offset-[#FDF9F1]" : "hover:shadow-xl shadow-lg shadow-[#121315]/5"}`}
                >
                  <motion.img
                    layout
                    src={cat.banner}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${isExpanded ? "scale-110 blur-[2px]" : "group-hover:scale-105"}`}
                    alt={cat.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=1200`;
                    }}
                  />
                  <div
                    className={`absolute inset-0 transition-opacity duration-500 ${isExpanded ? "bg-[#121315]/75" : "bg-gradient-to-t from-[#121315]/85 via-transparent to-transparent"}`}
                  />

                  <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between">
                    <div className="flex flex-col items-start gap-1">
                      <div
                        className={`flex items-center gap-2 transition-transform duration-500 ${isExpanded ? "translate-y-[-10px]" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/35 flex items-center justify-center text-white border border-white/45">
                          {cat.icon ? (
                            React.createElement(cat.icon as any, { className: "w-4 h-4" })
                          ) : (
                            <LayoutGrid className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider rtl:tracking-normal drop-shadow-sm">
                          {t("atmosphere") || "Atmosphère"}
                        </span>
                      </div>
                      <h2
                        className={`text-2xl font-bold text-white leading-none tracking-tight rtl:tracking-normal uppercase transition-transform duration-500 ${isExpanded ? "translate-y-[-10px]" : ""}`}
                      >
                        {getCategoryTranslation(cat.name, t)}
                      </h2>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center shadow-xl transition-all duration-500 ${isExpanded ? "rotate-90 scale-110 bg-[#EDAD00] text-white" : "bg-white/35 text-white border border-white/45 rtl:rotate-180"}`}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.button>

                {/* Sub-categories Grid: Bento Reveal */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {cat.subs.map((sub, sIdx) => {
                          const isSelectedSub = activeExpandedSub === sub.name;
                          const isWide = sIdx % 5 === 0 || isSelectedSub;
                          return (
                            <motion.div
                              key={sub.name}
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: sIdx * 0.03 + 0.1 }}
                              className={`relative overflow-hidden rounded-3xl group bg-[#FAF8F5] ${isWide ? "col-span-2" : "col-span-1"} ${isSelectedSub ? "h-auto shadow-[0_10px_30px_-10px_rgba(30,67,86,0.3)] border border-[#121315]/15" : isWide ? "h-32" : "h-36"} flex flex-col transition-all duration-300`}
                            >
                              {!isSelectedSub ? (
                                <button
                                  onClick={(e) => handleSubToggle(sub.name, e)}
                                  className="w-full h-full text-left p-0 border-none bg-transparent cursor-pointer flex flex-col relative"
                                >
                                  {isWide ? (
                                    <div className="w-full h-full flex flex-col md:flex-row items-start md:items-center p-5 gap-5 relative overflow-hidden">
                                      <div className="absolute top-0 end-0 w-32 h-32 bg-orange-500/5 rounded-full -me-16 -mt-16 blur-3xl" />
                                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 shadow-lg border-2 border-white/50 relative z-10 hidden sm:block">
                                        <img
                                          loading="lazy"
                                          src={getOptimizedImageUrl(sub.image || undefined, 400)}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                          alt={sub.name}
                                        />
                                      </div>
                                      <div className="flex flex-col items-start gap-1 relative z-10 w-full">
                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest rtl:tracking-normal">
                                          {t("view_collection") || "Voir la collection"}
                                        </span>
                                        <h3 className="text-xl font-black text-[#121315] uppercase tracking-tighter rtl:tracking-normal leading-none">
                                          {getCategoryTranslation(sub.name, t)}
                                        </h3>
                                        <div className="flex flex-wrap gap-1 mt-2 w-full">
                                          {sub.subSubs.slice(0, 3).map((ss) => (
                                            <span
                                              key={ss.name}
                                              className="px-2 py-0.5 text-[8px] font-bold bg-[#121315]/10 text-[#121315] rounded-full whitespace-nowrap"
                                            >
                                              {getCategoryTranslation(ss.name, t)}
                                            </span>
                                          ))}
                                          {sub.subSubs.length > 3 && (
                                            <span className="px-2 py-0.5 text-[8px] font-bold bg-[#121315]/10 text-[#121315] rounded-full">
                                              +{sub.subSubs.length - 3}
                                            </span>
                                          )}
                                        </div>
                                        <div className="mt-2 w-7 h-1 bg-[#121315] rounded-full group-hover:w-full transition-all duration-500" />
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="w-full h-[60%] overflow-hidden flex-1 relative">
                                        <img
                                          loading="lazy"
                                          src={getOptimizedImageUrl(sub.image || undefined, 400)}
                                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                          alt={sub.name}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pb-3 justify-center">
                                          <div className="flex flex-wrap gap-1 justify-center translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            {sub.subSubs.slice(0, 2).map((ss) => (
                                              <span
                                                key={ss.name}
                                                className="px-1.5 py-0.5 text-[7px] font-bold bg-black/60 text-white rounded-md whitespace-nowrap border border-white/5"
                                              >
                                                {ss.name}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-3 bg-white flex flex-col items-center justify-center flex-1">
                                        <span className="text-[10px] font-bold text-[#121315] uppercase tracking-wide text-center leading-tight line-clamp-2">
                                          {getCategoryTranslation(sub.name, t)}
                                        </span>
                                        <span className="text-[8px] font-semibold text-stone-500 mt-1 uppercase tracking-wider rtl:tracking-normal">
                                          {sub.subSubs.length} {t("departments") || "rayons"}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="flex flex-col w-full h-full">
                                  <button
                                    onClick={(e) => handleSubToggle(sub.name, e)}
                                    className="w-full flex items-center p-5 bg-[#121315] text-white shrink-0 border-none text-left cursor-pointer active:bg-[#0a0b0c] transition-colors relative overflow-hidden"
                                  >
                                    <div className="absolute top-0 end-0 w-32 h-32 bg-white/5 rounded-full -me-10 -mt-10 blur-2xl" />
                                    <div className="flex-1 flex flex-col relative z-10">
                                      <span className="text-[10px] text-orange-400 font-black uppercase tracking-widest rtl:tracking-normal mb-1">
                                        {t("choose_department") || "Choisir un rayon"}
                                      </span>
                                      <h3 className="text-xl font-black text-white uppercase tracking-tighter rtl:tracking-normal leading-none">
                                        {getCategoryTranslation(sub.name, t)}
                                      </h3>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center rotate-90 relative z-10">
                                      <ChevronRight className="w-4 h-4 text-white" />
                                    </div>
                                  </button>

                                  <div className="p-4 grid grid-cols-1 gap-2 w-full bg-[#FAF8F5]">
                                    {sub.subSubs.map((ss) => (
                                      <button
                                        key={ss.name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectSubCategoryAndNavigate(cat.id, ss.name);
                                        }}
                                        className="w-full text-left px-5 py-3.5 bg-white hover:bg-orange-50 rounded-2xl shadow-sm border border-[#EBE5DF] flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                                      >
                                        <span className="text-xs sm:text-sm font-bold text-[#121315] uppercase tracking-tight rtl:tracking-normal">
                                          {getCategoryTranslation(ss.name, t)}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-orange-500" />
                                      </button>
                                    ))}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectSubCategoryAndNavigate(cat.id, sub.name);
                                      }}
                                      className="w-full text-left px-5 py-3.5 bg-orange-100/60 hover:bg-orange-100 rounded-2xl text-orange-800 flex justify-between items-center mt-1 border border-orange-200/60 cursor-pointer active:scale-[0.98] transition-transform"
                                    >
                                      <span className="text-xs font-black uppercase tracking-widest rtl:tracking-normal">
                                        {t("see_all_in") || "Tout voir dans"} {getCategoryTranslation(sub.name, t)}
                                      </span>
                                      <ArrowRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}

                        {/* Explore All In This Category Tile */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: cat.subs.length * 0.03 + 0.1 }}
                          onClick={() => {
                            setActiveCategory(cat.id);
                            navigate("/shop");
                          }}
                          className="col-span-2 h-16 bg-[#121315] rounded-2xl flex items-center justify-between px-6 group cursor-pointer border-none active:scale-[0.98] transition-all"
                        >
                          <span className="text-xs font-black text-white uppercase tracking-widest rtl:tracking-normal">
                            {t("explore_all_in") || "Tout Explorer:"} {getCategoryTranslation(cat.name, t)}
                          </span>
                          <Zap className="w-4 h-4 text-orange-400 group-hover:rotate-12 transition-transform" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Viral Trends / Suggestion Section */}
        <section className="mt-20">
          <div className="flex flex-col items-start gap-1 mb-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                {t("at_the_moment") || "En ce moment"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#121315] tracking-tighter rtl:tracking-normal uppercase leading-none">
              {t("popular_styles") || "Styles Populaires"}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                title: t("look_kabyle") || "Look Kabyle",
                img: "https://images.unsplash.com/photo-1574169208507-84375144848b?auto=format&fit=crop&q=80&w=400",
              },
              {
                title: t("tech_minimal") || "Tech Minimal",
                img: "https://images.unsplash.com/photo-1550850839925-58f5bc68f006?auto=format&fit=crop&q=80&w=400",
              },
            ].map((style, i) => (
              <div key={i} className="relative h-44 rounded-[28px] overflow-hidden group cursor-pointer shadow-sm">
                <img
                  loading="lazy"
                  src={style.img}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-4 inset-x-4">
                  <span className="text-white font-bold text-xs uppercase tracking-wide block text-center bg-black/45 py-2.5 rounded-xl border border-white/10">
                    {style.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Decorative footer element for Olma */}
      <div className="mt-24 px-10 text-center opacity-10 select-none">
        <span className="text-[12vw] font-black tracking-tighter rtl:tracking-normal text-[#121315] uppercase">
          {t("OLMART")}
        </span>
      </div>
    </div>
  );
}
