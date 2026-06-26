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
          className="fixed inset-0 z-[9999] bg-black/90"
          onClick={onClose}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between text-white z-[10000]" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <h3 className="text-sm font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-100">{title}</h3>
              <p className="text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal text-[#FF5C00] font-bold">
                {t("Pincez l'écran pour zoomer en HD")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all border border-white/5"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Mobile Zoom Engine - Absolutely positioned to cover screen and center content */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <TransformWrapper 
              initialScale={1} 
              initialPositionX={0} 
              initialPositionY={0}
              panning={{ disabled: false }}
              limitToBounds={true}
              centerOnInit={true}
              centerZoomedOut={true}
            >
              {({ zoomIn, zoomOut, resetTransform }) => {
                return (
                  <div
                    onContextMenu={(e) => e.preventDefault()}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <TransformComponent 
                      wrapperStyle={{ width: "100vw", height: "100vh" }}
                      contentStyle={{ width: "max-content", height: "max-content" }}
                    >
                      <img
                        loading="lazy"
                        src={getOptimizedImageUrl(imageUrl, 1200)}
                        alt={title}
                        draggable={false}
                        className="max-h-screen max-w-[100vw] object-contain select-none block"
                      />
                    </TransformComponent>

                    {/* Control HUD - Absolutely positioned to not affect image centering */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-zinc-900/90 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl z-[10000]">
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
