import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone } from 'lucide-react';
import { useTranslation } from "react-i18next";

export const InstallPrompt: React.FC = () => {
    const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Afficher uniquement si c'est la 2eme visite (ou plus) et pas refusé récemment
      const visitCount = parseInt(localStorage.getItem('olmart_visits') || '0');
      const dismissed = localStorage.getItem('olmart_pwa_dismissed');
      
      localStorage.setItem('olmart_visits', (visitCount + 1).toString());

      if (visitCount > 0 && !dismissed) {
        // Delay popup to not interrupt immediate loading
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initialisation compteur visites même si pas de prompt
    if (!localStorage.getItem('olmart_visits')) {
       localStorage.setItem('olmart_visits', '1');
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      (process.env.NODE_ENV === 'debug' ? console.log : function(){})('User accepted the install prompt');
    } else {
      (process.env.NODE_ENV === 'debug' ? console.log : function(){})('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('olmart_pwa_dismissed', new Date().toISOString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-24 md:bottom-6 start-4 end-4 md:start-auto md:w-[350px] bg-white rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] border border-zinc-100 flex gap-4 items-start"
        >
          <div className="w-12 h-12 bg-orange-50 text-[#FF5C00] rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-orange-100">
             <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1 mt-0.5">
             <div className="flex justify-between items-start">
               <h4 className="font-kinder text-[#3C2B22] text-sm tracking-tight rtl:tracking-normal leading-none mb-1.5 pt-0.5">{t("Installez l'application")}</h4>
               <button onClick={handleDismiss} className="text-stone-400 hover:text-stone-600 -mt-1 -mr-1 p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
             <p className="text-xs rtl:text-sm font-bold text-stone-500 leading-snug mb-3">{t("Pour un accès ultra-rapide et un meilleur suivi de vos commandes, même avec peu de réseau.")}</p>
             <button 
               onClick={handleInstall}
               className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF5C00] text-white text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-xl hover:bg-[#FF5C00] transition-colors shadow-sm"
             >
               <Download className="w-3.5 h-3.5" />
               {t("Ajouter à l'écran d'accueil")}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
