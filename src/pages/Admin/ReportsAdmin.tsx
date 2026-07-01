import React, { useState } from 'react';
import { Download, FileText, BarChart3, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export const ReportsAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  const [generating, setGenerating] = useState<string | null>(null);

  const downloadReport = async (type: string) => {
    setGenerating(type);
    const toastId = toast.loading(
      isArabic 
        ? `جاري إنشاء وجمع بيانات ${type}...` 
        : `Génération et extraction des données pour ${type}...`
    );

    try {
      let headers: string[] = [];
      const rows: string[][] = [];
      const filename = `olmart_rapport_${type.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (type === "Rapport Financier") {
        // Fetch Completed and current orders + Withdrawals (Limited for the report generation to avoid out-of-memory and high billing)
        const ordersSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(250)));
        const withdrawalsSnap = await getDocs(query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(250)));

        headers = [
          t("ID Document"),
          t("Type Flux"),
          t("Montant (DZD)"),
          t("Statut"),
          t("Bénéficiaire / Boutique"),
          t("Date de Création")
        ];

        // Process withdrawals
        withdrawalsSnap.docs.forEach(doc => {
          const data = doc.data();
          const dateStr = data.createdAt ? (data.createdAt as any).toDate().toLocaleDateString() : "";
          rows.push([
            doc.id,
            t("Retrait Payout"),
            data.amount?.toString() || "0",
            data.status || "PENDING",
            data.shopName || data.sellerName || 'Boutique',
            dateStr
          ]);
        });

        // Process orders
        ordersSnap.docs.forEach(doc => {
          const data = doc.data();
          const dateStr = data.createdAt ? (data.createdAt as any).toDate().toLocaleDateString() : "";
          rows.push([
            doc.id,
            t("Commande Vente"),
            data.total?.toString() || data.grandTotal?.toString() || "0",
            data.status || "COMPLETED",
            data.customerName || data.customerEmail || 'Acheteur',
            dateStr
          ]);
        });

      } else if (type === "Export Commandes") {
        const ordersSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500)));

        headers = [
          t("ID Commande"),
          t("Client"),
          t("Téléphone"),
          t("Wilaya de livraison"),
          t("Montant Total (DZD)"),
          t("Wilaya de départ"),
          t("Statut de Commande"),
          t("Méthode Paiement"),
          t("Date Commande")
        ];

        ordersSnap.docs.forEach(doc => {
          const data = doc.data();
          const dateStr = data.createdAt ? (data.createdAt as any).toDate().toLocaleDateString() : "";
          rows.push([
            doc.id,
            data.customerName || data.shippingAddress?.fullName || 'Client',
            data.customerPhone || data.shippingAddress?.phone || '',
            data.shippingAddress?.wilaya || '',
            (data.total || data.grandTotal || 0).toString(),
            data.sellerWilaya || 'Alger',
            data.status || "PENDING",
            data.paymentMethod || "COD",
            dateStr
          ]);
        });

      } else if (type === "Performance Vendeurs") {
        // Fetch all sellers limited
        const sellersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "seller"), limit(300)));
        const activeSellers = sellersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }));

        headers = [
          t("ID Vendeur"),
          t("Nom de la boutique"),
          t("Email"),
          t("Téléphone"),
          t("Wilaya"),
          t("Note Globale"),
          t("Statut de Vérification"),
          t("Note d'activité")
        ];

        activeSellers.forEach((s: any) => {
          rows.push([
            s.id,
            s.shopName || s.name || 'Boutique OLMART',
            s.email || "",
            s.phone || "",
            s.wilaya || 'Alger',
            (s.rating || 4.5).toString(),
            s.status || "active",
            (s.productsCount || 10).toString()
          ]);
        });
      }

      // Format matrix as Excel WorkBook
      const worksheetData = [headers, ...rows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Add minimum widths to make it look decent
      const colWidths = headers.map(() => ({ wch: 25 }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Rapport");

      XLSX.writeFile(wb, filename);

      toast.success(
        isArabic 
          ? `تم تصدير ملف '${type}' بنجاح !` 
          : `Rapport "${type}" exporté avec succès !`,
        { id: toastId }
      );
    } catch (error: any) {
      console.error(error);
      toast.error(
        isArabic 
          ? `حدث خطأ أثناء تصدير التقرير: ${error.message}` 
          : `Erreur lors de l'exportation : ${error.message}`,
        { id: toastId }
      );
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-2">
        <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 uppercase">{t("Exports & Rapports")}</h2>
        <p className="text-zinc-500 font-medium">{t("Générez des rapports CSV/Excel pour la comptabilité, le marketing et l'analytique globale.")}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Rapport Financier", desc: "Toutes les transactions, commissions et payouts", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { title: "Export Commandes", desc: "Liste détaillée des commandes avec statuts", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Performance Vendeurs", desc: "Notes, volume de vente par boutique", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((report, idx) => {
          const isThisLoading = generating === report.title;
          
          return (
            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col items-start gap-4 hover:border-zinc-200 transition-colors">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.bg} ${report.color}`}>
                <report.icon className="w-6 h-6" />
              </div>
              <div className="min-h-[72px]">
                <h3 className="font-kinder text-lg text-zinc-900">{t(report.title)}</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">{t(report.desc)}</p>
              </div>
              <button 
                onClick={() => downloadReport(report.title)} 
                disabled={generating !== null}
                className="mt-4 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-700 rounded-xl font-bold uppercase tracking-widest rtl:tracking-normal text-[10px] flex items-center gap-2 w-full justify-center transition-colors"
                id={`btn-report-${idx}`}
              >
                {isThisLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isThisLoading ? t("Génération...") : t("Générer Excel")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
