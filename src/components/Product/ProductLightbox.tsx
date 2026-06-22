import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

interface ProductLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export const ProductLightbox: React.FC<ProductLightboxProps> = ({ isOpen, onClose, imageUrl, title }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4"
        >
          {/* Header */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white z-10 pt-4 px-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider rtl:tracking-normal text-zinc-100">{title}</h3>
              <p className="text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal text-[#F37021] font-bold">
                {t("Pincez l'écran pour zoomer en HD")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all border border-white/5"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Mobile Zoom Engine */}
          <div className="w-full h-full flex items-center justify-center relative">
            <TransformWrapper initialScale={1} initialPositionX={0} initialPositionY={0}>
              {({ zoomIn, zoomOut, resetTransform }) => {
                return (
                  <div
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full flex flex-col items-center justify-center"
                  >
                    <TransformComponent wrapperClass="!w-full !h-full flex items-center justify-center">
                      <img
                        loading="lazy"
                        src={getOptimizedImageUrl(imageUrl, 1200)}
                        alt={title}
                        draggable={false}
                        className="max-h-[70vh] max-w-full object-contain mx-auto select-none"
                      />
                    </TransformComponent>

                    {/* Control HUD */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-zinc-900/90 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl z-20">
                      <button
                        onClick={() => zoomIn()}
                        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        aria-label={t("Zoom In") || "Zoom In"}
                      >
                        <ZoomIn className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => zoomOut()}
                        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        aria-label={t("Zoom Out") || "Zoom Out"}
                      >
                        <ZoomOut className="w-5 h-5" />
                      </button>
                      <div className="h-4 w-px bg-white/10" />
                      <button
                        onClick={() => resetTransform()}
                        className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                        aria-label={t("Reset Zoom") || "Reset Zoom"}
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              }}
            </TransformWrapper>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
