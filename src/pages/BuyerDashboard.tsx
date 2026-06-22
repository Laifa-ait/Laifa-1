import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, Package, Heart, LogOut, ChevronRight, Settings, ShoppingBag, Clock, ShieldCheck, ArrowLeft, Store, MapPin, Sparkles, Wallet, RotateCcw, Star, Store as StoreIcon } from 'lucide-react';
import { BuyerSupport } from './BuyerSupport';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { formatPrice } from '../utils/format';
import { getRetroAvatar } from '../utils/avatar';

// Core Modular Components
import { AddressManager } from '../components/Buyer/AddressManager';
import { ProfileSettings } from '../components/Buyer/ProfileSettings';
import { SecuritySettings } from '../components/Buyer/SecuritySettings';
import { CustomerPreferences } from '../components/Buyer/CustomerPreferences';
import { WalletHistory } from '../components/Buyer/WalletHistory';
import { ReturnManagement } from '../components/Buyer/ReturnManagement';
import { MyReviews } from '../components/Buyer/MyReviews';
import { FollowedStores } from '../components/Buyer/FollowedStores';

export const BuyerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const ORDERS_PER_PAGE = 5;

  // Modern UI multi-tab router (Module 5)
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile' | 'security' | 'preferences' | 'support' | 'wallet' | 'returns' | 'reviews' | 'following'>('orders');

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth', { replace: true });
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "orders"), 
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(ORDERS_PER_PAGE)
        );
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, navigate]);

  const loadMoreOrders = async () => {
    if (!currentUser || !lastVisible) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "orders"), 
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(ORDERS_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(prev => [...prev, ...newOrders]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (err) {
      console.error("Error fetching more orders:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">
      {/* Mobile-first top header navigation tabs */}
      <div className="md:hidden mb-6 overflow-x-auto -mx-4 px-4 flex gap-2 pb-2 scrollbar-none snap-x">
        {[
          { id: 'orders', icon: Package, label: t("dashboard.tabs.orders") },
          { id: 'wallet', icon: Wallet, label: t("dashboard.tabs.wallet") },
          { id: 'returns', icon: RotateCcw, label: t("dashboard.tabs.returns") },
          { id: 'reviews', icon: Star, label: t("dashboard.tabs.evaluations") || "Mes Avis" },
          { id: 'following', icon: StoreIcon, label: t("dashboard.tabs.followed_stores") || "Boutiques Suivies" },
          { id: 'profile', icon: Settings, label: t("profile_addresses") },
          { id: 'preferences', icon: Sparkles, label: t("dashboard.tabs.preferences") || "Mes Préférences" },
          { id: 'security', icon: ShieldCheck, label: t("dashboard.tabs.security") || "Sécurité" },
          { id: 'support', icon: Headphones, label: t("support") },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-250 snap-start border ${
                isSelected 
                  ? 'bg-[#121315] text-white border-[#121315] shadow-md' 
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#F37021]' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 animate-in fade-in duration-300">
        {/* Sidebar */}
        <div className="col-span-1 md:col-span-4 lg:col-span-3 space-y-4 md:space-y-6">
          {/* Compact Profile Card */}
          <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#EBE5DF]/60 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ea580c]/5 rounded-full blur-2xl pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
              <img loading="lazy" 
                src={userProfile?.photoURL || currentUser.photoURL || getRetroAvatar(currentUser.email || currentUser.uid)} 
                className="w-full h-full object-cover" 
                alt={userProfile?.displayName} 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-extrabold text-[#121315] truncate text-lg leading-tight">
                {userProfile?.displayName || currentUser.displayName}
              </h2>
              <p className="text-[#ea580c] text-[10px] font-black uppercase tracking-widest rtl:tracking-normal mt-1 truncate">
                {userProfile?.role === 'admin' ? t("common.admin") : (userProfile?.role === 'seller' ? t("common.seller") : t("common.buyer"))}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FAF8F5] to-[#EBE5DF]/40 border border-[#EBE5DF]/60 rounded-3xl p-5 shadow-sm text-[#121315] relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-full h-full bg-[#FAF8F5]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
             <p className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-stone-500 mb-1">{t("dashboard.wallet.title")}</p>
             <h3 className="text-2xl font-black tracking-tight rtl:tracking-normal text-[#121315]">{formatPrice(userProfile?.walletBalance || 0)}</h3>
             <p className="text-[9px] font-medium text-stone-500 mt-2 leading-relaxed">
                {t("dashboard.wallet.desc")}
             </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-3xl p-5 shadow-sm text-[#121315] relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-stone-500 mb-1">{t("dashboard.loyalty.title")}</p>
             <h3 className="text-2xl font-black tracking-tight rtl:tracking-normal text-[#F37021]">{formatPrice(userProfile?.cashbackBalance || 0)}</h3>
             <p className="text-[9px] font-medium text-stone-500 mt-2 leading-relaxed">
                {t("dashboard.loyalty.desc")}
             </p>
          </div>

          {/* Desktop/Tablet Left Nav Menu */}
          <nav className="hidden md:block bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden p-3 space-y-1">
            {[
              { id: 'orders', icon: Package, label: t("dashboard.tabs.orders") },
              { id: 'wallet', icon: Wallet, label: t("dashboard.tabs.wallet") },
              { id: 'returns', icon: RotateCcw, label: t("dashboard.tabs.returns") },
              { id: 'reviews', icon: Star, label: t("dashboard.tabs.evaluations") || "Mes Avis" },
              { id: 'following', icon: StoreIcon, label: t("dashboard.tabs.followed_stores") || "Boutiques Suivies" },
              { id: 'profile', icon: Settings, label: t("profile_addresses") },
              { id: 'preferences', icon: Sparkles, label: t("dashboard.tabs.preferences") || "Mes Préférences" },
              { id: 'security', icon: ShieldCheck, label: t("dashboard.tabs.security") || "Sécurité" },
              { id: 'support', icon: Headphones, label: t("support") },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all border-none ${
                    isActive 
                      ? 'bg-[#121315] text-white shadow-md' 
                      : 'bg-transparent text-zinc-600 hover:bg-[#FAF8F5] hover:text-[#121315]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-[#F37021]' : 'text-zinc-400'}`} />
                    <span className="font-bold text-sm tracking-tight rtl:tracking-normal">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 rtl:rotate-180 text-[#F37021]" />}
                </button>
              );
            })}
            
            <div className="h-[1px] bg-zinc-100 my-2 mx-4" />
            
            {[
              { icon: Heart, label: t("wishlist"), onClick: () => navigate('/shop') },
              ...(userProfile?.role === 'admin' ? [{ icon: ShieldCheck, label: t("administration"), onClick: () => navigate('/dashboard/admin') }] : []),
              ...(userProfile?.role === 'seller' ? [{ icon: Store, label: t("seller_dashboard"), onClick: () => navigate('/dashboard/seller') }] : []),
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-zinc-600 hover:bg-[#FAF8F5] hover:text-[#121315] border-none bg-transparent"
              >
                <item.icon className="w-5 h-5 text-zinc-400" />
                <span className="font-bold text-sm tracking-tight rtl:tracking-normal">{item.label}</span>
              </button>
            ))}
            
            <div className="h-[1px] bg-zinc-100 my-2 mx-4" />
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm border-none bg-transparent"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="tracking-tight rtl:tracking-normal">{t("logout") || "Déconnexion"}</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-6 md:space-y-8">
          {activeTab === 'orders' && (
            <>
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-[#121315] tracking-tight rtl:tracking-normal">{t("dashboard.title")}</h1>
                  <p className="text-zinc-500 text-sm mt-1">{t("dashboard.subtitle")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white px-5 py-3 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#ea580c]">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none mb-1">{t("dashboard.stats.orders")}</p>
                      <p className="font-black text-lg text-[#121315] leading-none">{orders.length}</p>
                    </div>
                  </div>
                </div>
              </header>

              <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-[#121315]">
                    <Clock className="w-5 h-5 text-zinc-400" />
                    {t("recent_orders")}
                  </h3>
                </div>

                <div className="p-0">
                  {loading ? (
                    <div className="p-6 space-y-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-3xl bg-zinc-50 animate-pulse">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-zinc-200/60 rounded-2xl" />
                            <div className="space-y-2">
                              <div className="h-4 w-32 bg-zinc-200/60 rounded-lg animate-pulse" />
                              <div className="h-3 w-44 bg-zinc-200/40 rounded-lg animate-pulse" />
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="space-y-2">
                              <div className="h-3 w-12 bg-zinc-200/60 rounded animate-pulse" />
                              <div className="h-4 w-20 bg-zinc-200/80 rounded animate-pulse" />
                            </div>
                            <div className="w-10 h-10 bg-zinc-200/60 rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-8 md:p-12 min-h-[400px] flex flex-col justify-center items-center text-center bg-[#FAF8F5] m-4 md:m-6 rounded-3xl border border-[#EBE5DF]/50 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/10 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="w-16 h-16 bg-white border border-[#EBE5DF]/60 rounded-full flex items-center justify-center mx-auto text-zinc-400 shadow-sm relative z-10 mb-6">
                        <ShoppingBag className="w-8 h-8 text-[#ea580c]" />
                      </div>
                      
                      <h4 className="text-xl md:text-2xl font-black text-[#121315] tracking-tight rtl:tracking-normal relative z-10">{t("dashboard.no_purchases")}</h4>
                      <p className="text-xs text-zinc-500 mt-3 max-w-md mx-auto font-medium leading-relaxed relative z-10">
                        {t("dashboard.no_purchases_desc") || "Vous n'avez pas encore passé de commande sur notre plateforme. Nos vendeurs des 58 Wilayas proposent des produits uniques."}
                      </p>
                      
                      <button 
                        onClick={() => navigate('/shop')}
                        className="mt-8 relative z-10 inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#121315] hover:bg-[#0a0b0c] text-white font-extrabold text-[11px] uppercase tracking-widest rtl:tracking-normal rounded-2xl shadow-lg shadow-[#121315]/20 transition-all active:scale-95 border-none cursor-pointer"
                      >
                        {t("dashboard.explore_catalog") || "Explorer le Catalogue"}
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-50">
                      {orders.map((order) => {
                        
                        return (
                                              <div key={order.id} className="p-6 hover:bg-zinc-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                                                <div className="flex items-center gap-4">
                                                  <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center overflow-hidden">
                                                    {order.items?.[0]?.image ? (
                                                       <img loading="lazy" src={order.items[0].image} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                       <Package className="w-6 h-6 text-zinc-400" />
                                                    )}
                                                  </div>
                                                  <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="font-black text-sm tracking-tight rtl:tracking-normal text-[#121315]">{t("dashboard.orders.id_prefix") || "Commande #"} {order.id.substring(0, 8)}</span>
                                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest rtl:tracking-normal ${
                                                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                        order.status === 'pending' ? 'bg-orange-100 text-[#ea580c]' : 'bg-zinc-100 text-zinc-600'
                                                      }`}>
                                                        {order.status === 'pending' ? t("status_pending") : t("order.status.completed") || "Terminée"}
                                                      </span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 font-medium">{order.items?.length || 0} {t("articles •")}{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                                                  <div className="text-right">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1">{t("Total")}</p>
                                                    <p className="font-black text-lg text-[#121315]">{formatPrice(order.total)}</p>
                                                  </div>
                                                  <button onClick={() => navigate(`/dashboard/buyer/order/${order.id}`)} className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-400 flex items-center justify-center group-hover:bg-[#121315] group-hover:border-[#121315] group-hover:text-white transition-all cursor-pointer">
                                                    <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                      })}
                    </div>
                  )}
                  {lastVisible && orders.length > 0 && (
                    <div className="p-6 border-t border-zinc-50 flex justify-center bg-zinc-50/10">
                      <button 
                        onClick={loadMoreOrders} 
                        disabled={loadingMore}
                        className="px-8 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-widest rtl:tracking-normal rounded-xl hover:bg-zinc-50 transition-all active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
                      >
                        {loadingMore ? t("common.loading") || "Chargement..." : t("common.load_more") || "Charger plus"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-12">
              <ProfileSettings currentUser={currentUser} userProfile={userProfile} />
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-zinc-200/85" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#FAF8F5] px-4 text-stone-400 font-sans text-[10px] tracking-widest uppercase font-black">
                    {t("addresses_management")}
                  </span>
                </div>
              </div>

              <AddressManager currentUser={currentUser} userProfile={userProfile} />
            </div>
          )}

          {activeTab === 'security' && (
            <SecuritySettings currentUser={currentUser} />
          )}

          {activeTab === 'support' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-100 shadow-sm">
               <BuyerSupport />
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletHistory currentUser={currentUser} userProfile={userProfile} />
          )}

          {activeTab === 'returns' && (
            <ReturnManagement currentUser={currentUser} />
          )}

          {activeTab === 'reviews' && (
            <MyReviews currentUser={currentUser} />
          )}

          {activeTab === 'following' && (
            <FollowedStores currentUser={currentUser} />
          )}

          {activeTab === 'preferences' && (
            <CustomerPreferences currentUser={currentUser} userProfile={userProfile} />
          )}
        </div>
      </div>
    </div>
  );
};
