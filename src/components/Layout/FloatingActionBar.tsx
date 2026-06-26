import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export const FloatingActionBar: React.FC = () => {
  const { t } = useTranslation();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowScrollTop(window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="hidden md:flex fixed bottom-6 right-6 z-[90]">
      <div
        className={`transition-all duration-500 origin-bottom ${showScrollTop ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-4 pointer-events-none"}`}
      >
        <button
          onClick={scrollToTop}
          className="group relative w-12 h-12 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md border border-slate-200/50 text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer"
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />

          <div className="absolute end-full me-4 pointer-events-none opacity-0 group-hover:opacity-100 translate-x-4 rtl:-translate-x-4 group-hover:translate-x-0 transition-all duration-300">
            <div className="bg-slate-900 text-white text-[10px] font-sans font-bold uppercase tracking-widest rtl:tracking-normal px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
              {t("scroll_up") || "Remonter"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

