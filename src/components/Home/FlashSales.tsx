import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, Clock, Flame, AlertCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { db } from "../../lib/firebase";
import { collection, query, limit, getDocs, where } from "firebase/firestore";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { ProductCard } from "../Product/ProductCard";
import { MobileSwipeIndicator } from "../ui/MobileSwipeIndicator";

export const FlashSales: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [flashProducts, setFlashProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isAr = i18n.language === "ar";

  // Scroll function for desktop arrows
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Time Countdown to the end of today
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const difference = endOfDay.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch products and find/build deals
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        // Query 1: Actual active flash sale products
        const flashSnap = await getDocs(
          query(
            collection(db, "products"),
            where("status", "==", "active"),
            where("flashSaleActive", "==", true),
            limit(18)
          )
        );
        const flashList = flashSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);

        // Query 2: Promo products as fallback/additional items
        const promoSnap = await getDocs(
          query(collection(db, "products"), where("status", "==", "active"), where("isPromo", "==", true), limit(18))
        );
        const promoList = promoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);

        // Combine unique products, prioritizing flashSaleActive
        const combined: Product[] = [...flashList];
        const seenIds = new Set(flashList.map((p) => p.id));

        promoList.forEach((p) => {
          if (!seenIds.has(p.id)) {
            combined.push(p);
            seenIds.add(p.id);
          }
        });

        setFlashProducts(combined.slice(0, 18));
      } catch (err) {
        console.error("Error fetching Flash Sales products", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  if (loading) {
    return (
      <section className="py-8 sm:py-12 bg-white border-y border-slate-100">
        <div className="w-full max-w-[90rem] mx-auto px-4">
          <div className="w-full h-[400px] bg-stone-200 animate-pulse rounded-[2rem] border border-slate-100" />
        </div>
      </section>
    );
  }
  if (flashProducts.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8 relative bg-transparent border-none">
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
        <div className="relative bg-white p-5 sm:p-8 rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-rose-100/50">
          {/* Header Zone: Elegant, symmetry-driven layout */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 md:mb-8">
            {/* Left Block: Info Hub (Title, Badges & Countdown Timer) */}
            <div className="flex flex-col gap-4 w-full md:w-auto">
              {/* Title Block & Badges */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {flashProducts.some((p) => p.flashSaleActive || p.promoPrice) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider shadow-sm border border-rose-100">
                      <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                      {t("home.flash.badge", "OFFRE LIMITÉE")}
                    </span>
                  )}
                  {flashProducts.some((p) => p.stock && p.stock > 0 && p.stock <= 20) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider shadow-sm border border-orange-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping" />
                      {t("stock_scarcity", "STOCK FAIBLE")}
                    </span>
                  )}
                </div>
                <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight">
                  {t("home.flash.title", "VENTES FLASH")}
                </h2>
              </div>

              {/* Chrono Pill */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  <span className="text-[11px] sm:text-xs font-sans font-medium text-slate-500 uppercase tracking-wider">
                    {t("ends_in", "FINIT DANS")} :
                  </span>
                </div>

                {/* Inline countdown display */}
                <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold text-slate-900">
                  <div className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{String(timeLeft.hours).padStart(2, "0")}</div>
                  <span className="text-slate-300">:</span>
                  <div className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{String(timeLeft.minutes).padStart(2, "0")}</div>
                  <span className="text-slate-300">:</span>
                  <div className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md border border-rose-100">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>

            {/* View All & Chevrons Navigation */}
            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 mt-2 md:mt-0">
              <button
                onClick={() => navigate("/ventes-flash")}
                className="group flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-sans font-medium text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-md shrink-0 w-full sm:w-auto"
              >
                <span>{t("VOIR TOUT LE DROP", "VOIR TOUT LE DROP")}</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Carousel with arrows */}
          <div className="relative group/carousel -mx-2 sm:-mx-4 md:mx-0">
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 md:-left-4 top-[35%] -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 hidden md:flex active:scale-90 text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 md:-right-4 top-[35%] -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 hidden md:flex active:scale-90 text-slate-600 hover:text-slate-900"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto desktop-scrollbar gap-4 sm:gap-6 px-2 sm:px-4 pb-4 overflow-y-hidden overscroll-x-contain snap-x snap-mandatory scroll-smooth"
            >
              {flashProducts.map((product, i) => {
                // Respect User Intent: No fake/pseudo UI. Only true stock logic.
                const initialStock = product.flashQuantity || product.stock || 0;
                const itemsLeft = product.stock || 0;
                const reservedCount = Math.max(initialStock - itemsLeft, 0);
                const stockPercent = initialStock > 0 ? Math.min((reservedCount / initialStock) * 100, 100) : 0;

                const showProgress = initialStock > 0 && itemsLeft > 0;

                return (
                  <div
                    key={`${product.id}-${i}`}
                    className="w-[calc(44%-0.5rem)] sm:w-[calc(33.333%-0.666rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(20%-0.8rem)] shrink-0 flex flex-col justify-between"
                  >
                    {/* The Product Card */}
                    <div className="bg-white rounded-none p-1.5 shadow-sm border border-rose-100 hover:border-rose-500/30 transition-all duration-300">
                      <ProductCard product={product} index={i} variant="flash_sale" />

                      {/* Real stock meter below card - only shown if we have valid logical data */}
                      {showProgress && (
                        <div className="mt-3 px-2 pb-2">
                          <div className="flex justify-between text-[10px] sm:text-[11px] font-sans font-bold text-slate-900 mb-1">
                            <span className="text-red-600 font-extrabold animate-pulse flex items-center gap-1">
                              <Flame className="w-3 h-3 fill-current inline" />
                              {isAr
                                ? `بقي ${itemsLeft} فقط`
                                : `${t("Plus que", "Plus que")} ${itemsLeft} ${t("restants", "restants")}`}
                            </span>
                            <span className="opacity-80 text-stone-500">
                              {Math.round(stockPercent)}% {isAr ? "محجوز" : t("vendus", "réservé")}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                            <div
                              className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-1000"
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Swipe Indication for Mobile */}
            <MobileSwipeIndicator className="-mt-1" />
          </div>
        </div>
      </div>
    </section>
  );
};
