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
  return (
    <div className="space-y-4">
      <div
        onClick={onOpenLightbox}
        onContextMenu={(e) => e.preventDefault()}
        className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-zinc-200/50 group cursor-pointer"
      >
        <div className="hidden md:block w-full h-full">
          <ImageMagnifier
            src={getOptimizedImageUrl(images[selectedIndex], 800)}
            alt={productName}
            className="w-full h-full"
          />
        </div>
        <div className="md:hidden w-full h-full">
          <AnimatePresence mode="wait">
            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              src={getOptimizedImageUrl(images[selectedIndex], 800)}
              draggable={false}
              className="w-full h-full object-cover select-none pointer-events-none"
              alt={productName}
            />
          </AnimatePresence>
        </div>

        {productVideoUrl && !showVideo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowVideo(true);
            }}
            className="absolute bottom-6 right-6 w-16 h-16 bg-white/20 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl border border-white/20"
          >
            <Play className="w-6 h-6 fill-current ml-1" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectImage(i);
                setShowVideo(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-20 h-28 rounded-xl overflow-hidden border-[3px] transition-all shrink-0 ${selectedIndex === i ? "border-[#FF5C00] shadow-md shadow-[#FF5C00]/20 scale-95" : "border-white shadow-sm hover:border-zinc-200"}`}
            >
              <img
                loading="lazy"
                src={getOptimizedImageUrl(img, 200)}
                draggable={false}
                className="w-full h-full object-cover select-none pointer-events-none"
                alt=""
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
