import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, doc, updateDoc, or } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { AlertTriangle, Package, Check, X, User, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '../../utils/format';
import { useTranslation } from "react-i18next";

export const DisputeManagement: React.FC = () => {
    const { t } = useTranslation();
   const [cases, setCases] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchCases = async () => {
         setLoading(true);
         // Find all orders with return requests or disputes
         // Note: splitting due to Firestore limitation on multiple inequality filters on different fields
         const fetchReturns = async () => {
            const { limit } = await import('firebase/firestore');
            const q = query(
               collection(db, "orders"),
               where("returnRequest", "!=", null),
               limit(100)
            );
            return getDocs(q);
         };

         const fetchDisputes = async () => {
            const { limit } = await import('firebase/firestore');
            const q = query(
               collection(db, "orders"),
               where("disputeRequest", "!=", null),
               limit(100)
            );
            return getDocs(q);
         };

         try {
            const [returnsSnap, disputesSnap] = await Promise.all([fetchReturns(), fetchDisputes()]);
            const returns = returnsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const disputes = disputesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Merge and dedup
            const merged = [...returns];
            disputes.forEach(d => {
               if (!merged.find(m => m.id === d.id)) {
                  merged.push(d);
               }
            });

            setCases(merged);
         } catch (e) {
            console.error("Error fetching disputes:", e);
            toast.error(t("Erreur lors du chargement des litiges"));
         } finally {
            setLoading(false);
         }
      };
      fetchCases();
   }, []);

   const resolveDispute = async (orderId: string, resolution: 'approved' | 'rejected', amount: number) => {
      try {
         const token = await auth.currentUser?.getIdToken();
         const res = await fetch(`/api/admin/orders/${orderId}/resolve-dispute`, {
            method: 'POST',
            headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
               resolution: resolution === 'approved' ? 'refund_to_wallet' : 'close',
               refundAmount: amount
            })
         });

         if (!res.ok) throw new Error("Erreur serveur");

         toast.success(resolution === 'approved' ? t("Client remboursé sur son Wallet !") : t("Litige clos sans remboursement"));
         setCases(prev => prev.filter(c => c.id !== orderId));
      } catch (e) {
         console.error(e);
         toast.error(t("Erreur lors de la résolution"));
      }
   };

   return (
      <div className="space-y-6 px-4 md:px-0">
         <h2 className="text-2xl font-black text-zinc-900">{t("Litiges et Retours Admin")}</h2>
         <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
            {cases.length === 0 ? (
               <div className="py-12 text-center text-zinc-600 font-medium">
                  {t("Aucun litige ou demande de retour active.")}</div>
            ) : (
               <div className="space-y-6">
                  {cases.map((c) => {
                        
                        return (
                                           <div key={c.id} className="p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                                              <div className="flex items-start gap-5 w-full">
                                                 <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner"><AlertTriangle className="w-6 h-6"/></div>
                                                 <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-3">
                                                       <p className="font-black text-zinc-900">{t("Commande #")}{c.id.substring(0,8)}</p>
                                                       <span className="text-[10px] bg-zinc-200 text-zinc-700 font-black px-2 py-0.5 rounded-md uppercase tracking-wider rtl:tracking-normal">{c.status}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-800">{t("Raison:")}{c.returnRequest?.reason || c.disputeRequest?.reason}</p>
                                                    <p className="text-xs text-zinc-650 font-medium italic">"{c.returnRequest?.details || c.disputeRequest?.details}"</p>
                                                    
                                                    {c.returnRequest?.photos && c.returnRequest.photos.length > 0 && (
                                                       <div className="flex flex-wrap gap-2 pt-2">
                                                          {c.returnRequest.photos.map((photo: string, idx: number) => (
                                                             <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 hover:opacity-80 transition-opacity">
                                                                <img loading="lazy" src={photo} alt={`Preuve ${idx+1}`} className="w-full h-full object-cover" />
                                                             </a>
                                                          ))}
                                                       </div>
                                                    )}
                       
                                                    <div className="pt-2 flex items-center gap-2">
                                                       <Package className="w-3.5 h-3.5 text-zinc-600"/>
                                                       <span className="text-xs font-black text-emerald-600">{formatPrice(c.total)} {t("DZD")}</span>
                                                    </div>
                                                 </div>
                                              </div>
                                              <div className="flex items-center gap-3 w-full md:w-auto">
                                                 <button 
                                                    onClick={() => resolveDispute(c.id, 'approved', c.total)} 
                                                    className="flex-1 md:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal transition-all shadow-lg shadow-emerald-500/20"
                                                 >
                                                    {t("Rembourser (")}{formatPrice(c.total)})
                                                 </button>
                                                 <button 
                                                    onClick={() => resolveDispute(c.id, 'rejected', 0)} 
                                                    className="flex-1 md:flex-none px-6 py-3.5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal transition-all shadow-lg shadow-zinc-900/20"
                                                 >
                                                    {t("Fin de litige")}</button>
                                              </div>
                                           </div>
                                        );
                      })}
               </div>
            )}
         </div>
      </div>
   );
};
