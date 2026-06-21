import React from 'react';
import { Globe, Info, LogOut, Truck, ChevronRight } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface SupportSectionProps {
  handleLanguageToggle: () => void;
  fetchAboutText: () => void;
  currentUser: any;
  logout: () => void;
  closeMenu: () => void;
  t: (key: string) => string;
  lang: string;
  handleNav: (path: string) => void;
}

export const SupportSection: React.FC<SupportSectionProps> = ({ handleLanguageToggle, fetchAboutText, currentUser, logout, closeMenu, t, lang, handleNav }) => {
  return (
    <div className="pt-6 border-t border-slate-200/60 pb-4">
      <div className="space-y-2">
        <button 
          onClick={handleLanguageToggle}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white border border-slate-200/60 rounded-2xl text-[#121315]/70 hover:text-[#ea580c] hover:border-orange-200 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 ease-out font-bold text-sm cursor-pointer shadow-sm"
        >
          <Globe className="w-5 h-5 text-[#121315]/50" />
          {t("change_language") || "Changer de langue"} ({lang.toUpperCase().split('-')[0]})
        </button>
        <button 
          onClick={fetchAboutText}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white border border-slate-200/60 rounded-2xl text-[#121315]/70 hover:text-[#ea580c] hover:border-orange-200 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 ease-out font-bold text-sm cursor-pointer shadow-sm"
        >
          <Info className="w-5 h-5 text-[#121315]/50" />
          {t("À propos d'Olma")}</button>
        {currentUser && (
          <button 
            onClick={() => { logout(); closeMenu(); }}
            className="w-full flex items-center gap-4 px-5 py-4 bg-white border border-slate-200/60 rounded-2xl text-red-500 hover:bg-red-50 hover:border-red-200 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 ease-out font-bold text-sm cursor-pointer shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            {t("Déconnexion")}</button>
        )}
      </div>
      <button
         onClick={() => handleNav("/shipping-calculator")}
         className="hidden lg:flex mt-4 p-5 bg-orange-650/[0.04] hover:bg-orange-650/[0.08] border-t border-zinc-100 items-center justify-between gap-3 w-full transition-all text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-[#F37021]" />
          <div className="flex flex-col">
            <span className="text-xs rtl:text-sm font-black text-[#121315] uppercase tracking-tight rtl:tracking-normal">{t("Estimer mes frais de port")}</span>
            <span className="text-[10px] rtl:text-[12px] font-bold text-zinc-450">{t("Frais et livraison 58 Wilayas")}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#F37021]" />
      </button>
    </div>
  );
};
