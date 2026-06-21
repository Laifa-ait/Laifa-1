import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Settings, ShieldCheck, Box, ShoppingBag, Wallet, LayoutDashboard, Menu, X, Home, MessageSquare, Package, Star, Megaphone } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

export const SellerDashboardLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { to: '/dashboard/seller', icon: LayoutDashboard, label: t("seller_overview") || 'Vue d\'ensemble', end: true },
    { to: '/dashboard/seller/catalog', icon: Box, label: t("seller_catalog") || 'Mon Catalogue' },
    { to: '/dashboard/seller/orders', icon: ShoppingBag, label: t("seller_orders") || 'Commandes' },
    { to: '/dashboard/seller/returns', icon: Package, label: t("seller.menu.returns") || 'Gestion des Retours' },
    { to: '/dashboard/seller/sponsorships', icon: Megaphone, label: t("seller.menu.sponsorships") || 'Sponsoring' },
    { to: '/dashboard/seller/reviews', icon: Star, label: t("seller.menu.reviews") || 'Avis Clients' },
    { to: '/dashboard/seller/wallet', icon: Wallet, label: t("seller_wallet") || 'Portefeuille' },
    { to: '/dashboard/seller/verification', icon: ShieldCheck, label: t("seller_verification") || 'Vérification Profil' },
    { to: '/dashboard/seller/settings', icon: Settings, label: t("seller_settings") || 'Paramètres Boutique' },
    { to: '/dashboard/seller/support', icon: MessageSquare, label: t("seller.menu.support") || 'Messages Support' },
  ];

  const isUnverified = userProfile && userProfile.role === 'seller' && userProfile.isVerified === false;

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col lg:flex-row pb-20 lg:pb-0">
      {/* Velocity Suspension Alert */}
      {userProfile?.velocitySuspended && (
        <div className="fixed top-24 md:top-20 end-4 start-4 md:start-auto md:w-96 z-[110] bg-white border border-[#E3000F] shadow-2xl rounded-2xl p-4 flex gap-4 animate-in slide-in-from-right">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E3000F] shrink-0 flex items-center justify-center">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <p className="text-sm font-black text-[#E3000F] uppercase tracking-widest rtl:tracking-normal">{t("Alerte de Vélocité")}</p>
               <p className="text-xs text-zinc-600 font-medium mt-1 leading-relaxed">{userProfile?.bgSuspended_reason || "Votre boutique est temporairement mise en pause car vous avez accumulé trop de commandes en attente d'expédition. Veuillez expédier vos commandes pour réactiver votre boutique."}</p>
            </div>
        </div>
      )}

      {/* Verification Badge */}
      {isUnverified && (
        <div className="fixed top-20 end-4 z-[100] bg-white border border-rose-200 shadow-xl rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
               <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
               <p className="text-xs font-black text-zinc-950 uppercase tracking-widest rtl:tracking-normal">{t("Compte en Sandbox")}</p>
               <p className="text-[10px] text-zinc-500 font-medium">{t("Boutique en attente de vérification.")}</p>
            </div>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between w-full h-16 px-4 bg-white border-b border-zinc-100 sticky top-0 z-[40] shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-900 transition-colors bg-zinc-50 border-none cursor-pointer"
            id="seller-mobile-menu-open"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-white">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-sm font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Espace Vendeur")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             type="button"
             onClick={() => navigate("/")}
             className="p-2 text-zinc-500 hover:text-[#ea580c] transition-colors bg-transparent border-none text-xs font-bold uppercase tracking-wider rtl:tracking-normal flex items-center gap-1.5 cursor-pointer"
           >
             <Home className="w-5 h-5" />
           </button>
           <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-black text-[10px] text-zinc-600">
              {currentUser?.email?.substring(0, 1).toUpperCase()}
           </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile (App-like feel) */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
         <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/50 shadow-2xl rounded-[2rem] p-2 flex items-center justify-around">
            {[
               { to: '/dashboard/seller', icon: LayoutDashboard },
               { to: '/dashboard/seller/orders', icon: ShoppingBag },
               { to: '/dashboard/seller/catalog', icon: Box },
               { to: '/dashboard/seller/wallet', icon: Wallet },
            ].map((item) => (
               <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard/seller'}
                  className={({ isActive }) => 
                     `p-4 rounded-2xl transition-all ${
                        isActive 
                        ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-500/30' 
                        : 'text-zinc-400 hover:text-zinc-900'
                     }`
                  }
               >
                  <item.icon className="w-6 h-6" />
               </NavLink>
            ))}
         </div>
      </div>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
            {/* Drawer content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed start-0 top-0 bottom-0 w-[280px] sm:w-[300px] bg-white z-[60] flex flex-col lg:hidden border-e border-zinc-100 shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center text-white">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("OLMA")}</h1>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Seller Space")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1 px-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-700 transition-all bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black transition-all ${
                        isActive 
                        ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-500/15' 
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                      }`
                    }
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    {item.label}
                  </NavLink>
                ))}
                
                <button
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    if (currentUser) navigate(`/store/${currentUser.uid}`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 mt-2 rounded-xl text-xs font-black text-orange-600 bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer border-none text-start"
                >
                  <Store className="w-4.5 h-4.5" />
                  {t("Voir ma vitrine")}</button>
              </nav>

              <div className="p-6 border-t border-zinc-50">
                 <div className="bg-zinc-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 text-center">{t("Support Vendeur")}</p>
                    <button 
                      type="button"
                      className="w-full bg-white text-zinc-950 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal shadow-sm hover:bg-zinc-100 transition-colors bg-transparent border-none cursor-pointer"
                    >
                       {t("Ouvrir un Ticket")}</button>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-72 bg-white border-e border-zinc-100 sticky top-0 h-screen hidden lg:flex flex-col shrink-0">
        <div className="p-8 border-b border-zinc-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-lg">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("OLMA")}</h1>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Seller Space")}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 
                `flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-black transition-all ${
                  isActive 
                  ? 'bg-[#ea580c] text-white shadow-lg shadow-orange-500/20' 
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => currentUser ? navigate(`/store/${currentUser.uid}`) : null}
            className="w-full flex items-center gap-3 px-5 py-4 mt-2 rounded-2xl text-sm font-black text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 transition-all cursor-pointer border-none text-start"
          >
            <Store className="w-5 h-5" />
            {t("Voir ma vitrine")}</button>
          
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-black text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all bg-transparent border-none cursor-pointer text-start focus:outline-none"
          >
            <Home className="w-5 h-5" />
            {t("Accueil Olma")}</button>
        </nav>

        <div className="p-6 border-t border-zinc-50">
           <div className="bg-zinc-50 rounded-2xl p-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 text-center">{t("Support Vendeur")}</p>
              <button 
                type="button"
                className="w-full bg-white text-zinc-950 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal shadow-sm hover:bg-zinc-100 transition-colors cursor-pointer border-none"
              >
                 {t("Ouvrir un Ticket")}</button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8 lg:p-12">
           <Outlet />
        </div>
      </main>
    </div>
  );
};
