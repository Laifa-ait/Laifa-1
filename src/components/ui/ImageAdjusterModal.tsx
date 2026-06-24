import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCw, ZoomIn, Move, Check, X, Sliders } from "lucide-react";

interface ImageAdjusterModalProps {
  src: string;
  type: "logo" | "banner";
  isRTL: boolean;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

export const ImageAdjusterModal: React.FC<ImageAdjusterModalProps> = ({ src, type, isRTL, onClose, onConfirm }) => {
  const [zoom, setZoom] = useState<number>(1);

  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Translations

  const localDict = {
    fr: {
      title: "Ajustement de l'image",
      desc: "Glissez pour déplacer l'image, utilisez la molette ou le curseur pour zoomer.",
      zoom: "Zoom",
      rotate: "Pivoter 90°",
      reset: "Réinitialiser",
      cancel: "Annuler",
      save: "Appliquer & Enregistrer",
      loading: "Traitement de l'image...",
    },
    en: {
      title: "Adjust Image",
      desc: "Drag to pan the image, use the slider to zoom and rotate.",
      zoom: "Zoom",
      rotate: "Rotate 90°",
      reset: "Reset",
      cancel: "Cancel",
      save: "Apply & Save",
      loading: "Processing image...",
    },
    ar: {
      title: "تعديل وضبط الصورة",
      desc: "اسحب لتحريك الصورة، واستخدم شريط التكبير لضبط الحجم والتدوير.",
      zoom: "التكبير",
      rotate: "تدوير بمقدار 90°",
      reset: "إعادة ضبط",
      cancel: "إلغاء",
      save: "تطبيق وحفظ",
      loading: "جاري معالجة الصورة...",
    },
  };

  const t = (key: keyof (typeof localDict)["fr"]) => {
    const lang = isRTL ? "ar" : "fr"; // Defaults to FR
    return localDict[lang]?.[key] || localDict["fr"][key];
  };

  // Dimensions of viewport
  const viewWidth = 320;
  const viewHeight = type === "logo" ? 320 : 120; // banner aspect ratio is wider

  // Pointer event handlers for panners
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Prevent scroll propagation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = 0.1;
    setZoom((prev) => Math.min(5, Math.max(0.1, prev - e.deltaY * 0.002)));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleSave = () => {
    if (!imageRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement("canvas");

      // Determine canvas final target result quality dimensions
      if (type === "logo") {
        canvas.width = 512;
        canvas.height = 512;
      } else {
        canvas.width = 1200;
        canvas.height = 450;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill with clean canvas white background backplate
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Translate center coordinate pivot space
      ctx.translate(canvas.width / 2, canvas.height / 2);

      const displayToCanvasScale = canvas.width / viewWidth;
      const finalPanX = pan.x * displayToCanvasScale;
      const finalPanY = pan.y * displayToCanvasScale;

      // Apply screen-space panning BEFORE rotation
      ctx.translate(finalPanX, finalPanY);

      // Now apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const viewRatio = viewWidth / viewHeight;

      let startWidth = viewWidth;
      let startHeight = viewHeight;

      if (imgRatio > viewRatio) {
        startHeight = viewHeight;
        startWidth = viewHeight * imgRatio;
      } else {
        startWidth = viewWidth;
        startHeight = viewWidth / imgRatio;
      }

      const finalWidth = startWidth * zoom * displayToCanvasScale;
      const finalHeight = startHeight * zoom * displayToCanvasScale;

      // Draw compiled image
      ctx.drawImage(img, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);

      // Convert to high-grade compressed raw image blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onConfirm(blob);
          }
        },
        "image/jpeg",
        0.92
      );
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Dim Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
      />

      {/* Main Adjustment Window Glass Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md border border-zinc-150 shadow-2xl relative overflow-hidden z-10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className={`${isRTL ? "text-right" : "text-left"}`}>
            <h3 className="text-lg font-kinder text-zinc-950 tracking-tight">{t("title")}</h3>
            <p className="text-xs text-zinc-500 font-medium">
              {type === "logo" ? "Format Carré / Cercle" : "Format Large (Couverture)"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-50 hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Interactive Sandbox */}
        <div className="p-8 flex flex-col items-center justify-center bg-zinc-950 border-b border-zinc-100 relative overflow-hidden h-[400px]">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            style={{
              width: `${viewWidth}px`,
              height: `${viewHeight}px`,
              touchAction: "none",
            }}
            className={`relative cursor-grab select-none transition-shadow duration-150 ${
              isDragging ? "cursor-grabbing" : ""
            }`}
          >
            {/* The image (can overflow) */}
            <img
              loading="lazy"
              ref={imageRef}
              src={src}
              alt="Adjustment Preview"
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                const imgRatio = naturalWidth / naturalHeight;
                const viewRatio = viewWidth / viewHeight;

                let startWidth = viewWidth;
                let startHeight = viewHeight;

                if (imgRatio > viewRatio) {
                  startHeight = viewHeight;
                  startWidth = viewHeight * imgRatio;
                } else {
                  startWidth = viewWidth;
                  startHeight = viewWidth / imgRatio;
                }

                setImgSize({ width: startWidth, height: startHeight });
                setImageLoaded(true);
              }}
              style={{
                width: imgSize.width ? `${imgSize.width}px` : "100%",
                height: imgSize.height ? `${imgSize.height}px` : "100%",
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                position: "absolute",
                left: "50%",
                top: "50%",
                maxWidth: "none",
              }}
              draggable={false}
              className="pointer-events-none select-none transition-opacity duration-200"
            />

            {/* The crop bounding box dimming mask using massive ring */}
            <div
              className={`absolute inset-0 pointer-events-none ring-[9999px] ring-zinc-950/70 border-2 border-white ${
                type === "logo" ? "rounded-full" : "rounded-xl"
              }`}
            />

            {/* Visual Indicator lines/masks */}
            {type === "logo" && (
              <div className="absolute inset-0 border-[3px] border-dashed border-white/30 rounded-full pointer-events-none" />
            )}
            <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
              <Move className="w-6 h-6 text-white/50 drop-shadow animate-pulse" />
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 font-semibold absolute bottom-4 text-center z-10 w-full left-0 drop-shadow-md">
            {t("desc")}
          </p>
        </div>

        {/* Interactive Controls Sliders */}
        <div className="p-6 space-y-5">
          {/* Zoom Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-700">
              <span>{t("zoom")}</span>
              <span className="font-mono text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full text-[10px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 text-xs">-</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-1.5 bg-zinc-100 rounded-lg cursor-pointer"
              />
              <span className="text-zinc-400 text-xs">+</span>
            </div>
          </div>

          {/* Buttons Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleRotate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200/80 rounded-2xl text-[11px] font-kinder text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all uppercase tracking-wider"
            >
              <RotateCw className="w-4 h-4 text-zinc-500" />
              <span>{t("rotate")}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 border border-zinc-200/80 rounded-2xl text-[11px] font-kinder text-zinc-500 hover:bg-zinc-50 active:scale-95 transition-all uppercase tracking-wider"
            >
              {t("reset")}
            </button>
          </div>
        </div>

        {/* Action Bar Footer */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-5 rounded-2xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100/50 hover:text-zinc-800 font-extrabold text-xs transition-colors active:scale-95 uppercase tracking-wider"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-xs shadow-lg shadow-zinc-900/15 transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{t("save")}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
