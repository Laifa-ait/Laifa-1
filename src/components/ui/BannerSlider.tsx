import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Banner {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  buttonText: string;
  typeDestination?: string;
  cibleDestination?: string;
}

interface BannerSliderProps {
  banners: Banner[];
  onAction: (banner: Banner) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners, onAction }) => {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (activeBannerIndex + 1) % banners.length;
      scrollToBanner(nextIndex);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBannerIndex, banners.length]);

  const scrollToBanner = (index: number) => {
    if (!bannerScrollRef.current) return;
    isProgrammaticScroll.current = true;
    bannerScrollRef.current.scrollTo({
      left: index * bannerScrollRef.current.offsetWidth,
      behavior: "smooth",
    });
    setActiveBannerIndex(index);
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);
  };

  return (
    <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-8 pt-6 mb-6 transition-opacity duration-300">
      <div className="relative w-full aspect-video md:aspect-[21/9] rounded-[2rem] group overflow-hidden bg-white shadow-sm">
        <div
          ref={bannerScrollRef}
          className="relative w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
          onScroll={(e) => {
            if (isProgrammaticScroll.current) return;
            const target = e.target as HTMLElement;
            const newIndex = Math.round(target.scrollLeft / target.offsetWidth);
            if (activeBannerIndex !== newIndex) {
              setActiveBannerIndex(newIndex);
            }
          }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id || index}
              className="relative w-full h-full flex-shrink-0 snap-start flex items-end p-6 lg:p-12 overflow-hidden select-none cursor-pointer"
              onClick={() => onAction(banner)}
            >
              <div className="absolute inset-0">
                <picture className="w-full h-full">
                  {banner.image.includes("w=2000") && (
                    <source srcSet={banner.image.replace("w=2000", "w=800")} media="(max-width: 768px)" />
                  )}
                  <img
                    loading="lazy"
                    src={banner.image}
                    className="w-full h-full object-cover object-center select-none"
                    alt={banner.title}
                  />
                </picture>
                <div className="absolute bottom-0 start-0 end-0 h-3/4 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 start-0 w-3/4 h-full bg-gradient-to-e from-black/60 via-black/10 to-transparent sm:block hidden" />
              </div>
              <div className="relative z-10 max-w-xl text-white">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight rtl:tracking-normal mb-3 leading-tight drop-shadow-lg">
                    {banner.title}
                  </h2>
                  <p className="text-zinc-200 text-xs rtl:text-sm lg:text-sm mb-5 leading-relaxed drop-shadow-md font-medium line-clamp-2">
                    {banner.subtitle}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(banner);
                    }}
                    className="inline-flex items-center gap-2 bg-white text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal hover:bg-zinc-100 transition-colors shadow-lg"
                  >
                    {banner.buttonText}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            </div>
          ))}
        </div>

        {/* Indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 start-1/2 -translate-x-1/2 flex gap-2 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToBanner(i)}
                className={`h-1.5 transition-all duration-300 rounded-full ${
                  activeBannerIndex === i ? "w-8 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
