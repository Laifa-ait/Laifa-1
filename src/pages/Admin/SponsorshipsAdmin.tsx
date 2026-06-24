import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Megaphone, CheckCircle2, XCircle, Search, Clock, ShieldAlert, Star } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";

interface SponsorshipRequest {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  tier: string;
  requestDate: any;
  approvedAt?: any;
}

export const SponsorshipsAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [requests, setRequests] = useState<SponsorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sponsorship_requests'), orderBy('requestDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SponsorshipRequest[];
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sponsorship requests:", error);
      toast.error('Erreur de chargement des requêtes de sponsoring');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'expired', productId: string) => {
    try {
      // 1. Update the request status
      await updateDoc(doc(db, 'sponsorship_requests', id), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'approved' ? { approvedAt: new Date() } : {})
      });
      
      // 2. If approved, update the product itself, if expired or rejected make sure it is false
      await updateDoc(doc(db, 'products', productId), {
         isSponsored: newStatus === 'approved',
         ...(newStatus === 'approved' ? { sponsoredSince: new Date() } : {})
      });

      toast.success(`Requête ${
        newStatus === 'approved' ? 'approuvée' : 
        newStatus === 'rejected' ? 'rejetée' : 
        'sponsoring terminé'
      } avec succès.`);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour.');
    }
  };

  const filteredRequests = requests.filter(r => 
    r.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sellerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 flex items-center gap-4">
            <Megaphone className="w-10 h-10 text-orange-500" />
            {t("Gestion du Sponsoring")}</h2>
          <p className="text-zinc-500 font-medium mt-2">{t("Approuvez ou refusez les demandes de mise en avant des vendeurs.")}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-zinc-100">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h3 className="text-xl font-kinder text-zinc-950 uppercase tracking-widest rtl:tracking-normal">{t("Requêtes en attente")}</h3>
            <div className="relative w-full md:w-96">
              <Search className="w-5 h-5 absolute start-5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl ps-14 pe-6 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-colors"
                placeholder={t("Chercher vendeur ou produit...") || "Chercher vendeur ou produit..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
         </div>

         <div className="space-y-4">
            {loading ? (
                <div className="text-center py-20 text-zinc-400 font-bold uppercase">{t("Chargement...")}</div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">
                  {t("Aucune requête trouvée.")}</div>
            ) : (
                filteredRequests.map((req) => {
                      
                      return (
                                      <div key={req.id} className="border border-zinc-100 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all bg-white hover:shadow-lg">
                                         <div className="flex items-center gap-6">
                                            <img loading="lazy" src={req.productImage || 'https://via.placeholder.com/150'} alt={req.productName} className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-zinc-50" />
                                            <div>
                                               <div className="flex items-center gap-3 mb-1">
                                                  <h4 className="font-kinder text-zinc-950 text-lg uppercase">{req.productName}</h4>
                                                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal rounded-full ${
                                                    req.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    req.status === 'expired' ? 'bg-zinc-100 text-zinc-600' :
                                                    'bg-red-100 text-red-600'
                                                  }`}>
                                                    {req.status === 'pending' ? 'En Attente' : req.status === 'approved' ? 'Actif' : req.status === 'expired' ? 'Expiré/Révoqué' : 'Rejeté'}
                                                  </span>
                                               </div>
                                               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mb-1">{t("Par:")}{req.sellerName}</p>
                                               <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                                                 <div className="flex items-center gap-1.5 font-mono">
                                                   <Clock className="w-3.5 h-3.5" /> 
                                                   {req.requestDate?.toDate ? req.requestDate.toDate().toLocaleDateString('fr-FR') : 'Date Inconnue'}
                                                 </div>
                                                 <div className="flex items-center gap-1.5 font-mono">
                                                   <Star className="w-3.5 h-3.5 text-yellow-500" />
                                                   {t("Niveau:")}{req.tier.toUpperCase()}
                                                 </div>
                                               </div>
                                            </div>
                                         </div>

                                         {req.status === 'pending' ? (
                                            <div className="flex items-center gap-3 shrink-0">
                                               <button 
                                                 onClick={() => handleUpdateStatus(req.id, 'rejected', req.productId)}
                                                 className="px-5 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center gap-2"
                                               >
                                                 <XCircle className="w-4 h-4" /> {t("Rejeter")}</button>
                                               <button 
                                                 onClick={() => handleUpdateStatus(req.id, 'approved', req.productId)}
                                                 className="px-5 py-3 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                               >
                                                 <CheckCircle2 className="w-4 h-4" /> {t("Approuver")}</button>
                                            </div>
                                         ) : req.status === 'approved' ? (
                                            <div className="flex items-center gap-3 shrink-0">
                                               <button 
                                                 onClick={() => handleUpdateStatus(req.id, 'expired', req.productId)}
                                                 className="px-5 py-3 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center gap-2"
                                               >
                                                 <XCircle className="w-4 h-4" /> {t("Retirer le sponsoring")}</button>
                                            </div>
                                         ) : null}
                                      </div>
                                    );
                    })
            )}
         </div>
      </div>
    </div>
  );
};
