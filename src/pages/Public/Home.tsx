import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Eye,
  ShoppingBag,
  ArrowRight,
  Zap,
  Star,
  ShieldCheck,
  Wallet,
  Heart,
  Store,
  Shirt,
  Monitor,
  Sparkle,
  Truck,
  MessageSquare,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShop } from "../../context/ShopContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { BentoHero } from "../../components/Home/BentoHero";
import { TechTrustBanner } from "../../components/Home/TechTrustBanner";
import { NeoCategoryGrid } from "../../components/Home/NeoCategoryGrid";
import { DynamicSection } from "../../components/Home/DynamicSection";
import { HomepageSection, Banner } from "../../types";
import { BannerCarousel } from "../../components/ui/BannerCarousel";
import { ProductCard } from "../../components/Product/ProductCard";
import { formatPrice } from "../../utils/format";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { Product } from "../../types";
import { Helmet } from "react-helmet-async";
import { getTranslatedField } from "../../utils/translations";
import { MobileSwipeIndicator } from "../../components/ui/MobileSwipeIndicator";
import {
  cacheEngine,
  handleDevQuotaLogger,
} from "../../utils/mockProducts";
import { useUserHabits } from "../../hooks/useUserHabits";
import { useHomeData } from "../../hooks/useHomeData";
import { FlashSales } from "../../components/Home/FlashSales";
import { FeaturedProductsCarousel } from "../../components/Home/FeaturedProductsCarousel";
import { BoutiquesMarques } from "../../components/Home/BoutiquesMarques";
import { MonthlyUpdateBanner } from "../../components/Layout/MonthlyUpdateBanner";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as any;
  const rcmdScrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollRcmd = (direction: "left" | "right") => {
    if (rcmdScrollContainerRef.current) {
      const container = rcmdScrollContainerRef.current;
      const isRtl = document.documentElement.dir === "rtl" || i18n.language === 'ar';
      
      const scrollAmount = container.clientWidth * 0.7; // scroll by 70% of container width
      
      // In RTL mode, depending on the browser, scrolling left physically means negative pixels.
      // But conceptually, the "next" button in RTL layout is on the left.
      // We will simply let "left" be negative scroll and "right" be positive scroll.
      // Wait, in RTL, standard container scroll starts at 0 (max right) and max left is negative.
      // So if direction is "right", trying to scroll right from 0 will do nothing.
      // Let's just make sure it does what the physical arrow intends.
      let leftScroll = direction === "right" ? scrollAmount : -scrollAmount;
      if (document.documentElement.dir === "rtl" || i18n.language === 'ar') {
        // Many browsers implement RTL scroll. 
        // If they click left arrow (ChevronLeft), they want to go physically left, so negative scroll is still correct.
        // If they click right arrow, they want to go right.
        // It's just physical representation.
      }
      
      container.scrollBy({
        left: leftScroll,
        behavior: "smooth"
      });
    }
  };
  const { setActiveCategory, activeWilaya } = useShop();
  const { toggleWishlist, wishlist, addToCart } = useCart();
  const { currentUser, userProfile } = useAuth();

  const {
    getCategorieFavorite,
    trackCategorie,
    forceCategorieFavorite,
    clearHabits,
    categoriesVisiteesCount,
  } = useUserHabits();

  const {
    dbBanners,
    dbTags,
    isBannersLoading,
    homepageSections,
    featuredProducts,
    isLoadingProducts,
    customCategories,
    dbSellers,
    isSellersLoading
  } = useHomeData();

  // Dynamic Personalized Category Cards computed sequence
  const defaultCategoryMapping = useMemo(
    () => [
      {
        key: "Supermarché",
        title: t("cat_supermarche"),
        subtitle: t("cat_supermarche_desc"),
        image:
          "https://images.unsplash.com/photo-1590736704728-f4730bb30770?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-[#121315]/80 via-[#121315]/20 to-transparent",
        withExploreButton: true,
      },
      {
        key: "Maison & Déco",
        title: t("cat_maison_deco"),
        subtitle: t("cat_home_desc"),
        image:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
      {
        key: "Mode",
        title: t("cat_fashion_title"),
        subtitle: t("cat_fashion_desc"),
        image:
          "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
    ],
    [t],
  );

  // Merge default categories with custom database configurations
  const activeCategoriesConfig = useMemo(() => {
    const baseMap = [
      { key: "Supermarché", ...defaultCategoryMapping[0] },
      { key: "Maison & Déco", ...defaultCategoryMapping[1] },
      { key: "Mode", ...defaultCategoryMapping[2] },
      {
        key: "Beauté & Santé",
        title: t("cat_beauty_title") || "Beauté & Pureté",
        subtitle: t("cat_beauty_desc") || "Soins naturels et bio d'Algérie",
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-[#121315]/80 via-[#121315]/20 to-transparent",
      },
      {
        key: "Électronique",
        title: t("cat_electronic_title") || "Électronique",
        subtitle: t("cat_electronic_desc") || "Gadgets connectés",
        image:
          "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
      {
        key: "Électroménager",
        title: t("cat_appliance_title") || "Électroménager",
        subtitle: t("cat_appliance_desc") || "Pour la maison",
        image:
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
      {
        key: "Scolaire & Bureau",
        title: t("cat_scolaire_title") || "Scolaire & Bureau",
        subtitle: t("cat_scolaire_desc") || "Livres, fournitures & rentrée",
        image:
          "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
    ];

    return baseMap.map((categoryItem) => {
      const custom = customCategories.find((cc) => cc.id === categoryItem.key);
      if (custom) {
        return {
          ...categoryItem,
          title: custom.title || categoryItem.title,
          subtitle: custom.subtitle || categoryItem.subtitle,
          image: custom.image || categoryItem.image,
          gradient: custom.gradient || categoryItem.gradient,
          featuredProductIds: custom.featuredProductIds || [],
        };
      }
      return {
        ...categoryItem,
        featuredProductIds: [],
      };
    });
  }, [customCategories, defaultCategoryMapping, t]);

  // Sort and display strictly only 3 category cards according to user's navigation count!
  const sortedCategoryCards = useMemo(() => {
    const sorted = [...activeCategoriesConfig].sort((a, b) => {
      const aCount = categoriesVisiteesCount?.[a.key] || 0;
      const bCount = categoriesVisiteesCount?.[b.key] || 0;

      if (bCount !== aCount) {
        return bCount - aCount;
      }

      // Fallback: favorite category computed by getCategorieFavorite
      const favorite = getCategorieFavorite();
      if (favorite === a.key) return -1;
      if (favorite === b.key) return 1;

      // Default order mapping fallback matching default 3
      const defaultOrder = [
        "Supermarché",
        "Maison & Déco",
        "Mode",
        "Scolaire & Bureau",
        "Beauté & Santé",
        "Électronique",
        "Électroménager",
      ];
      const defaultOrderArray = Array.isArray(defaultOrder) ? defaultOrder : [];
      return defaultOrderArray.indexOf(a.key) - defaultOrderArray.indexOf(b.key);
    });

    // Take exactly 3 categories to maintain the pristine aesthetic of 3 layout blocks
    return sorted.slice(0, 3);
  }, [activeCategoriesConfig, categoriesVisiteesCount, getCategorieFavorite]);

  // Dynamically prioritize products that match user's custom favorite category's featured list defined by admin
  const sortedFeaturedProducts = useMemo(() => {
    const favorite = getCategorieFavorite() || "Supermarché";

    // Retrieve custom configuration for that category
    const categoryConfig = activeCategoriesConfig.find(
      (c) => c.key === favorite,
    );
    const adminFeaturedIds = categoryConfig?.featuredProductIds || [];

    return [...featuredProducts].sort((a, b) => {
      // 1. Is it explicitly marked as featured by admin (adminFeaturedIds) for the current favorite category? (Score 2)
      const aIsAdminFeatured =
        a.category === favorite && adminFeaturedIds.includes(a.id) ? 2 : 0;
      const bIsAdminFeatured =
        b.category === favorite && adminFeaturedIds.includes(b.id) ? 2 : 0;

      // 2. Is it in the customer's favorite category? (Score 1)
      const aIsFavoriteCat = a.category === favorite ? 1 : 0;
      const bIsFavoriteCat = b.category === favorite ? 1 : 0;

      return (
        bIsAdminFeatured + bIsFavoriteCat - (aIsAdminFeatured + aIsFavoriteCat)
      );
    });
  }, [featuredProducts, getCategorieFavorite, activeCategoriesConfig]);

  // Premium High-Value Selection: Sorted by sales count, devalued proportionally if seller trust drops
  const premiumProducts = useMemo(() => {
    if (!featuredProducts || featuredProducts.length === 0) return [];
    
    return [...featuredProducts]
      .map((product) => {
        // Look up seller profile in dbSellers to verify up-to-date trustScore
        const sellerProfile = dbSellers?.find((s) => s.id === product.sellerId);
        
        let sellerTrust = 100;
        if (sellerProfile && typeof sellerProfile.trustScore === "number") {
          sellerTrust = sellerProfile.trustScore;
        } else if (typeof (product as any).sellerTrustScore === "number") {
          sellerTrust = (product as any).sellerTrustScore;
        } else if (typeof (product as any).trustScore === "number") {
          sellerTrust = (product as any).trustScore;
        }

        const sales = product.salesCount || 0;
        const discountPenalty = product.promoPrice && product.promoPrice < product.price ? 1.1 : 1.0;
        
        // Value Score Formulation:
        // Reflects real customer sales, but drops value exponentially/linearly if seller has lost/compromised points in the trust Score system.
        const trustMultiplier = sellerTrust / 100;
        const valueScore = (sales * trustMultiplier * discountPenalty) + (product.rating || 0) * 2;

        return {
          ...product,
          sellerTrust,
          valueScore,
        };
      })
      .sort((a, b) => b.valueScore - a.valueScore);
  }, [featuredProducts, dbSellers]);

  const getPrecedingSectionBgColor = () => {
    const activeSections = homepageSections.filter((s) => s.isActive);
    if (activeSections.length > 0) {
      const lastSection = activeSections[activeSections.length - 1];
      if (lastSection.type === "flash_sale") {
        return "#51AEC6";
      }
      switch (lastSection.theme) {
        case "ramadan":
          return "#FEFAEF";
        case "summer":
          return "#FDF9F1";
        case "winter":
          return "#F4F7FC";
        case "back_to_school":
          return "#FCFBF8";
        default:
          return lastSection.backgroundColor || "#FAF8F5";
      }
    }
    return "#FAF8F5";
  };

  const banners = [
    {
      id: "1",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop",
      title: t("hero_title_1") || "Olma Marketplace",
      subtitle:
        t("hero_sub_1") ||
        "Vos achats du quotidien livrés chez vous à travers les 58 Wilayas.",
      buttonText: t("hero_btn_1") || "Découvrir la Collection",
    },
    {
      id: "2",
      image:
        "https://images.unsplash.com/photo-1616489953149-8f6bca6b6531?q=80&w=2000&auto=format&fit=crop",
      title: t("hero_title_2") || "Design & Tradition",
      subtitle:
        t("hero_sub_2") ||
        "Une fusion parfaite entre modernité et héritage culturel.",
      buttonText: t("hero_btn_2") || "Explorer",
    },
  ];

  // Dynamic Target Filtering for Banners and Sections (Audience & wilayas targeting + Dates)
  const filterByTargeting = useCallback((item: any, isBanner: boolean) => {
    if (isBanner && item.isActive === false) return false;

    // Date Schedule Checking
    if (item.startDate) {
      if (new Date() < new Date(item.startDate)) return false;
    }
    if (item.endDate) {
      if (new Date() > new Date(item.endDate)) return false;
    }

    // 1. Audience / User type filter
    const audienceValue = isBanner ? item.targetUserType : item.targetAudience;
    if (audienceValue && audienceValue !== "all") {
      if (audienceValue === "logged_in") {
        if (!currentUser) return false;
      } else if (audienceValue === "new") {
        if (currentUser) return false;
      } else if (audienceValue === "vip") {
        const isVip = userProfile?.isVip === true || userProfile?.vip === true || userProfile?.role === "admin";
        if (!isVip) return false;
      }
    }

    // 2. Region / Wilaya filter
    const regions = item.targetRegions;
    if (regions && regions.length > 0) {
      if (activeWilaya && activeWilaya !== "Tous") {
        const cleanActive = activeWilaya.toLowerCase().trim();
        const matches = regions.some((reg: string) => {
          const cleanReg = reg.toLowerCase().trim();
          return cleanReg === cleanActive || cleanActive.includes(cleanReg) || cleanReg.includes(cleanActive);
        });
        if (!matches) return false;
      }
    }

    return true;
  }, [currentUser, userProfile, activeWilaya]);

  const targetedHeroBanners = useMemo(() => {
    return dbBanners
      .filter((b) => !b.position || b.position === "hero")
      .filter((b) => filterByTargeting(b, true));
  }, [dbBanners, filterByTargeting]);

  const targetedIntermediateBanners = useMemo(() => {
    return dbBanners
      .filter((b) => b.position === "intermediate")
      .filter((b) => filterByTargeting(b, true));
  }, [dbBanners, filterByTargeting]);

  const targetedHomepageSections = useMemo(() => {
    return homepageSections
      .filter((s) => s.isActive)
      .filter((s) => filterByTargeting(s, false));
  }, [homepageSections, filterByTargeting]);

  const targetedPopupBanner = useMemo(() => {
    return dbBanners
      .filter((b) => b.position === "popup")
      .filter((b) => filterByTargeting(b, true))[0];
  }, [dbBanners, filterByTargeting]);

  const [showPopupBanner, setShowPopupBanner] = useState(false);

  useEffect(() => {
    if (targetedPopupBanner) {
      const hasSeenPopup = sessionStorage.getItem(`popup_seen_${targetedPopupBanner.id}`);
      if (!hasSeenPopup) {
        setShowPopupBanner(true);
        sessionStorage.setItem(`popup_seen_${targetedPopupBanner.id}`, "true");
      }
    }
  }, [targetedPopupBanner]);

  return (
    <div className="bg-[#FAF8F5]">
      <MonthlyUpdateBanner />
      {/* 💥 Dynamic Promotion Popup Banner (Loaded once per session per ID) */}
      {showPopupBanner && targetedPopupBanner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="relative max-w-sm sm:max-w-md w-full rounded-[2rem] overflow-hidden shadow-2xl bg-[#FCFAF6] border border-[#EBE5DF]/20 animate-in zoom-in-95 duration-500 group">
            <button 
              onClick={() => setShowPopupBanner(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white hover:bg-stone-50 backdrop-blur-md rounded-full text-[#121315] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div 
              className="relative cursor-pointer"
              onClick={() => {
                setShowPopupBanner(false);
                const hasLinkedProducts = targetedPopupBanner.linkedProductIds && targetedPopupBanner.linkedProductIds.length > 0;
                const linkDestination = hasLinkedProducts ? `/campaign/${targetedPopupBanner.id}` : (targetedPopupBanner.ctaLink || "#");
                navigate(linkDestination);
              }}
            >
              <img loading="lazy" 
                src={targetedPopupBanner.imageUrl || targetedPopupBanner.desktopImage} 
                alt={targetedPopupBanner.title} 
                className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              />
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-[#F37021] mb-1 block">{t("home.popup.exclusive_offer") || "Offre Exclusif"}</span>
                <h3 className="text-white font-extrabold text-xl font-serif drop-shadow-md">{targetedPopupBanner.title}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <Helmet>
        <title>{t("seo_home_title") !== "seo_home_title" ? t("seo_home_title") : "OLMART | Marketplace N°1 en Algérie"}</title>
        <meta name="description" content={t("seo_home_description") !== "seo_home_description" ? t("seo_home_description") : "La première marketplace en Algérie. Retrouvez des millions de produits dans la mode, décoration, électronique, supermarché avec livraison dans les 58 wilayas"} />
        <meta name="keywords" content={t("seo_home_keywords") !== "seo_home_keywords" ? t("seo_home_keywords") : "olmart, marketplace algérie, achat en ligne, e-commerce, shopping algérie, livraison 58 wilayas"} />
        <meta property="og:image" content={targetedHeroBanners[0]?.desktop_image || targetedHeroBanners[0]?.imageUrl || "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800"} />
        <meta property="og:url" content={window.location.href} />
      </Helmet>
      <h1 className="sr-only">{t("home.sr_title") || "Olma Marketplace - La plus grande plateforme E-commerce en Algérie"}</h1>
      
      {/* Neo-Heritage Bento Hero */}
      <section className="w-full bg-[#FAF8F5] py-4 sm:py-6 lg:py-8">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
          <BentoHero banners={targetedHeroBanners} />
        </div>
      </section>

      {/* Tech Trust Banner */}
      <TechTrustBanner />

      {activeWilaya && activeWilaya !== "Tous" && (
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mb-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-3 px-4 bg-white border border-[#EBE5DF]/60 rounded-xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#121315] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#121315]"></span>
              </span>
              <span className="font-mono text-[10px] sm:text-xs text-stone-900 uppercase tracking-widest rtl:tracking-normal">
                [ {activeWilaya} ] {t("home.regional_filter_active") || "FILTER ACTIVE"}
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* category Grid */}
      <NeoCategoryGrid categories={sortedCategoryCards} favoriteCategory={getCategorieFavorite()} />

      {/* Ventes Flash */}
      <FlashSales />

      {/* Optimized Featured Products Section (Nos Incontournables) */}
      <FeaturedProductsCarousel />

      {/* Intermediate Banners */}
      {targetedIntermediateBanners.length > 0 && (
        <section className="pb-16 sm:pb-24 w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-wrap gap-6">
            {targetedIntermediateBanners.map((banner) => {
              const hasLinkedProducts = banner.linkedProductIds && banner.linkedProductIds.length > 0;
              const linkDestination = hasLinkedProducts ? `/campaign/${banner.id}` : (banner.ctaLink || "#");
              return (
                <div
                  key={banner.id}
                  onClick={() => navigate(linkDestination)}
                  className={`relative block rounded-3xl overflow-hidden group shadow-xl hover:shadow-2xl transition-all duration-500 border border-zinc-200/50 cursor-pointer ${banner.layout === "half" ? "w-full md:w-[calc(50%-12px)] aspect-[2/1] sm:aspect-[2.5/1]" : "w-full aspect-[2.5/1] sm:aspect-[4/1] md:aspect-[5/1]"}`}
                >
                  {/* PC Image */}
                  <img loading="lazy"
                    src={banner.imageUrl || banner.desktop_image}
                    alt={banner.title || banner.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out ${banner.mobileImageUrl ? "hidden sm:block" : ""}`}
                  />
                  {/* Mobile Image */}
                  {banner.mobileImageUrl && (
                    <img loading="lazy"
                      src={banner.mobileImageUrl}
                      alt={banner.title || banner.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out sm:hidden block"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-[#121315]/5 transition-colors duration-500" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {targetedHomepageSections.map((section) => (
        <DynamicSection key={section.id} section={section} />
      ))}

      {/* Recommended Section (Point 4) - Framed Beautifully */}
      <section className="py-8 bg-[#FAF8F5] relative z-20 overflow-hidden border-t border-[#EBE5DF]/60">
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="bg-white backdrop-blur-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(44,30,22,0.05)] border border-[#EBE5DF]/60 p-6 sm:p-8">
          
          {/* Editorial Header Section (Compact) */}
          <div className="flex items-center justify-between mb-6 border-b border-[#EBE5DF]/60 pb-4">
            <h3 className="text-xl md:text-3xl font-bold text-[#121315] tracking-tighter rtl:tracking-normal uppercase font-sans flex items-center gap-2">
              <span className="text-[10px] font-mono font-black tracking-widest rtl:tracking-normal text-[#F37021] animate-pulse hidden sm:inline">
                [ {t("home.pour_vous.badge") || "PORTÉES"} ]
              </span>
              {lang === "ar" ? "خصيصاً لك" : <>{t("home.pour_vous.prefix") || "POUR"} <span className="text-[#121315]">{t("home.pour_vous.suffix") || "VOUS"}</span></>}
            </h3>

            {/* Elegant Compact Button */}
            <button 
              onClick={() => navigate('/shop')}
              className="group relative flex items-center gap-2 px-4 py-2 rounded-full border border-[#EBE5DF]/80 bg-white hover:border-[#121315]/40 hover:bg-stone-50 text-[9px] font-mono font-black text-stone-900 hover:text-[#121315] uppercase tracking-widest rtl:tracking-normal transition-all shadow-[0_2px_8px_rgba(44,30,22,0.05)] cursor-pointer"
            >
              <span>{t("home.pour_vous.explore_all") || "TOUT EXPLORER"}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
          
          <div className="relative group/rcmd px-4 sm:px-0">
            {/* Left Desktop Nav */}
            <button
              onClick={() => scrollRcmd("left")}
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
              aria-label={t("Voir les produits précédents") || "Voir les produits précédents"}
            >
              <ChevronLeft className="w-5 h-5 text-orange-650 stroke-[2.5]" />
            </button>

            <div 
              ref={rcmdScrollContainerRef} 
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 desktop-scrollbar snap-x snap-mandatory flex-nowrap select-none"
              style={{ scrollBehavior: 'smooth' }}
            >
              {featuredProducts.slice(0, 12).map((product, idx) => {
                return (
                  <div
                    key={product.id}
                    className="snap-start snap-always shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
                  >
                    <ProductCard
                      product={product}
                      index={idx}
                      sectionStyle="bg-white rounded-[1.5rem] shadow-[0_12px_25px_rgba(44,30,22,0.04)] border border-[#EBE5DF]/60 hover:border-[#F37021]/60"
                      onClick={(p) => navigate(`/product/${p.id}`)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right Desktop Nav */}
            <button
              onClick={() => scrollRcmd("right")}
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
              aria-label={t("Voir plus de produits") || "Voir plus de produits"}
            >
              <ChevronRight className="w-5 h-5 text-orange-650 stroke-[2.5]" />
            </button>
            
            <MobileSwipeIndicator className="-mt-3 md:hidden block" />
          </div>
        </div>
      </div>
    </section>


      {/* Brand Carousel: Redesigned Dynamic Boutiques & Marques Section */}
      <BoutiquesMarques sellers={dbSellers} isLoading={isSellersLoading} />

      {/* Main Product Grid Section: Shrink Banners and increase density - REMOVED DUPLICATE */}

      {/* Social Proof: Ultra-Compact Minimalist Banner */}
      <section className="py-6 sm:py-8 bg-zinc-50 border-y border-zinc-100">
         <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col items-center text-center space-y-3">
               <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 fill-orange-500" />
                  ))}
               </div>
               <p className="text-sm sm:text-base font-bold text-[#121315] leading-relaxed px-4 max-w-lg">
                 {t("home.social_proof.quote") || "\"Service au top, emballage parfait et livraison rapide vers Oran en 48h !\""}
               </p>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#121315] flex items-center justify-center text-[#121315] font-black text-xs sm:text-sm">{t("SA")}</div>
                  <span className="text-sm sm:text-base font-black text-[#121315]">{t("Sonia A. •")}<span className="text-emerald-600">{t("home.social_proof.verified") || "Vérifié"}</span></span>
               </div>
            </div>
         </div>
      </section>

      {/* Admin Selection / Featured - RE-BRANDED INSPIRED BY HIGH-JEWELRY & FINE COUTURING SITES */}
      <section className="pt-24 pb-28 bg-[#FAF7F2] relative overflow-hidden border-t-2 border-b-2 border-[#EBE5DF]/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,141,111,0.04),transparent_60%)] pointer-events-none" />
        {/* Fine gold border highlight embellishment */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A26A]/30 to-transparent" />
        
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 px-4 sm:px-0">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCFAF5] border border-[#E1D8C5] text-[#9E8155] font-mono text-[10px] uppercase font-bold tracking-[0.2em] mb-4">
                <Sparkles className="w-3 h-3 text-[#A88C5C] animate-pulse" />
                {t("exploration_premium") || "Exploration Premium"}
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1F1D19] tracking-tight mb-2">
                {t("product.premium_selection") || "Sélection Premium"}
              </h2>
              <div className="w-16 h-[1.5px] bg-[#9E8155] mb-4" />
              <p className="text-[#645F56] font-serif text-base md:text-lg italic max-w-xl leading-relaxed">
                {t("home.featured.subtitle") ||
                  "Le luxe n'est pas un surplus, c'est une exigence de chaque instant."}
              </p>
            </div>
            
            {/* CTA Option inspired by high-end boutiques - Underlined, light serif or sans, wide-tracking */}
            <div className="flex shrink-0">
              <button
                onClick={() => navigate("/premium-collection")}
                className="group flex items-center gap-3 border-b border-[#1F1D19] hover:border-[#9E8155] text-[#1F1D19] hover:text-[#9E8155] font-sans font-black text-xs uppercase tracking-[0.2em] pb-1.5 transition-all duration-300 cursor-pointer"
              >
                <span>{t("Voir la Collection") || "Découvrir la Sélection"}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-10 desktop-scrollbar snap-x snap-mandatory px-4 sm:px-0 select-none scroll-smooth">
            {isLoadingProducts ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="w-[280px] sm:w-[325px] shrink-0 snap-start snap-always h-[450px] rounded-2xl bg-white/60 border border-[#E9E1CE]/50 animate-pulse" />
              ))
            ) : premiumProducts.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-[#E9E1CE]/60">
                <Sparkles className="w-8 h-8 text-[#9E8155] mb-2 opacity-60" />
                <p className="font-serif text-stone-600 italic">{t("Prochain arrivage de prestige imminent") || "Aucune pièce premium actuellement disponible."}</p>
              </div>
            ) : (
              premiumProducts.slice(0, 8).map((product, i) => {
                const isPromo = product.promoPrice && product.promoPrice < product.price;
                const isItemWishlisted = wishlist.includes(product.id);
                return (
                  <div 
                    key={`${product.id}-${i}`} 
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="w-[280px] sm:w-[325px] shrink-0 snap-start snap-always h-[440px] rounded-2xl border border-[#E9E1CE]/80 bg-white overflow-hidden shadow-[0_12px_28px_rgba(44,30,22,0.03)] hover:shadow-[0_22px_45px_rgba(44,30,22,0.07)] group transition-all duration-500 relative flex flex-col cursor-pointer"
                  >
                    {/* Upper: High-Density Image Frame */}
                    <div className="relative h-[250px] bg-stone-100 overflow-hidden shrink-0">
                      <img
                        loading="lazy"
                        src={product.image || "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800"}
                        alt={getTranslatedField(product, "name", lang)}
                        className="w-full h-full object-cover transition-transform duration-750 ease-out group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";
                        }}
                      />
                      
                      {/* Premium Subtle White-Lit vignette */}
                      <div className="absolute inset-0 bg-stone-900/[0.01] pointer-events-none" />

                      {/* Overlap Badges: 100% Client trust validated system */}
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
                        <div className="px-2.5 py-1.5 rounded-lg bg-white/95 border border-[#EAE3D2] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            (product as any).sellerTrust >= 90 
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                              : (product as any).sellerTrust >= 75 
                              ? "bg-amber-400" 
                              : "bg-rose-500"
                          }`} />
                          <span className="font-mono text-[10px] uppercase font-extrabold text-[#1F1D19] tracking-wider">
                            {t("Fiabilité Vendeur") || "TRUST"} : {(product as any).sellerTrust}%
                          </span>
                        </div>
                      </div>

                      {/* Item Wishlist Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                          toast.success(
                            isItemWishlisted
                              ? t("Retiré des favoris")
                              : t("Ajouté aux favoris"),
                            {
                              icon: "✨",
                              style: {
                                borderRadius: "12px",
                                background: "#2C2A25",
                                color: "#FAF7F2",
                                fontSize: "12px",
                              }
                            }
                          );
                        }}
                        className="absolute top-4 right-4 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 border border-[#E9E1CE]/80 hover:border-orange-500/30 text-stone-900 transition-all shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
                        aria-label="Wishlist"
                      >
                        <Heart
                          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isItemWishlisted ? "fill-orange-500 text-orange-500 stroke-orange-500" : "text-[#4A443A] stroke-[2]"}`}
                        />
                      </button>

                      {/* Luxury Elite Label overlay when trust is pristine */}
                      {(product as any).sellerTrust >= 90 && (
                        <div className="absolute bottom-3 left-4 px-2 py-0.5 rounded-md bg-[#FAF7F2]/90 border border-[#C9A26A]/30 text-[#8E7755] font-sans text-[9px] font-black uppercase tracking-widest pointer-events-none">
                          🏆 {t("COMMERÇANT ÉLITE") || "Élite"}
                        </div>
                      )}
                    </div>

                    {/* Bottom Data Section - Absolute Elegance Card Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between bg-stone-50/20">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#9C8B76] truncate max-w-[130px]">
                            {product.sellerName || "Olma Boutique"}
                          </p>
                          <span className="w-1 h-1 rounded-full bg-[#C9A26A]/40" />
                          <p className="font-mono text-[9px] uppercase tracking-widest text-[#9C8B76] truncate">
                            {product.category || "Mode"}
                          </p>
                        </div>
                        
                        <h3 className="font-serif font-bold text-[#1F1D19] text-base group-hover:text-[#9E8155] transition-colors duration-300 line-clamp-1">
                          {getTranslatedField(product, "name", lang)}
                        </h3>
                        <div className="w-6 h-[1px] bg-[#E1D8C5] my-2" />
                      </div>

                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#F1ECE2]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] uppercase text-[#9C8B76] tracking-wider text-[9px]">
                            {t("Tarif Prestige") || "PRESTIGE"}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-black text-[#1F1D19] text-base">
                              {formatPrice(product.promoPrice || product.price)}
                            </span>
                            {isPromo && (
                              <span className="font-mono text-xs text-stone-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Top Selling Indicator (Product Value Score Metric) */}
                        <div className="flex flex-col items-end gap-1 font-mono text-right">
                          <div className="flex items-center gap-1 text-xs font-bold text-[#1F1D19]">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#9E8155]" />
                            <span>{product.salesCount || 0} {t("ventes")}</span>
                          </div>
                          <span className="text-[8px] text-[#A89884] uppercase tracking-wider">
                            {t("Performances réelles") || "VALEUR CERTIFIÉE"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <MobileSwipeIndicator className="-mt-4 mb-2 md:hidden block opacity-80 text-[#8C7A63]" />
        </div>
      </section>
    </div>
  );
};

