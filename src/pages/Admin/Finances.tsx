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
  Printer,
  TrendingUp,
  Filter,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, updateDoc, doc, getDoc, setDoc, orderBy, increment, limit, serverTimestamp, addDoc } from "firebase/firestore";
import { formatPrice } from "../../utils/format";
import { WithdrawalRequest } from "../../types";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  const [categoryCommissions, setCategoryCommissions] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<any>({ totalPending: 0, pendingCount: 0 });
  const [dateFilter, setDateFilter] = useState("30");

  // Mock data for chart
  const [chartData, setChartData] = useState<{date: string, revenu: number, commission: number}[]>([]);

  useEffect(() => {
    const fetchFinancesData = async () => {
      try {
        const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(100));
        const snap = await getDocs(q);
        setWithdrawals(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as WithdrawalRequest));

        // Fetch categories
        const catSnap = await getDocs(collection(db, "categories"));
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCategories(cats);

        // Fetch commissions
        try {
          const commDoc = await getDoc(doc(db, "settings", "commission"));
          if (commDoc.exists()) {
            const data = commDoc.data();
            setGlobalCommission(data.globalRate ?? 10);
            setCategoryCommissions(data.categoryRates || {});
          }
        } catch (e) {
          console.error("Failed to load commissions", e);
        }

        // Fetch financial summary
        try {
           const summaryDoc = await getDoc(doc(db, "system", "financial_summary"));
           if (summaryDoc.exists()) {
              setFinancialSummary(summaryDoc.data());
           }
        } catch (e) {
           console.error("Failed to load financial summary", e);
        }
        
        // Generate mock chart data based on date filter
        const days = parseInt(dateFilter);
        const data = Array.from({length: days}).map((_, i) => {
           const d = new Date();
           d.setDate(d.getDate() - (days - i - 1));
           return {
              date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
              revenu: Math.floor(Math.random() * 50000) + 10000,
              commission: Math.floor(Math.random() * 5000) + 1000
           };
        });
        setChartData(data);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancesData();
  }, [dateFilter]);

  const handleCommissionChange = (value: number) => {
    const clamped = Math.min(Math.max(value, 0), 50); // 0% a 50%
    setGlobalCommission(clamped);
  };
  
  const handleCategoryCommissionChange = (catId: string, value: number) => {
    const clamped = Math.min(Math.max(value, 0), 50);
    setCategoryCommissions(prev => ({...prev, [catId]: clamped}));
  };

  const handleSaveCommission = async () => {
    if (globalCommission < 0 || globalCommission > 50) {
      toast.error(t("Taux de commission invalide (max 50%)"));
      return;
    }
    setIsSavingCommission(true);
    try {
      await setDoc(doc(db, "settings", "commission"), { 
         globalRate: globalCommission,
         categoryRates: categoryCommissions
      }, { merge: true });
      toast.success(t("Commissions mises à jour avec succès"));
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

  const exportToCSV = async () => {
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

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // widths for Excel
    const colWidths = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Payouts");

    XLSX.writeFile(wb, `olmart_finances_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("Fichier exporté avec succès !"));
  };

  const pendingCount = financialSummary.pendingCount || withdrawals.filter((w) => w.status?.toLowerCase() === "pending").length;
  const totalPendingAmount = financialSummary.totalPending || withdrawals
    .filter((w) => w.status?.toLowerCase() === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const generateTaxReport = () => {
     let iframe = document.getElementById("print-tax-report") as HTMLIFrameElement;
     if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "print-tax-report";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
     }
     const docRef = iframe.contentWindow?.document || iframe.contentDocument;
     if (!docRef) return toast.error(t("Erreur iframe"));
     
     const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenu, 0);
     const totalCommissions = chartData.reduce((acc, curr) => acc + curr.commission, 0);
     const totalTva = totalCommissions * 0.19; // Example 19% TVA

     docRef.open();
     docRef.write(`
       <html>
       <head>
          <title>Rapport de Taxes</title>
          <style>
             body { font-family: sans-serif; padding: 40px; color: #111; }
             h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px; }
             .summary { display: flex; justify-content: space-between; margin-top: 40px; }
             .box { padding: 20px; border: 1px solid #ddd; border-radius: 8px; width: 30%; text-align: center; }
             .val { font-size: 24px; font-weight: bold; margin-top: 10px; }
             table { width: 100%; border-collapse: collapse; margin-top: 40px; }
             th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
             th { background-color: #f9fafb; }
          </style>
       </head>
       <body>
          <h1>OLMART - Rapport Financier & Taxes</h1>
          <p>Période: ${dateFilter} derniers jours</p>
          <p>Date d'édition: ${new Date().toLocaleDateString('fr-FR')}</p>
          
          <div class="summary">
             <div class="box">Volume Brut<div class="val">${formatPrice(totalRevenue)}</div></div>
             <div class="box">Commissions<div class="val">${formatPrice(totalCommissions)}</div></div>
             <div class="box">TVA Collectée (19%)<div class="val">${formatPrice(totalTva)}</div></div>
          </div>
          
          <table>
             <thead>
                <tr><th>Date</th><th>Volume Brut</th><th>Commissions HT</th><th>TVA</th></tr>
             </thead>
             <tbody>
                ${chartData.map(d => `
                   <tr>
                      <td>${d.date}</td>
                      <td>${formatPrice(d.revenu)}</td>
                      <td>${formatPrice(d.commission)}</td>
                      <td>${formatPrice(d.commission * 0.19)}</td>
                   </tr>
                `).join('')}
             </tbody>
          </table>
       </body>
       </html>
     `);
     docRef.close();
     setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
     }, 200);
  };

  return (
    <div className="space-y-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">
            {t("Portefeuille & Litiges")}
          </h2>
          <p className="text-zinc-500 font-medium">{t("Gérez les flux financiers et les paiements vendeurs.")}</p>
        </div>
        <div className="flex items-center gap-4">
           <button
             onClick={generateTaxReport}
             className="px-6 py-4 md:py-5 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50 rounded-[2rem] flex items-center gap-3 font-kinder text-[11px] uppercase tracking-widest rtl:tracking-normal shadow-sm transition-all"
           >
             <Printer className="w-4 h-4" />
             {t("Factures & Taxes (PDF)")}
           </button>
           <button
             onClick={exportToCSV}
             className="px-6 py-4 md:py-5 bg-[#ea580c] text-white rounded-[2rem] flex items-center gap-3 font-kinder text-[11px] uppercase tracking-widest rtl:tracking-normal shadow-xl shadow-orange-500/20"
           >
             <FileSpreadsheet className="w-5 h-5" />
             {t("Export Comptable (Excel)")}
           </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white rounded-[3rem] p-10 relative overflow-hidden border border-zinc-100 shadow-xl md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-[10px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal mb-2">
                  {t("Commission Globale & Catégories")}
                </h4>
                <h3 className="text-xl font-kinder text-zinc-950 tracking-tight rtl:tracking-normal mb-1">
                  {t("Taux appliqué par défaut aux vendeurs")}
                </h3>
                <p className="text-sm text-zinc-500 font-medium mb-6">
                  {t("Prélevé automatiquement sur chaque vente. Modifiez les taux spécifiques par catégorie ci-dessous.")}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <Percent className="w-6 h-6" />
              </div>
            </div>
            
            <div className="space-y-4 max-h-[160px] overflow-y-auto pe-4 mb-6 custom-scrollbar">
               <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="flex-1 text-sm font-bold text-zinc-900">{t("Taux par défaut (Global)")}</span>
                  <div className="relative w-32 shrink-0">
                    <input
                      type="number" max="50" min="0"
                      value={globalCommission}
                      onChange={(e) => handleCommissionChange(Number(e.target.value))}
                      className="w-full bg-white text-base font-bold text-zinc-900 rounded-xl py-2 ps-4 pe-10 outline-none border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <div className="absolute top-1/2 end-4 -translate-y-1/2 text-zinc-400 font-bold">%</div>
                  </div>
               </div>
               
               {categories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-4 px-4 py-2 hover:bg-zinc-50 rounded-xl transition-colors">
                     <span className="flex-1 text-xs font-medium text-zinc-600">{cat.translations?.fr?.name || cat.slug}</span>
                     <div className="relative w-28 shrink-0">
                       <input
                         type="number" max="50" min="0" placeholder={globalCommission.toString()}
                         value={categoryCommissions[cat.id] ?? ""}
                         onChange={(e) => handleCategoryCommissionChange(cat.id, Number(e.target.value))}
                         className="w-full bg-white text-sm font-bold text-zinc-900 rounded-lg py-1.5 ps-3 pe-8 outline-none border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-300"
                       />
                       <div className="absolute top-1/2 end-3 -translate-y-1/2 text-zinc-400 font-bold text-xs">%</div>
                     </div>
                  </div>
               ))}
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveCommission}
              disabled={isSavingCommission}
              className="px-8 py-3.5 bg-zinc-950 text-white rounded-[2rem] font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 hover:bg-zinc-800 transition-colors shadow-xl disabled:opacity-50"
            >
              {isSavingCommission ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("Sauvegarder")}
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 rounded-[3rem] p-10 text-white relative overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-center">
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
      
      {/* Chart Section */}
      <div className="bg-white rounded-[3.5rem] p-10 border border-zinc-100 shadow-sm overflow-hidden">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h4 className="text-xl font-kinder flex items-center gap-4 text-zinc-900">
               <TrendingUp className="w-6 h-6 text-indigo-500" />
               {t("Évolution des Revenus Vendeurs & Commissions")}
            </h4>
            <div className="relative">
               <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-zinc-50 border border-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-widest py-3 ps-5 pe-10 rounded-2xl outline-none cursor-pointer hover:bg-zinc-100 transition-colors focus:ring-2 ring-indigo-500/20"
               >
                  <option value="7">7 derniers jours</option>
                  <option value="30">30 derniers jours</option>
                  <option value="90">90 derniers jours</option>
               </select>
               <Filter className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>
         </div>
         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <Line type="monotone" dataKey="revenu" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={t("Volume Ventes")} />
                  <Line type="monotone" dataKey="commission" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name={t("Commissions OLMART")} />
                  <CartesianGrid stroke="#f4f4f5" strokeDasharray="5 5" vertical={false} />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
                  <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                     formatter={(value: any) => formatPrice(value)}
                     labelStyle={{ fontWeight: 'bold', marginBottom: '8px', color: '#18181b', fontSize: '12px' }}
                  />
               </LineChart>
            </ResponsiveContainer>
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
                      <p className="text-sm font-kinder text-zinc-950">{(w.createdAt as any)?.toDate?.()?.toLocaleDateString() || ''}</p>
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
                    ) : w.status?.toUpperCase() === "CANCELED" || w.status?.toUpperCase() === "FAILED" ? (
                      <div className="flex items-center gap-3 px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal border border-red-100">
                        <XCircle className="w-4 h-4" /> {t("Virement Refusé")}
                      </div>
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
