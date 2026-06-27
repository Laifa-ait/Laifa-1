import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageMagnifier } from "../ImageMagnifier";
import { Play, ArrowLeft } from "lucide-react";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";

interface GalleryProps {
  images: string[];
  selectedIndex: number;
  productName: string;
  onSelectImage: (index: number) => void;
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  productVideoUrl?: string;
  onOpenLightbox: () => void;
}

export const ProductGallery: React.FC<GalleryProps> = ({
  images,
  selectedIndex,
  productName,
  onSelectImage,
  showVideo,
  setShowVideo,
  productVideoUrl,
  onOpenLightbox,
}) => {
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swiped left -> next image
      if (selectedIndex < images.length - 1) {
        onSelectImage(selectedIndex + 1);
        setShowVideo(false);
      }
    } else if (info.offset.x > swipeThreshold) {
      // Swiped right -> previous image
      if (selectedIndex > 0) {
        onSelectImage(selectedIndex - 1);
        setShowVideo(false);
      }
    }
  };

  return (
    <div className="space-y-4 -mx-4 sm:mx-0">
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative aspect-[3/4] md:aspect-[4/5] sm:rounded-none overflow-hidden bg-slate-50 group cursor-pointer"
      >
        {showVideo && productVideoUrl ? (
          <div className="absolute inset-0 z-20 bg-black flex items-center justify-center">
            <video
              key={productVideoUrl}
              src={`/api/proxy-video?url=${encodeURIComponent(productVideoUrl)}`}
              controls
              playsInline
              autoPlay
              muted
              loop
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            />
            {productVideoUrl && (
              <a 
                href={productVideoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute top-4 right-[60px] bg-white/80 px-3 py-2 rounded shadow z-30 text-xs font-bold text-black"
              >
                Ouvrir la vidéo
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVideo(false);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors z-30"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* Desktop View with ImageMagnifier */}
        <div className="hidden lg:block w-full h-full bg-slate-50">
          <ImageMagnifier
            src={getOptimizedImageUrl(images[selectedIndex], 1200)}
            alt={productName}
            className="w-full h-full object-cover mix-blend-multiply"
            onClick={onOpenLightbox}
          />
        </div>

        {/* Mobile Swipe-enabled View */}
        <div className="lg:hidden w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              src={getOptimizedImageUrl(images[selectedIndex], 800)}
              draggable="true"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              className="w-full h-full object-cover select-none mix-blend-multiply pointer-events-auto"
              alt={productName}
              onClick={onOpenLightbox}
            />
          </AnimatePresence>

          {/* Swipe indicator dots - Zara minimalist style */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1.5 z-10 px-4">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectImage(idx);
                    setShowVideo(false);
                  }}
                  className={`h-0.5 transition-all duration-300 ${
                    selectedIndex === idx 
                      ? "bg-black w-6" 
                      : "bg-black/20 w-4 hover:bg-black/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {productVideoUrl && !showVideo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVideo(true);
            }}
            className="absolute bottom-6 right-6 w-12 h-12 bg-white/80 backdrop-blur-md text-black flex items-center justify-center hover:bg-white transition-colors z-10"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>
        )}
      </div>

      {(images.length > 1 || productVideoUrl) && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide justify-start sm:justify-start px-4 sm:px-0 mt-2">
          {productVideoUrl && (
            <button
              onClick={() => setShowVideo(true)}
              className={`w-16 h-20 sm:w-20 sm:h-28 overflow-hidden transition-all shrink-0 bg-slate-100 flex items-center justify-center relative ${
                showVideo 
                  ? "border border-black opacity-100" 
                  : "border border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Play className="w-6 h-6 text-black/60 fill-black/60" />
            </button>
          )}
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectImage(i);
                setShowVideo(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-16 h-20 sm:w-20 sm:h-28 overflow-hidden transition-all shrink-0 bg-white ${
                selectedIndex === i && !showVideo
                  ? "border border-black opacity-100" 
                  : "border border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                loading="lazy"
                src={getOptimizedImageUrl(img, 200)}
                draggable={false}
                className="w-full h-full object-cover mix-blend-multiply select-none pointer-events-none"
                alt=""
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
