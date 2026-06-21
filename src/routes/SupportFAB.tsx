import React from "react";
import { MessageSquare } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const SupportFAB: React.FC = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith('/dashboard/admin') || location.pathname.startsWith('/dashboard/seller');
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/forgot-password' || location.pathname === '/verify-email' || location.pathname === '/onboarding';
  const isShop = location.pathname.startsWith('/shop') || location.pathname.startsWith('/catalogue') || location.pathname.startsWith('/ventes-flash') || location.pathname.startsWith('/search');

  if (isDashboard || isAuthPage || isShop) return null;

  return (
    <button
      onClick={() => navigate('/support')}
      className="fixed bottom-24 md:bottom-8 end-4 md:end-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all z-[80] group"
      aria-label={t("Support Support") || "Support Support"}
    >
      <MessageSquare className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
      <div className="absolute -top-1 -end-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black animate-pulse">
        1
      </div>
      
      {/* Tooltip for desktop */}
      <div className="absolute end-full me-4 pointer-events-none opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 rtl:-translate-x-4 rtl:group-hover:translate-x-0 transition-all duration-300 hidden sm:block">
        <div className="bg-zinc-900 text-white text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal px-3 py-2 rounded-xl whitespace-nowrap shadow-xl">
          {t("Support Client")}</div>
      </div>
    </button>
  );
};
