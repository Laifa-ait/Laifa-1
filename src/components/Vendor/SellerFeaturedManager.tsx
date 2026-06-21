import React, { useState } from 'react';
import { 
  TrendingUp, 
  Zap, 
  Sparkles, 
  BarChart3, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar,
  CreditCard,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

interface SellerFeaturedManagerProps {
  productId: string;
  currentSales: number;
  currentName: string;
  isFeatured: boolean;
}

export const SellerFeaturedManager: React.FC<SellerFeaturedManagerProps> = ({ 
  productId, 
  currentSales, 
  currentName,
  isFeatured 
}) => {
    const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'performance' | 'boost'>('performance');
  const [isPurchasing, setIsPurchasing] = useState(false);
  
  const SALES_THRESHOLD = 25;
  const progress = Math.min((currentSales / SALES_THRESHOLD) * 100, 100);

  const handlePurchaseBoost = async (packageId: string) => {
    setIsPurchasing(true);
    try {
      // Mock payment simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const durationHours = packageId === 'boost_24h' ? 24 : 48;
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + durationHours);

      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        isFeaturedUntil: expiryDate,
        isFeatured: true,
        lastUpdated: serverTimestamp()
      });

      toast.success(`Produit mis en avant pour ${durationHours}h !`);
    } catch (error) {
      console.error('Boost purchase failed:', error);
      toast.error('Échec de l\'achat du boost.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-[#EBE5DF]/40 overflow-hidden shadow-sm selection:bg-[#EBE5DF]">
      {/* Tabs Header */}
      <div className="flex border-b border-[#EBE5DF]/20 bg-[#FDF9F1]">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal transition-all ${activeTab === 'performance' ? 'text-[#121315] bg-white border-b-2 border-[#121315]' : 'text-zinc-400'}`}
        >
          <BarChart3 className="w-4 h-4" />
          {t("Performance")}</button>
        <button
          onClick={() => setActiveTab('boost')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal transition-all ${activeTab === 'boost' ? 'text-[#F37021] bg-white border-b-2 border-[#F37021]' : 'text-zinc-400'}`}
        >
          <Zap className="w-4 h-4" />
          {t("Boost Payé")}</button>
      </div>

      <div className="p-6 sm:p-8">
        {activeTab === 'performance' ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#121315] uppercase tracking-tight rtl:tracking-normal">{t("Objectif : Incontournable")}</h4>
                <p className="text-blue-600 text-[11px] font-bold mt-0.5">
                  {t("Plus que")}<span className="text-base">{Math.max(SALES_THRESHOLD - currentSales, 0)}</span> {t("ventes pour apparaître sur la page d'accueil !")}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <span className="text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Progression Hebdomadaire")}</span>
                <span className="text-xl font-black text-[#121315] leading-none">{currentSales}/{SALES_THRESHOLD}</span>
              </div>
              <div className="h-4 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50 p-1">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-[#121315] rounded-full shadow-[0_0_12px_rgba(30,67,86,0.3)]"
                />
              </div>
              <p className="text-[10px] rtl:text-[12px] text-zinc-500 font-medium text-center">
                {t("Les \"Incontournables\" sont sélectionnés chaque jour à 3h00 parmi les produits dépassant le seuil de vente.")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#F37021]" />
              <span className="text-[11px] font-black text-[#F37021] uppercase tracking-widest rtl:tracking-normal">{t("Boost immédiat de visibilité")}</span>
            </div>

            <div className="grid gap-4">
              {/* Package 24h */}
              <div className="p-5 bg-white border-2 border-zinc-100 rounded-3xl hover:border-[#F37021]/40 transition-all group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#121315] group-hover:bg-orange-50 transition-colors">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-0.5 whitespace-nowrap">{t("Boost Rapide")}</h5>
                    <p className="text-sm font-black text-[#121315] uppercase leading-none">{t("Visibilité 24h")}</p>
                  </div>
                </div>
                <button 
                  disabled={isPurchasing}
                  onClick={() => handlePurchaseBoost('boost_24h')}
                  className="px-5 py-2.5 bg-[#121315] text-white rounded-full text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#121315]/20 disabled:opacity-50"
                >
                  {t("990 DA")}</button>
              </div>

              {/* Package 48h */}
              <div className="p-5 bg-white border-2 border-zinc-100 rounded-3xl hover:border-[#121315]/40 transition-all group flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#F37021] text-white text-[7px] font-black uppercase px-3 py-1 tracking-widest rtl:tracking-normal">{t("Populaire")}</div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#121315] group-hover:bg-[#121315]/10 transition-colors">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-[#F37021] uppercase tracking-widest rtl:tracking-normal mb-0.5">{t("Maximum Impact")}</h5>
                    <p className="text-sm font-black text-[#121315] uppercase leading-none">{t("Visibilité 48h")}</p>
                  </div>
                </div>
                <button 
                  disabled={isPurchasing}
                  onClick={() => handlePurchaseBoost('boost_48h')}
                  className="px-5 py-2.5 bg-[#F37021] text-white rounded-full text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#F37021]/20 disabled:opacity-50"
                >
                  {t("1790 DA")}</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 bg-zinc-50 rounded-xl flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[9px] rtl:text-[11px] font-black uppercase text-zinc-500 tracking-tight rtl:tracking-normal">{t("Conversion +35%")}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[9px] rtl:text-[11px] font-black uppercase text-zinc-500 tracking-tight rtl:tracking-normal">{t("SAV Prioritaire")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
