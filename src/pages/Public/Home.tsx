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
import { HomeEndlessGrid } from "../../components/Home/HomeEndlessGrid";

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
        gradient: "from-[#2B1D15]/80 via-[#2B1D15]/20 to-transparent",
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
        title: t("cat_beauty_title"),
        subtitle: t("cat_beauty_desc"),
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-[#2B1D15]/80 via-[#2B1D15]/20 to-transparent",
      },
      {
        key: "Électronique",
        title: t("cat_electronic_title"),
        subtitle: t("cat_electronic_desc"),
        image:
          "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
      {
        key: "Électroménager",
        title: t("cat_appliance_title"),
        subtitle: t("cat_appliance_desc"),
        image:
          "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      },
      {
        key: "Scolaire & Bureau",
        title: t("cat_scolaire_title"),
        subtitle: t("cat_scolaire_desc"),
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
      title: t("hero_title_1"),
      subtitle:
        t("hero_sub_1"),
      buttonText: t("hero_btn_1"),
    },
    {
      id: "2",
      image:
        "https://images.unsplash.com/photo-1616489953149-8f6bca6b6531?q=80&w=2000&auto=format&fit=crop",
      title: t("hero_title_2"),
      subtitle:
        t("hero_sub_2"),
      buttonText: t("hero_btn_2"),
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
    const filtered = dbBanners
      .filter((b) => !b.position || b.position === "hero")
      .filter((b) => filterByTargeting(b, true));
    
    if (filtered.length > 0) return filtered;

    return [
      {
        id: "default-1",
        desktop_image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop",
        title: t("hero_title_1"),
        subtitle: t("hero_sub_1"),
        button_text: t("hero_btn_1"),
      },
      {
        id: "default-2",
        desktop_image: "https://images.unsplash.com/photo-1616489953149-8f6bca6b6531?q=80&w=2000&auto=format&fit=crop",
        title: t("hero_title_2"),
        subtitle: t("hero_sub_2"),
        button_text: t("hero_btn_2"),
      }
    ];
  }, [dbBanners, filterByTargeting, t]);

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
    <div className="bg-[#F5F0E8] font-sans">
      <MonthlyUpdateBanner />
      {/* 💥 Dynamic Promotion Popup Banner (Loaded once per session per ID) */}
      {showPopupBanner && targetedPopupBanner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="relative max-w-sm sm:max-w-md w-full rounded-[2rem] overflow-hidden shadow-2xl bg-[#FCFAF6] border border-[#C75C1A]/20 animate-in zoom-in-95 duration-500 group">
            <button 
              onClick={() => setShowPopupBanner(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white hover:bg-stone-50 backdrop-blur-md rounded-full text-[#2C2118] transition-colors cursor-pointer"
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
                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] rtl:tracking-normal text-[#C75C1A] mb-1 block">{t("home.popup.exclusive_offer")}</span>
                <h3 className="text-white font-extrabold text-xl font-serif drop-shadow-md">{targetedPopupBanner.title}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <Helmet>
        <title>{t("seo_home_title")}</title>
        <meta name="description" content={t("seo_home_description")} />
        <meta name="keywords" content={t("seo_home_keywords")} />
        <meta property="og:image" content={targetedHeroBanners[0]?.desktop_image || targetedHeroBanners[0]?.imageUrl || "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800"} />
        <meta property="og:url" content={window.location.href} />
      </Helmet>
      <h1 className="sr-only">{t("home.sr_title")}</h1>
      
      {/* Neo-Heritage Bento Hero - Kinder Style */}
      <section className="w-full bg-[#F5F0E8] py-4 sm:py-6 lg:py-8 relative overflow-hidden">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
          {isBannersLoading ? (
            <div className="w-full min-h-[400px] sm:min-h-[500px] bg-[#E5DED4]/30 animate-pulse rounded-[2rem] border border-[#E5DED4]/50 mt-0" />
          ) : (
            <BentoHero banners={targetedHeroBanners} />
          )}
        </div>
      </section>

      {/* Tech Trust Banner */}
      <TechTrustBanner />

      {activeWilaya && activeWilaya !== "Tous" && (
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mb-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between py-4 px-6 bg-[#2C2118] text-white rounded-full shadow-[0_10px_20px_rgba(44,33,24,0.15)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="font-sans font-sans font-bold text-[12px] sm:text-sm uppercase tracking-widest rtl:tracking-normal drop-shadow-sm">
                [ {activeWilaya} ] {t("home.regional_filter_active")}
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
                  className={`relative block rounded-2xl overflow-hidden group shadow-[0_16px_48px_rgba(26,20,16,0.10)] hover:shadow-[0_24px_64px_rgba(26,20,16,0.14)] hover:scale-[1.02] transition-all duration-500 cursor-pointer ${banner.layout === "half" ? "w-full md:w-[calc(50%-12px)] aspect-[2/1] sm:aspect-[2.5/1]" : "w-full aspect-[2.5/1] sm:aspect-[4/1] md:aspect-[5/1]"}`}
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
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-[#2C2118]/5 transition-colors duration-500" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {targetedHomepageSections.map((section) => (
        <DynamicSection key={section.id} section={section} />
      ))}

      {/* Selection Premium - Clean Immersive Premium */}
      <div className="max-w-[90rem] mx-auto px-2 sm:px-6 md:px-8 mb-16">
        <section className="pt-16 pb-16 bg-[#FFFBF5] rounded-[2.5rem] relative overflow-hidden shadow-[0_20px_60px_rgba(26,20,16,0.08)] border border-[#E5DED4]/40">
          {/* Splash Drops Decorations */}
          <div className="absolute top-0 right-10 w-32 h-32 bg-white rounded-full opacity-10 rotate-45 transform blur-[8px] hidden md:block"></div>
          <div className="absolute top-10 right-32 w-16 h-16 bg-white rounded-full opacity-10 rotate-12 transform blur-[4px] hidden md:block"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full opacity-5 transform blur-[12px]"></div>

          <div className="w-full px-4 sm:px-8 md:px-12 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4A574]/10 text-[#C75C1A] border border-[#D4A574]/20 font-mono text-[9px] uppercase tracking-[0.2em] font-black mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-[#C75C1A]" />
                  {t("exploration_premium")}
                </div>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#2C2118] mb-3">
                  {t("product.premium_selection")}
                </h2>
                <p className="font-sans text-sm md:text-base text-[#8B7355] uppercase tracking-[0.15em] max-w-xl leading-relaxed">
                  {t("home.featured.subtitle")}
                </p>
              </div>
              
              <button
                onClick={() => navigate("/premium-collection")}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-[#C75C1A] font-mono font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#FFFDF5] hover:scale-105 active:scale-95 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.15)] cursor-pointer"
              >
                <span>{t("Voir la Collection")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>

          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-4 desktop-scrollbar snap-x snap-mandatory px-4 sm:px-0 select-none scroll-smooth">
            {isLoadingProducts ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="w-[240px] shrink-0 snap-start snap-always h-[340px] rounded-[2rem] bg-white/20 animate-pulse" />
              ))
            ) : premiumProducts.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center py-12 text-center bg-[#F5F0E8] rounded-[2rem] border border-[#E5DED4]/50 shadow-inner">
                <Sparkles className="w-8 h-8 text-[#D4A574] mb-3" />
                <p className="font-mono font-black text-[#8B7355] text-xs uppercase tracking-[0.2em]">{t("Prochain arrivage imminent")}</p>
              </div>
            ) : (
              premiumProducts.slice(0, 8).map((product, i) => {
                const isPromo = product.promoPrice && product.promoPrice < product.price;
                const isItemWishlisted = wishlist.includes(product.id);
                return (
                  <div 
                    key={`${product.id}-${i}`} 
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="w-[240px] sm:w-[260px] shrink-0 snap-start snap-always h-[360px] rounded-[2rem] bg-[#FFFBF5] overflow-hidden shadow-[0_16px_48px_rgba(26,20,16,0.08)] border border-[#E5DED4]/50 group transition-all duration-300 relative flex flex-col cursor-pointer hover:-translate-y-2"
                  >
                    <div className="relative h-[180px] bg-[#F5F0E8] overflow-hidden shrink-0 rounded-t-[2rem]">
                      <img
                        loading="lazy"
                        src={product.image || "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=600"}
                        alt={getTranslatedField(product, "name", lang)}
                        className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=600";
                        }}
                      />
                      
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                        <div className="px-2.5 py-1 rounded-full bg-white/95 text-[#2C2118] shadow-sm flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            (product as any).sellerTrust >= 90 
                              ? "bg-[#10B981]" 
                              : (product as any).sellerTrust >= 75 
                              ? "bg-[#F59E0B]" 
                              : "bg-[#EF4444]"
                          }`} />
                          <span className="font-mono font-black text-[9px] uppercase tracking-[0.2em]">
                            {t("FIABILITÉ")} : {(product as any).sellerTrust}%
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(product.id);
                          toast.success(
                            isItemWishlisted
                              ? t("Retiré des favoris")
                              : t("Ajouté aux favoris"),
                            {
                              id: `wishlist-${product.id}`,
                              icon: "✨",
                              style: { borderRadius: "10px", background: "#1A1410", color: "#FFF", fontSize: "14px", fontWeight: "bold" }
                            }
                          );
                        }}
                        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white text-[#2C2118] shadow-md hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer transition-all border border-stone-100"
                        aria-label="Wishlist"
                      >
                        <Heart
                          className={`w-4 h-4 ${isItemWishlisted ? "fill-[#C75C1A] text-[#C75C1A] stroke-[#C75C1A]" : "text-[#2C2118] stroke-[2.5]"}`}
                        />
                      </button>
                    </div>

                    <div className="flex-1 p-5 flex flex-col justify-between bg-[#FFFBF5] rounded-b-[2rem]">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="px-3 py-1 rounded-full bg-[#FFF0E5] text-[#C75C1A] font-mono text-[9px] font-black uppercase tracking-[0.2em] truncate max-w-[100px]">
                            {product.sellerName || "Olma Boutique"}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-stone-300" />
                          <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-stone-400 truncate">
                            {product.category || "Mode"}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-[#2C2118] text-sm group-hover:text-[#C75C1A] transition-colors duration-300 line-clamp-2 leading-snug">
                          {getTranslatedField(product, "name", lang)}
                        </h3>
                      </div>

                      <div className="flex items-end justify-between mt-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono font-black text-[#C75C1A] text-[18px]">
                              {formatPrice(product.promoPrice || product.price)}
                            </span>
                            {isPromo && (
                              <span className="font-sans font-bold text-[11px] text-stone-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-[11px] font-sans font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded-md">
                            <ShoppingBag className="w-3 h-3" />
                            <span>{product.salesCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <MobileSwipeIndicator className="md:hidden block text-white/50" />
        </div>
      </section>
      </div>

      

      {/* Recommended Section (Point 4) - Framed Beautifully & Playfully */}
      <section className="py-12 sm:py-16 bg-[#F5F0E8] relative z-20 overflow-hidden">
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="bg-[#FFFBF5] rounded-3xl shadow-[0_20px_60px_rgba(26,20,16,0.08)] border border-[#E5DED4]/40 p-6 sm:p-10 relative">
          
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C75C1A]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* Playful Header Section */}
          <div className="flex items-center justify-between mb-8 pb-4 relative z-10">
            <h3 className="text-3xl md:text-5xl font-serif font-bold text-[#2C2118] tracking-tight uppercase flex items-center gap-3">
              <span className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-[#C75C1A] rounded-full text-white rotate-12 shadow-sm border-4 border-[#FDF9EC]">
                <Sparkle className="w-6 h-6 md:w-8 md:h-8" />
              </span>
              {lang === "ar" ? "خصيصاً لك" : <>
                <span className="text-[#C75C1A]">{t("home.pour_vous.prefix")}</span> 
                <span>{t("home.pour_vous.suffix")}</span>
              </>}
            </h3>

            {/* Fun Rounded Button */}
            <button 
              onClick={() => navigate('/shop')}
              className="group relative flex items-center gap-2 px-6 py-3 rounded-full bg-[#2C2118] text-white hover:bg-[#C75C1A] hover:scale-105 active:scale-95 text-[11px] font-mono font-black uppercase tracking-[0.2em] transition-all shadow-md border-2 border-[transparent] cursor-pointer"
            >
              <span>{t("home.pour_vous.explore_all")}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
          
          <div className="relative group/rcmd px-4 sm:px-0 z-10">
            {/* Left Desktop Nav */}
            <button
              onClick={() => scrollRcmd("left")}
              className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFFBF5] text-[#2C2118] border border-[#E5DED4] flex items-center justify-center hover:bg-[#C75C1A] hover:text-white hover:border-[#C75C1A] hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-[0_8px_20px_rgba(26,20,16,0.1)] cursor-pointer"
              aria-label={t("Voir les produits précédents")}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
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
                      sectionStyle="bg-[#FFFBF5] rounded-[2rem] shadow-[0_8px_30px_rgba(26,20,16,0.06)] border border-[#E5DED4]/40 hover:-translate-y-2 transition-all duration-300"
                      onClick={(p) => navigate(`/product/${p.id}`)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Right Desktop Nav */}
            <button
              onClick={() => scrollRcmd("right")}
              className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFFBF5] text-[#2C2118] border border-[#E5DED4] flex items-center justify-center hover:bg-[#C75C1A] hover:text-white hover:border-[#C75C1A] hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-[0_8px_20px_rgba(26,20,16,0.1)] cursor-pointer"
              aria-label={t("Voir plus de produits")}
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
            
            <MobileSwipeIndicator className="-mt-3 md:hidden block" />
          </div>
        </div>
      </div>
    </section>


      {/* Brand Carousel: Redesigned Dynamic Boutiques & Marques Section */}
      <BoutiquesMarques sellers={dbSellers} isLoading={isSellersLoading} />

      {/* Main Product Grid Section: Shrink Banners and increase density - REMOVED DUPLICATE */}

      {/* Social Proof: Bubbly & Fun */}
      <section className="py-12 sm:py-20 bg-[#FFFBF5] relative mt-16 rounded-[2.5rem] mx-4 sm:mx-8 shadow-[0_20px_60px_rgba(26,20,16,0.05)] border border-[#E5DED4]/60">
         <div className="max-w-4xl mx-auto px-4 relative z-10 pt-8">
            <div className="flex flex-col items-center text-center space-y-6">
               <div className="flex items-center gap-2 p-4 rounded-full bg-[#F5F0E8] border border-[#E5DED4] shadow-inner transform -rotate-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 sm:w-8 sm:h-8 text-[#C75C1A] fill-[#C75C1A]" />
                  ))}
               </div>
               <p className="text-2xl sm:text-4xl font-serif font-bold text-[#2C2118] leading-snug px-4 max-w-3xl text-center italic">
                 {t("home.social_proof.quote")}
               </p>
               <div className="flex items-center gap-4 bg-[#F5F0E8] px-6 py-3 rounded-full shadow-inner border border-[#E5DED4] mt-4">
                  <div className="w-10 h-10 rounded-full bg-[#C75C1A] flex items-center justify-center text-white font-sans font-bold text-sm sm:text-base shadow-md">SA</div>
                  <span className="text-sm sm:text-lg font-bold text-[#2C2118] uppercase tracking-wide">{t("Sonia A. •")}<span className="text-[#2EC4B6] ml-2">{t("home.social_proof.verified")}</span></span>
               </div>
            </div>
         </div>
      </section>

      {/* Endless Grid Section */}
      <HomeEndlessGrid />
    </div>
  );
};

