import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Wallet,
  History,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowDownToLine,
  Upload,
  X,
  Loader2,
  Save,
  Percent,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, getDoc, setDoc, orderBy, increment, limit, serverTimestamp, addDoc } from "firebase/firestore";
import { formatPrice } from "../../utils/format";
import { WithdrawalRequest } from "../../types";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";

export const Finances: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [receiptValue, setReceiptValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [globalCommission, setGlobalCommission] = useState<number>(10);
  const [isSavingCommission, setIsSavingCommission] = useState(false);

  useEffect(() => {
    const fetchFinancesData = async () => {
      try {
        const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(100));
        const snap = await getDocs(q);
        setWithdrawals(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WithdrawalRequest));

        // Fetch global commission
        try {
          const commDoc = await getDoc(doc(db, "settings", "commission"));
          if (commDoc.exists()) {
            setGlobalCommission(commDoc.data().globalRate ?? 10);
          }
        } catch (e) {
          console.error("Failed to load global commission", e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancesData();
  }, []);

  const handleCommissionChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 50); // 0% a 50%
    setGlobalCommission(clamped);
  };

  const handleSaveCommission = async () => {
    if (globalCommission < 0 || globalCommission > 50) {
      toast.error(t("Taux de commission invalide (max 50%)"));
      return;
    }
    setIsSavingCommission(true);
    try {
      await setDoc(doc(db, "settings", "commission"), { globalRate: globalCommission }, { merge: true });
      toast.success(t("Commission mise à jour avec succès"));
    } catch (e) {
      toast.error(t("Erreur lors de la mise à jour"));
      console.error(e);
    } finally {
      setIsSavingCommission(false);
    }
  };

  const logFinanceAction = async (action: string, withdrawalId: string, amount: number) => {
    await addDoc(collection(db, "finance_logs"), {
      type: 'WITHDRAWAL_' + action.toUpperCase(),
      withdrawalId,
      amount,
      adminId: currentUser?.uid,
      timestamp: serverTimestamp()
    });
  };

  const validateReceipt = (value: string): boolean => {
    return /^[A-Z0-9]{5,30}$/i.test(value.trim());
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    if (!selectedWithdrawal) return;
    if (!validateReceipt(receiptValue)) {
      toast.error("Numéro de reçu invalide (5-30 caractères alphanumériques)");
      return;
    }

    setProcessing(true);
    try {
      const token = await currentUser?.getIdToken();

      const res = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proofUrl: receiptValue }),
      });

      if (!res.ok) throw new Error(await res.text());

      setWithdrawals(
        withdrawals.map((w) =>
          w.id === selectedWithdrawal.id ? { ...w, status: "PAID", receiptUrl: receiptValue } : w
        )
      );

      await logFinanceAction('APPROVE', selectedWithdrawal.id, selectedWithdrawal.amount);
      toast.success(t("Retrait marqué comme payé !"));
      setSelectedWithdrawal(null);
      setReceiptValue("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("Erreur lors de l'opération."));
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    if (!selectedWithdrawal) return;
    const reason = prompt(t("Motif du rejet (ex: RIB Invalide) :"));
    if (!reason) return toast.error(t("Le motif est obligatoire pour un rejet."));

    setProcessing(true);
    try {
      const token = await currentUser?.getIdToken();

      const res = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) throw new Error(await res.text());

      setWithdrawals(withdrawals.map((w) => (w.id === selectedWithdrawal.id ? { ...w, status: "CANCELED" } : w)));

      await logFinanceAction('REJECT', selectedWithdrawal.id, selectedWithdrawal.amount);
      toast.success(t("Retrait rejeté et fonds recrédités !"));
      setSelectedWithdrawal(null);
      setReceiptValue("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("Erreur lors de l'opération."));
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    if (withdrawals.length === 0) {
      toast.error(t("Aucune donnée à exporter."));
      return;
    }

    const headers = [t("ID"), t("Montant (DZD)"), t("Statut"), t("Boutique"), t("RIB/CCP"), t("Date Demande")];

    const rows = withdrawals.map((w) => [
      w.id,
      w.amount,
      w.status || "PENDING",
      w.shopName || (w as any).sellerName || "Boutique",
      w.accountDetails || (w as any).rib || "",
      w.createdAt ? (w.createdAt as any).toDate().toLocaleDateString() : "",
    ]);

    const worksheetData = [headers, ...rows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // widths for Excel
    const colWidths = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Payouts");

    XLSX.writeFile(wb, `olmart_finances_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("Fichier exporté avec succès !"));
  };

  const pendingCount = withdrawals.filter((w) => w.status?.toLowerCase() === "pending").length;
  const totalPendingAmount = withdrawals
    .filter((w) => w.status?.toLowerCase() === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">
            {t("Portefeuille & Litiges")}
          </h2>
          <p className="text-zinc-500 font-medium">{t("Gérez les flux financiers et les paiements vendeurs.")}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-8 py-5 bg-[#ea580c] text-white rounded-[2rem] flex items-center gap-4 font-kinder text-[11px] uppercase tracking-widest rtl:tracking-normal shadow-xl shadow-orange-500/20"
        >
          <FileSpreadsheet className="w-5 h-5" />
          {t("Export Comptable (Excel)")}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white rounded-[3rem] p-10 relative overflow-hidden border border-zinc-100 shadow-xl md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-[10px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal mb-2">
                  {t("Commission Globale")}
                </h4>
                <h3 className="text-xl font-kinder text-zinc-950 tracking-tight rtl:tracking-normal">
                  {t("Taux appliqué par défaut aux vendeurs")}
                </h3>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <Percent className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-zinc-500 font-medium mb-6">
              {t("Ce pourcentage est prélevé automatiquement sur chaque vente effectuée sur la plateforme.")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="number"
                max="100"
                min="0"
                value={globalCommission}
                onChange={(e) => setGlobalCommission(Number(e.target.value))}
                className="w-full bg-zinc-50 text-xl font-kinder rounded-3xl py-4 ps-6 pe-12 outline-none border border-transparent focus:border-zinc-200 focus:bg-white transition-all focus:shadow-sm"
              />
              <div className="absolute top-1/2 end-6 -translate-y-1/2 text-zinc-400 font-kinder">%</div>
            </div>
            <button
              onClick={handleSaveCommission}
              disabled={isSavingCommission}
              className="px-8 py-4 bg-zinc-950 text-white rounded-[2rem] font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 hover:bg-zinc-800 transition-colors shadow-xl disabled:opacity-50"
            >
              {isSavingCommission ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("Sauvegarder")}
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 rounded-[3rem] p-10 text-white relative overflow-hidden border border-white/10 shadow-2xl">
          <div className="absolute top-0 end-0 w-48 h-48 bg-[#ea580c]/20 rounded-full  -me-16 -mt-16" />
          <h4 className="text-[10px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal mb-2 relative z-10">
            {t("En attente de virement")}
          </h4>
          <h3 className="text-4xl font-kinder text-[#ffffff] tracking-tighter rtl:tracking-normal mb-4 relative z-10">
            {formatPrice(totalPendingAmount)}
          </h3>
          <div className="flex items-center gap-2 relative z-10">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
              {pendingCount} {t("demandes en cours")}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-zinc-50">
          <h4 className="text-xl font-kinder flex items-center gap-4">
            <Clock className="w-7 h-7 text-orange-500" />
            {t("Demandes de Retrait")}
          </h4>
        </div>
        <div className="divide-y divide-zinc-50">
          {withdrawals.length === 0 ? (
            <div className="p-24 text-center">
              <Wallet className="w-20 h-20 text-zinc-100 mx-auto mb-6" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs">
                {t("Aucune demande de retrait.")}
              </p>
            </div>
          ) : (
            withdrawals.map((w) => {
              return (
                <div
                  key={w.id}
                  className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 hover:bg-zinc-50/30 transition-colors group"
                >
                  <div className="flex items-center gap-8">
                    <div
                      className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${["PAID", "COMPLETED"].includes(w.status?.toUpperCase() || "") ? "bg-emerald-50 text-emerald-600" : w.status?.toUpperCase() === "FAILED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}
                    >
                      <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal mb-1">
                        {formatPrice(w.amount)}
                      </h4>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                          {w.shopName || (w as any).sellerName || "Boutique"}
                        </span>
                        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                        <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                          {t("RIB/CCP:")}
                          {w.accountDetails || (w as any).rib}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-end hidden lg:block">
                      <p className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1">
                        {t("Date Demande")}
                      </p>
                      <p className="text-sm font-kinder text-zinc-950">{w.createdAt?.toDate().toLocaleDateString()}</p>
                    </div>
                    {w.status?.toLowerCase() === "pending" ? (
                      <button
                        onClick={() => {
                          setSelectedWithdrawal(w);
                          setReceiptValue("");
                        }}
                        className="px-8 py-4 bg-zinc-950 text-white rounded-2xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> {t("Traiter Virement")}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" /> {t("Virement Effectué")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedWithdrawal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWithdrawal(null)}
              className="absolute inset-0 bg-zinc-950/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 overflow-hidden z-10"
            >
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="absolute top-6 end-6 text-zinc-400 hover:text-zinc-950 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-2xl font-kinder text-zinc-900 tracking-tight rtl:tracking-normal mb-2">
                {t("Confirmer le paiement")}
              </h3>
              <p className="text-zinc-500 text-sm mb-6">{t("Entrez le N° de reçu du virement.")}</p>

              <div className="bg-zinc-50 rounded-2xl p-4 mb-6 border border-zinc-100">
                <p className="text-[10px] font-kinder uppercase text-zinc-400 tracking-widest rtl:tracking-normal mb-1">
                  {t("Montant à transférer")}
                </p>
                <p className="text-2xl font-kinder text-zinc-900 mb-2">{formatPrice(selectedWithdrawal.amount)}</p>
                <p className="text-[10px] font-kinder uppercase text-zinc-400 tracking-widest rtl:tracking-normal mb-1">
                  {t("Coordonnées (")}
                  {(selectedWithdrawal.method || "").replace("_", " ")})
                </p>
                <p className="text-sm font-bold text-zinc-900">
                  {selectedWithdrawal.accountDetails || (selectedWithdrawal as any).rib}
                </p>
              </div>

              <form onSubmit={handleMarkAsPaid} className="space-y-6">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="N° de reçu (ex: TR12345678)"
                    value={receiptValue}
                    onChange={(e) => setReceiptValue(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold text-sm outline-none shrink"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={processing || !receiptValue}
                    className="w-full bg-[#ea580c] hover:bg-orange-600 text-white py-5 rounded-[2rem] font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex justify-center items-center gap-2 shadow-xl shadow-orange-500/20 disabled:opacity-50 transition-all"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Marquer comme Payé"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectWithdrawal}
                    disabled={processing}
                    className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-5 rounded-[2rem] font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {t("Échec du Virement / Rejeter")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
