import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Trash2, ArrowRight, Minus, Plus, ShoppingCart, Info, ShieldCheck, Flame, Truck, Store, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/format';
import { PremiumLayout } from '../../components/Layout/PremiumLayout';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Shop } from '../../types';
import { ALGERIA_WILAYAS } from '../../constants';
import { CartItemTimer } from '../../components/Cart/CartItemTimer';

const SizeGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-8 md:p-10 border border-zinc-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
         <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 font-bold p-2 text-sm">
            {t("common.close") || "✕ Fermer"}
         </button>
         <h3 className="text-2xl font-kinder text-[#3C2B22] tracking-tight rtl:tracking-normal mb-4">{t("product.details.size_guide_title")}</h3>
         <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            {t("product.details.size_guide_desc")}
         </p>
         <div className="overflow-x-auto rounded-2xl border border-zinc-100 mb-6">
            <table className="w-full text-left border-collapse text-xs">
               <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-150 font-kinder text-[#3C2B22]">
                     <th className="p-3">{t("size_eur_tk") || "Taille EUR/Turquie"}</th>
                     <th className="p-3">{t("equiv_china") || "Équivalence Chine"}</th>
                     <th className="p-3">{t("fit_algeria") || "Coupe Algérie"}</th>
                     <th className="p-3">{t("olma_recom") || "Recommandation Olma"}</th>
                  </tr>
               </thead>
               <tbody className="font-medium text-zinc-600">
                  <tr className="border-b border-zinc-100">
                     <td className="p-3 font-bold text-zinc-900">{t("size_s_36", "S (36)")}</td>
                     <td className="p-3">{t("size_m_cn", "M (Chinois)")}</td>
                     <td className="p-3">{t("fit_slim") || "Ajusté"}</td>
                     <td className="p-3 text-orange-600 font-bold">{t("size_guide_recom_s") || "Prendre M si étiquette Chine"}</td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                     <td className="p-3 font-bold text-zinc-900">{t("size_m_38", "M (38)")}</td>
                     <td className="p-3">{t("size_l_cn", "L (Chinois)")}</td>
                     <td className="p-3">{t("fit_regular") || "Standard"}</td>
                     <td className="p-3 text-orange-600 font-bold">{t("size_guide_recom_m") || "Prendre L si étiquette Chine"}</td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                     <td className="p-3 font-bold text-zinc-900">{t("size_l_40", "L (40)")}</td>
                     <td className="p-3">{t("size_xl_cn", "XL (Chinois)")}</td>
                     <td className="p-3">{t("fit_regular") || "Standard"}</td>
                     <td className="p-3 text-orange-600 font-bold">{t("size_guide_recom_l") || "Prendre XL si étiquette Chine"}</td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                     <td className="p-3 font-bold text-zinc-900">{t("size_xl_42", "XL (42)")}</td>
                     <td className="p-3">{t("size_xxl_cn", "XXL (Chinois)")}</td>
                     <td className="p-3">{t("fit_oversize") || "Ample"}</td>
                     <td className="p-3 text-orange-600 font-bold">{t("size_guide_recom_xl") || "Prendre XXL si étiquette Chine"}</td>
                  </tr>
               </tbody>
            </table>
         </div>
         <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl text-[11px] text-amber-900 leading-relaxed font-semibold">
            💡 <strong>{t("product.details.size_guide_tip_title")}</strong> {t("product.details.size_guide_tip_content")}
         </div>
      </div>
    </div>
  );
};

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, revalidateCart, getCartItemPrice, totalPrice } = useCart();
  const [isRevalidating, setIsRevalidating] = React.useState(false);
  const [cartWilaya, setCartWilaya] = React.useState<string>(localStorage.getItem("olma_default_wilaya") || "Alger");
  const [shops, setShops] = React.useState<Record<string, Shop>>({});
  const [isSizeGuideOpen, setIsSizeGuideOpen] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    const run = async () => {
      setIsRevalidating(true);
      await revalidateCart();
      setIsRevalidating(false);
    };
    run();
  }, []);

  React.useEffect(() => {
    const fetchShops = async () => {
      const sellerIds = Array.from(new Set(cart.map(item => item.sellerId).filter(Boolean))) as string[];
      const shopData: Record<string, Shop> = {};
      
      try {
        const fetchPromises = sellerIds.map(id => getDoc(doc(db, "publicProfiles", id)));
        const snaps = await Promise.all(fetchPromises);
        
        snaps.forEach(snap => {
           if (snap.exists()) {
             shopData[snap.id] = { uid: snap.id, ...snap.data() } as unknown as Shop;
           }
        });
        setShops(shopData);
      } catch (err) {
        console.error("Erreur fetch shop:", err);
      }
    };

    if (cart.length > 0) fetchShops();
  }, [cart]);

  const total = totalPrice;

  const groupedItems = React.useMemo<Record<string, typeof cart>>(() => {
    const groups: Record<string, typeof cart> = {};
    cart.forEach(item => {
      const sid = item.sellerId || 'unknown';
      if (!groups[sid]) groups[sid] = [];
      groups[sid].push(item);
    });
    return groups;
  }, [cart]);

  const estimatedShippingTotal = React.useMemo(() => {
    return Object.keys(groupedItems).reduce((sum, sellerId) => {
      const shop = shops[sellerId];
      const tariff = shop?.shippingTariffs?.[cartWilaya] ?? 600;
      return sum + tariff;
    }, 0);
  }, [groupedItems, shops, cartWilaya]);

  const estimatedGrandTotal = total + estimatedShippingTotal;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF9EC] flex flex-col items-center justify-center p-6 text-center">
         <div className="w-40 h-40 bg-white rounded-[4rem] border border-zinc-100 flex items-center justify-center text-zinc-200 mb-10 shadow-2xl">
            <ShoppingBag className="w-16 h-16" />
         </div>
         <h1 className="text-4xl md:text-5xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal mb-6">
           {t("cart_empty_title", "Votre panier est vide")}
         </h1>
         <p className="text-zinc-500 font-medium text-lg max-w-sm mb-12 italic">
           "{t("cart_empty_subtitle", "Le début d'une belle collection commence par une première pièce.")}"
         </p>
         <button 
           onClick={() => navigate('/shop')}
           className="px-12 py-6 bg-zinc-950 text-white rounded-[2rem] font-kinder text-sm uppercase tracking-[0.2em] rtl:tracking-normal hover:bg-orange-600 transition-all shadow-2xl flex items-center gap-4 group cursor-pointer"
         >
            {t("go_to_shop", "Explorer le Catalogue")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
         </button>
      </div>
    );
  }

  return (
    <PremiumLayout>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 px-4">
             <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                       <ShoppingCart className="w-5 h-5" />
                    </div>
                    <h4 className="text-[10px] font-kinder uppercase tracking-[0.3em] text-orange-600">
                      {t("cart_caption", "Votre Sélection")}
                    </h4>
                 </div>
                 <h1 className="text-5xl md:text-6xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal">
                   {t("cart_title", "Mon Panier")}
                 </h1>
                  {isRevalidating && (
                     <p className="text-[9px] font-kinder text-orange-600 uppercase tracking-widest rtl:tracking-normal animate-pulse mt-2">
                        ● {t("cart_revalidating", "Hydratation des prix en temps réel...")}
                     </p>
                  )}
             </div>
             <div className="flex items-center gap-4 p-5 bg-white border border-zinc-100 rounded-[2rem] shadow-sm">
                <Info className="w-5 h-5 text-zinc-400" />
                <p className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("shipping_disclaimer", "Frais de livraison calculés par colis vendeur")}
                </p>
             </div>
          </div>

          {/* Urgent Virtual Stock Reservation Warn Alert */}
          <div className="bg-orange-50 border border-orange-200/60 rounded-[2rem] p-6 mb-12 flex items-start gap-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100/30 rounded-full blur-2xl" />
             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-orange-600 animate-bounce" />
             </div>
             <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-orange-950">
                  ⚡ {t("reservation_alert_title", "Vos exclusivités sont protégées")}
                </h4>
                <p className="text-xs text-orange-700/90 font-semibold leading-relaxed">
                  {t("cart.virtual_reserve_desc", "En Algérie, les pièces de créateurs partent très vite ! Pour sécuriser vos achats, vos articles sont réservés virtuellement dans le stock du vendeur pendant ")}<strong>{t("cart.virtual_reserve_15m", "15 minutes")}</strong>{t("cart.virtual_reserve_exp", ". Passé ce délai, ils seront remis en vente pour d'autres clients.")}</p>
             </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-16">
             {/* Cart Items split physically by Vendor */}
             <div className="lg:col-span-2 space-y-12">
                {(Object.entries(groupedItems) as [string, any[]][]).map(([sellerId, items], packageIdx) => {
                   const shop = shops[sellerId];
                   const shippingFee = shop?.shippingTariffs?.[cartWilaya] ?? 600;
                   const sellerSubtotal = items.reduce((sum, item) => sum + (getCartItemPrice(item) * (item.quantity || 1)), 0);

                   return (
                      <div key={sellerId} className="bg-white rounded-[3.5rem] p-8 sm:p-10 border border-zinc-200/60 shadow-xl space-y-8">
                         
                         {/* Package Header with multi-seller action splitting */}
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-6 gap-6">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-[#3C2B22]/10 text-[#3C2B22] rounded-xl flex items-center justify-center shadow-inner">
                                  <Store className="w-5 h-5" />
                               </div>
                               <div>
                                  <p className="text-[9px] font-kinder uppercase tracking-[0.2em] text-orange-500 mb-0.5">
                                    {t("cart_info.package") || "Colis"} {packageIdx + 1}
                                  </p>
                                  <h3 className="text-lg font-kinder text-[#3C2B22] tracking-tight rtl:tracking-normal">
                                     {shop?.shopName || "Atelier Olma"}
                                  </h3>
                               </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 sm:self-center">
                               <div className="px-4 py-2.5 bg-stone-50 border border-stone-200/50 rounded-xl text-[10px] font-kinder text-stone-600 uppercase tracking-wider rtl:tracking-normal flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-orange-600" />
                                  {t("cart_info.delivery", "Livraison : ")}{formatPrice(shippingFee)}
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => navigate(`/checkout?sellerId=${sellerId}`)}
                                  className="px-5 py-2.5 bg-[#3C2B22] hover:bg-[#FF5C00] text-white transition-all text-[9px] font-kinder uppercase tracking-[0.15em] rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                                >
                                   {t("cart_info.pay_package_only", "Régler ce colis uniquement")}</button>
                            </div>
                         </div>

                         {/* Package Items */}
                         <div className="space-y-8">
                            <AnimatePresence mode="popLayout">
                               {items.map((item, idxx) => {
                                   
                                  const masterIndex = cart.findIndex(c => c.id === item.id && c.selectedVariant === item.selectedVariant);
                                  return (
                                     <motion.div 
                                       key={`${item.id}-${item.selectedVariant || ''}-${idxx}`}
                                       layout
                                       initial={{ opacity: 0, y: 15 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0, x: -15 }}
                                       className="group relative flex flex-col sm:flex-row gap-6 items-center bg-stone-50/40 hover:bg-stone-50/80 p-6 rounded-[2.5rem] border border-stone-100/70 transition-all duration-300"
                                     >
                                        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-white border border-stone-150 shrink-0 relative">
                                           <img loading="lazy" src={item.image || item.images?.[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>

                                        <div className="flex-1 space-y-3 text-center sm:text-left">
                                           <div className="space-y-1">
                                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                                 <span className="text-[9px] font-kinder text-orange-500 uppercase tracking-widest rtl:tracking-normal">{item.category}</span>
                                                 {item.addedAt && <CartItemTimer addedAt={item.addedAt} />}
                                              </div>
                                              <h3 className="text-xl font-kinder text-[#3C2B22] tracking-tight rtl:tracking-normal line-clamp-1">{item.name}</h3>
                                           </div>
                                           
                                           <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                              {item.selectedVariant && (
                                                 <div className="px-3 py-1.5 bg-white border border-stone-200/60 rounded-lg text-[9px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">
                                                    {t("cart.option", "Option : ")}{item.selectedVariant}
                                                 </div>
                                              )}
                                              <button
                                                 type="button"
                                                 onClick={() => setIsSizeGuideOpen(true)}
                                                 className="px-2.5 py-1.5 border border-dashed border-stone-300 text-stone-500 rounded-lg text-[9px] font-bold hover:text-orange-600 hover:border-orange-500 transition-colors cursor-pointer"
                                              >
                                                 {t("cart.standard_sizing", "📐 Standard Sizing")}</button>
                                           </div>
                                        </div>

                                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-6 shrink-0 border-t sm:border-t-0 border-stone-200/50 pt-4 sm:pt-0">
                                           <div className="flex items-center bg-white border border-stone-200/60 rounded-xl p-1 shadow-sm shrink-0">
                                              <button 
                                                onClick={() => {
                                                  const currentQty = item.quantity || 1;
                                                  if (currentQty <= 1) {
                                                    removeFromCart(masterIndex);
                                                  } else {
                                                    updateQuantity(masterIndex, currentQty - 1);
                                                  }
                                                }}
                                                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-[#FF5C00] transition-colors"
                                              >
                                                <Minus className="w-3.5 h-3.5" />
                                              </button>
                                              <span className="w-10 text-center font-kinder text-xs text-stone-800">{item.quantity || 1}</span>
                                              <button 
                                                onClick={() => updateQuantity(masterIndex, (item.quantity || 1) + 1)}
                                                className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-[#FF5C00] transition-colors"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                              </button>
                                           </div>
                                           
                                           <div className="text-right">
                                              <p className="text-lg font-kinder text-[#3C2B22] tracking-tight rtl:tracking-normal">
                                                 {formatPrice(getCartItemPrice(item) * (item.quantity || 1))}
                                              </p>
                                           </div>
                                           
                                           <button 
                                             onClick={() => removeFromCart(masterIndex)}
                                             className="text-stone-300 hover:text-red-500 transition-colors p-2 cursor-pointer self-center sm:self-auto"
                                           >
                                              <Trash2 className="w-4.5 h-4.5" />
                                           </button>
                                        </div>
                                     </motion.div>
                                  );
                               })}
                            </AnimatePresence>
                         </div>

                         {/* Package Sub-total detail */}
                         <div className="flex justify-between items-center pt-5 border-t border-stone-100 text-xs font-bold text-zinc-500 leading-none">
                            <span>{t("cart_info.subtotal_package") || "Sous-total Colis"} {packageIdx + 1} :</span>
                            <span className="font-extrabold text-[#3C2B22]">{formatPrice(sellerSubtotal)} (+ {formatPrice(shippingFee)} {t("shipping") || "livraison"})</span>
                         </div>
                      </div>
                   );
                })}
             </div>

             {/* Dynamic Order Checkout and Estimation summary */}
             <div className="space-y-8">
                <div className="bg-zinc-950 rounded-[4rem] p-10 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
                   
                   <h3 className="text-2xl font-kinder mb-10 tracking-tighter rtl:tracking-normal">
                      {t("summary_title", "Résumé Global")}
                   </h3>
                   
                   <div className="space-y-6 pb-8 border-b border-white/10">
                      <div className="flex justify-between items-center text-zinc-400">
                         <p className="text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal">
                            {t("summary_subtotal", "articles au panier")} ({cart.length})
                         </p>
                         <p className="font-bold text-white">{formatPrice(total)}</p>
                      </div>

                      {/* Realtime Wilaya Estimation dropdown */}
                      <div className="space-y-3 pt-2">
                         <label className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" />
                            {t("estimate_wilaya", "Estimer pour ma wilaya")}
                         </label>
                         <select 
                           value={cartWilaya}
                           onChange={(e) => {
                             setCartWilaya(e.target.value);
                             localStorage.setItem("olma_default_wilaya", e.target.value);
                           }}
                           className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl outline-none font-bold text-xs text-zinc-100 cursor-pointer"
                         >
                            {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                         </select>
                      </div>

                      <div className="flex justify-between items-center text-zinc-400 pt-2">
                         <p className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-400">
                            {t("estimated_shipping", "Frais de livraison")} {t("(Total)")}</p>
                         <p className="font-bold text-white">{formatPrice(estimatedShippingTotal)}</p>
                      </div>
                   </div>

                   <div className="pt-10 mb-12">
                      <div className="flex justify-between items-center mb-2">
                         <p className="text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal text-orange-500">
                            {t("grand_total", "Total Estimé")}
                         </p>
                         <p className="text-3xl font-kinder tracking-tighter rtl:tracking-normal text-white">
                            {formatPrice(estimatedGrandTotal)}
                         </p>
                      </div>
                      <p className="text-[9px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal">
                         {t("cod_guarantee", "Paiement en espèces à la livraison")}
                      </p>
                   </div>

                   <button 
                     onClick={() => navigate('/checkout')}
                     className="w-full bg-white text-zinc-950 rounded-[2.5rem] py-8 flex items-center justify-center gap-4 hover:bg-orange-500 hover:text-white transition-all shadow-2xl font-kinder uppercase tracking-[0.2em] rtl:tracking-normal text-sm group cursor-pointer"
                   >
                      {t("checkout_button", "Passer la commande")}
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                   </button>
                    
                   <p className="text-[10px] font-medium text-center text-zinc-500 mt-6 leading-relaxed">
                      {t("cart.pay_package_tip", "💡 Vous pouvez également payer vos colis vendeurs individuellement via le bouton \"Régler ce colis\" ci-contre.")}</p>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-zinc-200 shadow-sm space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                         <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="font-kinder text-[#3C2B22] text-sm">{t("cart.secure_buy", "Achat 100% Sécurisé")}</h4>
                         <p className="text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-400">{t("cart.olma_guarantee", "Garantie Olma Algérie")}</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => navigate('/shop')}
                  className="w-full py-6 rounded-[2.5rem] border-2 border-stone-200 text-stone-400 hover:text-[#3C2B22] hover:border-[#3C2B22] transition-all font-kinder uppercase tracking-[0.2em] rtl:tracking-normal text-[10px] cursor-pointer"
                >
                   {t("go_to_shop") || "Retourner au catalogue"}
                </button>
             </div>
          </div>
          
          <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </PremiumLayout>
  );
};
