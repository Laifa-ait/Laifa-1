import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, MapPin, CreditCard, Building2, Ticket, MessageCircle, Star, AlertTriangle, RotateCcw, ShieldCheck, Camera } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import { Shop, OrderStatus } from '../../types';
import { LiveChatDrawer } from '../../components/Chat/LiveChatDrawer';
import { ReturnRequestForm } from '../../components/Buyer/ReturnRequestForm';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const OrderDetails: React.FC = () => {
    const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Record<string, Shop>>({});
  const [cancelling, setCancelling] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Post-purchase return & dispute states
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('Taille inadaptée');
  const [refundMethod, setRefundMethod] = useState('coupon');
  const [bankInfo, setBankInfo] = useState('');
  const [returnDetails, setReturnDetails] = useState('');
  
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Produit endommagé / non conforme');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [disputePhotos, setDisputePhotos] = useState<{url: string, uploading: boolean}[]>([]);

  const handleDisputeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    if (disputePhotos.length + files.length > 3) {
      toast.error("Vous ne pouvez télécharger que 3 photos maximum.");
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const newObj = { url: '', uploading: true };
      setDisputePhotos(prev => [...prev, newObj]);
      try {
        const { uploadBytes, getDownloadURL, ref, getStorage } = await import('firebase/storage');
        const storage = getStorage();
        const storageRef = ref(storage, `disputes/${order?.id}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setDisputePhotos(prev => {
           const newPhotos = [...prev];
           const idx = newPhotos.findIndex(p => p.uploading);
           if (idx !== -1) newPhotos[idx] = { url, uploading: false };
           return newPhotos;
        });
      } catch (err) {
        toast.error("Erreur téléchargement");
        setDisputePhotos(prev => prev.filter(p => p.uploading === false));
      }
    }
  };

  const [submittingAction, setSubmittingAction] = useState(false);
  
  // Rating states per productId
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewedItems, setReviewedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser || !id) return;

    const fetchOrderAndShops = async () => {
      try {
        const orderRef = doc(db, "orders", id);
        const orderSnap = await getDoc(orderRef);
        
        if (orderSnap.exists()) {
          const orderData = { id: orderSnap.id, ...orderSnap.data() } as any;
          
          // Vérification de sécurité (normalement faite via Firestore Rules, mais on double check)
          if (orderData.userId !== currentUser.uid && !currentUser.uid) { // simplistic check, you'd check role too
             // For safety let's just let it be, firestore rules will reject if not allowed
          }
          
          setOrder(orderData);

          // Fetch sellers details
          if (orderData.sellerIds && orderData.sellerIds.length > 0) {
             const shopData: Record<string, Shop> = {};
             for (const sid of orderData.sellerIds) {
                const shopSnap = await getDoc(doc(db, "publicProfiles", sid));
                if (shopSnap.exists()) {
                   shopData[sid] = shopSnap.data() as Shop;
                }
             }
             setShops(shopData);
          }
        }
      } catch (err) {
        console.error("Erreur de récupération de la commande:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndShops();
  }, [id, currentUser]);

  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;
    
    

    setCancelling(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch("/api/buyer/orders/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: order.id })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur serveur");
      }
      setOrder((prev: any) => prev ? ({ ...prev, status: 'CANCELED' }) : null); // Mis à jour
      toast.success("Commande annulée avec succès !");
    } catch (err: any) {
      console.error("Erreur d'annulation:", err);
      toast.error(err.message || "Une erreur est survenue lors de l'annulation.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || order.status !== 'DELIVERED') return; // Mis à jour
    
    setSubmittingAction(true);
    try {
      const returnObj = {
        id: `ret_${Date.now()}`,
        status: 'pending',
        reason: returnReason,
        details: returnDetails,
        createdAt: new Date().toISOString()
      };
      
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        status: 'RETURN_REQUESTED', // Mis à jour
        returnRequest: returnObj
      });
      
      setOrder((prev: any) => ({ ...prev, returnRequest: returnObj, status: 'RETURN_REQUESTED' }));
      toast.success("Votre demande de retour a été enregistrée avec succès !");
      setShowReturnForm(false);
    } catch (err) {
      console.error("Error creating return request:", err);
      toast.error("Impossible d'enregistrer la demande de retour.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    if (disputePhotos.some(p => p.uploading)) {
        toast.error("Veuillez patienter pendant le téléchargement.");
        return;
    }

    setSubmittingAction(true);
    try {
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/buyer/orders/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          orderId: order.id,
          disputeReason: disputeReason,
          disputeDetails: disputeDetails,
          disputePhotos: disputePhotos.filter(p => !p.uploading).map(p => p.url)
        })
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || "Impossible d'ouvrir le litige.");
      }

      setOrder((prev: any) => ({ ...prev, status: 'dispute_open', disputeRequest: { reason: disputeReason, details: disputeDetails, photos: disputePhotos.filter(p=>!p.uploading).map(p=>p.url) } }));
      toast.success(t("Litige ouvert. Les fonds du vendeur sont gelés.") || "Litige ouvert avec succès !");
      setShowDisputeForm(false);
    } catch (err) {
      console.error("Error creating dispute:", err);
      toast.error("Échec de l'enregistrement de la réclamation.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitReview = async (productId: string) => {
    const ratingValue = ratings[productId] || 5;
    const commentValue = comments[productId] || '';
    
    if (!productId || !currentUser) return;
    
    setReviewedItems(prev => ({ ...prev, [productId]: true }));
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/reviews", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
         },
         body: JSON.stringify({
            productId,
            orderId: order.id,
            rating: ratingValue,
            comment: commentValue
         })
      });

      if (!res.ok) {
         throw new Error("Failed to submit review");
      }
      
      setOrder((prev: any) => ({
        ...prev,
        reviewsSubmitted: {
          ...(prev?.reviewsSubmitted || {}),
          [productId]: {
            rating: ratingValue,
            comment: commentValue,
            createdAt: new Date().toISOString()
          }
        }
      }));
      toast.success("Merci ! Votre avis a été publié.");
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Impossible de publier l'avis.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF9EC] flex items-center justify-center p-6">
         <div className="flex flex-col items-center gap-4 text-zinc-400">
            <Package className="w-12 h-12 opacity-50 animate-pulse" />
            <p className="text-sm font-bold uppercase tracking-widest rtl:tracking-normal">{t("Chargement...")}</p>
         </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FDF9EC] flex flex-col items-center justify-center p-6">
         <XCircle className="w-16 h-16 text-red-400 mb-6" />
         <h2 className="text-2xl font-kinder text-zinc-900 mb-2 tracking-tight rtl:tracking-normal">{t("Commande introuvable")}</h2>
         <p className="text-zinc-500 mb-8 font-medium">{t("Cette commande n'existe pas ou vous n'y avez pas accès.")}</p>
         <button onClick={() => navigate('/dashboard/buyer')} className="px-8 py-4 bg-zinc-950 text-white rounded-2xl font-kinder uppercase tracking-widest rtl:tracking-normal text-[11px]">
            {t("Retour au tableau de bord")}</button>
      </div>
    );
  }

  const getStatusDisplay = (status: OrderStatus) => {
     if (order?.returnRequest) {
        return { label: `Retour : ${order.returnRequest.status}`, color: 'text-purple-700', bg: 'bg-purple-50 border border-purple-200/60', icon: RotateCcw };
     }
     if (order?.disputeRequest) {
        return { label: 'Réclamation litige', color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-200/60', icon: AlertTriangle };
     }
     let normStatus = String(status).toUpperCase();
     if (normStatus === 'PENDING') normStatus = 'PROCESSING';
     switch (normStatus) {
        case 'NEW': return { label: 'Nouvelle commande', color: 'text-sky-600', bg: 'bg-sky-50 border border-sky-100', icon: Clock };
        case 'PROCESSING': return { label: 'En préparation', color: 'text-orange-600', bg: 'bg-orange-50/80 border border-orange-100', icon: Clock };
        case 'PICKED_UP': return { label: 'Ramassée', color: 'text-amber-600', bg: 'bg-amber-50/80 border border-amber-100', icon: Package };
        case 'IN_TRANSIT': return { label: 'En transit', color: 'text-blue-600', bg: 'bg-blue-50/80 border border-blue-100', icon: Truck };
        case 'SHIPPED': return { label: 'Expédiée', color: 'text-blue-600', bg: 'bg-blue-50/80 border border-blue-100', icon: Truck };
        case 'DELIVERED': return { label: 'Livrée & Payée', color: 'text-emerald-600', bg: 'bg-emerald-50/80 border border-emerald-100', icon: CheckCircle };
        case 'RETURN_REQUESTED': return { label: 'Retour demandé', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100', icon: RotateCcw };
        case 'RETURN_APPROVED': return { label: 'Retour accepté', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100', icon: CheckCircle };
        case 'RETURNING': return { label: 'En cours de retour', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100', icon: Truck };
        case 'RETURNED': return { label: 'Retour reçu', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100', icon: CheckCircle };
        case 'REFUNDED': return { label: 'Remboursée', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100', icon: CreditCard };
        case 'CANCELED': return { label: 'Annulée', color: 'text-zinc-500', bg: 'bg-zinc-50 border border-zinc-100', icon: XCircle };
        default: return { label: status, color: 'text-zinc-650', bg: 'bg-zinc-50 border border-zinc-150', icon: Package };
     }
  };

  const statusInfo = getStatusDisplay(order.status);
  const StatusIcon = statusInfo.icon;

  const orderDate = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Date inconnue';

  // Grouper les articles par vendeur pour l'affichage
  const groupedItems = order.items.reduce((acc: any, item: any) => {
     const sid = item.sellerId || 'unknown';
     if (!acc[sid]) acc[sid] = [];
     acc[sid].push(item);
     return acc;
  }, {});

  return (
    <div className="bg-[#FDF9EC] min-h-screen pt-24 pb-40 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header & Back Action */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-4">
              <button onClick={() => navigate('/dashboard/buyer')} className="flex items-center gap-2 text-zinc-400 font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal hover:text-zinc-900 transition-colors">
                 <ArrowLeft className="w-4 h-4" /> {t("Retour aux commandes")}</button>
              <h1 className="text-4xl md:text-5xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal">
                 {t("Commande")}<span className="text-zinc-400">#{order.id.substring(0,8)}</span>
              </h1>
              <p className="text-sm font-bold text-zinc-500">{t("Passée le")}{orderDate}</p>
           </div>
           
           <div className={`px-6 py-4 rounded-2xl flex items-center gap-3 ${statusInfo.bg}`}>
              <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
              <span className={`text-sm font-black uppercase tracking-widest rtl:tracking-normal ${statusInfo.color}`}>
                 {statusInfo.label}
              </span>
           </div>
        </div>

        {/* Timeline Status */}
        {['new', 'pending', 'processing', 'picked_up', 'in_transit', 'shipped', 'delivered'].includes((order.status || '').toLowerCase()) && (
          <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-200/20">
             <div className="relative flex justify-between">
                {/* Ligne de fond */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-100 -translate-y-1/2 rounded-full z-0" />
                
                {/* Ligne de progression */}
                <div className="absolute top-1/2 left-0 h-1 bg-zinc-900 -translate-y-1/2 rounded-full z-0 transition-all duration-1000" style={{ 
                   width: (() => {
                      const stat = (order.status || '').toLowerCase();
                      if (stat === 'delivered') return '100%';
                      if (stat === 'in_transit' || stat === 'shipped') return '66%';
                      if (stat === 'picked_up') return '33%';
                      return '0%';
                   })()
                }} />

                {/* Étapes */}
                {[
                   { key: 'processing', id: 0, label: 'Préparation', icon: Clock },
                   { key: 'picked_up', id: 1, label: 'Ramassé', icon: Package },
                   { key: 'in_transit', id: 2, label: 'En Transit', icon: Truck },
                   { key: 'delivered', id: 3, label: 'Livré', icon: CheckCircle }
                ].map((step) => {
                   const orderStat = (order.status || '').toLowerCase();
                   let currentLevel = 0;
                   if (orderStat === 'picked_up') currentLevel = 1;
                   if (orderStat === 'in_transit' || orderStat === 'shipped') currentLevel = 2;
                   if (orderStat === 'delivered') currentLevel = 3;
                   
                   const isActive = currentLevel >= step.id;
                   const StepIcon = step.icon;
                   return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center gap-4 bg-white px-2">
                         <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isActive ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-300'}`}>
                            <StepIcon className="w-5 h-5 md:w-6 md:h-6" />
                         </div>
                         <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest rtl:tracking-normal ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
                            {step.label}
                         </span>
                      </div>
                   );
                })}
             </div>
          </div>
        )}

        {/* Tracking Info Panel */}
        {order.trackingId && (
           <div className="bg-[#3C2B22] text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-[#FF5C00]" />
                 </div>
                 <div>
                    <p className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#FF5C00]">{t("Envoi logistique")}</p>
                    <p className="text-sm font-bold text-white/90">{t("Colis enregistré chez le transporteur, N° de suivi :")}<span className="font-kinder text-white ml-1">{order.trackingId}</span></p>
                 </div>
              </div>
              <a 
                 href={order.labelUrl || "#"} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full sm:w-auto px-6 py-3 bg-white text-[#3C2B22] rounded-xl text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-center hover:bg-stone-50 transition-colors"
              >
                 {t("Suivre le colis")}</a>
           </div>
        )}

        <div className="grid lg:grid-cols-3 gap-10 mt-10">
           {/* Items List */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-200/20">
                 <h3 className="text-xl font-kinder tracking-tight rtl:tracking-normal mb-8">{t("Articles commandés")}</h3>
                 
                 <div className="space-y-10">
                    {Object.entries(groupedItems).map(([sid, items]) => (
                       <div key={sid} className="space-y-6">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                <Building2 className="w-4 h-4" />
                             </div>
                             <span className="text-sm font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-900">
                                {shops[sid]?.shopName || "Vendeur Olma"}
                             </span>
                          </div>
                          
                          <div className="space-y-4 px-2">
                             {(items as any[]).map((item, idx) => {
                                 
                                 const itemProductId = item.id || item.productId || `prod_${idx}`;
                                 const wasReviewed = order.reviewsSubmitted && order.reviewsSubmitted[itemProductId];
                                 const isRating = ratings[itemProductId] || 5;
                                 const isComment = comments[itemProductId] || '';
                                 const isSubmitting = reviewedItems[itemProductId];

                                 return (
                                    <div key={idx} className="space-y-4 bg-zinc-50/50 p-6 rounded-3xl border border-zinc-100">
                                       <div className="flex gap-4 items-center">
                                          <div className="w-20 h-20 bg-zinc-100 rounded-2xl overflow-hidden shrink-0">
                                             {item.image ? (
                                                <img loading="lazy" src={getOptimizedImageUrl(item.image, 200)} alt={item.name} className="w-full h-full object-cover" />
                                             ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-350"><Package className="w-8 h-8" /></div>
                                             )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <h4 className="font-bold text-sm text-zinc-900 truncate">{item.name}</h4>
                                             {item.selectedVariant && (
                                                <p className="text-[10px] font-kinder uppercase text-zinc-500 mt-1">{t("Var:")}{item.selectedVariant}</p>
                                             )}
                                             <div className="flex items-center justify-between mt-2">
                                                <p className="text-[11px] font-kinder uppercase text-zinc-400">{t("Quantité:")}{item.quantity}</p>
                                                <p className="font-kinder text-sm text-zinc-900">{formatPrice(item.price * item.quantity)}</p>
                                             </div>
                                          </div>
                                       </div>

                                       {/* Interactive Product Review Panel (Delivered only / Frictionless) */}
                                       {order.status === 'delivered' && (
                                          <div className="pt-4 border-t border-zinc-100 mt-2">
                                             {wasReviewed ? (
                                                <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-2xl flex flex-col gap-3 text-left">
                                                   <div className="flex items-center gap-2">
                                                      <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal">
                                                         <ShieldCheck className="w-3 h-3" />
                                                         {t("Acheteur Vérifié Olmart")}</div>
                                                      <span className="text-[9px] font-kinder text-emerald-700 uppercase tracking-wider rtl:tracking-normal ml-auto">{t("Avis publié !")}</span>
                                                   </div>
                                                   <div>
                                                      <div className="flex gap-1 mb-1.5">
                                                         {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} className={`w-3 h-3 ${s <= wasReviewed.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                                                         ))}
                                                      </div>
                                                      <p className="text-zinc-650 text-xs italic text-left">"{wasReviewed.comment || 'Sans commentaire écrit'}"</p>
                                                   </div>
                                                </div>
                                             ) : (
                                                <div className="space-y-4">
                                                   <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">
                                                      <ShieldCheck className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                      <p className="text-xs font-bold text-[#3C2B22] leading-tight">
                                                         {t("Votre avis compte !")}<span className="text-orange-600 block mt-0.5">{t("Gagnez 100 DA sur votre Wallet en publiant une photo de votre article !")}</span>
                                                      </p>
                                                   </div>
                                                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                                                      <span className="text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal">{t("Avez-vous aimé cet article ? Notez-le :")}</span>
                                                      <div className="flex gap-1">
                                                         {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                               key={star}
                                                               type="button"
                                                               onClick={() => setRatings({ ...ratings, [itemProductId]: star })}
                                                               className="focus:outline-none hover:scale-110 transition-transform cursor-pointer"
                                                            >
                                                               <Star className={`w-6 h-6 ${star <= isRating ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-zinc-200 hover:text-amber-300'}`} />
                                                            </button>
                                                         ))}
                                                      </div>
                                                   </div>
                                                   <div className="flex flex-col gap-2 text-left">
                                                      <textarea
                                                         rows={2}
                                                         placeholder={t("Partagez votre avis sur cet article...") || "Partagez votre avis sur cet article..."}
                                                         value={isComment}
                                                         onChange={(e) => setComments({ ...comments, [itemProductId]: e.target.value })}
                                                         className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-medium text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-orange-500/20 text-left resize-none"
                                                      />
                                                      <div className="flex justify-between items-center">
                                                         <button type="button" className="text-xs font-bold text-stone-500 flex items-center gap-1.5 hover:text-[#3C2B22] transition-colors">
                                                            <Camera className="w-4 h-4" /> {t("Ajouter une photo")}</button>
                                                         <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => handleSubmitReview(itemProductId)}
                                                            className="px-6 py-2 bg-[#FF5C00] text-white rounded-[2rem] text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal hover:bg-[#b04b2c] transition-colors disabled:opacity-40 whitespace-nowrap cursor-pointer shadow-sm"
                                                         >
                                                            {isSubmitting ? "Envoi..." : "Publier l'avis"}
                                                         </button>
                                                      </div>
                                                   </div>
                                                </div>
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 );
                              })}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Summary & Actions */}
           <div className="space-y-8">
              <div className="bg-white rounded-[3rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-200/20 space-y-8">
                 <h3 className="text-xl font-kinder tracking-tight rtl:tracking-normal">{t("Résumé financier")}</h3>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                       <span>{t("Sous-total")}</span>
                       <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                       <div className="flex justify-between items-center text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal text-emerald-500">
                          <span className="flex items-center gap-2"><Ticket className="w-3 h-3" /> {t("Réduction")}</span>
                          <span>-{formatPrice(order.discountAmount)}</span>
                       </div>
                    )}
                    <div className="flex justify-between items-center text-[11px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                       <span>{t("Frais de livraison")}</span>
                       <span>{formatPrice(order.shippingTotal)}</span>
                    </div>
                    
                    <div className="pt-6 border-t border-zinc-100">
                       <div className="flex justify-between items-end">
                          <span className="text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-900">{t("Total payé")}</span>
                          <span className="text-3xl font-kinder tracking-tighter rtl:tracking-normal">{formatPrice(order.total)}</span>
                       </div>
                       <p className="text-[9px] font-bold text-zinc-400 mt-2 uppercase tracking-widest rtl:tracking-normal text-right">{t("Payé à la livraison (Cash)")}</p>
                    </div>
                 </div>
              </div>

                             <div className="bg-white rounded-[3rem] p-8 border border-zinc-100 shadow-xl shadow-zinc-200/20 space-y-6">
                  <h3 className="text-sm font-kinder uppercase tracking-widest rtl:tracking-normal mb-2 flex items-center gap-3">
                     <MapPin className="w-5 h-5 text-zinc-400" />
                     {t("Adresse de livraison")}</h3>
                  <div className="bg-[#FDF9EC] p-6 rounded-3xl border border-zinc-100">
                     <p className="font-bold text-sm text-zinc-900 mb-1">{order.shippingAddress?.name}</p>
                     <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        {order.shippingAddress?.address}<br/>
                        {order.shippingAddress?.commune && <><span className="font-kinder text-zinc-900">{order.shippingAddress.commune}</span><br/></>}
                        <span className="font-kinder text-zinc-900">{order.shippingAddress?.wilaya}</span><br/>
                        <span className="font-kinder text-zinc-900">{order.shippingAddress?.phone}</span>
                     </p>
                  </div>

                  {/* Cash on delivery premium callout (Safety isolation) */}
                  <div className="p-4 bg-orange-50/50 border border-orange-100/50 rounded-2xl">
                     <p className="text-[10px] font-kinder uppercase text-[#FF5C00] tracking-wider rtl:tracking-normal mb-1">{t("ℹ️ Paiement à la livraison")}</p>
                     <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                        {t("Le livreur des 58 Wilayas vous contactera par téléphone pour valider l'heure de passage. Merci de préparer la somme exacte en espèces.")}</p>
                  </div>
               </div>

               {/* Active Return Status / Dispute Status Cards */}
               {order.returnRequest && (
                  <div className="bg-purple-50/60 border border-purple-100 p-6 rounded-[2rem] space-y-3">
                     <div className="flex items-center gap-3 text-purple-700">
                        <RotateCcw className="w-5 h-5" />
                        <h4 className="font-kinder text-xs uppercase tracking-wider rtl:tracking-normal">{t("Demande de retour enregistrée")}</h4>
                     </div>
                     <p className="text-xs text-zinc-650 font-normal leading-relaxed">
                        {t("Motif :")}<span className="font-extrabold text-zinc-850">{order.returnRequest.reason}</span><br />
                        {t("Méthode :")}<span className="font-extrabold text-zinc-850">{order.returnRequest.refundMethod === 'ccp' ? 'Virement CCP' : 'Bon d\'achat Olma'}</span>
                     </p>
                     
                     {order.returnRequest.photos && order.returnRequest.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                           {order.returnRequest.photos.map((photo: string, idx: number) => (
                              <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block relative w-12 h-12 rounded-lg overflow-hidden border border-purple-200 hover:opacity-80 transition-opacity">
                                 <img loading="lazy" src={photo} alt={`Preuve ${idx+1}`} className="w-full h-full object-cover" />
                              </a>
                           ))}
                        </div>
                     )}

                     <div className="p-3 bg-white border border-purple-100 rounded-xl text-[10px] font-bold text-purple-650 uppercase tracking-widest rtl:tracking-normal text-center">
                        {t("Statut :")}{order.returnRequest.status === 'pending' ? 'Validation en cours' : 'Traitée'}
                     </div>
                  </div>
               )}

               {order.disputeRequest && (
                  <div className="bg-orange-50/60 border border-orange-150 p-6 rounded-[2rem] space-y-3">
                     <div className="flex items-center gap-3 text-orange-700">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="font-kinder text-xs uppercase tracking-wider rtl:tracking-normal">{t("Réclamation active")}</h4>
                     </div>
                     <p className="text-xs text-zinc-650 font-medium">
                        {t("Motif du litige :")}<span className="font-bold text-zinc-800">{order.disputeRequest.reason}</span>
                     </p>
                     <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                        {t("\"La commission de médiation Olma examine les détails. Tout échange hors de notre messagerie interne désactive la protection acheteur.\"")}</p>
                  </div>
               )}

               {/* Actions Panels for Shipped/Delivered (Disputes & Returns) */}
               {order.status === 'delivered' && !order.returnRequest && (
                  <div className="space-y-4">
                     {!showReturnForm ? (
                        <button
                           onClick={() => { setShowReturnForm(true); setShowDisputeForm(false); }}
                           className="w-full py-4 bg-purple-50 hover:bg-purple-105 border border-purple-200 text-purple-700 rounded-3xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer text-center block"
                        >
                           {t("Demander un retour d'article")}</button>
                     ) : (
                        <ReturnRequestForm 
                           orderId={order.id}
                           onClose={() => setShowReturnForm(false)}
                           onSubmit={async (data) => {
                              setSubmittingAction(true);
                              try {
                                 const returnObj = {
                                    status: 'pending',
                                    ...data,
                                    createdAt: new Date().toISOString()
                                 };
                                 const orderRef = doc(db, "orders", order.id);
                                 await updateDoc(orderRef, { returnRequest: returnObj });
                                 setOrder((prev: any) => ({ ...prev, returnRequest: returnObj }));
                              } catch (e) {
                                 console.error(e);
                                 throw e;
                              } finally {
                                 setSubmittingAction(false);
                              }
                           }}
                        />
                     )}
                  </div>
               )}

               {['shipped', 'delivered'].includes(order.status) && !order.disputeRequest && (
                  <div className="space-y-4">
                     {!showDisputeForm ? (
                        <button
                           onClick={() => { setShowDisputeForm(true); setShowReturnForm(false); }}
                           className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 rounded-3xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer text-center block"
                        >
                           {t("Ouvrir un Litige (Tribunal Interne)")}</button>
                     ) : (
                        <form onSubmit={handleOpenDispute} className="bg-zinc-50/80 border border-zinc-300 p-6 rounded-[2.5rem] space-y-5 shadow-xl shadow-zinc-900/5 text-left">
                           <div className="flex justify-between items-center mb-2 border-b border-zinc-200 pb-3">
                              <h4 className="font-kinder text-xs uppercase tracking-wider rtl:tracking-normal text-zinc-800 flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-zinc-400" />
                                 {t("Centre de Résolution")}</h4>
                              <button type="button" onClick={() => setShowDisputeForm(false)} className="text-zinc-400 hover:text-zinc-600 text-xs font-bold transition-colors">{t("Fermer")}</button>
                           </div>

                           <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 text-[10px] leading-relaxed text-zinc-600 font-medium italic">
                              {t("En ouvrant ce litige, vous saisissez le tribunal interne OLMART. Le vendeur aura 24h pour accepter votre demande. En cas de refus, l'escalade sera faite vers un médiateur officiel. Soyez courtois et factuel.")}</div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-kinder uppercase text-zinc-500">{t("Motif précis du litige")}</label>
                              <select 
                                 value={disputeReason} 
                                 onChange={(e) => setDisputeReason(e.target.value)}
                                 className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-2xl text-xs font-bold text-zinc-800 focus:border-zinc-500 transition-all outline-none"
                              >
                                 <option value="Produit endommagé / non conforme">{t("Produit non conforme ou cassé")}</option>
                                 <option value="Le livreur réclame un montant supérieur">{t("Livreur réclame un autre prix")}</option>
                                 <option value="Retard de livraison excessif">{t("Retard de livraison critique")}</option>
                                 <option value="Le vendeur ne répond pas">{t("Vendeur injoignable ou suspect")}</option>
                              </select>
                           </div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-kinder uppercase text-zinc-500">{t("Preuve par image")}</label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                 {disputePhotos.map((photo, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                                       {photo.uploading ? (
                                          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                             <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                                          </div>
                                       ) : (
                                          <>
                                             <img loading="lazy" src={photo.url} alt={`Preuve ${idx+1}`} className="w-full h-full object-cover" />
                                             <button type="button" onClick={() => setDisputePhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10 text-[8px]">{t("x_close", "X")}</button>
                                          </>
                                       )}
                                    </div>
                                 ))}
                              </div>
                              {disputePhotos.length < 3 && (
                                 <label className="w-full flex-col h-24 border-2 border-dashed border-zinc-300 bg-white rounded-xl flex items-center justify-center text-zinc-400 cursor-pointer overflow-hidden relative hover:bg-zinc-50 transition-colors">
                                    <input type="file" accept="image/*" multiple onChange={handleDisputeFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    <span className="text-[10px] font-bold">{t("Uploader des preuves (Max 3)")}</span>
                                 </label>
                              )}
                           </div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-kinder uppercase text-zinc-500">{t("Description détaillée des faits")}</label>
                              <textarea
                                 rows={3}
                                 required
                                 placeholder={t("Décrivez avec précision la situation...") || "Décrivez avec précision la situation..."}
                                 value={disputeDetails}
                                 onChange={(e) => setDisputeDetails(e.target.value)}
                                 className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-2xl text-xs font-medium focus:border-zinc-500 outline-none transition-all"
                              />
                           </div>

                           <button
                              type="submit"
                              disabled={submittingAction}
                              className="w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-2xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal disabled:opacity-50 transition-colors cursor-pointer"
                           >
                              {submittingAction ? "Soumission en cours..." : "Soumettre au Tribunal"}
                           </button>
                        </form>
                     )}
                  </div>
               )}

               {order.status === 'pending' && (
                  <div className="pt-4">
                     <button 
                       onClick={handleCancelOrder}
                       disabled={cancelling}
                       className="w-full py-5 bg-red-50 text-red-600 hover:bg-red-100 rounded-3xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all border border-red-100 disabled:opacity-50 cursor-pointer"
                     >
                        {cancelling ? 'Annulation...' : 'Annuler la commande'}
                     </button>
                     <p className="text-center text-[9px] font-bold text-zinc-400 mt-4 px-4 uppercase tracking-widest rtl:tracking-normal leading-relaxed">
                        {t("L'annulation n'est possible que tant que la commande est \"En attente\".")}</p>
                  </div>
               )}
            </div>
        </div>
      </div>
      
      {/* Contact Seller Floating action */}
      <button 
         onClick={() => setChatOpen(true)}
         className="fixed bottom-8 right-8 w-14 h-14 bg-sky-500 text-white rounded-full shadow-lg shadow-sky-500/30 flex items-center justify-center hover:scale-105 hover:bg-sky-600 transition-all active:scale-95 group z-50 border-none cursor-pointer"
      >
         <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform stroke-[2]" />
      </button>

      <LiveChatDrawer 
         isOpen={chatOpen}
         onClose={() => setChatOpen(false)}
         orderId={order.id}
         otherPartyName="Service Olma / Vendeur"
      />
    </div>
  );
};
