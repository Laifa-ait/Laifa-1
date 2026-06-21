import React, { useState, useEffect } from 'react';
import { Store, UserCheck, Search, ArrowRight, UserMinus, Sparkles, MapPin, Package, Heart, RefreshCw, Star, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../ui/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { ALGERIA_WILAYAS } from '../../constants';
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

// Aesthetic pastel gradients for Gen-Z empty banners
const PRESET_GRADIENTS = [
  "from-amber-100 to-orange-50",
  "from-violet-100 to-indigo-50",
  "from-teal-100 to-emerald-50",
  "from-rose-100 to-pink-50",
  "from-sky-100 to-blue-50",
];

export const FollowedStores: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const { t } = useTranslation();
  const [stores, setStores] = useState<any[]>([]);
  const [allSellers, setAllSellers] = useState<any[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, any[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'followed' | 'explore'>('followed');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWilaya, setSelectedWilaya] = useState('Tous');
  const [showAllWilayas, setShowAllWilayas] = useState(false);

  // Unfollow confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [storeToUnfollow, setStoreToUnfollow] = useState<any | null>(null);
  
  // Follow/Unfollow request debounce per store
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const navigate = useNavigate();

  // Popular Wilayas for quick pill selection
  const HOT_WILAYAS = ['Tous', '16 Alger', '31 Oran', '25 Constantine', '09 Blida', '15 Tizi Ouzou', '35 Boumerdès', '19 Sétif'];

  // 1. Fetch followed stores (subscriptions)
  useEffect(() => {
    const fetchStores = async () => {
      if (!currentUser) return;
      try {
        const snap = await getDocs(query(collection(db, "users", currentUser.uid, "following"), limit(100)));
        const fetchedStores = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStores(fetchedStores);
        
        // If user follows nothing, automatically open 'explore' tab to keep them engaged
        if (fetchedStores.length === 0) {
          setActiveTab('explore');
        }
      } catch (err) {
        console.error("Error fetching followed stores", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, [currentUser]);

  // 2. Fetch public sellers & recent active products concurrently for visual product previews
  useEffect(() => {
    const fetchExploreData = async () => {
      setExploreLoading(true);
      try {
        // Fetch top public profiles for explore feed
        const sellersSnap = await getDocs(query(collection(db, "publicProfiles"), limit(50)));
        const profiles = sellersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllSellers(profiles);

        // Fetch active products to group under their respective seller's preview slider
        const productsSnap = await getDocs(
          query(collection(db, "products"), where("status", "==", "active"), limit(120))
        );
        
        const tempMap: Record<string, any[]> = {};
        productsSnap.docs.forEach(doc => {
          const data: any = { id: doc.id, ...doc.data() };
          if (data.sellerId) {
            if (!tempMap[data.sellerId]) {
              tempMap[data.sellerId] = [];
            }
            if (tempMap[data.sellerId].length < 3) {
              tempMap[data.sellerId].push(data);
            }
          }
        });
        setProductsMap(tempMap);
      } catch (err) {
        console.error("Error fetching discovery profiles:", err);
      } finally {
        setExploreLoading(false);
      }
    };
    fetchExploreData();
  }, []);

  const triggerUnfollow = (store: any) => {
    setStoreToUnfollow(store);
    setShowConfirm(true);
  };

  const executeUnfollow = async () => {
    if (!currentUser || !storeToUnfollow) return;
    const sellerId = storeToUnfollow.sellerId || storeToUnfollow.id;
    
    setActionLoadingId(sellerId);
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "following", sellerId));
      setStores(prev => prev.filter(s => s.sellerId !== sellerId));
      toast.success("Désabonnement réussi. 👋");
    } catch (err) {
      console.error("Error unfollowing store", err);
      toast.error("Échec lors de la désinscription.");
    } finally {
      setActionLoadingId(null);
      setShowConfirm(false);
      setStoreToUnfollow(null);
    }
  };

  const handleFollow = async (seller: any) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    setActionLoadingId(seller.id);
    try {
      const followRef = doc(db, "users", currentUser.uid, "following", seller.id);
      const followPayload = {
        sellerId: seller.id,
        name: seller.shopName || seller.displayName || 'Boutique',
        logo: seller.logoUrl || null,
        location: seller.wilaya || 'Algérie',
        followedAt: new Date().toISOString()
      };
      
      await setDoc(followRef, followPayload);
      setStores(prev => [...prev, { id: seller.id, ...followPayload }]);
      toast.success(`Abonné à ${seller.shopName || 'la boutique'} ! ✨`);
    } catch (err) {
      console.error("Error following store", err);
      toast.error("Erreur d'abonnement.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pre-calculate search filtered items
  const filteredSellers = allSellers.filter(seller => {
    const sName = (seller.shopName || seller.displayName || '').toLowerCase();
    const sDesc = (seller.shopDescription || '').toLowerCase();
    const matchesSearch = sName.includes(searchQuery.toLowerCase()) || sDesc.includes(searchQuery.toLowerCase());
    const matchesWilaya = selectedWilaya === 'Tous' || seller.wilaya === selectedWilaya;
    return matchesSearch && matchesWilaya;
  });

  return (
    <div className="space-y-8">
      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setStoreToUnfollow(null);
        }}
        onConfirm={executeUnfollow}
        title={t("Se désabonner") || "Se désabonner"}
        message={`Voulez-vous vraiment vous désabonner de la boutique "${storeToUnfollow?.name || storeToUnfollow?.shopName || 'Boutique'}" ?`}
      />

      {/* Dynamic Header & Gen-Z Tabs */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#121315] tracking-tighter rtl:tracking-normal uppercase">{t("Réseau Vendeurs")}</h2>
          <p className="text-stone-500 font-medium text-sm">{t("Suivez vos favoris et explorez les pépites des 58 Wilayas.")}</p>
        </div>
        
        {/* Gen Z Light Dual Tabs */}
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200/40 w-fit shrink-0 self-start">
          <button
            onClick={() => setActiveTab('followed')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs rtl:text-sm tracking-wide uppercase transition-all duration-300 ${
              activeTab === 'followed'
                ? 'bg-white text-[#121315] shadow-sm'
                : 'text-stone-500 hover:text-[#121315]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            {t("Abonnements")}<span className="ms-1.5 px-2 py-0.5 text-[10px] rtl:text-[12px] bg-[#121315] text-white rounded-full font-black">{stores.length}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs rtl:text-sm tracking-wide uppercase transition-all duration-300 relative ${
              activeTab === 'explore'
                ? 'bg-white text-[#121315] shadow-sm'
                : 'text-stone-500 hover:text-[#121315]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            {t("Explorer")}<span className="absolute -top-1.5 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
          </button>
        </div>
      </header>

      {/* VIEWPORT CONTROLLER */}
      <div className="min-h-[400px]">
        {activeTab === 'followed' ? (
          /* =======================================================
             SUBSCRIBED STORES TAB (Traditional UI, polished)
             ======================================================= */
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 bg-stone-50 rounded-2xl animate-pulse border border-stone-200/60" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="p-10 md:p-16 flex flex-col items-center justify-center text-center bg-[#FAF8F5] border border-stone-200/50 rounded-3xl">
              <div className="w-20 h-20 bg-white border border-stone-200 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Store className="w-8 h-8 text-stone-300" />
              </div>
              <h3 className="text-xl font-black text-[#121315] mb-2 tracking-tight rtl:tracking-normal">{t("Aucun abonnement existant")}</h3>
              <p className="text-stone-500 font-medium max-w-sm mb-8 leading-relaxed text-sm">
                {t("Abonnez-vous à nos créateurs locaux pour être notifié instantanément de leurs derniers produits & bons plans locaux.")}</p>
              <button 
                onClick={() => setActiveTab('explore')}
                className="px-6 py-3.5 bg-[#121315] text-white hover:bg-[#0a0b0c] rounded-xl font-black text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal transition-all shadow-md shadow-stone-900/10 flex items-center gap-2 scale-100 hover:scale-[1.02] active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-orange-300" />
                {t("Découvrir des pépites")}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => {
                    
                    return (
                                  <div key={store.id} className="border border-stone-200/60 rounded-2xl p-5 flex gap-4 hover:border-stone-400 hover:shadow-md transition-all bg-white relative group">
                                    <div className="absolute top-4 right-4 text-[10px] rtl:text-[12px] font-bold text-stone-400 font-mono uppercase">{t("VIP")}</div>
                                    
                                    {/* Shop Avatar */}
                                    <div className="w-16 h-16 rounded-full bg-stone-50 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                      {store.logo ? (
                                        <img loading="lazy" src={getOptimizedImageUrl(store.logo, 200)} alt={store.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <Store className="w-6 h-6 text-stone-400" />
                                      )}
                                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" title={t("Vendeur actif") || "Vendeur actif"} />
                                    </div>
                                    
                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-black text-[#121315] truncate text-base leading-tight group-hover:text-orange-600 transition-colors">{store.name}</h4>
                                      <p className="text-xs rtl:text-sm font-bold text-stone-400 uppercase tracking-wider rtl:tracking-normal flex items-center gap-1.5 mt-1 mb-3">
                                        <MapPin className="w-3 h-3 text-orange-500" />
                                        {store.location}
                                      </p>
                                      
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => navigate(`/store/${store.sellerId}`)}
                                          className="px-4 py-2 bg-[#121315] hover:bg-[#0a0b0c] text-white rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all"
                                        >
                                          {t("Visiter la vitrine")}</button>
                                        <button 
                                          onClick={() => triggerUnfollow(store)}
                                          disabled={actionLoadingId === store.sellerId}
                                          className="p-2 text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 border border-stone-100 rounded-xl transition-all" 
                                          title={t("Ne plus suivre") || "Ne plus suivre"}
                                        >
                                          <UserMinus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                  })}
            </div>
          )
        ) : (
          /* =======================================================
             MÉTIRE-ORIENTED GEN-Z DISCOVER VIBE BOARD
             ======================================================= */
          <div className="space-y-6">
            
            {/* Filters Bar Context (Premium Search & Horizon Wilaya slider) */}
            <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("Rechercher une marque, une friperie ou un artisan...") || "Rechercher une marque, une friperie ou un artisan..."}
                    className="w-full bg-stone-50 border border-stone-200/60 rounded-2xl py-3 ps-11 pe-4 text-sm font-medium focus:outline-none focus:border-[#121315] focus:ring-1 focus:ring-[#121315] transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-700 text-xs rtl:text-sm font-bold font-mono"
                    >
                      {t("Clear")}</button>
                  )}
                </div>
                
                {/* Wilaya Filter Dropdown toggle helper */}
                <button
                  onClick={() => setShowAllWilayas(!showAllWilayas)}
                  className={`px-5 py-3 rounded-2xl text-xs rtl:text-sm font-bold border transition-colors flex items-center gap-2 ${
                    showAllWilayas || selectedWilaya !== 'Tous'
                      ? 'bg-orange-50 border-orange-200 text-orange-600'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {selectedWilaya === 'Tous' ? t("Filtrer Wilaya") : t(selectedWilaya)}
                </button>
              </div>

              {/* Algerian Wilayas Horizontal Pill Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs rtl:text-sm font-bold text-stone-400 uppercase tracking-wider rtl:tracking-normal">
                  <span>{t("Wilayas Populaires")}</span>
                  <button 
                    onClick={() => setShowAllWilayas(!showAllWilayas)} 
                    className="text-orange-600 hover:underline"
                  >
                    {showAllWilayas ? t("Masquer") : t("Voir les 58 Wilayas")}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {(showAllWilayas ? ALGERIA_WILAYAS : HOT_WILAYAS).map(wilaya => (
                    <button
                      key={wilaya}
                      onClick={() => setSelectedWilaya(wilaya)}
                      className={`px-4 py-2 rounded-xl text-xs rtl:text-sm font-black transition-all ${
                        selectedWilaya === wilaya
                          ? 'bg-[#121315] text-white shadow-md shadow-stone-900/15 scale-102'
                          : 'bg-stone-50 text-stone-600 border border-stone-200/50 hover:bg-stone-100 hover:border-stone-300'
                      }`}
                    >
                      {wilaya}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RESULTS BOARD */}
            {exploreLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-96 bg-stone-50 rounded-3xl animate-pulse border border-stone-200/60" />
                ))}
              </div>
            ) : filteredSellers.length === 0 ? (
              <div className="p-16 text-center text-stone-500 font-medium space-y-4">
                <div className="w-16 h-16 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-center mx-auto text-stone-300">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <h4 className="font-black text-lg text-[#121315]">{t("Aucune boutique correspondante")}</h4>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">{t("Essayez de modifier vos filtres ou de recherche par nom.")}</p>
                <button 
                  onClick={() => { setSelectedWilaya('Tous'); setSearchQuery(''); }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs rtl:text-sm font-bold"
                >
                  {t("Réinitialiser")}</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSellers.map((seller, index) => {
                    
                  const isUserFollowing = stores.some(s => s.sellerId === seller.id);
                  const isActioning = actionLoadingId === seller.id;
                  const shopProducts = productsMap[seller.id] || [];
                  const bannerColorIndex = index % PRESET_GRADIENTS.length;
                  const customBannerClass = PRESET_GRADIENTS[bannerColorIndex];

                  return (
                    <div 
                      key={seller.id} 
                      className="bg-white rounded-3xl border border-stone-200/60 overflow-hidden shadow-sm hover:shadow-lg hover:border-stone-300 transition-all duration-300 flex flex-col group relative"
                    >
                      {/* 1. Header Banner & Aesthetic cover */}
                      <div className={`h-24 bg-gradient-to-r ${customBannerClass} relative w-full overflow-hidden shrink-0`}>
                        {seller.bannerUrl ? (
                          <img loading="lazy" 
                            src={getOptimizedImageUrl(seller.bannerUrl, 800)} 
                            alt={t("Cover") || "Cover"} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" 
                          />
                        ) : (
                          // Fallback subtle line art or decoration
                          <div className="absolute inset-0 flex items-center justify-end p-4 opacity-15">
                            <Store className="w-24 h-24 stroke-[1]" />
                          </div>
                        )}
                        
                        {/* Wilaya Indicator Ribbon */}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] rtl:text-[11px] font-black tracking-widest rtl:tracking-normal text-[#121315] uppercase border border-stone-200/40 shadow-sm flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                          {seller.wilaya || 'Algérie'}
                        </div>
                      </div>

                      {/* 2. Overlap Profile Badge */}
                      <div className="px-5 pb-5 pt-1 relative flex-1 flex flex-col">
                        <div className="flex justify-between items-end -mt-10 mb-4 shrink-0">
                          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                            {seller.logoUrl ? (
                              <img loading="lazy" src={getOptimizedImageUrl(seller.logoUrl, 200)} alt={seller.shopName} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-6 h-6 text-stone-400" />
                            )}
                          </div>
                          
                          {/* Main follow action with inline trigger unfollow modal or follow write */}
                          <button
                            disabled={isActioning}
                            onClick={() => {
                              if (isUserFollowing) {
                                triggerUnfollow({ sellerId: seller.id, name: seller.shopName });
                              } else {
                                handleFollow(seller);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl font-black text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal transition-all duration-300 flex items-center gap-1.5 ${
                              isUserFollowing
                                ? 'bg-stone-100 text-stone-600 border border-stone-200/60 hover:bg-stone-200 hover:text-red-500'
                                : 'bg-[#121315] text-white hover:bg-stone-800 hover:scale-102 active:scale-95 shadow-sm'
                            }`}
                          >
                            {isActioning ? (
                              <span className="w-3 h-3 border-2 border-stone-400 border-t-white rounded-full animate-spin" />
                            ) : isUserFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500 animate-pulse" />
                                {t("Abonné")}</>
                            ) : (
                              <>
                                <Store className="w-3.5 h-3.5 shrink-0" />
                                {t("Suivre")}</>
                            )}
                          </button>
                        </div>

                        {/* Title & Descr */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 
                              onClick={() => navigate(`/store/${seller.id}`)}
                              className="font-black text-[#121315] hover:text-orange-600 transition-colors text-base truncate cursor-pointer select-none"
                            >
                              {seller.shopName || seller.displayName || 'Boutique'}
                            </h4>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title={t("Vendeur Vérifié & Actif") || "Vendeur Vérifié & Actif"} />
                          </div>
                          <p className="text-xs rtl:text-sm text-stone-500 font-medium line-clamp-2 leading-relaxed min-h-[2rem]">
                            {seller.shopDescription || t("Pas de description fournie. Cliquez pour découvrir les collections de ce créateur.")}
                          </p>
                        </div>

                        {/* GEN-Z HIGHLIGHT FEED: Product previews with inline catalog prices link */}
                        <div className="mt-5 pt-4 border-t border-stone-100 shrink-0">
                          <div className="flex items-center justify-between text-[10px] rtl:text-[12px] font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal mb-3">
                            <span>{t("Dernières publications")}</span>
                            <span className="text-orange-600 flex items-center gap-0.5 group/link cursor-pointer" onClick={() => navigate(`/store/${seller.id}`)}>
                              {t("Voir tout")}<ArrowUpRight className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                            </span>
                          </div>

                          {shopProducts.length === 0 ? (
                            <div className="bg-stone-50 rounded-2xl py-6 px-4 text-center border border-dashed border-stone-200/40">
                              <span className="text-stone-400 font-bold text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal flex items-center justify-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                {t("Collection en cours...")}</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2.5">
                              {shopProducts.map((prod) => {
                                    
                                    return (
                                                                  <div 
                                                                    key={prod.id} 
                                                                    onClick={() => navigate(`/product/${prod.id}`)}
                                                                    className="aspect-square bg-stone-50 rounded-2xl overflow-hidden border border-stone-200/40 group/prod cursor-pointer relative shadow-sm hover:shadow transition-all"
                                                                  >
                                                                    {prod.images && prod.images[0] ? (
                                                                      <img loading="lazy" 
                                                                        src={prod.images[0]} 
                                                                        alt={prod.name} 
                                                                        className="w-full h-full object-cover group-hover/prod:scale-105 transition-all duration-300" 
                                                                      />
                                                                    ) : (
                                                                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                                        <Package className="w-5 h-5" />
                                                                      </div>
                                                                    )}
                                                                    
                                                                    {/* Custom Price overlay inside tag bubbles */}
                                                                    <div className="absolute bottom-1 right-1 left-1 bg-white/90 backdrop-blur-md py-0.5 px-1 rounded-lg text-[8px] font-black text-[#121315] text-center truncate border border-stone-200/30">
                                                                      {prod.price || "Contact"} {t("DA")}</div>
                                                                  </div>
                                                                );
                                  })}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
