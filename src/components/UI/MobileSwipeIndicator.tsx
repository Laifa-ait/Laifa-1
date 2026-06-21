import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const MobileSwipeIndicator: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 1

  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    // Find the closest sibling or child of parent that is horizontally scrollable
    const scrollContainer = indicator.parentElement?.querySelector('.overflow-x-auto') as HTMLElement;
    if (!scrollContainer) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
          const maxScroll = scrollWidth - clientWidth;
          
          if (maxScroll <= 0) {
            setScrollProgress(0);
            ticking = false;
            return;
          }
          
          // Some browsers report negative scrollLeft in RTL, some report positive.
          // Math.abs handles both safely enough for a progress indicator.
          let progress = Math.abs(scrollLeft) / maxScroll;
          
          // Limit to 0-1 range just in case of overscroll bounce
          progress = Math.max(0, Math.min(1, progress));
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial state correctly
    // Also use requestAnimationFrame to let the DOM layout complete
    requestAnimationFrame(handleScroll);

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={indicatorRef} className={`flex md:hidden items-center justify-center gap-1.5 mt-3 w-full ${className}`}>
      {[0, 1, 2].map((i) => {
        // Calculate which dot should be active (0, 1, or 2)
        let activeIndex = Math.round(scrollProgress * 2);
        
        // If RTL, scrollProgress at 0 means we are at the rightmost limit.
        // We invert the index so the dot starts on the right and moves left.
        if (isRTL) {
          activeIndex = 2 - Math.round(scrollProgress * 2);
        }
        
        const isActive = activeIndex === i;
        
        return (
          <div
             key={i}
             className={`h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-orange-500/80 w-4 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-zinc-200 w-1.5'}`}
          />
        );
      })}
    </div>
  );
};

