import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, ArrowUpRight, Clock, CheckCircle2, History, CreditCard, Landmark, Download, Loader2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, doc, increment, limit } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { toast } from 'react-hot-toast';
import { WithdrawalRequest } from '../../types';
import { useTranslation } from "react-i18next";

export const Wallet: React.FC = () => {
    const { t, i18n } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'VIREMENT_BANCAIRE' | 'CCP_BARIDIMOB'>(userProfile?.legalStatus ? 'VIREMENT_BANCAIRE' : 'CCP_BARIDIMOB');
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');

  useEffect(() => {
    if (!currentUser) return;
    const fetchWithdrawals = async () => {
      try {
        const q = query(
          collection(db, "withdrawals"),
          where("sellerId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawals();
  }, [currentUser]);

  const handleRequestWithdrawal = async () => {
    const val = parseFloat(amount);
    const balance = userProfile?.walletBalance || 0;
    
    if (isNaN(val) || val < 2000) return toast.error(isArabic ? "الحد الأدنى للسحب هو 2000 د.ج." : "Le montant minimum est de 2000 DA.");
    if (val > balance) return toast.error(isArabic ? "الرصيد غير كافٍ." : "Solde insuffisant.");
    if (!userProfile?.rib) return toast.error(isArabic ? "يرجى إعداد رمز RIB الخاص بك في قسم التحقق." : "Veuillez configurer votre RIB dans la section Vérification.");

    setRequestLoading(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch("/api/seller/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: val,
          method: method,
          bankInfo: userProfile.rib
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isArabic ? "خطأ في خادم النظام" : "Erreur serveur"));
      }
      
      toast.success(isArabic ? "تم إرسال طلب السحب بنجاح! تم تجميد الأموال حتى المعالجة." : "Demande de retrait envoyée ! Les fonds sont gelés.");
      setAmount('');
      window.location.reload(); // Quick refresh to update Context's userProfile
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isArabic ? "حدث خطأ أثناء إرسال الطلب." : "Erreur lors de la demande."));
    } finally {
      setRequestLoading(false);
    }
  };

  const activeBalance = userProfile?.walletBalance || 0;
  const lockedBalance = userProfile?.lockedBalance || 0;

  return (
    <div className="max-w-6xl space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Portefeuille & Finances")}</h2>
          <p className="text-zinc-500 font-medium">{t("Gérez vos revenus et demandez vos virements.")}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         {/* Balance Card */}
         <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-orange-500/20 shadow-2xl h-full flex flex-col justify-between group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-700" />
               <div className="relative z-10 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-8 border border-white/20 backdrop-blur-sm shadow-inner">
                     <WalletIcon className="w-7 h-7 text-white" />
                  </div>
                  <div className="space-y-6">
                     <div>
                       <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest rtl:tracking-normal mb-2">{t("Solde Disponible Net")}</p>
                       <h3 className="text-5xl font-black text-white tracking-tighter rtl:tracking-normal">
                          {formatPrice(activeBalance)}
                       </h3>
                       <p className="text-[10px] text-orange-200 font-medium mt-4">{t("Commission plateforme :")}{userProfile?.commissionRate || 10}%</p>
                     </div>
                     {lockedBalance > 0 && (
                        <div className="bg-black/10 rounded-2xl p-4 border border-white/10 backdrop-blur-md">
                          <p className="text-[10px] font-black text-orange-100 uppercase tracking-widest rtl:tracking-normal mb-1">{t("Fonds gelés (Retraits en cours)")}</p>
                          <p className="text-lg font-bold text-white">{formatPrice(lockedBalance)}</p>
                        </div>
                     )}
                     <div className="bg-white/10 rounded-2xl p-4 border border-white/20 backdrop-blur-md flex items-start gap-3 mt-4">
                       <ShoppingBag className="w-5 h-5 text-orange-200 shrink-0 mt-0.5" />
                       <p className="text-[11px] font-medium text-orange-100 leading-snug">
                          <span className="font-bold text-white block mb-0.5">{t("Saviez-vous ?")}</span>
                          {t("Vous pouvez utiliser ce solde pour faire vos achats sur Olmart.")}
                       </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Withdrawal Form */}
         <div className="lg:col-span-2 bg-white rounded-[3rem] border border-zinc-100 shadow-sm p-10">
            <h4 className="text-xl font-black mb-8 flex items-center gap-3">
               <ArrowUpRight className="w-6 h-6 text-orange-500" />
               {t("Demander un Retrait")}</h4>
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setMethod('VIREMENT_BANCAIRE')}
                    className={`p-4 rounded-2xl border ${method === 'VIREMENT_BANCAIRE' ? 'border-orange-500 bg-orange-50' : 'border-zinc-100 hover:border-zinc-200'} flex items-center justify-between transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === 'VIREMENT_BANCAIRE' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div className="text-start">
                        <p className="text-xs font-black text-zinc-900 mt-1">{t("Virement Bancaire (RIB)")}</p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setMethod('CCP_BARIDIMOB')}
                    className={`p-4 rounded-2xl border ${method === 'CCP_BARIDIMOB' ? 'border-orange-500 bg-orange-50' : 'border-zinc-100 hover:border-zinc-200'} flex items-center justify-between transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method === 'CCP_BARIDIMOB' ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="text-start">
                        <p className="text-xs font-black text-zinc-900 mt-1">{t("CCP / BaridiMob")}</p>
                      </div>
                    </div>
                  </button>
               </div>

               <div className="bg-zinc-50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between border border-zinc-100 gap-4">
                  <div className="flex items-center gap-4">
                     <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-0.5">{t("Compte destinataire utilisé")}</p>
                        <p className="font-black text-zinc-900">{userProfile?.rib || "Aucun compte configuré"}</p>
                     </div>
                  </div>
                  <CheckCircle2 className={`w-6 h-6 hidden md:block ${userProfile?.rib ? 'text-emerald-500' : 'text-zinc-200'}`} />
               </div>

               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ml-1">{t("Montant à retirer (DA)")}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder={t("Min. 2 000 DA") || "Min. 2 000 DA"}
                      className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl outline-none text-2xl font-black tracking-tight rtl:tracking-normal focus:ring-4 ring-orange-500/5 transition-all"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 font-black">{t("DA")}</div>
                  </div>
               </div>

               <button 
                  onClick={handleRequestWithdrawal}
                  disabled={requestLoading || !userProfile?.rib || !amount}
                  className="w-full bg-zinc-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-sm hover:bg-zinc-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
               >
                  {requestLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {requestLoading ? t("security.verifying", 'Traitement...') : t("seller.wallet.confirm_request", 'Confirmer la Demande')}
               </button>
            </div>
         </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
            <h4 className="text-xl font-black flex items-center gap-3">
               <History className="w-6 h-6 text-orange-500" />
               {t("Historique des Retraits")}</h4>
         </div>
         <div className="divide-y divide-zinc-50">
            {loading ? (
               <div className="p-20 text-center flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
                  <p className="text-zinc-500 font-medium">{t("Chargement de l'historique...")}</p>
               </div>
            ) : withdrawals.length === 0 ? (
               <div className="p-20 text-center">
                  <Clock className="w-16 h-16 text-zinc-100 mx-auto mb-4" />
                  <p className="text-zinc-400 font-bold">{t("Aucun retrait effectué pour le moment.")}</p>
               </div>
            ) : (
               withdrawals.map((w) => {
                 
                 return (
                                 <div key={w.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-50/20 transition-colors group">
                                    <div className="flex items-center gap-6">
                                       <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${['PAID', 'COMPLETED'].includes(w.status?.toUpperCase() || '') ? 'bg-emerald-50 text-emerald-600' : ['CANCELED', 'FAILED'].includes(w.status?.toUpperCase() || '') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {['PAID', 'COMPLETED'].includes(w.status?.toUpperCase() || '') ? <CheckCircle2 className="w-7 h-7" /> : ['CANCELED', 'FAILED'].includes(w.status?.toUpperCase() || '') ? <Clock className="w-7 h-7 rotate-45" /> : <Clock className="w-7 h-7" />}
                                       </div>
                                       <div>
                                          <p className="font-black text-zinc-950 text-xl">{formatPrice(w.amount)}</p>
                                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">
                                            {w.method ? w.method.replace('_', ' ') : t("seller.wallet.transfer", 'Virement')} • {['PAID', 'COMPLETED'].includes(w.status?.toUpperCase() || '') ? t("seller.wallet.paid_on", 'Payé le ') : t("seller.wallet.requested_on", 'Demandé le ')}{w.createdAt?.toDate().toLocaleDateString('fr-FR')}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                       <p className={`text-[10px] font-black uppercase tracking-widest rtl:tracking-normal px-4 py-2 rounded-full border ${['PAID', 'COMPLETED'].includes(w.status?.toUpperCase() || '') ? 'border-emerald-100 text-emerald-600 bg-emerald-50/50' : ['CANCELED', 'FAILED'].includes(w.status?.toUpperCase() || '') ? 'border-red-100 text-red-600 bg-red-50/50' : 'border-amber-100 text-amber-600 bg-amber-50/50'}`}>
                                          {['PAID', 'COMPLETED'].includes(w.status?.toUpperCase() || '') ? t("seller.wallet.paid", 'PAYÉ') : ['CANCELED', 'FAILED'].includes(w.status?.toUpperCase() || '') ? t("seller.wallet.canceled", 'ANNULÉ / REFUSÉ') : t("seller.wallet.pending", 'EN ATTENTE')}
                                       </p>
                                       {w.receiptUrl && (
                                          <a 
                                            href={w.receiptUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-zinc-500 hover:text-orange-600 text-xs font-bold transition-colors"
                                          >
                                             <Download className="w-4 h-4" />
                                             {t("Reçu PDF")}</a>
                                       )}
                                    </div>
                                 </div>
                              );
               })
            )}
         </div>
      </div>
    </div>
  );
};
