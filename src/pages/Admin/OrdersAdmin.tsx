import React, { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  Search,
  Filter,
  X,
  Phone,
  FileText,
  Printer,
  CheckSquare,
  Square,
  RefreshCw,
  Barcode,
  HelpCircle,
  TrendingUp,
  Percent,
  DollarSign,
  Calendar,
} from "lucide-react";
import { formatPrice } from "../../utils/format";
import { Order, OrderStatus } from "../../types";
import { useTranslation } from "react-i18next";
import { ALGERIA_WILAYAS } from "../../constants";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../hooks/useConfirm";
import { OrderFilters } from "../../components/Admin/Orders/OrderFilters";
import { OrderTable } from "../../components/Admin/Orders/OrderTable";

interface CalculatedOrder {
  id: string;
  commissionAmount: number;
  netRevenue: number;
  platformFee: number;
  sellerPayout: number;
}

export const OrdersAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const { confirm: showConfirmModal, ConfirmationDialog } = useConfirm();
  const isRtl = i18n.language === "ar";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters State
  const [searchId, setSearchId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sellerSearch, setSellerSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalVolume, setTotalVolume] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [sellersNetPayout, setSellersNetPayout] = useState(0);
  const [calculatedOrdersMap, setCalculatedOrdersMap] = useState<Record<string, CalculatedOrder>>({});

  const [dynamicWilayas, setDynamicWilayas] = useState<string[]>([]);

  // Multi-selection (Bulk Actions) State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Pagination State
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const ORDERS_PER_PAGE = 20;

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Localized Status Labels
  const statusLabels: Record<string, string> = {
    new: t("Nouveau") || "Nouveau",
    processing: t("En Préparation") || "En Préparation",
    shipped: t("Expédié") || "Expédié",
    delivered: t("Livré") || "Livré",
    canceled: t("Annulé") || "Annulé",
    cancelled_by_client: t("Annulé Par Client") || "Annulé Par Client",
    return_requested: t("Retour Demandé") || "Retour Demandé",
    return_approved: t("Retour Approuvé") || "Retour Approuvé",
    return_rejected: t("Retour Refusé") || "Retour Refusé",
    returning: t("En cours de retour") || "En cours de retour",
    returned: t("Retourné") || "Retourné",
    refunded: t("Remboursé") || "Remboursé",
    dispute_open: t("Litige Ouvert") || "Litige Ouvert",
    dispute_resolved: t("Litige Résolu") || "Litige Résolu",
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-100",
    processing: "bg-amber-50 text-amber-700 border-amber-100",
    shipped: "bg-purple-50 text-purple-700 border-purple-100",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-100",
    canceled: "bg-rose-50 text-rose-700 border-rose-100",
    cancelled_by_client: "bg-red-50 text-red-700 border-red-100",
    returned: "bg-zinc-100 text-zinc-700 border-zinc-200",
    dispute_open: "bg-[#FF5C00]/15 text-[#ea580c] border-[#FF5C00]/20",
  };

  // Safe Date Extractor
  const getOrderDate = (createdAt: any): Date | null => {
    if (!createdAt) return null;
    if (typeof createdAt.toDate === "function") return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? null : date;
  };

  // Fetch orders
  const fetchOrders = async (isLoadMore = false) => {
    setLoading(true);
    try {
      const { startAfter, where } = await import("firebase/firestore");
      const baseQueryConstraints: any[] = [];

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        baseQueryConstraints.push(where("createdAt", ">=", start));
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        baseQueryConstraints.push(where("createdAt", "<=", end));
      }

      // If we use where("createdAt"), we MUST order by createdAt first.
      baseQueryConstraints.push(orderBy("createdAt", "desc"));

      let q = query(collection(db, "orders"), ...baseQueryConstraints, limit(ORDERS_PER_PAGE));

      if (isLoadMore && lastVisible) {
        q = query(collection(db, "orders"), ...baseQueryConstraints, startAfter(lastVisible), limit(ORDERS_PER_PAGE));
      }

      const snap = await getDocs(q);
      const fetched = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Order);

      if (isLoadMore) {
        setOrders((prev) => {
          const newOrders = [...prev, ...fetched];
          extractWilayas(newOrders);
          return newOrders;
        });
      } else {
        setOrders(fetched);
        extractWilayas(fetched);
      }

      setLastVisible(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === ORDERS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      toast.error(t("Erreur de chargement des commandes."));
    } finally {
      setLoading(false);
    }
  };

  const extractWilayas = (ordersData: Order[]) => {
    const wilayas = Array.from(new Set(ordersData.map((o) => o.shippingAddress?.wilaya).filter(Boolean))) as string[];
    setDynamicWilayas(wilayas);
  };

  useEffect(() => {
    setLastVisible(null);
    setHasMore(true);
    fetchOrders(false);
  }, [refreshTrigger, startDate, endDate]);

  // Reactive filtering
  const filteredOrders = React.useMemo(() => orders.filter((order) => {
    // 1. Order ID Search
    if (searchId && !order.id.toLowerCase().includes(searchId.toLowerCase())) {
      return false;
    }

    // Client Search (Name/Phone)
    if (clientSearch) {
      const qStr = clientSearch.toLowerCase();
      const name = (order.shippingAddress?.fullName || order.shippingAddress?.name || "").toLowerCase();
      const phone = (order.shippingAddress?.phone || "").toLowerCase();
      if (!name.includes(qStr) && !phone.includes(qStr)) {
        return false;
      }
    }

    // 2. Status Match
    if (selectedStatus !== "all" && (order.status || "").toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }

    // 3. Wilaya Filter
    if (selectedWilaya !== "all") {
      const orderWilaya = (order.shippingAddress?.wilaya || "").toLowerCase();
      const targetWilaya = selectedWilaya.toLowerCase();
      // Match exact code or full name
      if (!orderWilaya.includes(targetWilaya) && !targetWilaya.includes(orderWilaya)) {
        return false;
      }
    }

    // 4. Seller ID/Name filter
    if (sellerSearch) {
      const queryStr = sellerSearch.toLowerCase();
      const matchSellerId = order.sellerIds?.some((id) => id.toLowerCase().includes(queryStr));
      const matchItemSeller = order.items?.some((it) => it.sellerId?.toLowerCase().includes(queryStr));
      if (!matchSellerId && !matchItemSeller) {
        return false;
      }
    }

    // 5. Date filter
    const orderDate = getOrderDate(order.createdAt);
    if (orderDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (orderDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
    } else if (startDate || endDate) {
      return false; // exclude orders with no date if date filter exists
    }

    return true;
  }), [orders, searchId, clientSearch, selectedStatus, selectedWilaya, sellerSearch, startDate, endDate]);

  // Reactive Bookkeeping Calculations (comptabilité instantanée)

  // Calculate commissions via secure server endpoint
  useEffect(() => {
    if (filteredOrders.length === 0) {
      setTotalVolume(0);
      setTotalCommission(0);
      setSellersNetPayout(0);
      setCalculatedOrdersMap({});
      return;
    }

    // Batch process to prevent payload limit issues if too many orders, but limiting to 200 usually fits
    const calculateCommissions = async () => {
      try {
        const token = await currentUser?.getIdToken();
        const response = await fetch("/api/calculate-commissions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orders: filteredOrders }),
        });
        if (!response.ok) throw new Error("API Error");
        const data = await response.json();

        setTotalVolume(data.totalVolume);
        setTotalCommission(data.totalCommission);
        setSellersNetPayout(data.sellersNetPayout);

        const map: Record<string, any> = {};
        data.calculatedOrders.forEach((co: any) => {
          map[co.id] = co;
        });
        setCalculatedOrdersMap(map);
      } catch (err) {
        console.error("Failed to calculate server commissions", err);
      }
    };

    // Debounce to prevent spamming
    const timeout = setTimeout(() => {
      calculateCommissions();
    }, 500);
    return () => clearTimeout(timeout);
  }, [filteredOrders]);

  // Mass action check selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds((prev) => [...prev, orderId]);
    } else {
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  // Direct single order status update handler (using secure server-side endpoint)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!currentUser || userProfile?.role !== "admin") {
      toast.error(t("Veuillez vous authentifier d'abord."));
      return;
    }
    const confirmed = await showConfirmModal(`Modifier le statut de la commande en "${statusLabels[newStatus]}" ?`);
    if (!confirmed) return;
    setIsUpdatingStatus(true);
    const progressToast = toast.loading(t("Mise à jour du statut..."));
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/seller/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderIds: [orderId],
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || t("Échec de la validation serveur."));
      }

      // Refresh state
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      toast.success(t("Statut mis à jour et validé côté serveur avec commission et historique."), {
        id: progressToast,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(`${t("Erreur de mise à jour :")} ${err.message}`, { id: progressToast });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Bulk Status Update Handler (using secure server-side endpoint)
  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    if (!currentUser || userProfile?.role !== "admin") {
      toast.error(t("Veuillez vous authentifier d'abord."));
      return;
    }
    const confirmed = await showConfirmModal(
      `Modifier le statut de ${selectedOrderIds.length} commandes en "${statusLabels[newStatus]}" ?`
    );
    if (!confirmed) return;

    const progressToast = toast.loading(
      `${t("Mise à jour en masse de")} ${selectedOrderIds.length} ${t("commandes...")}`
    );
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/seller/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || t("Échec de la validation groupée serveur."));
      }

      toast.success(`${selectedOrderIds.length} ${t("commandes mises à jour avec succès via le serveur !")}`, {
        id: progressToast,
      });
      setSelectedOrderIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      toast.error(`${t("Erreur de mise à jour groupée :")} ${err.message}`, { id: progressToast });
    }
  };

  // Bulk Label Generation & Printing (using stealth iframe pattern, avoiding popup blockers)
  const handleBulkPrint = () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t("Veuillez sélectionner au moins une commande à imprimer."));
      return;
    }

    const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedOrders.length === 0) return;

    // Create a hidden iframe for print isolation that doesn't trigger popup blockers
    let iframe = document.getElementById("print-iframe-stealth-bulk") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-iframe-stealth-bulk";
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.style.left = "-1000px";
      iframe.style.top = "-1000px";
      document.body.appendChild(iframe);
    }

    const docRef = iframe.contentWindow?.document || iframe.contentDocument;
    if (!docRef) {
      toast.error(t("Erreur d'accès à l'iframe d'impression"));
      return;
    }

    // Generate consecutive labels with print break separation css
    let labelsHtml = "";
    selectedOrders.forEach((o, index) => {
      const tracking = o.trackingId || o.trackingNumber || `OLM-REF-${o.id.slice(-6).toUpperCase()}`;
      const remarks = t("Notes Admin : Livraison standard rapide 58 Wilayas d'Algérie.");
      const itemsList = (o.items || [])
        .map((it) => `• ${it.productName || it.name || "Produit"} x ${it.quantity}`)
        .join("<br/>");

      labelsHtml += `
        <div class="label-ticket-wrap" style="${index > 0 ? "page-break-before: always;" : ""}">
          <div style="border: 3px solid #000; padding: 18px; font-family: 'Inter', sans-serif; border-radius: 12px; margin-bottom: 20px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
              <div>
                <strong style="font-size: 16px; font-weight: 900; color: #ea580c; text-transform: uppercase;">⚡ OLMART LOGISTICS</strong>
                <p style="font-size: 9px; margin: 2px 0 0 0; font-weight: bold; color: #555;">Co-partenaire Algérie 58 Wilayas</p>
              </div>
              <div style="border: 1px solid #000; padding: 4px; font-weight: bold; font-size: 10px;">
                QR SCAN
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
              <tr>
                <td style="width: 50%; padding-right: 10px; vertical-align: top; border-right: 1.5px solid #000;">
                  <span style="font-size: 8px; font-weight: bold; color: #666; text-transform: uppercase; display: block;">EXPÉDITEUR</span>
                  <strong style="display: block; font-size: 12px; color: #000;">OLMART DIRECT VENDORS</strong>
                  <span style="color: #444;">ID Commande: ${o.id.slice(-8).toUpperCase()}</span>
                </td>
                <td style="width: 50%; padding-left: 10px; vertical-align: top;">
                  <span style="font-size: 8px; font-weight: bold; color: #666; text-transform: uppercase; display: block;">${t("DESTINATAIRE (CLIENT)") || "DESTINATAIRE (CLIENT)"}</span>
                  <strong style="display: block; font-size: 12px; color: #000;">${o.shippingAddress?.fullName || o.shippingAddress?.name || t("Client Olmart") || "Client Olmart"}</strong>
                  <span style="color: #444; font-weight: bold;">💬 ${o.shippingAddress?.phone}</span>
                </td>
              </tr>
            </table>

            <div style="background-color: #fafafa; border: 1.5px solid #000; border-radius: 6px; padding: 10px; margin-bottom: 15px;">
              <span style="font-size: 8px; font-weight: bold; color: #666; display: block; text-transform: uppercase; margin-bottom: 4px;">ADRESSE FINALE DE LIVRAISON</span>
              <strong style="font-size: 12px; display: block; line-height: 1.25; color: #000;">${o.shippingAddress?.street || "Adresse non spécifiée"}</strong>
              <strong style="font-size: 13px; color: #ea580c; text-transform: uppercase; display: block; margin-top: 4px;">🎯📍 ${o.shippingAddress?.commune || ""} • ${o.shippingAddress?.wilaya || ""}</strong>
            </div>

            <div style="border-bottom: 1.5px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
              <span style="font-size: 8px; font-weight: bold; color: #666; display: block; text-transform: uppercase; margin-bottom: 4px;">CONTENU DE COMMANDE</span>
              <div style="font-size: 11px; font-weight: bold; color: #111;">
                ${itemsList}
              </div>
            </div>

            <div style="background-color: #000; color: #fff; text-align: center; padding: 12px; border-radius: 6px;">
              <span style="font-size: 8px; font-weight: bold; color: rgba(255,255,255,0.7); display: block; tracking-wider: 1px; text-transform: uppercase;">MONTANT TOTAL GLOBAL A ENCAISSER (COD)</span>
              <strong style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; display: block;">${formatPrice(o.total)}</strong>
              <span style="font-size: 8px; display: block; opacity: 0.8; margin-top: 2px;">Cash On Delivery (Espèces uniquement)</span>
            </div>

            <div style="margin-top: 15px; text-align: center;">
              <div style="font-size: 26px; font-weight: normal; font-family: 'Arial', sans-serif; letter-spacing: 5px; color: #000; line-height: 1;">
                ||||| | |||| ||| || | |||| ||
              </div>
              <strong style="font-size: 12px; font-weight: 900; letter-spacing: 3px; display: block; margin-top: 6px; text-transform: uppercase;">
                ${tracking}
              </strong>
            </div>

            <div style="font-size: 9px; color: #555; border-top: 1px solid #ddd; margin-top: 12px; padding-top: 6px;">
              <strong>Note:</strong> ${remarks}
            </div>
          </div>
        </div>
      `;
    });

    docRef.open();
    docRef.write(`
      <html>
        <head>
          <title>Bordereaux de Transport Olmart - Masse</title>
          <style>
            @import url('https://fonts.googleapis.com/css2family=Inter:wght@400;700;900&display=swap');
            @page {
              size: 105mm 148mm;
              margin: 0;
            }
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 10px;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .label-ticket-wrap {
              width: 100%;
              max-width: 101mm;
              margin: 0 auto;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `);
    docRef.close();

    // Trigger printing safely
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        toast.success(`${selectedOrders.length} ${t("tickets d'expédition envoyés à l'impression !")}`);
      }
    }, 400);
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error(t("Aucune commande à exporter."));
      return;
    }
    const headers = [
      "ID",
      "Date",
      "Statut",
      "Client",
      "Téléphone",
      "Wilaya",
      "Commune",
      "Montant (DA)",
      "Frais Livraison",
      "Nb Articles",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      getOrderDate(o.createdAt)?.toISOString() || "",
      statusLabels[o.status?.toLowerCase()] || o.status,
      o.shippingAddress?.fullName || o.shippingAddress?.name || "",
      o.shippingAddress?.phone || "",
      o.shippingAddress?.wilaya || "",
      o.shippingAddress?.commune || "",
      o.total,
      o.shippingCost || 0,
      o.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) =>
          e
            .map(String)
            .map((s) => `"${s.replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `olmart_orders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" dir={isRtl ? "rtl" : "ltr"}>
      <ConfirmationDialog />
      {/* Dynamic Print Iframe */}
      <iframe id="print-iframe-stealth-bulk" className="hidden" style={{ display: "none" }} />

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-zinc-100 pb-5">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 uppercase flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-[#F46B1D]" />
            {t("Global Manifest & Central Orders Admin")}
          </h2>
          <p className="text-zinc-500 font-bold text-sm">
            {t(
              "Comptabilité instantanée, filtrage multidimensionnel des 58 Wilayas et impression de bordereaux groupés."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="p-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold text-xs uppercase"
          >
            <FileText className="w-4 h-4" />
            {t("Exporter CSV")}
          </button>
          <button
            onClick={() => {
              setRefreshTrigger((prev) => prev + 1);
              toast.success(t("Données actualisées"));
            }}
            className="p-3 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-zinc-650 transition-all cursor-pointer flex items-center gap-2 font-bold text-xs uppercase"
          >
            <RefreshCw className="w-4 h-4" />
            {t("Actualiser")}
          </button>
        </div>
      </div>

      {/* Reactive Instant Bookkeeping Statistics (Comptabilité instantanée) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* volume */}
        <div className="p-6 bg-white border border-zinc-250/70 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-widest">
              {t("Volume Global (COD Total)")}
            </span>
            <strong className="block text-xl font-kinder font-mono text-zinc-900 tracking-tight mt-1">
              {formatPrice(totalVolume)}
            </strong>
          </div>
          <div className="absolute end-3 top-3 opacity-10 font-mono text-4xl select-none font-bold">
            {t("admin_orders.cod_bg", "COD")}
          </div>
        </div>

        {/* Commission */}
        <div className="p-6 bg-white border border-zinc-250/70 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-widest">
              {t("Commission Olmart (5%)")}
            </span>
            <strong className="block text-xl font-kinder font-mono text-purple-600 tracking-tight mt-1">
              {formatPrice(totalCommission)}
            </strong>
          </div>
          <div className="absolute end-3 top-3 opacity-10 font-mono text-4xl select-none font-bold">5%</div>
        </div>

        {/* payout */}
        <div className="p-6 bg-white border border-zinc-250/70 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-widest">
              {t("Net Estimé Vendeurs (95%)")}
            </span>
            <strong className="block text-xl font-kinder font-mono text-emerald-600 tracking-tight mt-1">
              {formatPrice(sellersNetPayout)}
            </strong>
          </div>
          <div className="absolute end-3 top-3 opacity-10 font-mono text-4xl select-none font-bold">95%</div>
        </div>

        {/* count */}
        <div className="p-6 bg-white border border-zinc-250/70 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-widest">
              {t("Portefeuille Actif")}
            </span>
            <strong className="block text-xl font-kinder font-mono text-blue-600 tracking-tight mt-1">
              {filteredOrders.length} / {orders.length} {t("com.")}
            </strong>
          </div>
          <div className="absolute end-3 top-3 opacity-10 font-mono text-4xl select-none font-bold">
            {t("admin_orders.qty_bg", "QTY")}
          </div>
        </div>
      </div>

      {/* Multidimensional Advanced Filters Panel */}
      <OrderFilters
        searchId={searchId}
        setSearchId={setSearchId}
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        selectedWilaya={selectedWilaya}
        setSelectedWilaya={setSelectedWilaya}
        dynamicWilayas={dynamicWilayas}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        sellerSearch={sellerSearch}
        setSellerSearch={setSellerSearch}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        statusLabels={statusLabels}
        onResetFilters={() => {
          setSearchId("");
          setSelectedWilaya("all");
          setSelectedStatus("all");
          setSellerSearch("");
          setStartDate("");
          setEndDate("");
          setSelectedOrderIds([]);
          toast.success(t("Filtres réinitialisés !"));
        }}
      />

      {/* Orders List Table Card */}
      <div className="space-y-4">
        <OrderTable
          loading={loading && orders.length === 0}
          ordersCount={orders.length}
          filteredOrders={filteredOrders}
          selectedOrderIds={selectedOrderIds}
          calculatedOrdersMap={calculatedOrdersMap}
          statusLabels={statusLabels}
          statusColors={statusColors}
          handleSelectAll={handleSelectAll}
          handleSelectOrder={handleSelectOrder}
          setSelectedOrder={setSelectedOrder}
          getOrderDate={getOrderDate}
        />
        {hasMore && !loading && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => fetchOrders(true)}
              className="px-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-kinder text-xs uppercase tracking-widest rounded-xl transition-colors font-bold cursor-pointer"
            >
              {t("Charger plus de commandes")}
            </button>
          </div>
        )}
        {loading && orders.length > 0 && (
          <div className="flex justify-center mt-4">
            <span className="text-zinc-500 font-bold text-xs uppercase animate-pulse">
              {t("Chargement en cours...")}
            </span>
          </div>
        )}
      </div>

      {/* Floating Bottom Massive Bulk Actions Controller */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 bg-zinc-950 text-white p-4 sm:p-5 rounded-[2.5rem] shadow-2xl z-55 w-[90%] max-w-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#ea580c] flex items-center justify-center font-kinder text-sm text-white">
              {selectedOrderIds.length}
            </span>
            <div>
              <strong className="text-xs uppercase tracking-wider block font-kinder text-white">
                {t("Commandes sélectionnées")}
              </strong>
              <span className="text-[10px] text-zinc-405 font-bold">{t("Manifeste groupé prêt")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center">
            {/* Generate & Print Transport documents */}
            <button
              onClick={handleBulkPrint}
              className="py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-950 font-kinder text-[11px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer border-none transition-all shadow-md"
            >
              <Printer className="w-3.5 h-3.5 text-[#F46B1D]" />
              {t("Print Labels Bulk")} {t("admin_orders.pdf", "(PDF)")}
            </button>

            {/* Set to Processing / Shipped sub option */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value as OrderStatus);
                  e.target.value = ""; // reset
                }
              }}
              className="py-2.5 px-3 bg-zinc-800 text-white font-kinder text-[11px] uppercase tracking-wider rounded-xl cursor-pointer border-none transition-all focus:outline-none"
            >
              <option value="">⚙️ {t("Changer Statut (Bulk)")}</option>
              {Object.keys(statusLabels).map((k) => (
                <option key={k} value={k}>
                  {statusLabels[k]}
                </option>
              ))}
            </select>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer border-none transition-all"
            >
              {t("Désélectionner")}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-zinc-100 max-h-[90vh] flex flex-col scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="p-6 bg-zinc-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[9px] font-kinder uppercase tracking-widest text-[#FF5C00] block">
                  {t("Manifeste n°")} {selectedOrder.id.toUpperCase()}
                </span>
                <h3 className="text-lg font-kinder uppercase text-white mt-1">{t("Fiche Commande Complète")}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer border-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-zinc-800">
              {/* Client Profile Card with Phone links */}
              <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-[2rem] space-y-3">
                <h4 className="text-xs font-kinder uppercase tracking-widest text-zinc-505 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" />
                  {t("Dossier & Profil Client")}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-kinder text-zinc-400">{t("Nom Complet")}</span>
                    <strong className="block text-sm text-zinc-900 font-extrabold">
                      {selectedOrder.shippingAddress?.fullName || selectedOrder.shippingAddress?.name}
                    </strong>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-kinder text-zinc-400">
                      {t("Téléphone de Contact")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-kinder text-zinc-900 bg-zinc-100 px-3.5 py-1.5 rounded-xl border border-zinc-200">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      {selectedOrder.shippingAddress?.phone}
                    </span>
                  </div>

                  <div className="col-span-2 space-y-1 pt-1 border-t border-zinc-200">
                    <span className="block text-[10px] uppercase font-kinder text-zinc-400">
                      {t("Adresse d'expédition")}
                    </span>
                    <p className="text-xs font-semibold text-zinc-700">
                      {selectedOrder.shippingAddress?.street || t("Non renseignée")}
                    </p>
                    <strong className="text-xs font-kinder text-zinc-900 block mt-1">
                      🎯 {selectedOrder.shippingAddress?.wilaya} • {selectedOrder.shippingAddress?.commune}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Product list breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-kinder uppercase tracking-widest text-zinc-505">
                  {t("Détail des Articles commandés")}
                </h4>
                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="p-3 font-kinder text-zinc-600">{t("Produit")}</th>
                        <th className="p-3 font-kinder text-zinc-600 w-20 text-center">{t("Quantité")}</th>
                        <th className="p-3 font-kinder text-zinc-600 w-32 text-end">{t("Prix Unitaire")}</th>
                        <th className="p-3 font-kinder text-zinc-600 w-32 text-end">{t("Total")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {selectedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-xs">
                            <span className="font-semibold text-zinc-900 block leading-tight">
                              {it.productName || "Produit"}
                            </span>
                            {it.selectedVariant && (
                              <span className="font-bold text-[9px] uppercase tracking-widest text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded inline-block mt-1">
                                {it.selectedVariant}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-zinc-700 font-mono">{it.quantity}</td>
                          <td className="p-3 text-end font-bold text-zinc-800 font-mono">{formatPrice(it.price)}</td>
                          <td className="p-3 text-end font-kinder text-zinc-900 font-mono">
                            {formatPrice((it.price || 0) * (it.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commission breakdown breakdown & transparent math */}
              <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-[2rem] space-y-3">
                <span className="text-[9px] font-kinder uppercase tracking-widest text-purple-700 block">
                  ⚙️ {t("Comptabilité & Commission Olmart")}
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white border border-purple-100 rounded-2xl">
                    <span className="block text-[8px] font-kinder text-zinc-400 uppercase">{t("Articles")}</span>
                    <strong className="text-xs font-kinder text-zinc-800">
                      {formatPrice(selectedOrder.subtotal || selectedOrder.total)}
                    </strong>
                  </div>
                  <div className="p-3 bg-white border border-purple-100 rounded-2xl">
                    <span className="block text-[8px] font-kinder text-zinc-400 uppercase">{t("Livraison")}</span>
                    <strong className="text-xs font-kinder text-zinc-800">
                      {formatPrice(selectedOrder.shippingCost || 0)}
                    </strong>
                  </div>
                  <div className="p-3 bg-white border border-purple-100 rounded-2xl">
                    <span className="block text-[8px] font-kinder text-zinc-400 uppercase">
                      {t("Encaissement (COD)")}
                    </span>
                    <strong className="text-sm font-kinder text-[#ea580c]">{formatPrice(selectedOrder.total)}</strong>
                  </div>
                  <div className="p-3 bg-white border border-purple-100 rounded-2xl">
                    <span className="block text-[8px] font-kinder text-purple-600 uppercase">
                      {t("Commission (5%)")}
                    </span>
                    <strong className="text-sm font-kinder text-purple-700">
                      -{formatPrice(calculatedOrdersMap[selectedOrder.id]?.commissionAmount || 0)}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-purple-900/10 rounded-xl text-center text-xs font-kinder text-purple-800">
                  {t("Net Vendeur à reverser :")} {formatPrice(calculatedOrdersMap[selectedOrder.id]?.netRevenue || 0)}
                </div>
              </div>

              {/* Status controller and manual changes with journal logs */}
              <div className="p-5 border border-zinc-200 rounded-[2rem] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <strong className="block text-xs uppercase tracking-wider text-zinc-705 font-kinder">
                      {t("Modifier le statut de la commande")}
                    </strong>
                    <span className="text-[10px] text-zinc-400 block">
                      {t("Prend effet immédiatement côté vendeur et acheteur")}
                    </span>
                  </div>

                  <select
                    disabled={isUpdatingStatus}
                    value={selectedOrder.status?.toLowerCase() || ""}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    className="p-3 border border-zinc-200 bg-white rounded-xl text-xs font-kinder uppercase tracking-wider text-zinc-800 outline-none cursor-pointer"
                  >
                    {Object.keys(statusLabels).map((key) => (
                      <option key={key} value={key}>
                        {statusLabels[key]}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Logistics & Delivery Boy assignment */}
                <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <strong className="block text-xs uppercase tracking-wider text-zinc-705 font-kinder flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-500" />
                      {t("Attribution Logistique")}
                    </strong>
                    <span className="text-[10px] text-zinc-400 block mt-1">
                      {selectedOrder.deliveryBoyId 
                         ? t("Assigné au livreur : ") + (selectedOrder.deliveryBoyName || selectedOrder.deliveryBoyId)
                         : t("Aucun livreur assigné.")}
                    </span>
                  </div>
                  <button 
                     onClick={() => {
                        const name = prompt(t("Entrez le nom ou l'ID du livreur :"));
                        if(name) {
                           // In a real scenario, this updates via an API. Using Firestore directly for mock.
                           updateDoc(doc(db, "orders", selectedOrder.id), {
                              deliveryBoyId: name,
                              deliveryBoyName: name,
                              updatedAt: serverTimestamp()
                           });
                           setSelectedOrder({...selectedOrder, deliveryBoyId: name, deliveryBoyName: name});
                           toast.success(t("Livreur assigné !"));
                        }
                     }}
                     className="px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 font-kinder text-[10px] uppercase tracking-widest rounded-xl transition-colors border border-orange-200"
                  >
                     {selectedOrder.deliveryBoyId ? t("Changer Livreur") : t("Assigner un livreur")}
                  </button>
                </div>
                
                {/* Simplified Delivery Logs */}
                <div className="pt-4 border-t border-zinc-100">
                   <h5 className="text-[10px] font-kinder uppercase text-zinc-500 mb-3">{t("Journal Logistique (Delivery Logs)")}</h5>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs">
                         <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                         <span className="text-zinc-500">{selectedOrder.createdAt ? getOrderDate(selectedOrder.createdAt)?.toLocaleString() : ''}</span>
                         <strong className="text-zinc-800">{t("Commande créée")}</strong>
                      </div>
                      {selectedOrder.status?.toUpperCase() !== "NEW" && (
                         <div className="flex items-center gap-3 text-xs">
                            <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                            <span className="text-zinc-500">{new Date().toLocaleString()}</span>
                            <strong className="text-zinc-800">{t("Mise à jour : ")} {statusLabels[selectedOrder.status] || selectedOrder.status}</strong>
                         </div>
                      )}
                      {selectedOrder.deliveryBoyId && (
                         <div className="flex items-center gap-3 text-xs">
                            <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            <span className="text-zinc-500">{new Date().toLocaleString()}</span>
                            <strong className="text-zinc-800">{t("Assigné au livreur")} {selectedOrder.deliveryBoyName}</strong>
                         </div>
                      )}
                   </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-zinc-50 border-t border-zinc-200 flex justify-between">
              <div>
                {/* Single printable ticket triggers with stealth print */}
                <button
                  onClick={() => {
                    setSelectedOrderIds([selectedOrder.id]);
                    setTimeout(() => {
                      handleBulkPrint();
                      setSelectedOrderIds([]);
                    }, 100);
                  }}
                  className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-855 text-white font-kinder text-xs uppercase tracking-widest rounded-xl flex items-center gap-1 cursor-pointer transition-all border-none"
                >
                  <Printer className="w-4 h-4" />
                  {t("Imprimer Ticket")} {t("admin_orders.pdf", "(PDF)")}
                </button>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-zinc-200 hover:bg-zinc-250 text-zinc-700 font-kinder text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-all border-none"
              >
                {t("Fermer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
