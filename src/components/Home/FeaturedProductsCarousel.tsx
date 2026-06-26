import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { motion } from "motion/react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Product } from "../../types";
import { MOCK_PRODUCTS } from "../../utils/mockProducts";
import { getTranslatedField } from "../../utils/translations";
import { formatPrice } from "../../utils/format";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const FeaturedProductsCarousel: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as any;

  useEffect(() => {
    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100);
    };
    handleResize(); // trigger on mount
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const docRef = doc(db, "ui_elements", "homepage_featured");
        const docSnap = await getDoc(docRef);

        let items: Product[] = [];
        if (docSnap.exists()) {
          const aggregated = docSnap.data()?.products || [];
          const formatted = aggregated.map((p: any) => ({
            id: p.productId || p.id,
            name: p.name,
            price: p.price,
            promoPrice: p.promoPrice,
            image: p.image,
            category: p.category,
            sellerName: p.sellerName,
            rating: p.rating,
            status: "approved",
          })) as Product[];

          items = formatted;
        }

        if (items.length === 0) {
          items = [];
        }

        setAllProducts(items);
      } catch (error: any) {
        console.error("Error fetching featured products:", error);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const displayProducts = [...allProducts];

  const itemsPerPage = isMobile ? 5 : displayProducts.length || 1;
  const totalPages = Math.ceil(displayProducts.length / itemsPerPage);

  // Reset page when switching mobile/desktop to avoid out of bounds
  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile]);

  const handleNext = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const handlePrev = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);

  const currentProducts = displayProducts.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  if (loading) {
    return (
      <div className="w-full bg-slate-50 py-8 px-4">
        <div className="w-full max-w-[90rem] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pb-12">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i, idx) => {
              const bentoClass =
                idx === 0
                  ? "col-span-2 row-span-2 aspect-square md:aspect-[4/4]"
                  : "col-span-1 row-span-1 aspect-[4/5]";
              return (
                <div
                  key={i}
                  className={`${bentoClass} bg-slate-200 animate-pulse rounded-3xl border border-sky-100`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (allProducts.length === 0) return null;

  return (
    <section className="pt-8 pb-4 sm:pt-12 bg-transparent relative z-20 overflow-hidden">
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        {/* Luxury Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between mb-4 pb-2 relative px-4 gap-6">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left justify-center relative">
            <div className="flex items-center gap-4 mb-4 select-none">
              <span className="text-[10px] rtl:text-[12px] sm:text-[11px] font-sans font-bold tracking-[0.2em] rtl:tracking-normal text-sky-500 uppercase">
                [ {t("home.featured.title_premium")} ]
              </span>
            </div>

            <h3 className="text-3xl sm:text-5xl md:text-6xl font-display font-semibold text-slate-900 uppercase leading-none mb-3 drop-shadow-sm">
              {t("home.featured.title_prefix")}
            </h3>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-colors active:scale-95 shadow-sm hover:shadow-md border-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-colors active:scale-95 shadow-sm hover:shadow-md border-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}
            <button
              onClick={() => navigate("/premium-collection")}
              className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-full text-[10px] rtl:text-[12px] sm:text-xs rtl:text-sm font-sans font-bold uppercase tracking-widest rtl:tracking-normal hover:bg-slate-50 hover:text-sky-600 transition-all shadow-md hover:shadow-xl active:scale-95 group border-2 cursor-pointer"
            >
              {t("home.featured.explore_all")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Neo-Heritage Bento Grid for Featured Products */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pb-12">
          {currentProducts.map((product, idx) => {
            const isPromo = product.promoPrice && product.promoPrice < product.price;
            const translatedName = getTranslatedField(product, "name", lang) || product.name;
            const coverImage =
              getOptimizedImageUrl(product.image, 800) ||
              "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=800";

            // Bento logic: make the first item span 2 rows and columns
            const bentoClass =
              idx === 0
                ? "col-span-2 row-span-2 aspect-square md:aspect-[4/4]"
                : "col-span-1 row-span-1 aspect-[4/5] sm:aspect-square";

            return (
              <motion.div
                key={`${product.id}-${currentPage}-${idx}`}
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: idx * 0.05,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={bentoClass}
              >
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="group relative flex flex-col rounded-3xl overflow-hidden cursor-pointer w-full h-full transition-all duration-500 ease-out bg-white border border-slate-200 shadow-sm md:hover:-translate-y-2 hover:shadow-md"
                >
                  <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors duration-500 z-10 pointer-events-none" />

                  <img
                    src={coverImage}
                    alt={translatedName}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800";
                    }}
                  />

                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                    {idx === 0 && (
                      <span className="bg-slate-900 text-white text-[9px] rtl:text-[11px] font-sans font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm select-none border-none">
                        {t("PIÈCE UNIQUE ARTISANALE")}
                      </span>
                    )}
                    <span className="bg-white text-slate-800 border border-slate-200 text-[9px] rtl:text-[11px] font-sans font-bold uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded-sm shadow-sm select-none">
                      [ {product.category || "PREMIUM"} ]
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-2/3 z-[1] bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none transition-opacity duration-300" />

                  <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-4 flex flex-col shadow-xl">
                    <h4 className="font-sans font-bold text-slate-900 text-[14px] sm:text-[16px] leading-tight uppercase line-clamp-1 group-hover:text-sky-500 transition-colors mb-2">
                      {translatedName}
                    </h4>

                    <div className="flex items-center justify-between">
                      <span
                        className="font-sans font-bold text-slate-900 text-[14px] sm:text-[16px] whitespace-nowrap"
                        dir="ltr"
                      >
                        {formatPrice(product.promoPrice || product.price)}
                      </span>
                      <div className="text-slate-900 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
