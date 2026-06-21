import React, { useState, useEffect } from 'react';
import { RotateCcw, PackageX, ChevronRight, AlertCircle, Calendar, CreditCard, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ReturnManagement: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const { t } = useTranslation();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReturns = async () => {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        // Query orders belonging to this user that have a returnRequest
        const q = query(
          collection(db, "orders"),
          where("userId", "==", currentUser.uid),
          where("returnRequest", "!=", null),
          limit(50)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client side by returnRequest.createdAt if any
        list.sort((a: any, b: any) => {
          const tA = new Date(a.returnRequest?.createdAt || 0).getTime();
          const tB = new Date(b.returnRequest?.createdAt || 0).getTime();
          return tB - tA;
        });
        setReturns(list);
      } catch (err) {
        console.error("Error fetching returns for buyer:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReturns();
  }, [currentUser]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: t("Validation en cours"), bg: 'bg-amber-50 text-amber-700 border-amber-200/60' };
      case 'approved':
        return { label: t("Retour Accepté"), bg: 'bg-blue-50 text-blue-700 border-blue-200/60' };
      case 'received':
        return { label: t("Reçu par le vendeur"), bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' };
      case 'completed':
        return { label: t("Remboursé sur Wallet"), bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
      case 'rejected':
        return { label: t("Demande Rejetée"), bg: 'bg-rose-50 text-rose-700 border-rose-200/60' };
      default:
        return { label: status, bg: 'bg-zinc-50 text-zinc-600 border-zinc-200/60' };
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-[#121315] mb-1">{t("Mes Retours & Annulations")}</h2>
        <p className="text-zinc-500 font-medium text-sm">{t("Gérez vos demandes de retours, remboursements et refus de colis.")}</p>
      </header>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
             <div className="flex gap-4 animate-pulse">
                <div className="w-16 h-16 bg-zinc-200 rounded-2xl" />
                <div className="space-y-2 flex-grow">
                   <div className="w-1/2 h-4 bg-zinc-200 rounded" />
                   <div className="w-1/3 h-3 bg-zinc-100 rounded" />
                </div>
             </div>
          </div>
        ) : returns.length === 0 ? (
          <div className="p-10 md:p-16 flex flex-col items-center justify-center text-center bg-[#FAF8F5] m-2 border border-zinc-100 rounded-3xl border-dashed">
            <div className="w-20 h-20 bg-white border border-zinc-200 rounded-full flex items-center justify-center mb-6 shadow-sm shadow-zinc-200/50">
              <PackageX className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-xl font-black text-[#121315] mb-2 tracking-tight rtl:tracking-normal">{t("Aucun retour en cours")}</h3>
            <p className="text-zinc-500 font-medium max-w-sm mb-6 leading-relaxed">
              {t("Vous n'avez effectué aucune demande de retour. Si vous rencontrez un problème avec une commande (taille, défaut...), vous pouvez initier un retour depuis le détail de la commande.")}</p>
            <button 
              onClick={() => navigate('/dashboard/buyer?tab=orders')}
              className="px-6 py-3 bg-[#121315] text-white rounded-xl font-bold uppercase tracking-widest rtl:tracking-normal text-[10px] rtl:text-[12px] hover:bg-[#0a0b0c] transition-colors"
            >
              {t("Voir mes commandes")}</button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {returns.map(req => {
              const badge = getStatusBadge(req.returnRequest?.status);
              return (
                <div key={req.id} className="p-6 hover:bg-[#FAF8F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-extrabold text-[#121315] text-base">{t("Commande #")}{req.id.substring(0, 8)}</span>
                      <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-semibold text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{req.returnRequest?.createdAt ? new Date(req.returnRequest.createdAt).toLocaleDateString() : t("Inconnu")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#121315] font-extrabold">{t("Total :")}</span>
                        <span className="text-[#9E6E4E] font-black">{req.total || 0} {t("currency.da", "DA")}</span>
                      </div>
                    </div>

                    <div className="text-xs bg-white border border-zinc-150 p-3 rounded-2xl max-w-2xl">
                      <span className="font-extrabold text-[#121315] block mb-0.5">{t("Motif :")} {req.returnRequest?.reason}</span>
                      <span className="text-zinc-500 font-medium leading-relaxed italic">"{req.returnRequest?.details}"</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button 
                      onClick={() => navigate(`/order/${req.id}`)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl font-bold text-xs text-[#121315] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>{t("Détails Commande")}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex gap-4 mt-6">
        <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
        <div>
          <h4 className="font-bold text-orange-800 text-sm mb-1">{t("Politique de retour simplifiée")}</h4>
          <p className="text-orange-700/80 text-xs rtl:text-sm font-medium leading-relaxed">
            {t("Notre modèle de Paiement à la Livraison permet de vérifier le colis à réception. Si un article ne correspond pas (taille, modèle), signalez-le immédiatement. Les retours validés sont remboursés sur votre Olma Wallet pour un usage futur.")}</p>
        </div>
      </div>
    </div>
  );
};
