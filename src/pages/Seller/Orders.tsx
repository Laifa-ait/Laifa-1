import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Filter, Printer, ChevronRight, User, MapPin, Phone, Truck, CheckCircle2, Clock, CheckSquare, Square, MessageSquare, Download, DownloadCloud, Info, PackageCheck, HandCoins, ArrowRight, BookOpen, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, getDoc, orderBy, updateDoc, doc, limit, startAfter } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { toast } from 'react-hot-toast';
import { ShippingLabelPrinter } from '../../components/Seller/ShippingLabelPrinter';
import { OrderChatBox } from '../../components/OrderChatBox';
import { useTranslation } from "react-i18next";
import { exportPremiumToSheets } from '../../services/googleWorkspace';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import { utils, writeFile } from 'xlsx';

interface CalculatedOrder {
  id: string;
  commissionAmount: number;
  netRevenue: number;
  platformFee: number;
}

export const Orders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('olmart_hide_order_guide') !== 'true';
  });
  const [calculatedOrdersMap, setCalculatedOrdersMap] = useState<Record<string, CalculatedOrder>>({});

  useEffect(() => {
    if (orders.length === 0) {
      setCalculatedOrdersMap({});
      return;
    }
    
    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const token = await currentUser?.getIdToken();
        if (!token) return;
        
        const response = await fetch('/api/calculate-commissions', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({ orders })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (!cancelled) toast.error(errorData.error || "Erreur calcul commissions");
          return;
        }
        
        if (!cancelled) {
          const data = await response.json();
          const map: Record<string, CalculatedOrder> = {};
          data.calculatedOrders.forEach((co: CalculatedOrder) => {
             map[co.id] = co;
          });
          setCalculatedOrdersMap(map);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Service indisponible");
          console.error('Failed to calculate server commissions', err);
        }
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [orders, currentUser]);

  const ORDERS_PER_PAGE = 20;

  const handleToggleGuide = () => {
    const newVal = !showGuide;
    setShowGuide(newVal);
    localStorage.setItem('olmart_hide_order_guide', (!newVal).toString());
  };

  useEffect(() => {
    if (!currentUser) return;
    
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      if (searchTerm.trim() === '') {
        try {
          const q = query(
            collection(db, "orders"),
            where("sellerIds", "array-contains", currentUser.uid),
            limit(250)
          );
          const snap = await getDocs(q);
          const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetched.sort((a: any, b: any) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
          });
          setOrders(fetched);
          setLastVisible(null);
        } catch (err) {
          console.error(err);
        }
      } else {
         try {
            const docRef = doc(db, "orders", searchTerm.trim());
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().sellerIds?.includes(currentUser.uid)) {
               setOrders([{ id: docSnap.id, ...docSnap.data() }]);
            } else {
               setOrders([]);
            }
         } catch(e) {
            setOrders([]);
         }
         setLastVisible(null);
      }
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentUser, refreshTrigger]);

  const loadMoreOrders = async () => {
    // No-op as all orders up to limit are pre-fetched
    return;
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch("/api/seller/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ orderIds: [orderId], status: newStatus })
      });
      if (!res.ok) throw new Error("Erreur serveur");
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
     if (selectedIds.length === 0) return;
     
     const eligibleIds: string[] = [];
     for (const id of selectedIds) {
        const o = orders.find(ord => ord.id === id);
        if (!o) continue;
        const currentLower = (o.status || 'pending').toLowerCase();
        const targetLower = newStatus.toLowerCase();
        
        if (targetLower === 'confirmed' && currentLower === 'pending') {
           eligibleIds.push(id);
        } else if (targetLower === 'shipped' && (currentLower === 'preparing' || currentLower === 'processing' || currentLower === 'confirmed')) {
           eligibleIds.push(id);
        } else if (targetLower === 'delivered' && currentLower === 'shipped') {
           eligibleIds.push(id);
        }
     }

     if (eligibleIds.length === 0) {
        toast.error(`Aucune commande sélectionnée n'est éligible pour passer au statut "${newStatus.toUpperCase()}".`);
        return;
     }

     toast.loading("Mise à jour en cours...", { id: "bulk" });
     try {
        const token = await currentUser?.getIdToken();
        const res = await fetch("/api/seller/orders/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ orderIds: eligibleIds, status: newStatus })
        });
        if (!res.ok) throw new Error("Erreur serveur");
        
        setOrders(orders.map(o => eligibleIds.includes(o.id) ? { ...o, status: newStatus } : o));
        setSelectedIds([]);
        toast.success(`Statut mis à jour pour ${eligibleIds.length} commandes !`, { id: "bulk" });
     } catch (err) {
        console.error(err);
        toast.error("Erreur lors de la mise à jour en lot.", { id: "bulk" });
     }
  };

  const handleBulkGenerateTracking = async () => {
    if (selectedIds.length === 0 || !currentUser) return;

    const eligibleIds = selectedIds.filter(id => {
       const o = orders.find(ord => ord.id === id);
       return o && (o.status || '').toLowerCase() === 'confirmed';
    });

    if (eligibleIds.length === 0) {
       toast.error("Aucune des commandes sélectionnées n'est éligible pour la génération d'étiquettes (le statut doit être 'CONFIRMED').");
       return;
    }

    toast.loading("Génération des étiquettes en masse...", { id: "bulk_tracking" });
    try {
       const token = await currentUser.getIdToken();
       
       // Process sequentially or in a single API call. We will loop for now, 
       // but ideally backend would accept array.
       let successCount = 0;
       
       const res = await fetch('/api/prepare-shipment', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({ orderIds: eligibleIds, provider: 'YALIDINE' }) // Or specific implementation
       });

       if (!res.ok) throw new Error("Erreur de génération groupée");
       
       const data = await res.json();
       
       if (data.trackingNumbers) {
          // data.trackingNumbers could be a map or we just refresh orders
          toast.success("Étiquettes générées ! " + (data.pdfUrl ? "Téléchargement..." : ""), { id: "bulk_tracking" });
          if (data.pdfUrl) {
             window.open(data.pdfUrl, '_blank');
          }
          setRefreshTrigger(prev => prev + 1); // Refresh to get tracking numbers
          setSelectedIds([]);
       }

    } catch (err) {
       console.error(err);
       toast.error("Erreur, assurez-vous que les commandes sont en PRÉPARATION.", { id: "bulk_tracking" });
    }
  };

  const handleGenerateTracking = async (orderId: string) => {
    if (!currentUser) return;
    try {
      let idToken = "";
      if (currentUser) {
        idToken = await currentUser.getIdToken();
      }
      const response = await fetch('/api/prepare-shipment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ orderId })
      });
      const data = await response.json();
      if (data.tracking_id) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, trackingId: data.tracking_id, labelUrl: data.pdf_label_url, status: "shipped" } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, trackingId: data.tracking_id, labelUrl: data.pdf_label_url, status: "shipped" });
        }
        toast.success(`Colis enregistré ! N° de suivi généré: ${data.tracking_id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du bordereau.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'text-sky-600 bg-sky-50 border-sky-100';
      case 'PROCESSING': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'PICKED_UP': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'IN_TRANSIT': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'SHIPPED': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'DELIVERED': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'RETURN_REQUESTED': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'RETURN_APPROVED': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'RETURNING': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'RETURNED': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'REFUNDED': return 'text-zinc-600 bg-zinc-100 border-zinc-200';
      case 'CANCELED': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-zinc-500 bg-zinc-50 border-zinc-100';
    }
  };

  const getStatusLabel = (status: string) => {
     switch (status) {
       case 'NEW': return 'Nouveau';
       case 'PROCESSING': return 'Préparation';
       case 'PICKED_UP': return 'Ramassé';
       case 'IN_TRANSIT': return 'En transit';
       case 'SHIPPED': return 'Expédié';
       case 'DELIVERED': return 'Livré';
       case 'RETURN_REQUESTED': return 'Retour demandé';
       case 'RETURN_APPROVED': return 'Retour accepté';
       case 'RETURNING': return 'En retour';
       case 'RETURNED': return 'Retour reçu';
       case 'REFUNDED': return 'Remboursé';
       case 'CANCELED': return 'Annulé';
       default: return status;
     }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return;
    const headers = ['N° Commande', 'Date', 'Client', 'Telephone', 'Wilaya', 'Commune', 'Adresse', 'Total Client (DA)', 'Statut'];
    const rows = orders.map(o => {
      const isConfirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'IN_TRANSIT', 'PICKED_UP'].includes((o.status || 'NEW').toUpperCase());
      return [
        o.id,
        o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('fr-DZ') : '',
        o.shippingAddress?.name || o.shippingAddress?.fullName || '',
        isConfirmed ? (o.shippingAddress?.phone || '') : (o.shippingAddress?.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1 **** $2') || ''),
        o.shippingAddress?.wilaya || '',
        o.shippingAddress?.commune || '',
        isConfirmed ? (o.shippingAddress?.streetAddress || o.shippingAddress?.address || o.shippingAddress?.street || '') : '*** Masquée ***',
        o.total || 0,
        getStatusLabel(o.status || 'NEW')
      ];
    });

    const worksheetData = [headers, ...rows];
    
    // Create a new workbook and adding the worksheet
    const wb = utils.book_new();
    const ws = utils.aoa_to_sheet(worksheetData);

    // Set column widths to give it a "Canva/Premium" Excel design feel
    const colWidths = [
      { wch: 25 }, // N° Commande
      { wch: 15 }, // Date
      { wch: 25 }, // Client
      { wch: 20 }, // Telephone
      { wch: 20 }, // Wilaya
      { wch: 20 }, // Commune
      { wch: 40 }, // Adresse
      { wch: 20 }, // Total
      { wch: 25 }  // Statut
    ];
    ws['!cols'] = colWidths;

    utils.book_append_sheet(wb, ws, "Commandes");

    // Produce an Excel spreadsheet rather than raw CSV, to instantly display as a grid on mobile/desktop.
    writeFile(wb, `olmart_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getExportHeaders = (lang: string) => {
    if (lang.startsWith('ar')) {
      return [
        "التاريخ", "رقم الطلب", "المنتج", "الكمية", "سعر الوحدة (د.ج)", "المجموع الإجمالي (د.ج)",
        "نسبة العمولة", "مبلغ العمولة (د.ج)", "صافي البائع (د.ج)",
        "الرمز البريدي", "الولاية", "الموزع", "رقم التتبع", "حالة الدفع", "حالة الطرد"
      ];
    } else if (lang.startsWith('en')) {
      return [
        "Date", "Order ID", "Product", "Qty", "Unit Price (DZD)", "Total Gross (DZD)",
        "Commission %", "Commission Amount", "Net Seller (Revenue)",
        "Zip Code", "Province", "Carrier", "Tracking", "Payment Status", "Package Status"
      ];
    } else {
      return [
        "Date", "ID Commande", "Produit", "Qte", "Prix Unitaire (DZD)", "Total Brut (DZD)",
        "Commission %", "Montant Commission", "Net Vendeur (Revenu)",
        "Code postal", "Wilaya", "Livreur", "Tracking", "Statut Paiement", "Statut Colis"
      ];
    }
  };

  const handleExportPremium = async () => {
    if (!currentUser) return;
    try {
      setLoadingSheets(true);
      
      // Fetch live orders query from Firestore matching sellerIds contains current seller (no mocked hardcoded data)
      const q = query(
        collection(db, 'orders'),
        where('sellerIds', 'array-contains', currentUser.uid),
        limit(150)
      );
      const ordersSnap = await getDocs(q);
      
      const realRows: any[] = [];
      let totalBrut = 0;
      let totalCommission = 0;
      let totalNet = 0;

      // Calculate localized commission rate (fall back to 10% if missing)
      const commissionRate = userProfile?.commissionRate || 10;

      const rawOrders = ordersSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
      rawOrders.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      const token = await currentUser?.getIdToken();
      const calcRes = await fetch('/api/calculate-commissions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ orders: rawOrders })
      });
      const calcData = await calcRes.json();
      const calcMap: Record<string, CalculatedOrder> = {};
      calcData.calculatedOrders?.forEach((co: CalculatedOrder) => calcMap[co.id] = co);

      rawOrders.forEach(order => {
        const orderId = order.id;
        
        // Filter items specific to this seller
        const sellerItems = order.items?.filter((item: any) => item.sellerId === currentUser.uid) || [];
        const zipCode = order.shippingAddress?.wilaya || "N/A";
        const province = order.shippingAddress?.commune || "N/A";
        const provider = order.deliveryProvider || "Non assigné";
        const tracking = order.trackingId || order.trackingNumber || "";
        const orderDate = order.createdAt?.toDate 
          ? order.createdAt.toDate().toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-DZ' : 'fr-DZ') 
          : new Date().toLocaleDateString();

        sellerItems.forEach((item: any) => {
          const lineTotal = item.price * item.quantity;
          // Extract percentage based on server calculation ratio, or fallback
          const serverComm = calcMap[orderId]?.commissionAmount || 0;
          const serverNet = calcMap[orderId]?.netRevenue || 0;
          const orderTotal = order.total || 1;
          const commission = lineTotal * (serverComm / orderTotal);
          const net = lineTotal - commission;
          
          totalBrut += lineTotal;
          totalCommission += commission;
          totalNet += net;

          realRows.push([
            orderDate, 
            orderId, 
            item.productName || "Produit", 
            item.quantity || 1, 
            item.price || 0, 
            lineTotal, 
            'Serveur API', 
            commission, 
            net, 
            zipCode, 
            province, 
            provider, 
            tracking, 
            order.paymentStatus || (i18n.language.startsWith('ar') ? "في الانتظار" : "En attente"), 
            getStatusLabel(order.status || "NEW")
          ]);
        });
      });

      if (realRows.length === 0) {
        toast.error(t("Aucune commande trouvée pour générer le bilan."));
        setLoadingSheets(false);
        return;
      }

      const isArabic = i18n.language.startsWith('ar');
      const isEnglish = i18n.language.startsWith('en');
      const lang = i18n.language;

      const headers = getExportHeaders(lang);

      // Multilingual document title & meta tags setup
      let docTitle = `RAPPORT_VENTES_${(userProfile?.shopName || "BOUTIQUE").toUpperCase()}_${new Date().toISOString().split('T')[0]}`;
      if (isArabic) {
        docTitle = `تقرير_مبيعات_${(userProfile?.shopName || "المتجر").replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      } else if (isEnglish) {
        docTitle = `SALES_REPORT_${(userProfile?.shopName || "SHOP").toUpperCase()}_${new Date().toISOString().split('T')[0]}`;
      }

      const mainHeader = isArabic 
        ? `تقرير المبيعات والعمولات - متجر ${(userProfile?.shopName || "الخاص بك")}`
        : isEnglish
        ? `SALES & COMMISSIONS REPORT - SHOP ${(userProfile?.shopName || "").toUpperCase()}`
        : `RAPPORT DE VENTES ET COMMISSIONS - BOUTIQUE ${(userProfile?.shopName || "").toUpperCase()}`;

      const metaLabelSeller = isArabic ? "معرّف البائع" : isEnglish ? "Seller ID" : "ID Vendeur";
      const metaLabelPeriod = isArabic ? "الفترة" : isEnglish ? "Period" : "Période";
      const metaPeriodVal = isArabic ? "آخر 30 يوم" : isEnglish ? "Last 30 days" : "30 derniers jours";
      const metaLabelGenerated = isArabic ? "تاريخ الإنشاء" : isEnglish ? "Generated on" : "Généré le";
      
      const metaLabelBalance = isArabic ? "صافي الأرباح" : isEnglish ? "Net Balance" : "Solde Net Vendeur";
      const metaLabelFee = isArabic ? "عمولة المنصة" : isEnglish ? "Avg Platform Commission" : "Commission Plateforme";

      const metadata = [
        [mainHeader],
        [metaLabelSeller, currentUser.uid, metaLabelPeriod, metaPeriodVal, metaLabelGenerated, new Date().toLocaleString()],
        [metaLabelBalance, `${totalNet} DZD`, metaLabelFee, `${commissionRate}%`, "", ""],
        [""]
      ];

      const totalLabel = isArabic ? "المجموع الكلي" : isEnglish ? "GRAND TOTAL" : "TOTAL GÉNÉRAL";
      const totals = [
        ["", "", "", "", totalLabel, totalBrut, "", totalCommission, totalNet, "", "", "", "", "", ""]
      ];

      const payload = {
        title: docTitle,
        metadata,
        headers,
        rows: realRows,
        totals,
        theme: {
          headerColor: { red: 0.05, green: 0.5, blue: 0.3 }, // Corporate Emerald Green theme
          isRtl: isArabic
        }
      };

      const confirmedMsg = isArabic
        ? `هل تريد تصدير تقرير المبيعات المتميز غوغل شيتس لمتجرك بالاعتماد على بيانات حقيقية مباشرة؟`
        : isEnglish
        ? `Generate premium personalized sales report on Google Sheets with live shop logs?`
        : `Générer le Bilan Financier Vendeur Canva-like vers Google Sheets (avec DONNÉES RÉELLES de votre boutique) ?`;

      const confirmed = window.confirm(confirmedMsg);
      if (!confirmed) {
        setLoadingSheets(false);
        return;
      }

      toast.loading(t("Génération du rapport Premium Google Sheets en cours..."), { id: "sheets_export" });
      const res = await exportPremiumToSheets(payload);
      toast.success(t("Bilan Sheets généré avec succès !"), { id: "sheets_export" });
      window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      console.error(err);
      toast.error(t("Erreur de connexion Google ou d'exportation.") + ` ${err.message}`, { id: "sheets_export" });
    } finally {
      setLoadingSheets(false);
    }
  };

  const toggleSelection = (id: string) => {
     setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (printingOrder) {
    return (
      <ShippingLabelPrinter 
        order={printingOrder} 
        onClose={() => setPrintingOrder(null)} 
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">{t("Commandes Reçues")}</h2>
          <p className="text-zinc-500 font-medium">{t("Suivez et expédiez vos ventes à travers l'Algérie.")}</p>
        </div>
        <div className="flex items-center gap-3">
           {!showGuide && (
              <button 
                onClick={handleToggleGuide}
                className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-orange-100 transition-colors shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                {t("Afficher le Guide")}</button>
           )}
           <button 
             onClick={exportToCSV}
             className="flex items-center gap-2 px-6 py-3 bg-zinc-950 text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-zinc-800 transition-colors shrink-0"
           >
             <Download className="w-4 h-4" />
             {t("Exporter Excel")}</button>
           <button 
             onClick={handleExportPremium}
             disabled={loadingSheets}
             className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
           >
             <DownloadCloud className="w-4 h-4" />
             {loadingSheets ? t("Exportation...") : t("Bilan Premium (Sheets)")}</button>
        </div>
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-6 sm:p-8 relative">
              <button 
                onClick={handleToggleGuide}
                className="absolute top-6 right-6 p-2 bg-white/50 hover:bg-white rounded-full text-orange-400 hover:text-orange-600 transition-colors border border-orange-100"
                title={t("Masquer le guide") || "Masquer le guide"}
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              
              <div className="absolute top-0 right-10 p-8 opacity-5 pointer-events-none hidden md:block">
                <BookOpen className="w-32 h-32" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-orange-100 p-2.5 rounded-xl">
                    <Info className="w-6 h-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <h3 className="font-kinder text-orange-900 text-lg">{t("Comment gérer vos commandes sur Olmart ?")}</h3>
                    <p className="text-[#ea580c] text-xs font-bold mt-1">{t("Un processus ultra-simple en 4 étapes pour garantir la satisfaction client")}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Etape 1 */}
                  <div className="bg-white/80 p-5 rounded-2xl border border-orange-100 shadow-sm relative">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-kinder tracking-widest rtl:tracking-normal text-white bg-[#ea580c] px-3 py-1.5 rounded-lg">{t("ÉTAPE 1")}</span>
                      <CheckSquare className="w-5 h-5 text-orange-400" />
                    </div>
                    <h4 className="font-kinder text-sm text-zinc-950 mb-2 uppercase tracking-wide rtl:tracking-normal">{t("Confirmation")}</h4>
                    <p className="text-xs text-zinc-600 font-medium">{t("Vérifiez la disponibilité de votre stock. Une fois certain de pouvoir honorer la commande, cliquez sur \"Confirmer\".")}</p>
                  </div>
                  
                  {/* Etape 2 */}
                  <div className="bg-white/80 p-5 rounded-2xl border border-orange-100 shadow-sm relative">
                    <div className="hidden xl:block absolute -left-3 top-1/2 -translate-y-1/2 text-orange-200 z-10">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-kinder tracking-widest rtl:tracking-normal text-white bg-[#ea580c] px-3 py-1.5 rounded-lg">{t("ÉTAPE 2")}</span>
                      <PackageCheck className="w-5 h-5 text-orange-400" />
                    </div>
                    <h4 className="font-kinder text-sm text-zinc-950 mb-2 uppercase tracking-wide rtl:tracking-normal">{t("Préparation")}</h4>
                    <p className="text-xs text-zinc-600 font-medium">{t("Emballez soigneusement le produit. Utilisez le bouton \"Étiquettes/PDF\" pour générer et imprimer le bordereau.")}</p>
                  </div>

                  {/* Etape 3 */}
                  <div className="bg-white/80 p-5 rounded-2xl border border-orange-100 shadow-sm relative">
                    <div className="hidden xl:block absolute -left-3 top-1/2 -translate-y-1/2 text-orange-200 z-10">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-kinder tracking-widest rtl:tracking-normal text-white bg-[#ea580c] px-3 py-1.5 rounded-lg">{t("ÉTAPE 3")}</span>
                      <Truck className="w-5 h-5 text-orange-400" />
                    </div>
                    <h4 className="font-kinder text-sm text-zinc-950 mb-2 uppercase tracking-wide rtl:tracking-normal">{t("Expédition")}</h4>
                    <p className="text-xs text-zinc-600 font-medium">{t("Collez l'étiquette sur votre colis et remettez-le au transporteur. Changez alors le statut en \"Expédiée\".")}</p>
                  </div>

                  {/* Etape 4 */}
                  <div className="bg-white/80 p-5 rounded-2xl border border-orange-100 shadow-sm relative">
                    <div className="hidden xl:block absolute -left-3 top-1/2 -translate-y-1/2 text-orange-200 z-10">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-kinder tracking-widest rtl:tracking-normal text-[#ea580c] bg-orange-100 border border-[#ea580c]/20 px-3 py-1.5 rounded-lg">{t("ÉTAPE 4")}</span>
                      <HandCoins className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h4 className="font-kinder text-sm text-emerald-950 mb-2 uppercase tracking-wide rtl:tracking-normal">{t("Paiement Garanti")}</h4>
                    <p className="text-xs text-zinc-600 font-medium">{t("Une fois l'article livré par le transporteur, l'argent est crédité automatiquement sur votre \"Portefeuille\".")}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 w-full max-w-lg">
          <Search className="absolute start-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text" 
            placeholder={t("Rechercher par N° Commande...") || "Rechercher par N° Commande..."} 
            className="w-full ps-14 pe-6 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-medium focus:ring-4 ring-orange-500/5 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Actions en Lot */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-3 bg-white border border-zinc-200 px-6 py-3 rounded-2xl shadow-sm">
               <span className="text-sm font-bold text-zinc-700">{selectedIds.length} {t("sélectionnée(s)")}</span>
               <div className="h-6 w-[1px] bg-zinc-200" />
               <div className="flex gap-2">
                  <button onClick={() => handleBulkUpdateStatus('confirmed')} className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-kinder uppercase rounded-xl hover:bg-blue-100 transition-colors">{t("Confirmer")}</button>
                  <button onClick={handleBulkGenerateTracking} className="px-4 py-2 bg-zinc-950 text-white text-xs font-kinder uppercase rounded-xl hover:bg-zinc-800 transition-colors">{t("Étiquettes(PDF)")}</button>
                  <button onClick={() => handleBulkUpdateStatus('shipped')} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-kinder uppercase rounded-xl hover:bg-indigo-100 transition-colors">{t("Expédiée")}</button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
         <div className="divide-y divide-zinc-50">
            {orders.length === 0 ? (
               <div className="p-24 text-center">
                  <ShoppingBag className="w-20 h-20 text-zinc-100 mx-auto mb-6" />
                  <p className="text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs">{t("Aucune commande pour le moment.")}</p>
               </div>
            ) : (
               orders.map((o) => {
                 const sellerItems = o.items?.filter((item: any) => item.sellerId === currentUser?.uid) || [];
                 if (sellerItems.length === 0) return null;

                 return (
                                 <div key={o.id} className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:bg-zinc-50/50 transition-colors group">
                                    <div className="flex gap-6 items-center">
                                       <button onClick={() => toggleSelection(o.id)} className="text-zinc-300 hover:text-orange-500 transition-colors">
                                          {selectedIds.includes(o.id) ? <CheckSquare className="w-6 h-6 text-orange-500" /> : <Square className="w-6 h-6" />}
                                       </button>
                                       <div className="space-y-4">
                                          <div className="flex items-center gap-4">
                                             <span className="text-[10px] font-kinder bg-zinc-950 text-white px-4 py-1.5 rounded-full tracking-widest rtl:tracking-normal">#{o.id.substring(0, 8).toUpperCase()}</span>
                                             <span className={`text-[9px] font-black uppercase tracking-widest rtl:tracking-normal px-4 py-1.5 rounded-full border ${getStatusColor(o.status)}`}>
                                                {getStatusLabel(o.status)}
                                             </span>
                                          </div>
                                          <div className="flex items-center gap-6">
                                             <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                                                <User className="w-6 h-6" />
                                             </div>
                                             <div>
                                                <p className="font-kinder text-zinc-950">{o.shippingAddress?.name}</p>
                                                <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none mt-1">{o.shippingAddress?.wilaya} • {o.shippingAddress?.commune}</p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-10 lg:text-end">
                                       <div>
                                          <p className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5">{t("Montant Total")}</p>
                                          <p className="text-2xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal">{formatPrice(o.total)}</p>
                                       </div>
                                       <div className="h-10 w-[1px] bg-zinc-100 hidden lg:block" />
                                       <div className="flex items-center gap-3">
                                          <button 
                                            onClick={() => setSelectedOrder(o)}
                                            className="px-6 py-3.5 bg-zinc-950 text-white rounded-xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal shadow-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
                                          >
                                             {t("Détails")}<ChevronRight className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              );
               })
            )}
         </div>
         {lastVisible && orders.length > 0 && !searchTerm && (
            <div className="p-6 border-t border-zinc-50 flex justify-center bg-zinc-50/30">
               <button 
                 onClick={loadMoreOrders} 
                 disabled={loadingMore}
                 className="px-8 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-xs uppercase tracking-widest rtl:tracking-normal rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-50"
               >
                 {loadingMore ? "Chargement..." : "Charger plus"}
               </button>
            </div>
         )}
      </div>

      {/* Order Detail View (Modal) */}
      <AnimatePresence>
         {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
               <motion.div layoutId="order-modal" className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                  {/* Content */}
                  <div className="flex-1 p-10 overflow-y-auto scrollbar-hide">
                     <div className="flex items-center justify-between mb-10">
                        <div>
                           <h3 className="text-2xl font-kinder tracking-tight rtl:tracking-normal">{t("Commande #")}{selectedOrder.id.substring(0, 8).toUpperCase()}</h3>
                           <p className="text-zinc-500 font-medium">{t("Reçu le")}{selectedOrder.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <button 
                             onClick={() => handleGenerateTracking(selectedOrder.id)}
                             className="flex items-center gap-2 text-orange-600 font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal hover:text-orange-700 transition-colors"
                           >
                              <Truck className="w-4 h-4" />
                              {selectedOrder.trackingId ? `Suivi: ${selectedOrder.trackingId}` : "Préparer l'expédition"}
                           </button>
                           <button 
                             onClick={() => {
                               setPrintingOrder(selectedOrder);
                               setSelectedOrder(null);
                             }}
                             className="flex items-center gap-2 bg-[#ea580c] hover:bg-orange-600 px-4 py-2.5 rounded-xl text-white transition-colors text-[10px] uppercase tracking-widest rtl:tracking-normal font-[#FF5C00] font-kinder shadow-md cursor-pointer border-none"
                           >
                              <Printer className="w-3.5 h-3.5" />
                              {t("Bordereau / Ticket d'Expédition")}</button>
                           {selectedOrder.labelUrl && (
                              <a 
                                href={selectedOrder.labelUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-lg text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200 transition-colors text-[10px] uppercase tracking-widest rtl:tracking-normal font-kinder"
                              >
                                 <Printer className="w-3 h-3" />
                                 {t("Label Transporteur (PDF)")}</a>
                           )}
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                           <div className="bg-zinc-50 rounded-3xl p-8 border border-zinc-100">
                              <h4 className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-6 flex items-center gap-2">
                                 <Truck className="w-4 h-4" /> {t("Destination")}</h4>
                              <div className="space-y-4">
                                 <div className="flex items-center gap-4">
                                    <MapPin className="w-5 h-5 text-zinc-300" />
                                    <div>
                                       <p className="text-sm font-kinder text-zinc-950">
                                          {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'IN_TRANSIT', 'PICKED_UP'].includes((selectedOrder.status || 'NEW').toUpperCase())
                                              ? selectedOrder.shippingAddress?.street || selectedOrder.shippingAddress?.address || selectedOrder.shippingAddress?.streetAddress || 'N/A'
                                              : '*** Adresse Masquée (Confirmer d\'abord) ***'}
                                       </p>
                                       <p className="text-sm font-medium text-zinc-500">{selectedOrder.shippingAddress?.commune}, {selectedOrder.shippingAddress?.wilaya}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <Phone className="w-5 h-5 text-zinc-300" />
                                    <p className="text-sm font-kinder text-zinc-950">
                                       {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'IN_TRANSIT', 'PICKED_UP'].includes((selectedOrder.status || 'NEW').toUpperCase()) 
                                          ? selectedOrder.shippingAddress?.phone 
                                          : selectedOrder.shippingAddress?.phone?.replace(/(\d{3})\d{4}(\d{3})/, '$1 **** $2') || 'N/A'}
                                    </p>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <h4 className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-4 ml-1">{t("Items Commandés")}</h4>
                              {selectedOrder.items?.map((item: any, i: number) => {
                                
                                return (
                                                               <div key={i} className="flex gap-4 p-4 border border-zinc-100 rounded-2xl bg-white shadow-sm">
                                                                  <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                                                                     <img loading="lazy" src={getOptimizedImageUrl(item.image, 200)} className="w-full h-full object-cover" alt="" />
                                                                  </div>
                                                                  <div>
                                                                     <p className="text-sm font-kinder text-zinc-950">{item.name}</p>
                                                                     {item.selectedVariant && (
                                                                       <p className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full inline-block mt-0.5 mb-1 uppercase tracking-widest">{item.selectedVariant}</p>
                                                                     )}
                                                                     <p className="text-xs text-zinc-500 font-medium">{t("Qté:")}{item.quantity || 1} • {formatPrice(item.price)}</p>
                                                                  </div>
                                                               </div>
                                                            );
                              })}
                           </div>

                           {/* Order Chat Box */}
                           <div className="mt-8">
                               <OrderChatBox orderId={selectedOrder.id} buyerId={selectedOrder.userId} />
                           </div>
                        </div>

                        <div className="space-y-8 text-center md:text-start">
                           <div className="bg-white border-2 border-zinc-950 rounded-[2.5rem] p-8 flex flex-col items-center justify-between h-fit">
                              <div className="w-full space-y-4 mb-4">
                                 <div className="flex justify-between items-center text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                                    <span>{t("Total Client")}</span>
                                    <span>{formatPrice(selectedOrder.total)}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-[10px] font-kinder text-rose-500 uppercase tracking-widest rtl:tracking-normal">
                                    <span>{t("Commission OLMART (")}{userProfile?.commissionRate || 10}%)</span>
                                    <span>-{formatPrice(calculatedOrdersMap[selectedOrder?.id]?.commissionAmount || 0)}</span>
                                 </div>
                                 <div className="h-[1px] bg-zinc-100 w-full" />
                              </div>
                              <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2">{t("Net à Percevoir")}</p>
                              <h4 className="text-4xl font-kinder tracking-tighter rtl:tracking-normal text-zinc-950 mb-8">{formatPrice(calculatedOrdersMap[selectedOrder?.id]?.netRevenue || 0)}</h4>
                              <div className="w-full space-y-3">
                                 <p className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal text-center mb-1">{t("Mettre à jour l'état")}</p>
                                 <div className="grid grid-cols-2 gap-2">
                                    {['processing', 'picked_up', 'in_transit', 'delivered'].map((s) => {
                                       const getNextValidStatus = (currentStatus: string): string | null => {
                                          const norm = (currentStatus || '').toLowerCase();
                                          if (norm === 'new' || norm === 'pending' || norm === 'confirmed') return 'processing';
                                          if (norm === 'preparing' || norm === 'processing') return 'picked_up';
                                          if (norm === 'picked_up') return 'in_transit';
                                          if (norm === 'in_transit' || norm === 'shipped') return 'delivered';
                                          return null;
                                       };
                                       const currentLower = (selectedOrder.status || '').toLowerCase();
                                       const targetLower = s.toLowerCase();
                                       
                                       // Map legacy active states to the new ones visually
                                       let effectiveCurrent = currentLower;
                                       if (currentLower === 'preparing') effectiveCurrent = 'processing';
                                       if (currentLower === 'shipped') effectiveCurrent = 'in_transit';
                                       
                                       const isCurrent = effectiveCurrent === targetLower;
                                       const isNext = getNextValidStatus(currentLower) === targetLower;
                                       const isBtnDisabled = !isCurrent && !isNext;

                                       return (
                                          <button 
                                            key={s}
                                            disabled={isBtnDisabled}
                                            onClick={() => !isCurrent && handleUpdateStatus(selectedOrder.id, s)}
                                            className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest rtl:tracking-normal transition-all ${isCurrent ? 'bg-zinc-950 text-white shadow-lg cursor-default' : isNext ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:text-orange-700 active:scale-[0.98]' : 'bg-zinc-50/50 text-zinc-300 border border-zinc-100/60 opacity-40 cursor-not-allowed'}`}
                                          >
                                             {getStatusLabel(s.toUpperCase())}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};
