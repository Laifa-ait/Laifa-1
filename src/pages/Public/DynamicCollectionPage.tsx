import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ShoppingBag,
  ArrowLeft,
  Sofa,
  Shirt,
  Laptop,
  Sparkles,
  Truck,
  Flame,
  Tag,
  Diamond,
  BookOpen,
  Smartphone,
  Refrigerator,
  CarFront,
  Dumbbell,
  Baby,
  Hammer,
  Dices,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { db } from "../../lib/firebase";
import { Product } from "../../types";
import { ProductCard } from "../../components/Product/ProductCard";
import { VirtualizedProductGrid } from "../../components/Shop/VirtualizedProductGrid";
import { useUIStore } from "../../store/useUIStore";
import { AdvancedSearchbar } from "../../components/Search/AdvancedSearchbar";
import { useShop } from "../../context/ShopContext";
import { useTranslation } from "react-i18next";
import { getCategoryTranslation } from "../../utils/translations";
import { ALGERIA_WILAYAS } from "../../constants";

const CATEGORIES = [
  { id: "all", label: "Tous", icon: Sparkles },
  { id: "supermarché", label: "Supermarché", icon: Diamond },
  { id: "maison & déco", label: "Maison & Déco", icon: Sofa },
  { id: "électronique", label: "Électronique", icon: Smartphone },
  { id: "électroménager", label: "Électroménager", icon: Refrigerator },
  { id: "scolaire & bureau", label: "Scolaire & Bureau", icon: BookOpen },
  { id: "mode", label: "Mode", icon: Shirt },
  { id: "beauté & santé", label: "Beauté & Santé", icon: Sparkles },
  { id: "auto & moto", label: "Auto & Moto", icon: CarFront },
  { id: "sport & loisirs", label: "Sport & Loisirs", icon: Dumbbell },
  { id: "bébé & puériculture", label: "Bébé & Puériculture", icon: Baby },
  { id: "bricolage & outillage", label: "Bricolage & Outillage", icon: Hammer },
  { id: "jeux & jouets", label: "Jeux & Jouets", icon: Dices }
];

const QUICK_FILTERS = [
  { id: "free-shipping", label: "Livraison Gratuite", icon: Truck },
  { id: "on-sale", label: "En Promotion", icon: Tag },
  { id: "trending", label: "Tendance", icon: Flame },
];

export const DynamicCollectionPage: React.FC = () => {
  const { collectionName } = useParams<{ collectionName: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Advanced Filters States
  const [selectedWilaya, setSelectedWilaya] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Section custom parameters for the independent local collection shop
  const [sectionTitle, setSectionTitle] = useState<string>("");
  const [sectionBannerImg, setSectionBannerImg] = useState<string>("https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop");
  const [activeTheme, setActiveTheme] = useState<any>(null);

  const navigate = useNavigate();
  const setIsCartOpen = useUIStore((state) => state.setIsCartOpen);
  const { searchQuery } = useShop();
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const decodedName = collectionName
    ? decodeURIComponent(collectionName)
    : "SHOP DYNAMIQUE";

  // Robust comparison helper
  const normalizeStr = (str: string) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  };

  useEffect(() => {
    const fetchCollectionData = async () => {
      setLoading(true);
      try {
        if (!collectionName) {
          setSectionTitle(t("Boutique Olmart") || "BOUTIQUE OLMART");
          setSectionBannerImg("https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop");
          
          const productsRef = collection(db, "products");
          const q = query(productsRef, where("status", "==", "active"), limit(40));
          const snap = await getDocs(q);
          setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product)));
          return;
        }

        const normalizedDecoded = normalizeStr(decodedName);
        const normalizedCollection = normalizeStr(collectionName);

        // Fetch custom sections to find exact metadata matching collectionName or decoded ID
        const sectionsRef = query(collection(db, "homepage_sections"), limit(50));
        const sectionsSnap = await getDocs(sectionsRef);
        let matchingSection: any = null;

        sectionsSnap.forEach((doc) => {
          const data = doc.data();
          const docIdNorm = normalizeStr(doc.id);
          const titleNorm = normalizeStr(data.title || "");
          const nameNorm = normalizeStr(data.name || "");

          if (
            doc.id === collectionName || 
            doc.id === decodedName || 
            docIdNorm === normalizedCollection ||
            docIdNorm === normalizedDecoded ||
            titleNorm === normalizedDecoded ||
            titleNorm === normalizedCollection ||
            nameNorm === normalizedDecoded ||
            nameNorm === normalizedCollection
          ) {
            matchingSection = { id: doc.id, ...data };
          }
        });

        // Try banners parallel search
        const bannersRef = query(collection(db, "banners"), limit(30));
        const bannersSnap = await getDocs(bannersRef);
        let matchingBanner: any = null;

        bannersSnap.forEach((doc) => {
          const data = doc.data();
          const docIdNorm = normalizeStr(doc.id);
          const titleNorm = normalizeStr(data.title || "");
          const nameNorm = normalizeStr(data.name || "");

          if (
            doc.id === collectionName ||
            doc.id === decodedName ||
            docIdNorm === normalizedCollection ||
            docIdNorm === normalizedDecoded ||
            titleNorm === normalizedDecoded ||
            titleNorm === normalizedCollection ||
            nameNorm === normalizedDecoded ||
            nameNorm === normalizedCollection
          ) {
            matchingBanner = { id: doc.id, ...data };
          }
        });

        // Apply metadata and background
        if (matchingSection) {
          const cleanTitle = matchingSection.title || matchingSection.name || decodedName;
          setSectionTitle(cleanTitle);

          let resolvedImg = "";
          if (matchingSection.themeImage) {
            resolvedImg = matchingSection.themeImage;
          } else if (matchingSection.theme && matchingSection.theme !== "none") {
            try {
              const tDoc = await getDoc(doc(db, "seasonal_themes", matchingSection.theme));
              if (tDoc.exists()) {
                const themeData = tDoc.data();
                if (themeData) {
                  setActiveTheme(themeData);
                  if (themeData.imageUrl) {
                    resolvedImg = themeData.imageUrl;
                  }
                }
              }
            } catch (themeErr) {
              console.error("Error loading seasonal theme in DynamicCollectionPage:", themeErr);
            }
          }
          
          if (!resolvedImg) {
            resolvedImg = matchingSection.imageUrl || matchingSection.bannerImage || "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop";
          }
          setSectionBannerImg(resolvedImg);
        } else if (matchingBanner) {
          const cleanTitle = matchingBanner.title || matchingBanner.name || decodedName;
          setSectionTitle(cleanTitle);
          const resolvedImg = matchingBanner.imageUrl || matchingBanner.mobileImageUrl || "https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop";
          setSectionBannerImg(resolvedImg);
        } else {
          setSectionTitle(decodedName);
          setSectionBannerImg("https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop");
        }

        // --- FETCH PRODUCTS FOR THE DYNAMIC SHOP ---
        let curatedProducts: Product[] = [];
        let sectionTag = matchingSection?.tag || null;
        let sectionCategory = matchingSection?.category || null;

        // Custom manual curated lists
        if (matchingSection?.manualProducts && matchingSection.manualProducts.length > 0) {
          const idList = matchingSection.manualProducts;
          const productPromises = idList.map((pid: string) => getDoc(doc(db, "products", pid)));
          const productDocs = await Promise.all(productPromises);
          curatedProducts = productDocs
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...d.data() } as unknown as Product));
        }

        // If no curated products yet, dynamic query by category or tags
        if (curatedProducts.length === 0) {
          const productsRef = collection(db, "products");
          if (sectionCategory) {
            const catQ = query(productsRef, where("category", "==", sectionCategory), limit(30));
            const catSnap = await getDocs(catQ);
            curatedProducts = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));
          } else if (sectionTag) {
            const tagQ = query(productsRef, where("tags", "array-contains", sectionTag), limit(30));
            const tagSnap = await getDocs(tagQ);
            curatedProducts = tagSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));
          }
        }

        const targetTags = new Set<string>();
        if (sectionTag) {
          targetTags.add(sectionTag);
        }
        curatedProducts.forEach(p => {
          if (p.tags && Array.isArray(p.tags)) {
            p.tags.forEach(t => targetTags.add(t));
          }
        });

        // Load active items for fallback/additional coverage in this boutique view
        const productsRef = collection(db, "products");
        const allProductsQ = query(
          productsRef,
          where("status", "==", "active"),
          limit(100)
        );
        const allProductsSnap = await getDocs(allProductsQ);
        const allProducts = allProductsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));

        const curatedIds = new Set(curatedProducts.map(p => p.id));
        
        const sameTagProducts = allProducts.filter(p => {
          if (curatedIds.has(p.id)) return false;
          const pTags = p.tags || [];
          const sharesTag = pTags.some((t: string) => targetTags.has(t));
          const sharesCategory = sectionCategory && p.category === sectionCategory;
          return sharesTag || sharesCategory;
        });

        const remainderProducts = allProducts.filter(p => {
          return !curatedIds.has(p.id) && !sameTagProducts.some(st => st.id === p.id);
        });

        // Combine
        const combined = [...curatedProducts, ...sameTagProducts, ...remainderProducts];

        // Deduplicate
        const seenIds = new Set<string>();
        const uniqueProducts: Product[] = [];
        combined.forEach(p => {
          if (p && p.id && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            uniqueProducts.push(p);
          }
        });

        setProducts(uniqueProducts);
      } catch (error) {
        console.error("Error setting up Dynamic Shop Collection:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, [collectionName, decodedName]);

  // Load standard mocks if Firestore is empty
  useEffect(() => {
    // Intentionally removed mock fallback here as requested by user.
    // We only show real products from the database or an empty state.
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWilaya !== "all") count++;
    if (minPrice) count++;
    if (maxPrice) count++;
    if (activeQuickFilter) count++;
    return count;
  }, [selectedWilaya, minPrice, maxPrice, activeQuickFilter]);

  const INITIAL_LIMIT = typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 12 : window.innerWidth >= 768 ? 8 : 6) : 6;
  const LOAD_MORE_LIMIT = 6;
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);

  const loadMoreItems = () => {
    setDisplayLimit(prev => prev + LOAD_MORE_LIMIT);
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Search Query filter
    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.category?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q)
      );
    }

    // 2. Category filter
    if (activeCategory !== "all") {
      const selectedLower = activeCategory.toLowerCase();
      list = list.filter(p => {
        const cat = p.category?.toLowerCase() || "";
        if (selectedLower === "mode") {
          return cat.includes("mode") || cat.includes("vêtement") || cat.includes("fashion") || cat.includes("chaussure");
        }
        if (selectedLower === "maison & déco" || selectedLower === "maison") {
          return cat.includes("maison") || cat.includes("déco") || cat.includes("home") || cat.includes("design");
        }
        if (selectedLower === "électronique") {
          return cat.includes("tech") || cat.includes("informatique") || cat.includes("électronique") || cat.includes("smartphone") || cat.includes("téléphone") || cat.includes("ordinateur");
        }
        if (selectedLower === "électroménager") {
          return cat.includes("électroménager") || cat.includes("refrigerator") || cat.includes("cuisine") || cat.includes("machine") || cat.includes("appareil");
        }
        return cat === selectedLower || cat.includes(selectedLower);
      });
    }

    // 3. Quick Filters
    if (activeQuickFilter === "free-shipping") {
      list = list.filter(p => 
        p.freeShipping === true || 
        p.tags?.some((t: string) => t.toLowerCase().includes('gratuit')) || 
        p.description?.toLowerCase().includes('gratuit')
      );
    } else if (activeQuickFilter === "on-sale") {
      list = list.filter(p => 
        (p.promoPrice && p.promoPrice > 0) || 
        (p.originalPrice && p.originalPrice > p.price)
      );
    } else if (activeQuickFilter === "trending") {
      list = list.filter(p => p.rating && p.rating >= 4.5);
    }

    // 4. Advanced Price range filter
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    if (min !== null && !isNaN(min)) {
      list = list.filter(p => (p.promoPrice || p.price) >= min);
    }
    if (max !== null && !isNaN(max)) {
      list = list.filter(p => (p.promoPrice || p.price) <= max);
    }

    // 5. Advanced Wilaya filter
    if (selectedWilaya !== "all") {
      list = list.filter(p => {
        if (!p.wilaya) return false;
        const pWilaya = p.wilaya.toLowerCase();
        const sWilaya = selectedWilaya.toLowerCase();
        return pWilaya.includes(sWilaya) || sWilaya.includes(pWilaya);
      });
    }

    // 6. Sorting
    if (sortBy === "price-asc") {
      list.sort((a, b) => {
        const pA = a.promoPrice || a.price;
        const pB = b.promoPrice || b.price;
        return pA - pB;
      });
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => {
        const pA = a.promoPrice || a.price;
        const pB = b.promoPrice || b.price;
        return pB - pA;
      });
    } else if (sortBy === "rating-desc") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      list.sort((a, b) => (b.salesCount || b.rating || 0) - (a.salesCount || a.rating || 0));
    }

    return list;
  }, [products, activeCategory, activeQuickFilter, sortBy, searchQuery, selectedWilaya, minPrice, maxPrice]);

  return (
    <div className="min-h-screen bg-[#FDF9EC] relative text-[#3C2B22]" ref={containerRef}>
      {/* 25vh / 35vh banner as requested, perfectly resized */}
      <div className="h-[25vh] min-h-[220px] md:h-[35vh] md:min-h-[320px] relative flex flex-col justify-end">
        
        {/* Transparent glass header */}
        <div className="absolute top-0 start-0 w-full p-3 lg:p-4 flex justify-between items-center z-[65]">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer border-none"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <div className="font-kinder text-lg sm:text-xl tracking-widest rtl:tracking-normal text-white drop-shadow-md uppercase">
            {t("Olmart Shop")}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer border-none"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Banner with smooth slow animation */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            src={sectionBannerImg}
            alt={t(sectionTitle)}
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>

        {/* Info overlay */}
        <motion.div className="relative z-50 w-full max-w-[90rem] mx-auto px-4 sm:px-8 pb-6 sm:pb-8 md:pb-10 pt-12 md:pt-16 flex flex-col justify-end h-full">
          <motion.div style={{ y: textY, opacity: textOpacity }}>
            <div className="flex items-center gap-2 text-[9px] sm:text-xs font-bold tracking-widest rtl:tracking-normal text-white/80 uppercase mb-1 md:mb-2">
              <Link to="/" className="hover:text-white transition-colors">
                {t("Accueil")}
              </Link>
              <span>/</span>
              <span>{t("Shop")}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-kinder tracking-tighter rtl:tracking-normal uppercase drop-shadow-2xl text-white mb-2 md:mb-4 leading-none">
              {t(sectionTitle) || decodedName}
            </h1>
          </motion.div>

          {/* SearchBar */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-4xl relative z-[100] mb-3 sm:mb-4">
            <div className="flex-1">
              <AdvancedSearchbar variant="glass" />
            </div>
            <button 
              onClick={() => setShowAdvancedFilters(true)}
              className="flex items-center justify-center gap-3 px-6 md:px-8 h-10 sm:h-11 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 font-kinder uppercase tracking-widest rtl:tracking-normal text-[10px] md:text-xs hover:bg-white/20 transition-all duration-300 shadow-xl shrink-0 cursor-pointer select-none"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{t("Filtres")}</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5C00] text-white text-[9px] font-kinder leading-none shadow-md ring-2 ring-white animate-pulse">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main body content section with specialized local logic */}
      <div ref={filterSectionRef} className="relative z-40 bg-[#FDF9EC] rounded-t-[2rem] -mt-6 sm:-mt-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] min-h-[65vh]">
        
        {/* Sticky category row */}
        <div className="sticky top-0 z-40 bg-[#FDF9EC]/95 backdrop-blur-md border-b border-[#3C2B22]/10 shadow-sm rounded-t-[2rem] pt-6 sm:pt-8">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-8 pb-3 lg:pb-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar flex-1 pb-1">
                  {CATEGORIES.map((cat) => {
                    const displayLabel = cat.id === "all" ? "Tout voir" : getCategoryTranslation(cat.label, t);
                    const isSelected = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 border cursor-pointer select-none ${
                          isSelected
                            ? "bg-[#3C2B22] text-white border-[#3C2B22] shadow-md"
                            : "bg-white text-[#3C2B22]/70 border-[#3C2B22]/10 hover:border-[#3C2B22]/30"
                        }`}
                      >
                        <cat.icon className="w-3.5 h-3.5" />
                        <span className="font-semibold text-[11px] sm:text-xs uppercase tracking-wider rtl:tracking-normal">
                          {displayLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick filters & sort bar */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar pb-1">
                {QUICK_FILTERS.map((filter) => {
                  const isSelected = activeQuickFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setActiveQuickFilter(isSelected ? null : filter.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal transition-all whitespace-nowrap cursor-pointer select-none ${
                        isSelected
                          ? "bg-[#FF5C00] border-[#FF5C00] text-white shadow-md font-extrabold"
                          : "bg-white/60 border-[#3C2B22]/10 text-[#3C2B22]/70 hover:bg-white hover:text-[#3C2B22]"
                      }`}
                    >
                      <filter.icon className="w-3 h-3" />
                      <span>{t(filter.label)}</span>
                    </button>
                  );
                })}

                {/* Unified Sorting Trigger */}
                <div className="relative ms-auto shrink-0 z-[100]">
                  <button 
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal transition-all whitespace-nowrap cursor-pointer hover:bg-white select-none ${
                      sortBy !== "popular" 
                        ? "bg-[#3C2B22] border-[#3C2B22] text-white" 
                        : "bg-white/60 border-[#3C2B22]/10 text-[#3C2B22]/70"
                    }`}
                  >
                    <span>
                      {t("Trier par :")}{
                        sortBy === "price-asc" ? t("Prix Croissant") :
                        sortBy === "price-desc" ? t("Prix Décroissant") :
                        sortBy === "rating-desc" ? t("Les Mieux Notés") : t("Popularité")
                      }
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showSortDropdown ? "rotate-180" : "rotate-0"}`} />
                  </button>
                  
                  {showSortDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                      <div className="absolute end-0 top-full mt-1.5 bg-white border border-[#3C2B22]/10 rounded-xl shadow-xl z-50 py-1.5 min-w-[150px] animate-in fade-in-50 slide-in-from-top-1 rtl:start-0 rtl:end-auto">
                        {[
                          { id: "popular", label: "Popularité" },
                          { id: "price-asc", label: "Prix Croissant" },
                          { id: "price-desc", label: "Prix Décroissant" },
                          { id: "rating-desc", label: "Mieux Notés" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setSortBy(opt.id);
                              setShowSortDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rtl:tracking-normal transition-colors border-none bg-transparent cursor-pointer flex items-center ${
                              sortBy === opt.id 
                                ? "text-[#FF5C00] bg-[#FDF9EC]" 
                                : "text-[#3C2B22]/85 hover:bg-[#FDF9EC]/50 hover:text-[#3C2B22]"
                            }`}
                          >
                            {t(opt.label)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product display grid */}
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 py-8 sm:py-12 pb-24">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-8">
            
            {/* Main Products Grid Column */}
            <div className="col-span-2 lg:col-span-12">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#3C2B22] uppercase mb-6 ms-1">
                <span className="text-[#3C2B22] font-kinder">{filteredProducts.length}</span>{" "}
                {t("ARTICLES")}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] bg-[#3C2B22]/5 animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="flex flex-col gap-6">
                  <VirtualizedProductGrid products={filteredProducts.slice(0, displayLimit)} variant="premium_immersive" />
                  
                  {displayLimit < filteredProducts.length && (
                    <div className="col-span-full flex justify-center py-10">
                      <button
                        onClick={loadMoreItems}
                        className="px-8 py-3.5 bg-zinc-950 text-white hover:bg-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-3 cursor-pointer"
                      >
                        {t("Voir plus d'articles")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-[#3C2B22]/50 py-20 text-lg">
                  {t("Aucun article trouvé pour cette collection.")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer with beautiful clean glass details */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdvancedFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] cursor-pointer"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 end-0 w-full max-w-md bg-[#FAF6EE] shadow-2xl z-[201] flex flex-col overflow-hidden text-[#3C2B22]"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-[#3C2B22]/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-[#3C2B22]" />
                  <h2 className="font-kinder text-sm uppercase tracking-wider rtl:tracking-normal text-[#3C2B22]">{t("Filtres Avancés")}</h2>
                </div>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#3C2B22]/5 hover:bg-[#3C2B22]/10 text-[#3C2B22] transition-colors cursor-pointer select-none border-none outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 58 Wilayas compliant Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#3C2B22]/70">{t("Wilaya de livraison")}</label>
                  <div className="relative">
                    <select
                      value={selectedWilaya}
                      onChange={(e) => setSelectedWilaya(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-[#3C2B22]/10 rounded-xl outline-none focus:border-[#FF5C00] transition-colors text-xs font-bold text-[#3C2B22]/80 cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="all">{t("Toutes les Wilayas (58 Wilayas)")}</option>
                      {ALGERIA_WILAYAS.map((wilaya) => (
                        <option key={wilaya} value={wilaya}>{wilaya}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3C2B22] pointer-events-none" />
                  </div>
                </div>

                {/* Price range */}
                <div className="space-y-2">
                  <label className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#3C2B22]/70">{t("Tranche de Prix (DA)")}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-[#3C2B22]/50 uppercase tracking-widest rtl:tracking-normal">{t("Min (DA)")}</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#3C2B22]/10 rounded-xl text-xs font-bold text-[#3C2B22] focus:border-[#FF5C00] outline-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-[#3C2B22]/50 uppercase tracking-widest rtl:tracking-normal">{t("Max (DA)")}</span>
                      <input
                        type="number"
                        placeholder={t("Indéfini") || "Indéfini"}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-[#3C2B22]/10 rounded-xl text-xs font-bold text-[#3C2B22] focus:border-[#FF5C00] outline-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Express criteria options */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#3C2B22]/70">{t("Critères Spécifiques")}</label>
                  <div className="space-y-3">
                    {[
                      { id: "free-shipping", name: "Livraison Gratuite", desc: "Produits sans frais de port" },
                      { id: "on-sale", name: "En Promotion / Solde", desc: "Produits bénéficiant d'une réduction" },
                      { id: "trending", name: "Sélection Tendance (★ 4.5+)", desc: "Produit de premier choix hautement notés" }
                    ].map((opt) => {
                      const isActive = activeQuickFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setActiveQuickFilter(isActive ? null : opt.id)}
                          className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer outline-none ${
                            isActive
                              ? "bg-white border-[#FF5C00] shadow-md ring-1 ring-[#FF5C00]"
                              : "bg-white border-[#3C2B22]/10 hover:border-[#3C2B22]/30 shadow-sm"
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${isActive ? "bg-[#FF5C00] border-[#FF5C00]" : "bg-white border-zinc-300"}`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                          </div>
                          <div>
                            <div className={`text-[10px] font-black uppercase tracking-widest rtl:tracking-normal ${isActive ? "text-[#FF5C00]" : "text-[#3C2B22]"}`}>{t(opt.name)}</div>
                            <div className="text-[9px] text-[#3C2B22]/60 mt-0.5 leading-relaxed font-semibold">{t(opt.desc)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Apply Buttons */}
              <div className="p-6 bg-white border-t border-[#3C2B22]/10 grid grid-cols-2 gap-3 shrink-0">
                <button
                  onClick={() => {
                    setSelectedWilaya("all");
                    setMinPrice("");
                    setMaxPrice("");
                    setActiveQuickFilter(null);
                  }}
                  className="px-4 py-3 border border-[#3C2B22]/10 rounded-xl text-[10px] font-extrabold uppercase tracking-widest rtl:tracking-normal text-[#3C2B22]/75 hover:bg-zinc-50 transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("Effacer")}</span>
                </button>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="px-4 py-3 bg-[#3C2B22] border border-[#3C2B22] text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest rtl:tracking-normal hover:bg-[#0a0b0c] transition-all cursor-pointer flex items-center justify-center select-none"
                >
                  <span>{t("Appliquer")}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
