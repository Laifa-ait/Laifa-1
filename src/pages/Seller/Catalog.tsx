import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, Search, Filter, Trash2, Edit2, Sparkles, X, ChevronRight, Video, ImageIcon, Upload, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, updateDoc, deleteDoc, doc, limit, startAfter, addDoc, Timestamp } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { toast } from 'react-hot-toast';
import { ProductFormModal } from './ProductFormModal';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

import { useSearchParams } from 'react-router-dom';
import { PRODUCT_HIERARCHY } from '../../constants';

export const Catalog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  const { currentUser, userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const PRODUCTS_PER_PAGE = 20;
  
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'out_of_stock', 'draft'
  const [adminTags, setAdminTags] = useState<any[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<Record<string, Record<string, string[]>>>(PRODUCT_HIERARCHY);
  const [categories, setCategories] = useState<string[]>(Object.keys(PRODUCT_HIERARCHY));
  
  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      try {
        const prodQ = query(
          collection(db, "products"), 
          where("sellerId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(PRODUCTS_PER_PAGE)
        );
        const prodSnap = await getDocs(prodQ);
        setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLastVisible(prodSnap.docs[prodSnap.docs.length - 1]);
        
        // Fetch Categories
        const catRef = doc(db, "settings", "categories");
        const categoryDocSnap = await (await import("firebase/firestore")).getDoc(catRef);
        if (categoryDocSnap && categoryDocSnap.exists() && categoryDocSnap.data().hierarchy) {
           const h = categoryDocSnap.data().hierarchy;
           if (Object.keys(h).length > 0) {
             setCategoryHierarchy(h);
             setCategories(Object.keys(h));
           } else {
             setCategoryHierarchy(PRODUCT_HIERARCHY);
             setCategories(Object.keys(PRODUCT_HIERARCHY));
           }
        }

        // Fetch admin tags
        const resTags = await fetch('/api/tags');
        if (resTags.ok) {
           const tagsData = await resTags.json();
           setAdminTags(tagsData.tags || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const loadMoreProducts = async () => {
    if (!currentUser || !lastVisible) return;
    setLoadingMore(true);
    try {
      const prodQ = query(
        collection(db, "products"), 
        where("sellerId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(PRODUCTS_PER_PAGE)
      );
      const prodSnap = await getDocs(prodQ);
      const newProducts = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prev => [...prev, ...newProducts]);
      setLastVisible(prodSnap.docs[prodSnap.docs.length - 1]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaveSuccess = (savedProduct: any, isEdit: boolean) => {
    if (isEdit) {
      setProducts(products.map(p => p.id === savedProduct.id ? { ...p, ...savedProduct } : p));
    } else {
      setProducts([savedProduct, ...products]);
    }
  };

  const filteredProducts = products.filter(p => {
    if (p.status === 'deleted') return false;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (activeFilter === 'active') matchFilter = p.status === 'active' && p.stock > 0;
    if (activeFilter === 'out_of_stock') matchFilter = p.stock === 0;
    if (activeFilter === 'draft') matchFilter = p.status === 'draft';
    return matchSearch && matchFilter;
  });

  const isShopValidated = userProfile?.status === 'ACTIVE' || userProfile?.status === 'active';

  useEffect(() => {
    if (searchParams.get('action') === 'new' && isShopValidated) {
      setEditingProduct(null);
      setIsAddMode(true);
    }
  }, [searchParams, isShopValidated]);

  return (
    <div className="space-y-8">
      {!isShopValidated && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
               </div>
               <div>
                  <h3 className="font-bold text-sm">{t("Boutique en attente de vérification")}</h3>
                  <p className="text-xs text-amber-700/80">{t("Vous ne pouvez pas ajouter de produits ni modifier votre catalogue tant que votre profil n'a pas été validé par l'administration.")}</p>
               </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Mon Catalogue")}</h2>
          <p className="text-zinc-500 font-medium">{t("Gérez vos articles en vente sur Olma.")}</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setIsAddMode(true); }}
          disabled={!isShopValidated}
          className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 shadow-xl transition-all ${isShopValidated ? 'bg-[#ea580c] text-white shadow-orange-500/20 hover:scale-105' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
        >
          <Plus className="w-5 h-5" />
          {t("Ajouter un Produit")}</button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute start-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder={t("Rechercher un produit...") || "Rechercher un produit..."}
            className="w-full ps-14 pe-6 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-medium focus:ring-2 ring-orange-500/10 transition-all shadow-sm text-zinc-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative group">
           <button className="h-full px-8 bg-white border border-zinc-100 text-zinc-700 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap">
             <Filter className="w-4 h-4" />
             <span className="hidden md:inline">{t("Filtres")}</span>
           </button>
           <div className="absolute top-full end-0 mt-2 w-48 bg-white border border-zinc-100 rounded-2xl shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button onClick={() => setActiveFilter('all')} className={`w-full text-start px-4 py-3 rounded-xl text-xs font-bold ${activeFilter === 'all' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'}`}>{t("Tous les produits")}</button>
              <button onClick={() => setActiveFilter('active')} className={`w-full text-start px-4 py-3 rounded-xl text-xs font-bold ${activeFilter === 'active' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'}`}>{t("Actifs")}</button>
              <button onClick={() => setActiveFilter('out_of_stock')} className={`w-full text-start px-4 py-3 rounded-xl text-xs font-bold ${activeFilter === 'out_of_stock' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'}`}>{t("En rupture")}</button>
              <button onClick={() => setActiveFilter('draft')} className={`w-full text-start px-4 py-3 rounded-xl text-xs font-bold ${activeFilter === 'draft' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'}`}>{t("Brouillons")}</button>
           </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-50">
          {filteredProducts.length === 0 ? (
            <div className="p-20 text-center">
              <Package className="w-16 h-16 text-zinc-100 mx-auto mb-4" />
              <p className="text-zinc-400 font-bold">{t("Aucun produit trouvé.")}</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              
              return (
                          <div key={p.id} className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-zinc-50/50 transition-colors group">
                            <div className="flex items-start gap-4 sm:gap-6 min-w-0 flex-1">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-100 overflow-hidden shadow-inner shrink-0 relative">
                                <img loading="lazy" src={getOptimizedImageUrl(p.image, 200) || "https://placehold.co/200x200/png?text=Product"} className="w-full h-full object-cover" alt={p.name} />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-zinc-950 text-base sm:text-lg mb-1 leading-normal truncate" title={p.name}>{p.name}</h4>
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] font-black text-zinc-400 tracking-widest rtl:tracking-normal uppercase">
                                  <span className="rtl:tracking-normal">{p.category}</span>
                                  <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                  <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-0.5 shadow-sm">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-normal">{t("Stock:")}</span>
                                    <input 
                                      type="number" 
                                      defaultValue={p.stock}
                                      onBlur={async (e) => {
                                        const newStock = parseInt(e.target.value);
                                        if (newStock !== p.stock && !isNaN(newStock)) {
                                          setLoading(true);
                                          try {
                                            await updateDoc(doc(db, "products", p.id), { stock: newStock });
                                            setProducts(products.map(item => item.id === p.id ? { ...item, stock: newStock } : item));
                                            toast.success("Stock mis à jour !");
                                          } catch(err) {
                                            toast.error("Erreur mise à jour stock.");
                                          } finally {
                                            setLoading(false);
                                          }
                                        }
                                      }}
                                      className="w-10 text-center text-[11px] font-black outline-none bg-transparent text-zinc-800 transition-colors"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {(!p.status || p.status === 'active') && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-emerald-100">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {t("Approuvé & En Ligne")}</span>
                                  )}
                                  {p.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-amber-100 shadow-sm backdrop-blur-md">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      {t("En cours d'examen par la Curation")}</span>
                                  )}
                                  {p.status === 'pending_deletion' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-red-150 animate-pulse">
                                      <span>{t("⏳ Suppression en attente")}</span>
                                    </span>
                                  )}
                                  {p.status === 'rejected' && (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-red-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {t("Refusé par la modération")}</span>
                                      {p.rejectionReason && (
                                        <p className="text-[10px] text-red-600 font-bold italic">{t("Motif: \"")}{p.rejectionReason}{t("\" (Veuillez modifier le produit pour renvoyer en validation)")}</p>
                                      )}
                                    </div>
                                  )}
                                  {p.flashSaleActive && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-purple-100">
                                      {t("⚡ Vente Flash (")}{formatPrice(p.flashPrice)})
                                    </span>
                                  )}
                                  {p.promoPrice && !p.flashSaleActive && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-rose-100">
                                      {t("💎 Promo (")}{formatPrice(p.promoPrice)})
                                    </span>
                                  )}
                                  {p.isSponsored && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-400 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider rtl:tracking-normal border border-white/20 shadow-sm">
                                      <Zap className="w-2.5 h-2.5 fill-white" /> {t("Sponsorisé")}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-2">
                                   <p className="font-black text-[#ea580c] text-xl">
                                      {p.flashSaleActive ? formatPrice(p.flashPrice) : (p.promoPrice ? formatPrice(p.promoPrice) : formatPrice(p.price))}
                                   </p>
                                   {(p.promoPrice || p.flashSaleActive) && (
                                     <p className="text-zinc-400 line-through text-xs font-bold">{formatPrice(p.price)}</p>
                                   )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 md:border-t-0 md:pt-0 w-full md:w-auto shrink-0">
                              <button 
                                disabled={p.status === 'pending_deletion'}
                                onClick={() => { 
                                  if (p.status === 'pending_deletion') return;
                                  const { id, createdAt, updatedAt, ...cloneData } = p;
                                  setEditingProduct({ ...cloneData, name: `${p.name} (Copie)` }); 
                                  setIsAddMode(true); 
                                }}
                                title={p.status === 'pending_deletion' ? "Duplication impossible" : "Dupliquer"}
                                className={`p-2.5 sm:p-3 bg-white border rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 ${p.status === 'pending_deletion' ? 'text-zinc-300 border-zinc-100 cursor-not-allowed opacity-50' : 'border-zinc-150 text-zinc-500 hover:text-emerald-600 hover:border-emerald-100'}`}
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                              <button 
                                disabled={p.status === 'pending_deletion'}
                                onClick={() => { 
                                  if (p.status === 'pending_deletion') return;
                                  setEditingProduct(p); 
                                  setIsAddMode(true); 
                                }}
                                title={p.status === 'pending_deletion' ? "Modification impossible" : "Modifier"}
                                className={`p-2.5 sm:p-3 bg-white border rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 ${p.status === 'pending_deletion' ? 'text-zinc-300 border-zinc-100 cursor-not-allowed opacity-50' : 'border-zinc-150 text-zinc-500 hover:text-zinc-950 hover:border-zinc-300'}`}
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button 
                                disabled={p.status === 'pending_deletion'}
                                onClick={async () => {
                                  if (p.status === 'pending_deletion') return;
                                  const confirmMsg = isArabic
                                    ? `هل تريد حذف هذا المنتج من الكتالوج الخاص بك؟ سيتم إرسال الطلب للمسؤول وسيصبح المنتج تحت حالة "قيد الحذف".`
                                    : "Voulez-vous supprimer ce produit de votre catalogue ? La demande sera envoyée à l'administrateur pour validation et l'article passera en statut 'Suppression en attente'.";
                                  if(window.confirm(confirmMsg)) {
                                    try {
                                      await updateDoc(doc(db, "products", p.id), { status: "pending_deletion" });
                                      setProducts(products.map(item => item.id === p.id ? { ...item, status: "pending_deletion" } : item));
                                      
                                      // Log internal moderation alert for admins
                                      await addDoc(collection(db, "internal_notifications"), {
                                        type: "PRODUCT_DELETION_REQUEST",
                                        title: "Demande de suppression de produit",
                                        message: `Le vendeur "${userProfile?.shopName || userProfile?.name || currentUser?.uid}" demande la suppression de "${p.name}".`,
                                        productId: p.id,
                                        sellerId: currentUser?.uid || "UNKNOWN",
                                        createdAt: Timestamp.now(),
                                        read: false
                                      });
                                      
                                      toast.success(isArabic ? "تم إرسال طلب الحذف إلى مسؤول النظام." : "Demande de suppression transmise à l'administrateur.");
                                    } catch (err) {
                                      console.error(err);
                                      toast.error(isArabic ? "فشل طلب الحذف." : "Erreur lors de la demande de suppression.");
                                    }
                                  }
                                }}
                                title={p.status === 'pending_deletion' ? "Suppression déjà en cours" : "Supprimer"}
                                className={`p-2.5 sm:p-3 bg-white border rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 ${p.status === 'pending_deletion' ? 'text-zinc-300 border-zinc-100 cursor-not-allowed opacity-50' : 'border-zinc-150 text-zinc-400 hover:text-red-500 hover:border-red-100'}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
            })
          )}
        </div>
        {lastVisible && filteredProducts.length > 0 && !searchTerm && (
           <div className="p-6 border-t border-zinc-50 flex justify-center bg-zinc-50/30">
              <button 
                onClick={loadMoreProducts} 
                disabled={loadingMore}
                className="px-8 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-widest rtl:tracking-normal rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Chargement..." : "Charger plus"}
              </button>
           </div>
        )}
      </div>

      <AnimatePresence>
        {isAddMode && (
          <ProductFormModal
            onClose={() => { setIsAddMode(false); setEditingProduct(null); }}
            editingProduct={editingProduct}
            categories={categories}
            CATEGORY_TREE={categoryHierarchy}
            adminTags={adminTags}
            userProfile={userProfile}
            currentUser={currentUser}
            onSaveSuccess={handleSaveSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
