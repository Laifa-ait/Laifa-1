import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Package, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

export const ReturnManagement: React.FC = () => {
    const { t } = useTranslation();
   const { currentUser } = useAuth();
   const [returns, setReturns] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchReturns = async () => {
         if (!currentUser) return;
         setLoading(true);
         // Get orders where this seller has items simply, avoiding complex indexes
         const { limit } = await import('firebase/firestore');
         const q = query(
            collection(db, "orders"),
            where("sellerIds", "array-contains", currentUser.uid),
            limit(250)
         );
         try {
            const snap = await getDocs(q);
            const allOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            // Filter returnRequest in-memory to completely bypass index requirement
            const returnOrders = allOrders.filter((o: any) => o.returnRequest !== undefined && o.returnRequest !== null);
            setReturns(returnOrders);
         } catch (err) {
            console.error("Error fetching returns: ", err);
         } finally {
            setLoading(false);
         }
      };
      fetchReturns();
   }, [currentUser]);

   const handleReturnAction = async (orderId: string, action: 'accepted' | 'rejected' | 'received') => {
      const progressToast = toast.loading(t("Mise à jour du statut sur le serveur..."));
      try {
         if (!auth.currentUser) {
            throw new Error(t("Veuillez vous authentifier d'abord."));
         }
         const idToken = await auth.currentUser.getIdToken();

         let targetStatusVal = '';
         if (action === 'accepted') {
            targetStatusVal = 'return_approved';
         } else if (action === 'rejected') {
            targetStatusVal = 'return_rejected';
         } else if (action === 'received') {
            targetStatusVal = 'refunded'; // Déclenche le remboursement dans le backend
         }

         const response = await fetch("/api/seller/orders/status", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({
               orderIds: [orderId],
               status: targetStatusVal
            })
         });

         if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || t("Échec de la validation serveur."));
         }

         setReturns(prev => prev.map(r => {
            if (r.id === orderId) {
               return {
                  ...r,
                  status: targetStatusVal,
                  returnRequest: {
                     ...r.returnRequest,
                     status: action === 'accepted' ? 'approved' : action === 'rejected' ? 'rejected' : 'received'
                  }
               };
            }
            return r;
         }));

         toast.success(t("Statut de retour mis à jour et validé côté serveur avec succès !"), { id: progressToast });
      } catch (err: any) {
         console.error(err);
         toast.error(`${t("Erreur de mise à jour :")} ${err.message}`, { id: progressToast });
      }
   };

   if (loading) return <div className="p-6 text-zinc-500">{t("Chargement...")}</div>;

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-kinder text-zinc-900">{t("Gestion des Retours")}</h2>
            <div className="px-4 py-2 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">
               {returns.length} {returns.length === 1 ? 'demande' : 'demandes'} {t("en cours")}</div>
         </div>
         
         <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 divide-y divide-zinc-100">
            {returns.length === 0 ? (
               <div className="py-12 text-center text-zinc-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <p>{t("Aucune demande de retour pour le moment.")}</p>
               </div>
            ) : (
               returns.map((r) => {
                     
                     return (
                                     <div key={r.id} className="py-6 flex items-start gap-4">
                                        <div className="p-3 bg-zinc-50 rounded-2xl">
                                           <Package className="w-6 h-6 text-zinc-500" />
                                        </div>
                                        <div className="flex-grow">
                                           <div className="flex items-center justify-between mb-1">
                                              <p className="font-bold text-zinc-900">{t("Commande #")}{r.id.substring(0, 8)}</p>
                                              <span className={`text-[10px] uppercase font-black tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full ${
                                                 r.returnRequest.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                 r.returnRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                 'bg-rose-100 text-rose-700'
                                              }`}>
                                                 {r.returnRequest.status}
                                              </span>
                                           </div>
                                           <p className="text-sm text-zinc-600 font-medium mb-1">{t("Motif:")}{r.returnRequest.reason}</p>
                                           <p className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100 mb-3">"{r.returnRequest.details}"</p>
                                           
                                           {r.returnRequest.photos && r.returnRequest.photos.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                 {r.returnRequest.photos.map((photoUrl: string, idx: number) => (
                                                    <a key={idx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 hover:opacity-80 transition-opacity">
                                                       <img loading="lazy" src={photoUrl} alt={`Preuve ${idx+1}`} className="w-full h-full object-cover" />
                                                    </a>
                                                 ))}
                                              </div>
                                           )}
                                        </div>
                                        {r.returnRequest.status === 'pending' && (
                                           <div className="flex items-center gap-2">
                                              <button onClick={() => handleReturnAction(r.id, 'accepted')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors">
                                                 <Check className="w-5 h-5" />
                                              </button>
                                              <button onClick={() => handleReturnAction(r.id, 'rejected')} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                                                 <X className="w-5 h-5" />
                                              </button>
                                           </div>
                                        )}
                                        {r.returnRequest.status === 'approved' && (
                                           <div className="flex flex-col items-end gap-1"><button onClick={() => handleReturnAction(r.id, 'received')} disabled={!r.carrier_tracking_events || !r.carrier_tracking_events.some((e: any) => e.status_key === 'TRACKING_STATUS_RETURNED')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                              {t("Marquer comme reçu & Rembourser")}</button> {(!r.carrier_tracking_events || !r.carrier_tracking_events.some((e: any) => e.status_key === 'TRACKING_STATUS_RETURNED')) && <div className='text-[10px] text-amber-600 mt-1 flex items-center gap-1'><AlertCircle className='w-3 h-3'/>{t('En attente du transporteur')}</div>}</div>
                                        )}
                                     </div>
                                  );
                   })
            )}
         </div>
      </div>
   );
};
