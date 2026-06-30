import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Star, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { useCompareStore } from '../../store/useCompareStore';
import { formatPrice } from '../../utils/format';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/useCartStore';

export const CompareModal: React.FC = () => {
  const { isCompareOpen, setIsCompareOpen, compareList, removeFromCompare, clearCompare } = useCompareStore();
  const { t } = useTranslation();
  const addToCart = useCartStore((state) => state.addToCart);

  if (!isCompareOpen) return null;

  return (
    <AnimatePresence>
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCompareOpen(false)}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white z-10 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#3C2B22]">{t("Comparateur de produits")}</h2>
                <p className="text-sm text-stone-500">{compareList.length} {t("produits sélectionnés")}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCompare}
                  className="text-sm text-stone-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  {t("Tout effacer")}
                </button>
                <button
                  onClick={() => setIsCompareOpen(false)}
                  className="p-2 bg-stone-100 text-stone-500 rounded-full hover:bg-stone-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-x-auto overflow-y-auto bg-stone-50 p-6 custom-scrollbar">
              {compareList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-stone-400">
                  <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t("Le comparateur est vide")}</p>
                  <button 
                    onClick={() => setIsCompareOpen(false)}
                    className="mt-4 px-6 py-2 bg-[#3C2B22] text-white rounded-xl text-sm font-bold"
                  >
                    {t("Découvrir des produits")}
                  </button>
                </div>
              ) : (
                <div className="min-w-max flex gap-6">
                  {/* Features Column (Sticky on Desktop) */}
                  <div className="w-48 shrink-0 flex flex-col pt-[280px] sticky left-0 bg-stone-50 z-10 border-r border-stone-200 pr-4">
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("Prix")}</div>
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("Marque")}</div>
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("État")}</div>
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("Évaluation")}</div>
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("Localisation")}</div>
                    <div className="h-16 flex items-center text-sm font-bold text-stone-400 uppercase tracking-wider">{t("Garantie")}</div>
                  </div>

                  {/* Product Columns */}
                  {compareList.map((product) => (
                    <div key={product.id} className="w-72 shrink-0 flex flex-col relative group">
                      {/* Remove Button */}
                      <button 
                        onClick={() => removeFromCompare(product.id)}
                        className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-md text-stone-400 hover:text-red-500 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Top Card */}
                      <div className="bg-white p-4 rounded-2xl border border-stone-200 h-[260px] flex flex-col mb-6 shadow-sm">
                        <div className="h-32 w-full rounded-xl overflow-hidden bg-stone-100 mb-4">
                          <img src={product.images?.[0] || 'https://via.placeholder.com/300'} alt={product.title} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="font-bold text-[#3C2B22] text-sm line-clamp-2 leading-snug flex-1">{product.title}</h3>
                        <button
                          onClick={() => addToCart(product, 1)}
                          className="w-full mt-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          {t("Ajouter")}
                        </button>
                      </div>

                      {/* Attributes */}
                      <div className="flex flex-col">
                        <div className="h-16 flex items-center font-bold text-[#3C2B22] text-lg">
                          {product.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="text-amber-600">{formatPrice(product.discountPrice)}</span>
                              <span className="text-xs text-stone-400 line-through font-normal">{formatPrice(product.price)}</span>
                            </div>
                          ) : (
                            formatPrice(product.price)
                          )}
                        </div>
                        <div className="h-16 flex items-center text-stone-700 font-medium">
                          {product.brand || <span className="text-stone-300">-</span>}
                        </div>
                        <div className="h-16 flex items-center">
                          <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold uppercase tracking-wide">
                            {product.condition === 'new' ? t("Neuf") : t("Occasion")}
                          </span>
                        </div>
                        <div className="h-16 flex items-center text-stone-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>{product.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-xs text-stone-400">({product.reviewsCount || 0})</span>
                          </div>
                        </div>
                        <div className="h-16 flex items-center text-stone-700 font-medium">
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="w-4 h-4 text-stone-400" />
                            {product.wilaya ? product.wilaya : <span className="text-stone-300">-</span>}
                          </div>
                        </div>
                        <div className="h-16 flex items-center text-stone-700 font-medium">
                           {product.warranty ? (
                             <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                               <ShieldCheck className="w-4 h-4" />
                               {product.warranty}
                             </div>
                           ) : (
                             <span className="text-stone-300">-</span>
                           )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty Slot Placeholder */}
                  {compareList.length < 4 && (
                    <div className="w-72 shrink-0 flex flex-col pt-[280px]">
                       <div className="h-[calc(100%-280px)] border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 gap-3 min-h-[300px]">
                         <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                           <X className="w-6 h-6 rotate-45" />
                         </div>
                         <p className="text-sm font-medium">{t("Ajouter un produit")}</p>
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
