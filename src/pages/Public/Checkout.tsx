import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, CreditCard, CheckCircle, Package, ArrowLeft, Truck, ShieldCheck, Ticket } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import { PremiumLayout } from '../../components/Layout/PremiumLayout';
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from '../../constants';
import { ALGERIA_REGIONS } from '../../data/algeriaRegions';
import { db, auth } from '../../lib/firebase';
import { processCheckout } from '../../services/checkoutService';
import { getDoc, doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Shop } from '../../types';
import { analyticsEngine } from '../../utils/analyticsEngine';

const getCommunes = (wilaya: string) => {
  const wilayaData = ALGERIA_REGIONS[wilaya];
  if (wilayaData && wilayaData.dairas) {
    const allCommunes = new Set<string>();
    Object.values(wilayaData.dairas).forEach(communes => {
      communes.forEach(c => allCommunes.add(c));
    });
    return Array.from(allCommunes).sort((a, b) => a.localeCompare(b));
  }
  
  // Fallback to older mechanism if not found
  const cleanWilaya = wilaya.replace(/^\d+\s*-\s*/, '').trim().replace(/^\d+\s+/, '').trim();
  const dict: Record<string, string[]> = {
    'Alger': ["Alger Centre", "Bab El Oued", "Sidi M'Hamed", "El Harrach", "Zéralda", "Douera", "Chéraga", "Dar El Beïda", "Kouba", "Bordj El Kiffan", "Rouïba", "Hydra", "Bir Mourad Raïs"],
    'Oran': ["Oran Centre", "Bir El Djir", "Es Senia", "Arzew", "Mers El Kébir", "Gdyel", "Oued Tlelat"],
    'Sétif': ["Sétif Ville", "El Eulma", "Aïn Oulmene", "Aïn Arnat", "Bouandas", "Aïn Azel", "Bougaa"],
    'Blida': ["Blida", "Boufarik", "Ouled Yaïch", "Beni Mered", "Larbaâ", "Meftah", "Mouzaïa"],
    'Constantine': ["Constantine", "Khroub", "Hamma Bouziane", "Didouche Mourad", "Aïn Smara"],
    'Annaba': ["Annaba", "El Bouni", "Seraïdi", "Berrahal", "El Hadjar"],
    'Tlemcen': ["Tlemcen", "Maghnia", "Ghazaouet", "Remchi", "Sebdou", "Hennaya"],
    'Tizi Ouzou': ["Tizi Ouzou", "Azeffoun", "Larbaâ Nath Irathen", "Tigzirt", "Draâ El Mizan", "Azazga"],
    'Béjaïa': ["Béjaïa Ville", "Akbou", "Sidi Aïch", "Amizour", "Kherrata", "El Kseur"]
  };
  return dict[cleanWilaya] || [`${cleanWilaya} Chef-lieu`];
};

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const filterSellerId = searchParams.get('sellerId');
  const { cart, clearCart, getCartItemPrice, revalidateCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  
  const [step, setStep] = useState('checkout'); // 'checkout' | 'success'
  const [activeAccordion, setActiveAccordion] = useState(1);
  const [successNotifPrompted, setSuccessNotifPrompted] = useState(false);

  const idempotencyKey = useMemo(() => {
    return `${currentUser?.uid}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }, [currentUser]);

  useEffect(() => {
     revalidateCart().catch(err => console.error("Checkout cart hydration error:", err));
  }, [revalidateCart]);

  useEffect(() => {
     if (step === 'success' && !successNotifPrompted) {
        setSuccessNotifPrompted(true);
        setTimeout(() => {
           if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                 if (permission === 'granted') {
                    toast.success(t("notifications_activated_toast") || "Notifications activées ! Vous serez alerté dès que le livreur sera en approche (Push Dernier Kilomètre).", { duration: 6000, icon: '🔔' });
                 }
              });
           }
        }, 1500);
     }
  }, [step, successNotifPrompted, t]);
  
  const activeCart = useMemo(() => {
    if (!filterSellerId) return cart;
    return cart.filter(item => item.sellerId === filterSellerId);
  }, [cart, filterSellerId]);
  
  const [useCashbackPoints, setUseCashbackPoints] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'domicile' | 'stopdesk'>('domicile');
  const [formData, setFormData] = useState({
    fullName: currentUser?.displayName || '',
    phone: '',
    wilaya: localStorage.getItem("olma_default_wilaya") || '16 Alger',
    commune: '',
    address: '', // point of reference
  });

  // Watch currentUser and update name if it arrives late
  useEffect(() => {
    if (currentUser?.displayName && !formData.fullName) {
      setFormData(prev => ({ ...prev, fullName: currentUser.displayName || '' }));
    }
  }, [currentUser]);

  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSummary, setOrderSummary] = useState<any>(null);

  const isValidPhone = !!formData.phone.replace(/\s+/g, '').match(/^(05|06|07|02|03|04|09)\d{8}$/);

  const groupedCart = useMemo(() => {
    const groups: Record<string, { items: any[], total: number, sellerName: string }> = {};
    activeCart.forEach(item => {
      const sId = item.sellerId || "default";
      if (!groups[sId]) {
         groups[sId] = { items: [], total: 0, sellerName: shops[sId]?.shopName || t("independent_store") || "Boutique Indépendante" };
      }
      groups[sId].items.push(item);
      groups[sId].total += (getCartItemPrice(item) * (item.quantity || 1));
    });
    return groups;
  }, [activeCart, shops, getCartItemPrice]);

  // Subtotal
  const subtotal = useMemo(() => activeCart.reduce((sum, item) => sum + (getCartItemPrice(item) * (item.quantity || 1)), 0), [activeCart, getCartItemPrice]);

  // Premium Coupon States
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
       toast.error(t("checkout.empty_coupon_error", "Veuillez entrer un code coupon."));
       return;
    }
    setIsValidatingCoupon(true);
    try {
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', couponInput.trim().toUpperCase())
      );
      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        toast.error(t("checkout.invalid_coupon_error", "Code promo ou coupon invalide."));
        setAppliedCoupon(null);
        setCouponDiscount(0);
        return;
      }
      
      const couponDoc = querySnap.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() } as any;
      
      if (!couponData.isActive) {
        toast.error(t("checkout.inactive_coupon_error", "Ce coupon est inactif."));
        return;
      }
      
      if (couponData.expiresAt || couponData.expiryDate) {
        let expiry = null;
        const rawExpiry = couponData.expiresAt || couponData.expiryDate;
        
        if (typeof rawExpiry?.toDate === 'function') {
          expiry = rawExpiry.toDate();
        } else if (rawExpiry?.seconds) {
          expiry = new Date(rawExpiry.seconds * 1000);
        } else if (rawExpiry?._seconds) {
          expiry = new Date(rawExpiry._seconds * 1000);
        } else {
          expiry = new Date(rawExpiry);
        }

        if (expiry && !isNaN(expiry.getTime()) && expiry <= new Date()) {
          toast.error(t("checkout.expired_coupon_error", "Ce coupon a expiré."));
          return;
        }
      }
      
      if (subtotal < (couponData.minOrderValue || 0)) {
        toast.error(t("checkout.min_order_error", "Minimum d'achat requis pour ce coupon : {{amount}}", { amount: formatPrice(couponData.minOrderValue) }));
        return;
      }

      if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit) {
        toast.error(t("checkout.usage_limit_error", "La limite d'utilisation de ce coupon est de {{limit}} fois.", { limit: couponData.usageLimit }));
        return;
      }

      let amount = 0;
      if (couponData.discountType === 'percentage') {
         amount = (subtotal * couponData.discountValue) / 100;
      } else {
         amount = Math.min(couponData.discountValue, subtotal);
      }
      
      setAppliedCoupon(couponData);
      setCouponDiscount(amount);
      toast.success(t("checkout.coupon_applied", "Coupon \"{{code}}\" appliqué (-{{amount}}) ! 🎫", { code: couponData.code, amount: formatPrice(amount) }));
    } catch (e: any) {
      console.error(e);
      toast.error(t("checkout.coupon_validation_error", "Erreur lors de la validation du coupon."));
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    toast.success(t("checkout.coupon_removed", "Coupon retiré."));
  };

  const [shippingConfig, setShippingConfig] = useState<{globalBaseFee?: number; wilayaFees?: Record<string,number>; matrixFees?: Record<string, Record<string, number>>}>({});

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'shipping');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShippingConfig(docSnap.data());
        }
      } catch(e) {
        console.error("Erreur charagement shipping configuration", e);
      }
    };
    fetchGlobalSettings();
  }, []);

  useEffect(() => {
    const fetchShops = async () => {
      const sellerIds = Array.from(new Set(activeCart.map(item => item.sellerId).filter(Boolean))) as string[];
      const shopData: Record<string, Shop> = {};
      const fetchPromises = sellerIds.map(id => getDoc(doc(db, "publicProfiles", id)));
      const snaps = await Promise.all(fetchPromises);
      snaps.forEach(snap => {
         if (snap.exists()) {
             shopData[snap.id] = { uid: snap.id, ...snap.data() } as unknown as Shop;
         }
      });
      setShops(shopData);
    };
    if (activeCart.length > 0) fetchShops();
  }, [activeCart]);

  useEffect(() => {
    if (activeCart.length > 0) {
      analyticsEngine.track('checkout_start', { itemsCount: activeCart.length, subtotal });
    }
  }, [activeCart.length, subtotal]);

  const totalShipping = useMemo(() => {
    const sellerIds = Array.from(new Set(activeCart.map(item => item.sellerId).filter(Boolean))) as string[];
    let total = 0;
    
    const cleanWilaya = formData.wilaya.replace(/^\d+\s+/, "").trim();
    let weightMultiplier = 1;

    sellerIds.forEach(sid => {
       const shop = shops[sid];
       if (shop && formData.wilaya) {
          const tariff = shop.shippingTariffs?.[formData.wilaya];
          if (typeof tariff === 'number') {
             total += tariff;
             return;
          }
       }
       
       const sellerWilaya = shop?.address?.wilaya || "DEFAULT_ORIGIN";
       const matrix = shippingConfig.matrixFees || {};
       
       let wFee: number | undefined = undefined;
       if (matrix[sellerWilaya] && matrix[sellerWilaya][formData.wilaya] !== undefined) {
          wFee = matrix[sellerWilaya][formData.wilaya];
       } else if (matrix[sellerWilaya] && matrix[sellerWilaya][cleanWilaya] !== undefined) {
          wFee = matrix[sellerWilaya][cleanWilaya];
       } else if (matrix["DEFAULT_ORIGIN"] && matrix["DEFAULT_ORIGIN"][formData.wilaya] !== undefined) {
          wFee = matrix["DEFAULT_ORIGIN"][formData.wilaya];
       } else if (matrix["DEFAULT_ORIGIN"] && matrix["DEFAULT_ORIGIN"][cleanWilaya] !== undefined) {
          wFee = matrix["DEFAULT_ORIGIN"][cleanWilaya];
       } else if (shippingConfig.wilayaFees?.[formData.wilaya] !== undefined) {
          wFee = shippingConfig.wilayaFees[formData.wilaya];
       } else if (shippingConfig.wilayaFees?.[cleanWilaya] !== undefined) {
          wFee = shippingConfig.wilayaFees[cleanWilaya];
       }
       
       let rawMethodPrice = wFee !== undefined ? wFee : (shippingConfig.globalBaseFee ?? 600);
       if (wFee === undefined && ALGERIA_SHIPPING_DATA[cleanWilaya]) {
          rawMethodPrice = ALGERIA_SHIPPING_DATA[cleanWilaya].price;
       }
       
       let methodPrice = deliveryMethod === 'domicile' ? rawMethodPrice : (Math.max(400, rawMethodPrice - 200));
       total += Math.round(methodPrice * weightMultiplier / 10) * 10;
    });
    return total;
  }, [activeCart, shops, formData.wilaya, deliveryMethod, shippingConfig]);

  const cashbackApplied = useCashbackPoints ? Math.min(userProfile?.cashbackBalance || 0, Math.max(0, subtotal - couponDiscount)) : 0;
  const grandTotalBeforeWallet = Math.max(0, subtotal - couponDiscount - cashbackApplied + totalShipping);
  const walletBalanceAvailable = userProfile?.walletBalance || 0;
  const walletAmountUsed = useWallet ? Math.min(walletBalanceAvailable, grandTotalBeforeWallet) : 0;
  const grandTotal = grandTotalBeforeWallet - walletAmountUsed;

  const handlePlaceOrder = async () => {
    if (!formData.fullName) return toast.error(t("enter_name_error") || "Veuillez saisir votre nom.");
    if (!isValidPhone) return toast.error(t("invalid_phone_error") || "Le numéro de téléphone est invalide.");
    if (!formData.commune || !formData.address) return toast.error(t("incomplete_address_error") || "L'adresse de livraison est incomplète.");
    
    setIsSubmitting(true);
    try {
      const sendData = { ...formData, name: formData.fullName, phone: formData.phone.replace(/\s+/g, '') };

      const payload = {
        cart: activeCart.map(item => ({
             id: item.id,
             quantity: item.quantity || 1,
             sellerId: item.sellerId || "admin",
             selectedVariant: item.selectedVariant || null,
             priceSeen: item.promoPrice || item.price
        })),
        shippingAddress: sendData,
        deliveryMethod,
        billingAddress: sendData,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        useCashbackPoints,
        useWallet,
        idempotencyKey,
      };

      const data = await processCheckout(payload);
      
      setOrderSummary({ id: data.orderId, total: data.total });
      
      analyticsEngine.track('purchase_complete', {
         orderId: data.orderId,
         totalAmount: data.total,
         itemsCount: activeCart.length
      });

      clearCart(filterSellerId || undefined);
      setStep('success');
    } catch (err: any) {
      // Securely scrub and sanitize any sensitive checkout error details (Credit Card #s, CVV, private tokens) before logging
      const errorMsg = err?.message || String(err);
      const scrubbed = errorMsg
        .replace(/\b\d{13,19}\b/g, '[masked_card]')
        .replace(/\b\d{3,4}\b/g, '[masked_cvv]')
        .replace(/(?:key|token|secret|password|stripe|authorization|auth)[^=\s:"]*["\s:=]+[^\s",]+/gi, '$1: [masked]');
      console.error("OLMART Checkout failed:", scrubbed);
      toast.error(err.message || t("payment_error") || "Erreur de paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeCart.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center p-6 text-center">
         <Package className="w-16 h-16 text-zinc-200 mb-8" />
         <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal mb-4 text-zinc-950">{t("empty_cart") || "Panier vide"}</h2>
         <button onClick={() => navigate('/shop')} className="btn-premium-orange">{t("to_shop") || "Vers la Boutique"}</button>
      </div>
    );
  }

  return (
    <PremiumLayout>
       <div className="pt-24 lg:pt-32 pb-32">
          {step === 'checkout' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto px-4 lg:px-8">
                <div className="col-span-1 lg:col-span-12 mb-8">
                   <h1 className="text-4xl md:text-5xl font-black text-[#121315] tracking-tighter rtl:tracking-normal">{t("checkout") || "Validation"}</h1>
                </div>

                <div className="col-span-1 lg:col-span-7 space-y-6">
                   
                   {/* Step 1: Identité */}
                   <div className="surface-card p-6 sm:p-8">
                      <button 
                        onClick={() => setActiveAccordion(1)}
                        className="w-full flex items-center justify-between text-start"
                      >
                         <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAccordion === 1 ? 'bg-[#F37021] text-white shadow-lg' : 'bg-stone-100 text-stone-500'}`}>1</div>
                            <h3 className="text-lg sm:text-xl font-black text-[#121315]">{t("checkout.identity") || "Identité (Qui ?)"}</h3>
                         </div>
                         {isValidPhone && activeAccordion !== 1 && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                      </button>
                      
                      <AnimatePresence>
                         {activeAccordion === 1 && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                               <div className="pt-8 space-y-6">
                                  <div className="space-y-3">
                                     <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("full_name") || "Nom Complet"}</label>
                                     <input 
                                        type="text" 
                                        required 
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder={t("full_name_placeholder") || "Ex: Selma Laifa"}
                                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-bold text-sm focus:ring-2 ring-[#F37021]/20 transition-all"
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("phone_number") || "Numéro de téléphone"}</label>
                                     <div className="relative">
                                        <input 
                                           type="tel" 
                                           required 
                                           value={formData.phone}
                                           onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                           placeholder={t("phone_placeholder") || "Ex: 0550 12 34 56"}
                                           className={`w-full px-6 py-4 bg-stone-50 border rounded-2xl outline-none font-bold text-sm transition-all focus:ring-2 ${isValidPhone ? 'border-emerald-500 ring-emerald-500/20 bg-emerald-50/10' : 'border-stone-200 ring-[#F37021]/20'}`}
                                        />
                                        {isValidPhone && (
                                           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute end-4 top-1/2 -translate-y-1/2">
                                              <CheckCircle className="w-6 h-6 text-emerald-500" />
                                           </motion.div>
                                        )}
                                     </div>
                                  </div>
                                  <button 
                                     onClick={() => {
                                        if(isValidPhone && formData.fullName.trim()) setActiveAccordion(2);
                                        else toast.error(t("checkout.invalid_name_phone", "Veuillez saisir un nom et un numéro valide algérien."));
                                     }}
                                     className="btn-ghost-teal w-full sm:w-auto mt-4"
                                  >
                                     {t("checkout.continue_to_shipping") || "Continuer vers l'Expédition"}
                                  </button>
                               </div>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>

                   {/* Step 2: Expédition */}
                   <div className={`surface-card p-6 sm:p-8 ${activeAccordion === 2 ? '' : 'opacity-70'} transition-opacity duration-300`}>
                      <button 
                        onClick={() => { if(isValidPhone && formData.fullName.trim()) setActiveAccordion(2) }}
                        className="w-full flex items-center justify-between text-start"
                      >
                         <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAccordion === 2 ? 'bg-[#F37021] text-white shadow-lg' : 'bg-stone-100 text-stone-500'}`}>2</div>
                            <h3 className="text-lg sm:text-xl font-black text-[#121315]">{t("checkout.shipping") || "Expédition (Où ?)"}</h3>
                         </div>
                         {formData.commune && formData.address && activeAccordion !== 2 && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                      </button>

                      <AnimatePresence>
                         {activeAccordion === 2 && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                               <div className="pt-8 space-y-6">
                                  <div className="grid sm:grid-cols-2 gap-6">
                                     <div className="space-y-3">
                                        <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("wilaya") || "Wilaya"}</label>
                                        <select 
                                           value={formData.wilaya}
                                           onChange={e => {
                                              setFormData({ ...formData, wilaya: e.target.value, commune: '' });
                                              localStorage.setItem("olma_default_wilaya", e.target.value);
                                           }}
                                           className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-bold text-sm cursor-pointer focus:ring-2 ring-[#F37021]/20"
                                        >
                                           {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                     </div>
                                     <div className="space-y-3">
                                        <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("commune") || "Commune"}</label>
                                        <select 
                                           value={formData.commune}
                                           onChange={e => setFormData({ ...formData, commune: e.target.value })}
                                           className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-bold text-sm cursor-pointer focus:ring-2 ring-[#F37021]/20"
                                        >
                                           <option value="">-- {t("choose_commune") || "Choisissez la commune"} --</option>
                                           {getCommunes(formData.wilaya).map(c => <option key={c} value={c}>{c}</option>)}
                                           <option value="Autre">{t("Autre")}</option>
                                        </select>
                                     </div>
                                  </div>
                                  {formData.commune === 'Autre' && (
                                     <div className="space-y-3">
                                        <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("enter_commune_name") || "Saisir le nom de la Commune"}</label>
                                        <input 
                                           type="text"
                                           placeholder={t("Ex: Hydra, Hussein Dey") || "Ex: Hydra, Hussein Dey"}
                                           onChange={e => setFormData({ ...formData, commune: e.target.value })}
                                           className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-bold focus:ring-2 ring-[#F37021]/20"
                                        />
                                     </div>
                                  )}
                                  <div className="space-y-3">
                                     <label className="text-xs font-black text-stone-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("landmark") || "Point de repère (ex: près de la pharmacie)"}</label>
                                     <textarea 
                                        rows={3}
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder={t("landmark_placeholder") || "Pas de code postal. Indiquez plutôt un lieu connu, quartier, ou particularité de votre bâtiment."}
                                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none font-bold text-sm resize-none focus:ring-2 ring-[#F37021]/20"
                                     />
                                  </div>
                                  <button 
                                     onClick={() => {
                                        if(formData.commune && formData.address) setActiveAccordion(3);
                                        else toast.error(t("checkout.invalid_commune_landmark", "Veuillez choisir une commune et un point de repère."));
                                     }}
                                     className="btn-ghost-teal w-full sm:w-auto mt-4"
                                  >
                                     {t("checkout.continue_validation") || "Passer à la validation"}
                                  </button>
                               </div>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                </div>

                {/* Step 3: Recapitulatif & Paiement */}
                <div className={`surface-card p-6 sm:p-8 ${activeAccordion === 3 ? '' : 'opacity-70'} transition-opacity duration-300`}>
                     <button 
                       onClick={() => { if(formData.commune && formData.address) setActiveAccordion(3) }}
                       className="w-full flex items-center justify-between text-start"
                     >
                        <div className="flex items-center gap-4">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${activeAccordion === 3 ? 'bg-[#F37021] text-white shadow-lg' : 'bg-stone-100 text-stone-500'}`}>3</div>
                           <h3 className="text-lg sm:text-xl font-black text-[#121315]">{t("checkout.review_and_pay") || "Paiement & Confirmation"}</h3>
                        </div>
                     </button>

                     <AnimatePresence>
                        {activeAccordion === 3 && (
                           <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="mt-8 space-y-6 overflow-hidden">
                              <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                                 <h4 className="font-bold text-sm text-[#121315] mb-4 uppercase tracking-widest rtl:tracking-normal">{t("checkout.delivery_info") || "Vos Informations de Livraison"}</h4>
                                 <div className="text-sm font-medium text-stone-600 space-y-2">
                                    <p className="flex gap-2"><span className="font-bold text-stone-900 w-24 shrink-0">{t("checkout.client", "Client :")}</span> <span className="flex-1 break-words">{formData.fullName} ({formData.phone})</span></p>
                                    <p className="flex gap-2"><span className="font-bold text-stone-900 w-24 shrink-0">{t("checkout.destination", "Destination :")}</span> <span className="flex-1 break-words">{formData.wilaya} • {formData.commune}</span></p>
                                    <p className="flex gap-2"><span className="font-bold text-stone-900 w-24 shrink-0">{t("checkout.reference", "Repère :")}</span> <span className="flex-1 break-words">{formData.address}</span></p>
                                    <p className="flex gap-2 items-center"><span className="font-bold text-stone-900 w-24 shrink-0">{t("checkout.mode", "Mode :")}</span> <span className="bg-[#121315] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shrink-0">{deliveryMethod === 'stopdesk' ? t("checkout.stopdesk", "📦 Point Relais StopDesk") : t("checkout.door_delivery", "🚚 À Domicile")}</span></p>
                                 </div>
                              </div>

                              <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 flex gap-4 items-start text-emerald-800">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                     <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm mb-1">{t("checkout.pay_on_delivery") || "Paiement à la livraison 🤝"}</h4>
                                      <p className="text-xs font-medium text-emerald-700/80 leading-relaxed mb-6">{t("checkout.pay_on_delivery_desc", "Vous ne payez que lorsque vous recevez votre commande en main propre. Aucun paiement par carte n'est requis aujourd'hui.")}</p>
                                      
                                      <div className="lg:hidden mt-4 pt-4 border-t border-emerald-100/60">
                                          <button
                                             onClick={handlePlaceOrder}
                                             disabled={isSubmitting}
                                             className="btn-premium-orange w-full flex items-center justify-center gap-3 disabled:opacity-60"
                                          >
                                             {isSubmitting ? t("checkout.processing", "Traitement...") : (grandTotal === 0 ? t("checkout.confirm_100_wallet", "Confirmer & Réserver (100% Wallet) 🌟") : (walletAmountUsed > 0 ? t("checkout.pay_cod_wallet", "Payer {{amount}} en COD + Wallet 🚚", { amount: formatPrice(grandTotal) }) : t("checkout.confirm_and_pay", "Confirmer & Payer {{amount}} à la livraison", { amount: formatPrice(grandTotal) })))}
                                          </button>
                                      </div>
                                  </div>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                </div>

                {/* Order Summary sidebar */}
                <div className="col-span-1 lg:col-span-5 space-y-6">
                   <div className="surface-card p-6 sm:p-8 sticky top-28">
                      <h3 className="text-sm font-black text-[#121315] uppercase tracking-widest rtl:tracking-normal mb-6 border-b border-stone-100 pb-4">{t("order_summary") || "Résumé de la commande"}</h3>
                      
                      <div className="space-y-6 max-h-[350px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                          {Object.values(groupedCart).map((group: any, idx) => (
                             <div key={idx} className="bg-stone-50/50 rounded-xl p-4 border border-stone-100">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200/50">
                                   <span className="bg-[#121315] text-white text-[9px] font-black uppercase tracking-widest rtl:tracking-normal px-2 py-0.5 rounded-full">
                                      {t("checkout.subpackage") || "Sous-colis"} {idx + 1}
                                   </span>
                                   <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal">{group.sellerName}</span>
                                </div>
                                <div className="space-y-3">
                                   {group.items.map((item: any, i: number) => {
                                     
                                     return (
                                                                          <div key={i} className="flex gap-4">
                                                                              <div className="w-14 h-16 rounded-xl bg-white shrink-0 overflow-hidden border border-stone-100">
                                                                                  <img loading="lazy" src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                                              </div>
                                                                              <div className="flex-1 flex flex-col justify-center">
                                                                                  <p className="text-[11px] font-bold text-[#121315] line-clamp-2 leading-tight">{item.name}</p>
                                                                                  {item.selectedVariant && (
                                                                                      <p className="text-[9px] font-medium text-stone-500 mt-0.5 uppercase tracking-wider">{item.selectedVariant}</p>
                                                                                  )}
                                                                                  <div className="flex justify-between items-center mt-2 text-stone-500">
                                                                                      <span className="text-[10px] font-bold">{t("checkout.qty", "Qté:")} {item.quantity || 1}</span>
                                                                                      <span className="text-[10px] font-black text-[#F37021] tracking-wider rtl:tracking-normal">{formatPrice(getCartItemPrice(item) * (item.quantity||1))}</span>
                                                                                  </div>
                                                                              </div>
                                                                          </div>
                                                                      );
                                   })}
                                </div>
                             </div>
                          ))}
                      </div>
                      
                      {/* Premium Promo Code Section */}
                      <div className="py-4 border-t border-b border-stone-100/80 my-4 space-y-3 animate-fade-in text-start">
                         <div className="flex items-center gap-2 mb-1">
                            <Ticket className="w-4 h-4 text-orange-600" />
                            <span className="text-[10px] font-black text-[#121315] uppercase tracking-widest rtl:tracking-normal">{t("Code Promotionnel")}</span>
                         </div>
                         {appliedCoupon ? (
                            <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                               <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                     <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider rtl:tracking-normal font-mono">{appliedCoupon.code}</p>
                                     <p className="text-[9px] font-semibold text-emerald-600">{t("checkout.discount_applied", "Coupon appliqué : -{{amount}}", { amount: appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}%` : formatPrice(appliedCoupon.discountValue) })}</p>
                                  </div>
                               </div>
                               <button 
                                  onClick={handleRemoveCoupon}
                                  className="text-[10px] font-black uppercase tracking-wider rtl:tracking-normal text-red-500 hover:text-red-700 transition-colors p-1"
                               >
                                  {t("remove") || "Retirer"}
                               </button>
                            </div>
                         ) : (
                            <div className="flex gap-2">
                               <input 
                                  type="text"
                                  value={couponInput}
                                  onChange={e => setCouponInput(e.target.value)}
                                  placeholder={t("EX : TARIK2026, OLMA10") || "EX : TARIK2026, OLMA10"}
                                  className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs uppercase focus:border-stone-400 focus:bg-white outline-none transition-all"
                               />
                               <button 
                                  onClick={handleApplyCoupon}
                                  disabled={isValidatingCoupon || !couponInput.trim()}
                                  className="px-4 py-2.5 bg-[#121315] hover:bg-[#0a0b0c] text-white rounded-xl text-[10px] font-black uppercase tracking-widest rtl:tracking-normal transition-colors disabled:opacity-50"
                               >
                                  {isValidatingCoupon ? (t("checking") || "Vérif...") : (t("apply") || "Valider")}
                               </button>
                            </div>
                         )}
                      </div>

                      <div className="space-y-3 pt-2">
                         <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                            <span>{t("Sous-total")}</span>
                            <span className="text-[#121315]">{formatPrice(subtotal)}</span>
                         </div>
                         {couponDiscount > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold text-emerald-600 animate-fade-in py-1">
                               <span className="flex items-center gap-1.5 font-black uppercase text-xs">{t("checkout.discount", "🎟️ Remise :")} {appliedCoupon?.code}</span>
                               <span className="font-extrabold text-xs">- {formatPrice(couponDiscount)}</span>
                            </div>
                         )}
                         <div className="hidden">
                         </div>
                         <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                            <span>{t("Livraison estimée")}</span>
                            <span className="text-[#121315]">{formatPrice(totalShipping)}</span>
                         </div>
                         
                         {(userProfile?.cashbackBalance || 0) > 0 && (
                            <div className="flex justify-between items-center pt-3 pb-1">
                               <label className="flex items-center gap-2 cursor-pointer group">
                                 <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${useCashbackPoints ? 'bg-orange-500' : 'bg-stone-200 group-hover:bg-stone-300'}`}>
                                    {useCashbackPoints && <CheckCircle className="w-3 h-3 text-white" />}
                                 </div>
                                 <span className="text-sm font-bold text-[#121315]">{t("checkout.use_cashback", "Utiliser mes points de fidélité (")}{formatPrice(userProfile?.cashbackBalance || 0)})</span>
                                 <input type="checkbox" className="hidden" checked={useCashbackPoints} onChange={e => setUseCashbackPoints(e.target.checked)} />
                               </label>
                               {useCashbackPoints && (
                                  <span className="text-emerald-500 font-bold text-sm">- {formatPrice(cashbackApplied)}</span>
                               )}
                            </div>
                         )}

                         {(userProfile?.walletBalance || 0) > 0 && (
                            <div className="flex justify-between items-center pt-3 pb-1 border-t border-stone-100/60 mt-2">
                               <label className="flex items-center gap-2.5 cursor-pointer group">
                                 <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 ${useWallet ? 'bg-orange-500 shadow-md scale-105' : 'bg-stone-100 group-hover:bg-stone-200'}`}>
                                    {useWallet && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                 </div>
                                 <div>
                                    <span className="text-sm font-bold text-[#121315] block">{t("checkout.use_wallet", "Utiliser mon solde Wallet")}</span>
                                    <span className="text-[10px] text-stone-500 font-bold block">{t("checkout.wallet_balance", "Solde disponible :")} {formatPrice(userProfile?.walletBalance || 0)}</span>
                                 </div>
                                 <input type="checkbox" className="hidden" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                               </label>
                               {useWallet && (
                                  <span className="text-emerald-500 font-extrabold text-sm">- {formatPrice(walletAmountUsed)}</span>
                                )}
                            </div>
                         )}

                         <div className="flex justify-between items-center pt-4 mt-4 border-t border-stone-100">
                            <div>
                                <span className="text-xs font-black text-[#121315] uppercase tracking-widest rtl:tracking-normal block font-sans">{t("checkout.total", "Total à payer")}</span>
                                {walletAmountUsed > 0 && (
                                   <span className="text-[10px] text-stone-500 font-bold block mt-0.5">({formatPrice(grandTotalBeforeWallet)} {t("checkout.order_minus", "commande -")} {formatPrice(walletAmountUsed)} {t("checkout.wallet", "Wallet")})</span>
                                )}
                             </div>
                            <div className="text-end">
                                <span className="text-xl font-black text-[#F37021] block">{formatPrice(grandTotal)}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-orange-600 block mt-0.5 animate-pulse">
                                   {grandTotal === 0 ? t("checkout.fully_paid_wallet", "✨ Payé à 100% par Wallet") : t("checkout.remaining_cod", "Reste à payer en COD")}
                                </span>
                             </div>
                         </div>
                      </div>

                      <AnimatePresence>
                         {activeAccordion === 3 && (
                            <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="mt-8 border-t border-stone-100 pt-6">
                               <button
                                  onClick={handlePlaceOrder}
                                  disabled={isSubmitting}
                                  className="btn-premium-orange w-full flex items-center justify-center gap-3 disabled:opacity-60"
                               >
                                  {isSubmitting ? t("checkout.processing", "Traitement...") : (grandTotal === 0 ? t("checkout.confirm_100_wallet", "Confirmer & Réserver (100% Wallet) 🌟") : (walletAmountUsed > 0 ? t("checkout.pay_cod_wallet", "Payer {{amount}} en COD + Wallet 🚚", { amount: formatPrice(grandTotal) }) : t("checkout.confirm_and_pay", "Confirmer & Payer {{amount}} à la livraison", { amount: formatPrice(grandTotal) })))}
                               </button>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                </div>
             </div>
          )}

          {step === 'success' && (
             <div className="max-w-3xl mx-auto text-center space-y-12 py-10 px-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-32 h-32 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center mx-auto shadow-[0_10px_40px_rgba(16,185,129,0.3)]"
                >
                   <CheckCircle className="w-16 h-16 animate-pulse" />
                </motion.div>
                <div className="space-y-4">
                   <h2 className="text-4xl md:text-5xl font-black text-[#121315] tracking-tighter rtl:tracking-normal">{t("congratulations") || "Félicitations !"}</h2>
                   <p className="text-stone-500 text-lg font-bold max-w-lg mx-auto">
                      {t("order_confirmed_msg") || "Commande"} <span className="text-[#121315]">#{orderSummary?.id?.substring(0, 8)}</span> {t("confirmed_suffix") || "confirmée."}<br/> 
                      {t("payment_due_delivery") || "Paiement de"} <span className="text-[#F37021]">{formatPrice(orderSummary?.total || 0)}</span> {t("to_be_expected_on_delivery") || "à prévoir à la livraison."}
                   </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 p-8 md:p-10 rounded-[3rem] shadow-sm transform hover:scale-[1.01] transition-transform">
                   <div className="w-14 h-14 bg-white rounded-2xl shadow-sm text-orange-500 flex items-center justify-center mx-auto mb-6">
                      <Ticket className="w-6 h-6" />
                   </div>
                   <h3 className="text-2xl font-black text-[#121315] mb-4">{t("earn_points_title") || "Gagnez 100 Olma Points !"}</h3>
                   <p className="text-sm font-bold text-stone-500 max-w-sm mx-auto leading-relaxed">
                      {t("validate_delivery_points_desc") || "Validez la réception de votre colis sur l'application dans les 24h suivant l'arrivée du livreur pour débloquer vos points."}
                   </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-stone-100">
                   <button 
                     onClick={() => navigate('/orders')}
                     className="btn-premium-orange"
                   >
                      {t("track_order") || "Suivre ma commande"}
                   </button>
                   <button 
                     onClick={() => navigate('/shop')}
                     className="btn-ghost-teal"
                   >
                      {t("continue_shopping") || "Continuer mes achats"}
                   </button>
                </div>
             </div>
          )}
       </div>
    </PremiumLayout>
  );
};
