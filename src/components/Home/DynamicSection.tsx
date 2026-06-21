import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  Heart,
  Clock,
  TrendingUp,
  Sparkles,
  Tag,
  ShoppingBag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  ArrowRight,
} from "lucide-react";
import { HomepageSection, Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { useCart } from "../../context/CartContext";
import { db } from "../../lib/firebase";
import { ProductCard } from "../Product/ProductCard";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  where,
  documentId,
  startAfter,
} from "firebase/firestore";
import {
  cacheEngine,
  handleDevQuotaLogger,
} from "../../utils/mockProducts";
import { MobileSwipeIndicator } from "../UI/MobileSwipeIndicator";

export const DynamicSection: React.FC<{ section: HomepageSection; isFramed?: boolean }> = ({
  section,
  isFramed = false,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toggleWishlist, wishlist } = useCart();
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [customTheme, setCustomTheme] = useState<any>(null);
  const hasActiveImage = !!customTheme;

  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const { scrollLeft, clientWidth } = containerRef.current;
      const scrollAmount = clientWidth * 0.75;
      const target = direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      containerRef.current.scrollTo({
        left: target,
        behavior: "smooth"
      });
    }
  };

  let ticking = false;
  const handleScroll = () => {
    if (!ticking && containerRef.current) {
      window.requestAnimationFrame(() => {
        if (containerRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
          setShowLeftArrow(scrollLeft > 10);
          setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      
      // Delay initial calculation to allow DOM/images to paint expanding the scrollWidth
      handleScroll();
      const t1 = setTimeout(handleScroll, 150);
      const t2 = setTimeout(handleScroll, 500);
      const t3 = setTimeout(handleScroll, 1500);

      let resizeTimeout: any;
      const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleScroll, 150);
      });
      resizeObserver.observe(container);

      return () => {
        container.removeEventListener("scroll", handleScroll);
        resizeObserver.disconnect();
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(resizeTimeout);
      };
    }
  }, [products]);

  // Determine items per page based on layout
  const itemsPerPage =
    section.layout === "small"
      ? 36
      : section.layout === "compact"
        ? 20
        : section.columns
          ? section.columns * 2
          : 12;

  const [limitState, setLimitState] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);

  useEffect(() => {
    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // First load limits
        if (products.length === 0 && !isLoading) {
          if (window.innerWidth >= 1024) setLimitState(10);
          else if (window.innerWidth >= 768) setLimitState(8);
          else setLimitState(6);
        }
      }, 150);
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [products.length, isLoading]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      const maxRequested = section.limit || section.rules?.maxItems;
      const fetchLimit = maxRequested || limitState; // Using our dynamic limit 

      try {
        let q;
        const productsCol = collection(db, "products");
        let docs: Product[] = [];

        if (section.manualProducts && section.manualProducts.length > 0) {
          const idList = section.manualProducts.slice(0, fetchLimit);
          const chunks: string[][] = [];
          for (let i = 0; i < idList.length; i += 10) {
            chunks.push(idList.slice(i, i + 10));
          }
          
          const fetchedPromises = chunks.map(chunk => {
            const chunkQuery = query(productsCol, where(documentId(), "in", chunk));
            return getDocs(chunkQuery);
          });
          
          const snaps = await Promise.all(fetchedPromises);
          const unsortedDocsMap: Record<string, Product> = {};
          
          snaps.forEach(snap => {
            snap.docs.forEach(d => {
              unsortedDocsMap[d.id] = { id: d.id, ...(d.data() as any) } as unknown as Product;
            });
          });
          
          idList.forEach(id => {
            if (unsortedDocsMap[id]) {
              docs.push(unsortedDocsMap[id]);
            }
          });
          setHasMore(idList.length === fetchLimit && section.manualProducts.length > fetchLimit);
        } else {
          if (section.category) {
            q = query(
              productsCol,
              where("category", "==", section.category),
              limit(fetchLimit)
            );
          } else if (section.tag) {
            q = query(
              productsCol,
              where("tags", "array-contains", section.tag),
              limit(fetchLimit)
            );
          } else {
            switch (section.type) {
              case "new_arrivals":
              case "top_picks":
              case "trending":
              case "recommended":
                q = query(
                  productsCol,
                  orderBy("createdAt", "desc"),
                  limit(fetchLimit),
                );
                break;
              case "flash_sale":
                q = query(productsCol, limit(fetchLimit));
                break;
              default:
                q = query(productsCol, limit(fetchLimit));
            }
          }

          const snap = await getDocs(q);
          docs = snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as any) }) as unknown as Product,
          );
          setLastVisible(snap.docs[snap.docs.length - 1]);
          setHasMore(snap.docs.length === fetchLimit);
        }

        const filteredDocs = docs.filter(d => d && (d.stock === undefined || d.stock > 0));

        setProducts(filteredDocs);
      } catch (err) {
        console.log("Error fetching section items:", err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [section, limitState]);

  const loadMore = async () => {
    if (!hasMore || !lastVisible) return;
    
    // As requested: 6 on subsequent requests
    const fetchLimit = 6; 
    let q;
    const productsCol = collection(db, "products");
    
    // We only support dynamic load more for non-manual sections for now
    if (section.manualProducts && section.manualProducts.length > products.length) {
       // local load more strategy for manual
       const nextIds = section.manualProducts.slice(products.length, products.length + fetchLimit);
       if (nextIds.length === 0) {
         setHasMore(false);
         return;
       }
       const chunks: string[][] = [];
       for (let i = 0; i < nextIds.length; i += 10) chunks.push(nextIds.slice(i, i + 10));
       
       const fetchedPromises = chunks.map(chunk => getDocs(query(productsCol, where(documentId(), "in", chunk))));
       const snaps = await Promise.all(fetchedPromises);
       const unsortedDocsMap: Record<string, Product> = {};
       snaps.forEach(snap => snap.docs.forEach(d => unsortedDocsMap[d.id] = { id: d.id, ...(d.data() as any) } as unknown as Product));
       
       const newDocs: Product[] = [];
       nextIds.forEach(id => {
         if (unsortedDocsMap[id]) newDocs.push(unsortedDocsMap[id]);
       });
       const validNewDocs = newDocs.filter(d => d && (d.stock === undefined || d.stock > 0));
       
       setProducts(prev => [...prev, ...validNewDocs]);
       setHasMore(products.length + nextIds.length < section.manualProducts.length);
       return;
    }

    if (section.category) {
      q = query(productsCol, where("category", "==", section.category), startAfter(lastVisible), limit(fetchLimit));
    } else if (section.tag) {
      q = query(productsCol, where("tags", "array-contains", section.tag), startAfter(lastVisible), limit(fetchLimit));
    } else {
      switch (section.type) {
        case "new_arrivals":
        case "top_picks":
        case "trending":
        case "recommended":
          q = query(productsCol, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(fetchLimit));
          break;
        default:
          q = query(productsCol, startAfter(lastVisible), limit(fetchLimit));
      }
    }

    try {
      const snap = await getDocs(q);
      const docs = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as unknown as Product,
      );
      const validNewDocs = docs.filter(d => d && (d.stock === undefined || d.stock > 0));
      
      setProducts(prev => {
         // Deduplicate
         const existingIds = new Set(prev.map(p => p.id));
         const toAdd = validNewDocs.filter(d => !existingIds.has(d.id));
         return [...prev, ...toAdd];
      });
      setLastVisible(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === fetchLimit);
    } catch (err) {
      console.log("Error loading more:", err);
    }
  };

  useEffect(() => {
    const fetchCustomTheme = async () => {
      if (section.themeImage) {
        setCustomTheme({
          name: section.themeName || "",
          imageUrl: section.themeImage
        });
      } else if (section.theme && section.theme !== "none") {
        try {
          const tDoc = await getDoc(doc(db, "seasonal_themes", section.theme));
          if (tDoc.exists()) {
            setCustomTheme(tDoc.data());
          } else {
            // Fallback for hardcoded if they still exist or were not migrated
            setCustomTheme(null);
          }
        } catch (e) {
          console.error("Error fetching theme:", e);
        }
      } else {
        setCustomTheme(null);
      }
    };
    fetchCustomTheme();
  }, [section.theme, section.themeImage, section.themeName]);

  if (!section.isActive) return null;

  const getSectionTitle = () => {
    const rawValue = section.title || section.name;
    if (!rawValue) {
      switch (section.type) {
        case "new_arrivals":
          return t("home.sections.new_arrivals") || "Nouveautés";
        case "top_picks":
          return t("home.sections.top_picks") || "Recommandé pour vous";
        case "trending":
          return t("home.sections.trending") || "Tendances actuelles";
        case "flash_sale":
          return t("home.sections.flash_sale") || "Ventes Flash";
        default:
          return t("home.sections.default") || "Sélection du moment";
      }
    }
    return rawValue;
  };

  const renderHeader = () => {
    const hasImage = hasActiveImage;
    const titleColor = "text-[#121315]";
    const subtitleColor = hasImage ? "text-[#121315]/80" : "text-[#121315]/60";
    const seeMoreLabel = t("home.sections.see_more") || "VOIR PLUS";

    if (hasImage) {
      return (
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4 group/header relative border-b border-[#121315]/10 pb-3">
          <div className="flex flex-col">
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight rtl:tracking-normal leading-tight ${titleColor}`}>
              {getSectionTitle()}
            </h2>
            {section.subtitle && (
              <p className={`text-xs rtl:text-sm sm:text-sm font-semibold mt-1 max-w-xl leading-snug ${subtitleColor}`}>
                {section.subtitle}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => navigate('/collection/' + encodeURIComponent(section.id || getSectionTitle()))}
              className="group relative flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#121315]/15 bg-white/50 hover:bg-white/80 text-[8.5px] font-black text-[#121315] uppercase tracking-[0.1em] transition-all cursor-pointer shadow-sm"
            >
              <span>{seeMoreLabel}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform duration-300 text-[#F37021] stroke-[2.5]" />
            </button>
            
            {userProfile?.role === "admin" && (
              <button 
                onClick={() => navigate(`/admin/homepage`)}
                className="bg-black/60 text-white font-bold text-[10px] rtl:text-[12px] px-2.5 py-1.5 rounded-full opacity-0 group-hover/header:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
              >
                {t("common.edit") || "Modifier"}
              </button>
            )}
          </div>
        </div>
      );
    }

    const titleText = getSectionTitle().toUpperCase();
    const words = titleText.split(" ");
    const headPart = words.slice(0, words.length - 1).join(" ");
    const tailPart = words[words.length - 1] || "";

    return (
      <div className="flex items-center justify-between mb-4 border-b border-[#EBE5DF]/35 pb-2.5">
        <h3 className="text-lg sm:text-xl font-extralight text-stone-900 tracking-tight rtl:tracking-normal leading-none font-serif flex items-center gap-2">
          {section.subtitle && (
            <span className="text-[9px] rtl:text-[11px] font-black tracking-[0.15em] text-[#F37021] select-none animate-pulse hidden sm:inline uppercase me-2">
              ✦ {section.subtitle} ✦
            </span>
          )}
          {headPart ? (
            <>
              {headPart} <span className="font-semibold tracking-tighter rtl:tracking-normal text-[#121315]">{tailPart}</span>
            </>
          ) : (
            <span className="font-semibold tracking-tighter rtl:tracking-normal text-[#121315]">{tailPart}</span>
          )}
        </h3>
        
        <button 
          onClick={() => navigate('/collection/' + encodeURIComponent(section.id || getSectionTitle()))}
          className="group relative flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#EBE5DF]/80 bg-white hover:border-[#121315]/40 hover:bg-[#FAF8F5] text-[8.5px] sm:text-[9.2px] font-bold text-[#121315] uppercase tracking-[0.25em] transition-all shadow-[0_2px_8px_rgba(44,30,22,0.03)] hover:shadow-[0_4px_12px_rgba(44,30,22,0.06)] cursor-pointer animate-fade-in"
        >
          <span>{seeMoreLabel}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform duration-300 text-[#F37021] stroke-[2.5]" />
        </button>
      </div>
    );
  };

  const getCardStyle = () => {
    switch (section.style) {
      case "glass":
        return "bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-[1.5rem] hover:bg-white/60";
      case "minimal":
        return "bg-transparent border border-zinc-200 rounded-xl hover:border-zinc-300";
      case "immersive":
        return "bg-slate-900 rounded-[1.5rem] overflow-hidden shadow-lg border border-slate-200/20 hover:shadow-2xl hover:-translate-y-1 relative";
      case "premium":
      default:
        return "bg-white rounded-[1.5rem] shadow-sm border border-[#EBE5DF] hover:shadow-xl hover:-translate-y-1";
    }
  };

  const getGridClasses = () => {
    return "flex gap-4 overflow-x-auto pb-6 desktop-scrollbar snap-x snap-mandatory flex-nowrap";
  };

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const renderThemeWrapper = () => {
    if (!customTheme) return null;

    return (
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Real background image, perfectly sharp, gracefully fading out at top and bottom to blend with page color */}
        <div 
          className="absolute inset-0 bg-cover bg-center object-cover opacity-90"
          style={{ 
            backgroundImage: `url('${customTheme.imageUrl}')`,
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
          }}
        />
        
        {/* Very subtle gradient overlay to ensure the white text is legible without killing the crispness of the BG */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/30 via-black/10 to-[#FAF8F5]/30" />
      </div>
    );
  };

  const themeClasses = () => {
    if (customTheme) return "bg-[#FAF8F5]";
    return "";
  };

  if (section.type === "flash_sale") {
    return (
      <div className="w-full bg-gradient-to-br from-[#0C0303] via-[#2F0606] to-[#0D0101] py-8 sm:py-12 mb-8 rounded-xl border-2 border-red-500/20 shadow-[0_25px_60px_rgba(220,38,38,0.25)] relative overflow-hidden ring-4 ring-red-500/5">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-[450px] h-[450px] bg-orange-650/10 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-650 to-orange-550 rounded-lg flex items-center justify-center text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)] relative animate-pulse">
                  <Zap className="w-6 h-6 fill-white" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  </span>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter rtl:tracking-normal leading-none">{t("Ventes Flash")}</h2>
                </div>
              </div>
              <p className="text-red-300/70 font-bold text-sm tracking-tight rtl:tracking-normal">{t("Ne manquez pas nos offres exceptionnelles à durée limitée. Prix de choc immédiats !")}</p>
            </div>
            
            <button 
              onClick={() => navigate('/ventes-flash')}
              className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest rtl:tracking-normal shadow-xl transition-all active:scale-95 flex items-center gap-2 group border-none cursor-pointer"
            >
              <span>{t("VOIR TOUTES LES OFFRES")}</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Content */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 desktop-scrollbar snap-x snap-mandatory px-4 md:px-0">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.666rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.833rem)] shrink-0 aspect-[2/3] bg-zinc-900/40 border border-white/5 animate-pulse rounded-xl" />
              ))
            ) : products.length > 0 ? (
              <>
                {products.map((product, i) => (
                  <div key={product.id} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.666rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.833rem)] shrink-0 snap-start snap-always">
                    <ProductCard
                      product={product}
                      index={i}
                      variant="flash_sale"
                    />
                  </div>
                ))}
                {hasMore && (
                  <div className="shrink-0 flex items-center justify-center p-4">
                    <button
                      onClick={loadMore}
                      className="px-6 py-3 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap"
                    >
                      {t("Afficher plus")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-red-300/50 font-bold text-center py-10 w-full">{t("Aucun produit trouvé.")}</p>
            )}
          </div>
          <MobileSwipeIndicator className="-mt-2 mb-2 text-red-200/50" />
        </div>
      </div>
    );
  }

  if (isFramed) {
    return (
      <div className="w-full relative z-10 animate-fade-in">
        {renderHeader()}

        {isLoading ? (
          <div className={getGridClasses()}>
            {[...Array(section.limit || section.rules?.maxItems || 8)].map(
              (_, i) => (
                <div
                  key={i}
                  className="snap-start snap-always shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)] aspect-[4/5] bg-stone-200/50 animate-pulse rounded-3xl"
                />
              ),
            )}
          </div>
        ) : products.length > 0 ? (
          <div className="relative group/carousel px-4 sm:px-0">
            {showLeftArrow && (
              <button
                type="button"
                onClick={() => scroll("left")}
                className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
                aria-label={t("Voir les produits précédents") || "Voir les produits précédents"}
              >
                <ChevronLeft className="w-5 h-5 text-orange-650 stroke-[2.5]" />
              </button>
            )}

            <div 
              ref={containerRef}
              className={`${getGridClasses()} no-scrollbar`}
              style={{ scrollBehavior: 'smooth' }}
            >
              {products.map((product, i) => (
                <div
                  key={`${product.id}-${i}`}
                  className="snap-start snap-always shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
                >
                  <ProductCard
                    product={product}
                    index={i}
                    sectionStyle={getCardStyle()}
                  />
                </div>
              ))}
            </div>

            {showRightArrow && (
              <button
                type="button"
                onClick={() => scroll("right")}
                className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
                aria-label={t("Voir plus de produits") || "Voir plus de produits"}
              >
                <ChevronRight className="w-5 h-5 text-orange-650 stroke-[2.5]" />
              </button>
            )}
            
            <MobileSwipeIndicator className="-mt-3 mb-2" />
          </div>
        ) : (
          <p className="text-zinc-500 font-bold text-center py-10">
            {t("Aucun produit trouvé pour cette section.")}</p>
        )}
      </div>
    );
  }

  const containerBgClass = hasActiveImage
    ? "relative z-10 p-4 sm:p-6 pb-5 sm:pb-7 rounded-[2rem] animate-fade-in " +
      "bg-gradient-to-b from-white/10 via-white/5 to-transparent border-[1.5px] border-white/30 " +
      "shadow-[0_16px_40px_-5px_rgba(0,0,0,0.2),inset_0_2px_4px_rgba(255,255,255,0.7),inset_0_-1px_2px_rgba(255,255,255,0.1)]"
    : "bg-white border border-stone-200/40 p-4 sm:p-6 pb-5 sm:pb-7 rounded-[2rem] shadow-[0_20px_50px_rgba(30,67,86,0.05)] animate-fade-in";

  return (
    <section
      className="py-12 sm:py-20 relative"
      style={
        !themeClasses()
          ? { backgroundColor: section.backgroundColor || "transparent" }
          : {}
      }
    >
      {renderThemeWrapper()}

      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className={containerBgClass}>
          {renderHeader()}

          {isLoading ? (
            <div className={getGridClasses()}>
              {[...Array(section.limit || section.rules?.maxItems || 8)].map(
                (_, i) => (
                  <div
                    key={i}
                    className="snap-start snap-always shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)] aspect-[4/5] bg-stone-200/50 animate-pulse rounded-3xl"
                  />
                ),
              )}
            </div>
          ) : products.length > 0 ? (
            <div className="relative group/carousel px-4 sm:px-0">
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
                  aria-label={t("Voir les produits précédents") || "Voir les produits précédents"}
                >
                  <ChevronLeft className="w-5 h-5 text-orange-650 stroke-[2.5]" />
                </button>
              )}

              <div 
                ref={containerRef}
                className={`${getGridClasses()} no-scrollbar`}
                style={{ scrollBehavior: 'smooth' }}
              >
                {products.map((product, i) => (
                  <div
                    key={`${product.id}-${i}`}
                    className="snap-start snap-always shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] xl:w-[calc((100%-5rem)/6)]"
                  >
                    <ProductCard
                      product={product}
                      index={i}
                      sectionStyle={getCardStyle()}
                    />
                  </div>
                ))}
              </div>

              {showRightArrow && (
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white text-[#121315] border border-[#EBE5DF]/60 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"
                  aria-label={t("Voir plus de produits") || "Voir plus de produits"}
                >
                  <ChevronRight className="w-5 h-5 text-orange-650 stroke-[2.5]" />
                </button>
              )}
              
              <MobileSwipeIndicator className="-mt-3 mb-2" />
            </div>
          ) : (
            <p className="text-zinc-500 font-bold text-center py-10">
              {t("Aucun produit trouvé pour cette section.")}</p>
          )}
        </div>
      </div>
    </section>
  );
};
