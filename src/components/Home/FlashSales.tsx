import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Zap, Clock, Flame, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { db } from "../../lib/firebase";
import { collection, query, limit, getDocs, where } from "firebase/firestore";
import { Product } from "../../types";
import { formatPrice } from "../../utils/format";
import { ProductCard } from "../Product/ProductCard";
import { MobileSwipeIndicator } from "../UI/MobileSwipeIndicator";

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
      <section className="py-8 sm:py-12 bg-[#FAF8F5] border-y border-[#EBE5DF]/60">
        <div className="w-full max-w-[90rem] mx-auto px-4">
          <div className="w-full h-[400px] bg-stone-200 animate-pulse rounded-[2rem] border border-[#EBE5DF]/40" />
        </div>
      </section>
    );
  }
  if (flashProducts.length === 0) return null;

  return (
    <section className="py-10 sm:py-14 bg-[#FAF8F5] border-y border-[#EBE5DF]/60 overflow-hidden">
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
        {/* Urgent Textured Container: Warm Caramel & Cream (Neither too dark nor too bright) */}
        <div className="relative border-2 border-orange-500/30 bg-gradient-to-br from-[#FFFBF9] via-[#FAF3EC] to-[#FFF9F5] p-5 sm:p-8 rounded-[2.5rem] shadow-[0_22px_50px_rgba(243,112,33,0.12)]">
          {/* Header Zone: Elegant, symmetry-driven layout with matching heights */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 md:mb-10 border-b border-orange-200/40 pb-6">
            {/* Left Block: Info Hub (Title, Badges & Countdown Timer) */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 w-full md:w-auto">
              {/* Title Block & Badges */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {flashProducts.some((p) => p.flashSaleActive || p.promoPrice) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider animate-bounce">
                      <Flame className="w-3 h-3 fill-current animate-pulse" />
                      {t("home.flash.badge", "OFFRE LIMITÉE")}
                    </span>
                  )}
                  {flashProducts.some((p) => p.stock && p.stock > 0 && p.stock <= 20) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F37021]/15 text-[#F37021] text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                      {t("stock_scarcity", "STOCK FAIBLE")}
                    </span>
                  )}
                </div>
                <h2 className="font-sans font-black text-3xl sm:text-4xl text-[#121315] tracking-tighter rtl:tracking-normal uppercase leading-none">
                  {t("home.flash.title", "VENTES FLASH")}
                </h2>
              </div>

              {/* Chrono Pill with exact h-11 height matching the button */}
              <div className="flex items-center justify-between sm:justify-start gap-4 bg-[#121315] text-white px-4 rounded-2xl border border-stone-800 shadow-md h-11 shrink-0 w-full sm:w-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <Clock className="w-4 h-4 text-red-500 animate-spin" style={{ animationDuration: "4s" }} />
                  <span className="text-[10px] sm:text-[11px] font-mono font-black text-stone-300 uppercase tracking-widest rtl:tracking-normal">
                    {t("ends_in", "FINIT DANS")} :
                  </span>
                </div>

                {/* Inline countdown display (No bulky stacked label clutter) */}
                <div className="flex items-center gap-1 font-mono font-black text-sm sm:text-base">
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-red-500 animate-pulse text-xs">:</span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-red-500 animate-pulse text-xs">:</span>
                  <span className="bg-red-600 px-1.5 py-0.5 rounded text-white min-w-[1.6rem] text-center animate-pulse">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Block: CTA button perfectly aligned to the absolute right side */}
            <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
              <button
                onClick={() => navigate("/ventes-flash")}
                className="group flex gap-2 px-6 bg-gradient-to-r from-[#F37021] to-red-600 hover:from-red-600 hover:to-[#F37021] text-white font-mono font-bold text-xs uppercase items-center justify-center rounded-2xl shadow-[0_4px_15px_rgba(243,112,33,0.3)] hover:shadow-[0_8px_20px_rgba(243,112,33,0.45)] transition-all duration-300 hover:scale-[1.01] active:scale-95 border border-white/10 h-11 shrink-0 w-full md:w-auto"
              >
                <span>{t("VOIR TOUT LE DROP", "VOIR TOUT LE DROP")}</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </button>
            </div>
          </div>

          {/* Carousel with arrows */}
          <div className="relative group/carousel -mx-2 sm:-mx-4 md:mx-0">
            <button
              onClick={() => scroll("left")}
              className="absolute left-4 md:-left-5 top-[35%] -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white border-2 border-orange-200 rounded-full flex flex-col items-center justify-center shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 hidden md:flex active:scale-90"
            >
              <ChevronLeft className="w-6 h-6 text-[#121315]" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="absolute right-4 md:-right-5 top-[35%] -translate-y-1/2 z-20 w-12 h-12 bg-white/90 hover:bg-white border-2 border-orange-200 rounded-full flex flex-col items-center justify-center shadow-xl opacity-0 group-hover/carousel:opacity-100 transition-all hover:scale-110 hidden md:flex active:scale-90"
            >
              <ChevronRight className="w-6 h-6 text-[#121315]" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-4 sm:gap-6 px-2 sm:px-4 pb-4 overflow-y-hidden overscroll-x-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
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
                    <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-orange-100 hover:border-[#F37021]/30 transition-all duration-300">
                      <ProductCard product={product} index={i} variant="flash_sale" />

                      {/* Real stock meter below card - only shown if we have valid logical data */}
                      {showProgress && (
                        <div className="mt-3 px-2 pb-2">
                          <div className="flex justify-between text-[10px] sm:text-[11px] font-black text-[#121315] mb-1">
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
                              className="h-full bg-gradient-to-r from-red-600 to-[#F37021] rounded-full transition-all duration-1000"
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
