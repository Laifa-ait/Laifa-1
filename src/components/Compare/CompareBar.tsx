import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale } from 'lucide-react';
import { useCompareStore } from '../../store/useCompareStore';
import { useTranslation } from 'react-i18next';

export const CompareBar: React.FC = () => {
  const { compareList, removeFromCompare, clearCompare, setIsCompareOpen, isCompareOpen } = useCompareStore();
  const { t } = useTranslation();

  if (compareList.length === 0 || isCompareOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[95%] md:w-auto max-w-2xl bg-white/80 backdrop-blur-xl border border-stone-200/50 shadow-2xl rounded-2xl p-3 flex flex-col md:flex-row items-center gap-4"
      >
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t("Comparateur")}</p>
              <p className="text-sm font-bold text-[#3C2B22]">{compareList.length} / 4 {t("produits")}</p>
            </div>
          </div>
          
          <button 
            onClick={clearCompare}
            className="md:hidden text-xs text-stone-400 hover:text-red-500"
          >
            {t("Vider")}
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
          {compareList.map((product) => (
            <div key={product.id} className="relative w-12 h-12 rounded-xl border border-stone-200 overflow-hidden shrink-0 group">
              <img src={product.images?.[0] || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeFromCompare(product.id)}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
          {Array.from({ length: 4 - compareList.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-12 h-12 rounded-xl border-2 border-dashed border-stone-200 shrink-0 flex items-center justify-center text-stone-300 bg-stone-50/50">
              <span className="text-xs font-medium">{i + compareList.length + 1}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0">
          <button
            onClick={() => setIsCompareOpen(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-[#3C2B22] hover:bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-stone-900/10 transition-all"
          >
            {t("Comparer")}
          </button>
          <button 
            onClick={clearCompare}
            className="hidden md:flex p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title={t("Vider le comparateur")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
