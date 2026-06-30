import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, Image as ImageIcon, Heart, ShoppingBag, MessageCircle, Truck } from "lucide-react";

interface CurationMobilePreviewProps {
  product: any;
}

export const CurationMobilePreview: React.FC<CurationMobilePreviewProps> = ({ product }) => {
  const { t } = useTranslation();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image index when the product changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const currentImg = images[activeImageIndex] || product.image;

  return (
    <div className="space-y-4 w-full max-w-[340px]">
      {/* Visual Label */}
      <div className="flex items-center gap-2 justify-center text-[10px] font-kinder text-zinc-400 uppercase tracking-widest">
        <Smartphone className="w-4 h-4" />
        {t("Preview du rendu sur mobile")}
      </div>

      {/* NATIVE PHONE CONTAINER */}
      <div className="w-full aspect-[9/18.5] bg-zinc-950 rounded-[44px] p-3 shadow-2xl relative border-4 border-zinc-800 ring-1 ring-white/10 overflow-hidden flex flex-col">
        {/* Top Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-zinc-950 rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-zinc-800 rounded-full" />
        </div>

        {/* App Internal Frame */}
        <div className="w-full h-full bg-[#FCFAF7] rounded-[36px] overflow-hidden flex flex-col relative text-zinc-900 text-xs">
          {/* Sub-header status bar space */}
          <div className="h-6 bg-transparent shrink-0 flex items-center justify-between px-6 text-[9px] font-bold text-zinc-400 select-none">
            <span>12:45</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 bg-zinc-400 rounded-sm" />
            </div>
          </div>

          {/* Store Header App Bar */}
          <div className="h-10 bg-white/70 border-b border-zinc-100 flex items-center justify-between px-4 sticky top-0 z-40">
            <span className="font-kinder text-[10px] text-zinc-800 uppercase tracking-wide">
              Olmart Marketplace
            </span>
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-zinc-400" />
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
            </div>
          </div>

          {/* Scrollable Viewport */}
          <div className="flex-1 overflow-y-auto pb-14">
            {/* Image Slide Carousel */}
            <div className="aspect-square bg-zinc-100 relative overflow-hidden">
              {currentImg ? (
                <>
                  <img
                    src={currentImg}
                    alt="Mobile preview"
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 px-2 py-1 rounded-full">
                      {images.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setActiveImageIndex(i)}
                          className={`w-1.5 h-1.5 rounded-full border-none cursor-pointer ${
                            i === activeImageIndex ? "bg-[#FF5C00]" : "bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Product Info Section */}
            <div className="p-4 space-y-3">
              {/* Price Tag with Promo Support */}
              <div className="flex items-baseline gap-2">
                {(() => {
                  const price = Number(product.price || 0);
                  const promoPrice = product.promoPrice ? Number(product.promoPrice) : null;

                  if (promoPrice && promoPrice < price) {
                    return (
                      <>
                        <span className="text-base font-kinder text-[#FF5C00]">
                          {promoPrice} DA
                        </span>
                        <span className="text-[10px] text-zinc-400 line-through font-bold">
                          {price} DA
                        </span>
                      </>
                    );
                  }
                  return (
                    <span className="text-base font-kinder text-zinc-900">
                      {price} DA
                    </span>
                  );
                })()}
              </div>

              {/* Title */}
              <h3 className="text-xs font-kinder text-zinc-900 uppercase leading-snug">
                {product.name}
              </h3>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1">
                <span className="bg-green-50 text-green-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                  {t("Authentique")}
                </span>
                <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                  {t("Garantie Qualité")}
                </span>
                {product.freeShipping && (
                  <span className="bg-orange-50 text-[#FF5C00] text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                    {t("Livraison Gratuite")}
                  </span>
                )}
              </div>

              {/* Seller shop header widget */}
              <div className="bg-white p-2.5 rounded-xl border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-zinc-200">
                    {(product.sellerName || "P")[0]}
                  </div>
                  <div>
                    <h5 className="text-[9px] font-kinder text-zinc-800 uppercase tracking-tight">
                      {product.sellerName || t("Vendeur Créateur")}
                    </h5>
                    <p className="text-[8px] text-zinc-400 font-bold">
                      {t("Artisan Certifié Olmart")}
                    </p>
                  </div>
                </div>
                <span className="text-[8px] font-kinder bg-[#FAF8F5] text-zinc-600 border border-zinc-200/60 px-2 py-0.5 rounded-md">
                  {t("Visiter")}
                </span>
              </div>

              {/* Shipping details (COD support & 58 Wilayas) */}
              <div className="bg-amber-50/40 border border-amber-100 p-2.5 rounded-xl space-y-1.5">
                <h4 className="text-[8px] font-kinder text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <Truck className="w-3 h-3 text-[#FF5C00]" />
                  {t("Logistique & Expédition Algérie")}
                </h4>
                <p className="text-[8px] text-zinc-500 font-medium">
                  {t("Paiement à la livraison (Cash on Delivery) supporté dans")}{" "}
                  <strong>58 wilayas</strong>.
                </p>
              </div>

              {/* Description detailed layout */}
              <div className="space-y-1">
                <h4 className="text-[8px] font-kinder text-zinc-400 uppercase tracking-wider">
                  {t("Description de l'article")}
                </h4>
                <p className="text-[9px] text-zinc-600 font-medium leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* Sticky App Bottom Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-white border-t border-zinc-100 flex items-center justify-between px-3 z-40">
            <button className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-500 bg-transparent cursor-pointer">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button className="flex-1 ms-2 py-2 bg-[#FF5C00] text-white text-[9px] font-kinder uppercase tracking-widest rounded-xl border-none cursor-pointer text-center">
              {t("Ajouter au panier")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
