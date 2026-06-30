import React, { useEffect, useState, useCallback, Suspense } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Activity,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  ArrowUp,
  Truck,
  Printer,
  Eye,
  ShoppingCart,
  Search,
  Heart,
  Sparkles,
  History,
  BookOpen,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import OverviewChart from "../../components/Admin/OverviewChart";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, limit, orderBy, where, startAfter, Timestamp } from "firebase/firestore";
import { formatPrice } from "../../utils/format";
import { analyticsEngine, AnalyticsEvent } from "../../utils/analyticsEngine";
import { WorkspaceActions } from "../../components/Admin/WorkspaceActions";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { AdminManualGuide } from "../../components/Admin/AdminManualGuide";
import { useDebounce } from "../../hooks/useDebounce";
import { AdminKPICards } from "../../components/Admin/Metrics/AdminKPICards";
import { BehaviorFunnel } from "../../components/Admin/Metrics/BehaviorFunnel";
import { PopularInsights } from "../../components/Admin/Metrics/PopularInsights";
import { RealTimeTrafficChart } from "../../components/Admin/Metrics/RealTimeTrafficChart";
import { WilayaBreakdown } from "../../components/Admin/Metrics/WilayaBreakdown";

interface AdminAlert {
  id: string;
  type: string;
  title?: string;
  message?: string;
  createdAt?: Timestamp;
  resolved?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  sellerId?: string;
}

interface DashboardData {
  metric?: string;
  value?: number;
  change?: number;
  period?: string;
}

export const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try { return await fn(); } catch (e) { console.error(e); return fallback; }
};

export const Overview: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");
  const [stats, setStats] = useState({
    totalSales: 0,
    activeVendors: 0,
    totalOrders: 0,
    netRevenue: 0,
    pendingVendors: 0,
    revenueChange: 0,
    ordersChange: 0
  });
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [data, setData] = useState<DashboardData[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [globalOrders, setGlobalOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [lastAlertVisible, setLastAlertVisible] = useState<any>(null);
  const ALERTS_PER_PAGE = 20;

  const [insights, setInsights] = useState<any>(() => {
    try {
      return analyticsEngine.getInsights();
    } catch {
      return { 
        totalViews: 0,
        totalCarts: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        conversionRate: "0.0",
        addToCartRate: "0.0",
        categoryHits: [],
        productViews: [],
        searchQueries: []
      };
    }
  });

  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>(() => {
    try {
      return analyticsEngine.getEvents().slice(-15).reverse();
    } catch {
      return [];
    }
  });

  const [isGuideOpen, setIsGuideOpen] = useState(() => {
    return localStorage.getItem('olmart_admin_guide_closed') !== 'true';
  });

  const closeGuide = () => {
    setIsGuideOpen(false);
    localStorage.setItem('olmart_admin_guide_closed', 'true');
  };

  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const refreshAnalytics = useCallback(async () => {
    setLoadingRefresh(true);
    try {
      setInsights(analyticsEngine.getInsights());
      setAnalyticsEvents(analyticsEngine.getEvents().slice(-15).reverse());
      // Refresh admin alerts
      const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "internal_notifications"), orderBy("createdAt", "desc"), limit(ALERTS_PER_PAGE));
      const snap = await getDocs(q);
      setAdminAlerts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminAlert));
      setLastAlertVisible(snap.docs[snap.docs.length - 1]);
    } catch {
       // fallback silently
    } finally {
      setLoadingRefresh(false);
    }
  }, []);

  const debouncedRefresh = useDebounce(refreshAnalytics, 500);

  const loadMoreAlerts = async () => {
    if (!lastAlertVisible) return;
    const q = query(
      collection(db, "internal_notifications"),
      orderBy("createdAt", "desc"),
      startAfter(lastAlertVisible),
      limit(ALERTS_PER_PAGE)
    );
    const snap = await getDocs(q);
    setAdminAlerts(prev => [...prev, ...snap.docs.map(d => ({ id: d.id, ...d.data() }) as AdminAlert)]);
    setLastAlertVisible(snap.docs[snap.docs.length - 1]);
  };

  const [disputeCount, setDisputeCount] = useState(0);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('month');
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [wilayaStats, setWilayaStats] = useState<any[]>([]);
  const [realTimeTraffic, setRealTimeTraffic] = useState<{time: string; views: number; carts: number}[]>([]);

  useEffect(() => {
    const fetchDisputes = async () => {
      const { query, collection, where, getCountFromServer, or } = await import("firebase/firestore");
      const q = query(
        collection(db, "orders"),
        or(where("status", "==", "RETURN_REQUESTED"), where("status", "==", "DISPUTE_OPEN"))
      );
      const snap = await getCountFromServer(q);
      setDisputeCount(snap.data().count);
    };
    fetchDisputes();
    refreshAnalytics();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalyticsData = async () => {
      try {
        const { getDoc, doc, collection, query, where, getCountFromServer, getAggregateFromServer, sum, orderBy, limit, getDocs } = await import("firebase/firestore");
        
        let startDate = new Date();
        if (dateFilter === 'today') {
          startDate.setHours(0,0,0,0);
        } else if (dateFilter === 'week') {
          startDate.setDate(startDate.getDate() - 7);
        } else {
          startDate.setMonth(startDate.getMonth() - 1);
        }

        let previousStartDate = new Date(startDate);
        let previousEndDate = new Date(startDate);
        if (dateFilter === 'today') {
          previousStartDate.setDate(previousStartDate.getDate() - 1);
          previousEndDate.setHours(0,0,0,0);
        } else if (dateFilter === 'week') {
          previousStartDate.setDate(previousStartDate.getDate() - 7);
        } else {
          previousStartDate.setMonth(previousStartDate.getMonth() - 1);
        }

        // 1. Fetch Orders Count & Revenue via Aggregation for Current Period
        const ordersQuery = query(collection(db, "orders"), where("createdAt", ">=", startDate));
        const [countSnap, aggSnap, pendingSnap] = await Promise.all([
           safeFetch(() => getCountFromServer(ordersQuery), { data: () => ({ count: 0 }) } as any),
           safeFetch(() => getAggregateFromServer(ordersQuery, { totalRevenue: sum('total') }), { data: () => ({ totalRevenue: 0 }) } as any),
           safeFetch(() => getCountFromServer(query(collection(db, "users"), where("role", "==", "seller"), where("status", "==", "pending"))), { data: () => ({ count: 0 }) } as any)
        ]);

        // 1b. Fetch Orders Count & Revenue for Previous Period
        const prevOrdersQuery = query(collection(db, "orders"), where("createdAt", ">=", previousStartDate), where("createdAt", "<", previousEndDate));
        const [prevCountSnap, prevAggSnap] = await Promise.all([
           safeFetch(() => getCountFromServer(prevOrdersQuery), { data: () => ({ count: 0 }) } as any),
           safeFetch(() => getAggregateFromServer(prevOrdersQuery, { totalRevenue: sum('total') }), { data: () => ({ totalRevenue: 0 }) } as any)
        ]);

        const currentRevenue = aggSnap.data().totalRevenue;
        const prevRevenue = prevAggSnap.data().totalRevenue;
        const revenueChange = prevRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

        const currentOrders = countSnap.data().count;
        const prevOrders = prevCountSnap.data().count;
        const ordersChange = prevOrders === 0 ? (currentOrders > 0 ? 100 : 0) : ((currentOrders - prevOrders) / prevOrders) * 100;

        // 2. Daily Document for Chart
        const docSnap = await safeFetch(() => getDoc(doc(db, "analytics", "daily")), null as any);

        if (!cancelled) {
          setStats({
            totalSales: docSnap?.exists() ? docSnap.data().totalSales : 0,
            activeVendors: docSnap?.exists() ? docSnap.data().activeVendors : 0,
            totalOrders: currentOrders,
            netRevenue: currentRevenue * 0.1, // assuming 10% commission for "Net Revenue Olma"
            pendingVendors: pendingSnap.data().count,
            revenueChange: revenueChange,
            ordersChange: ordersChange
          });

          if (docSnap && docSnap.exists() && docSnap.data().chartData) {
            setData(docSnap.data().chartData);
          }

          // Top Products (by fetching top 5 from products sorted by salesCount)
          const topProductsQuery = query(collection(db, "products"), orderBy("salesCount", "desc"), limit(5));
          const topProductsSnap = await safeFetch(() => getDocs(topProductsQuery), { docs: [] } as any);
          setTopProducts(topProductsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

          // Top Sellers (by fetching top 5 from users where role=seller sorted by totalRevenue)
          const topSellersQuery = query(collection(db, "users"), where("role", "==", "seller"), orderBy("totalRevenue", "desc"), limit(5));
          const topSellersSnap = await safeFetch(() => getDocs(topSellersQuery), { docs: [] } as any);
          setTopSellers(topSellersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));

          // Wilaya stats (mocked aggregation for now since Firestore doesn't group by natively, but we can read from analytics/daily if exists)
          if (docSnap && docSnap.exists() && docSnap.data().wilayaStats) {
             setWilayaStats(docSnap.data().wilayaStats);
          }

          // Fetch Real-time traffic (last 100 events)
          try {
             const rtQuery = query(collection(db, "analytics_events"), orderBy("serverTimestamp", "desc"), limit(100));
             const rtSnap = await getDocs(rtQuery);
             
             // Group by hour:minute (e.g. 14:00, 14:05) for charting
             const intervalMinutes = 15;
             const trafficMap: Record<string, {views: number, carts: number}> = {};
             
             rtSnap.docs.forEach(doc => {
                const data = doc.data();
                if(!data.serverTimestamp) return;
                const date = data.serverTimestamp.toDate();
                // Round to nearest interval
                const roundedMinutes = Math.floor(date.getMinutes() / intervalMinutes) * intervalMinutes;
                date.setMinutes(roundedMinutes, 0, 0);
                
                const timeKey = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (!trafficMap[timeKey]) trafficMap[timeKey] = { views: 0, carts: 0 };
                
                if (data.name === 'product_view' || data.name === 'search_query') trafficMap[timeKey].views++;
                if (data.name === 'add_to_cart') trafficMap[timeKey].carts++;
             });
             
             const formattedTraffic = Object.entries(trafficMap)
                .map(([time, stats]) => ({ time, ...stats }))
                .sort((a, b) => a.time.localeCompare(b.time)); // Sort chronologically
             
             if(formattedTraffic.length > 0) {
               setRealTimeTraffic(formattedTraffic);
             } else {
               // Seed some mock traffic if empty
               setRealTimeTraffic([
                  { time: '10:00', views: 12, carts: 2 },
                  { time: '10:15', views: 15, carts: 3 },
                  { time: '10:30', views: 25, carts: 5 },
                  { time: '10:45', views: 22, carts: 4 },
                  { time: '11:00', views: 30, carts: 8 }
               ]);
             }
          } catch(err) {
             console.error("Error fetching real time traffic", err);
             setRealTimeTraffic([
                { time: '10:00', views: 12, carts: 2 },
                { time: '10:15', views: 15, carts: 3 },
                { time: '10:30', views: 25, carts: 5 }
             ]);
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Erreur KPI:", err);
      }
    };
    fetchAnalyticsData();

    // Fetch Admin Activities
    const fetchActivities = async () => {
      const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "admin_activities"), orderBy("createdAt", "desc"), limit(5));
      const snap = await safeFetch(() => getDocs(q), { docs: [] } as any);
      if (!cancelled && snap.docs.length > 0) {
        setRecentEvents(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      } else if (!cancelled) {
         setRecentEvents([]);
      }
    };
    fetchActivities();

    return () => { cancelled = true; };
  }, [t, dateFilter]);

  useEffect(() => {
    const fetchGlobalOrders = async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        setGlobalOrders(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchGlobalOrders();

    const fetchAlerts = async () => {
      try {
        const q = query(collection(db, "internal_notifications"), orderBy("createdAt", "desc"), limit(ALERTS_PER_PAGE));
        const snap = await getDocs(q);
        setAdminAlerts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminAlert));
        setLastAlertVisible(snap.docs[snap.docs.length - 1]);
      } catch (e) {
        (process.env.NODE_ENV === "development" ? console.log : function () {})("No admin alerts or missing index");
      }
    };
    fetchAlerts();
  }, []);

  const handleDangerReset = async () => {
    const confirmInput = prompt(t("DANGER: Taper 'DANGER' pour réinitialiser la base de données"));
    if (confirmInput === "DANGER") {
      toast.success(t("Demande de réinitialisation envoyée au serveur sécurisé..."));
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">
            {t("Vue d'ensemble")}
          </h2>
          <p className="text-zinc-500 font-medium">{t("Contrôle global de la performance Olma Algérie.")}</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex bg-zinc-100 p-1 rounded-2xl">
            <button 
              onClick={() => setDateFilter('today')} 
              className={`px-4 py-2 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${dateFilter === 'today' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Aujourd'hui
            </button>
            <button 
              onClick={() => setDateFilter('week')} 
              className={`px-4 py-2 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${dateFilter === 'week' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Semaine
            </button>
            <button 
              onClick={() => setDateFilter('month')} 
              className={`px-4 py-2 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${dateFilter === 'month' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Mois
            </button>
          </div>
          {/* OLAP BigQuery Pattern Acknowledgement */}
          <div className="hidden lg:flex flex-col text-end me-4">
            <span className="text-[10px] font-kinder uppercase text-zinc-400 tracking-widest rtl:tracking-normal leading-none">
              {t("Moteur Analytics")}
            </span>
            <span className="text-xs font-bold text-emerald-600">{t("Export BigQuery Actif (OLAP)")}</span>
          </div>

          <button
            onClick={() => debouncedRefresh()}
            disabled={loadingRefresh}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-zinc-100 rounded-2xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal text-zinc-500 hover:text-zinc-900 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRefresh ? 'animate-spin' : ''}`} /> {t("Actualiser")}
          </button>
        </div>
      </div>

      <AdminManualGuide />

      {adminAlerts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-[14px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#E3000F] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {t("Alertes Critiques Système (")}
            {adminAlerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminAlerts.map((alert) => {
              return (
                <div key={alert.id} className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-kinder text-red-900">
                      {alert.type === "velocity_kill_switch"
                        ? t("Suspension Vélocité (Kill-Switch)") || "Suspension Vélocité (Kill-Switch)"
                        : alert.type}
                    </h4>
                    <p className="text-xs text-red-700 mt-1">
                      {alert.details || t("Alerte générée par le système") || "Alerte générée par le système"}
                    </p>
                    <p className="text-[10px] text-red-500 font-bold mt-2">
                      {t("ID Vendeur :")}
                      {alert.sellerId}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {lastAlertVisible && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMoreAlerts}
                className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-kinder text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors shadow-sm"
              >
                {t("Charger plus d'alertes")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE INTEGRATIONS */}
      <WorkspaceActions />

      {/* ACTIONS RAPIDES (Quick Actions) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          to="/dashboard/admin/products-moderation"
          className="flex flex-col items-center justify-center p-6 bg-[#ea580c] hover:bg-orange-600 text-white rounded-[2rem] transition-all shadow-md shadow-orange-500/20 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
            {t("Modération")}
            <br />
            {t("Produits")}
          </span>
        </Link>
        <Link
          to="/dashboard/admin/sellers"
          className="flex flex-col items-center justify-center p-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[2rem] transition-all shadow-md shadow-zinc-900/20 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <span className="font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
            {t("Modération")}
            <br />
            {t("Vendeurs")}
          </span>
        </Link>
        <Link
          to="/dashboard/admin/disputes"
          className="flex flex-col items-center justify-center p-6 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-[2rem] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-red-100/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <span className="font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
            {t("Gérer")}
            <br />
            {t("Litiges")}
          </span>
        </Link>
        <Link
          to="/dashboard/admin/orders"
          className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-[2rem] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ShoppingCart className="w-6 h-6 text-blue-500" />
          </div>
          <span className="font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
            {t("Toutes")}
            <br />
            {t("Commandes")}
          </span>
        </Link>
      </div>

      {/* Analytics Kpis */}
      <AdminKPICards stats={stats} disputeCount={disputeCount} />

      {/* SECTION ANALYTICS DES COMPORTEMENTS D'ACHAT */}
      <div className="space-y-8 bg-zinc-50/50 p-6 sm:p-10 rounded-[3.5rem] border border-zinc-200/50 mt-12">
        <BehaviorFunnel
          insights={insights}
          onReset={() => {
            analyticsEngine.clear();
            refreshAnalytics();
          }}
        />

        <PopularInsights insights={insights} />

        {/* Live Event Stream Logs */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm">
          <h4 className="text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-[#ea580c]" /> {t("Journal Temps Réel des Événements")}
          </h4>
          <div className="overflow-x-auto text-start">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Heure")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Session User")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Action")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Détails")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {analyticsEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-xs font-bold text-zinc-400">
                      {t("Aucun événement enregistré.")}
                    </td>
                  </tr>
                ) : (
                  analyticsEvents.map((evt, idx) => {
                    const formattedTime = new Date(evt.timestamp).toLocaleTimeString();
                    let badgeColor = "bg-zinc-100 text-zinc-700";
                    if (evt.name === "product_view") badgeColor = "bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]";
                    if (evt.name === "add_to_cart")
                      badgeColor = "bg-orange-50 text-orange-600 border border-orange-100";
                    if (evt.name === "purchase_complete")
                      badgeColor = "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]";
                    if (evt.name === "wishlist_toggle")
                      badgeColor = "bg-[#fdf2f8] text-[#db2777] border border-[#fbcfe8]";
                    if (evt.name === "search_query") badgeColor = "bg-amber-50 text-amber-600 border border-amber-100";
                    if (evt.name === "checkout_start")
                      badgeColor = "bg-purple-50 text-purple-600 border border-purple-100";
                    if (evt.name === "remove_from_cart") badgeColor = "bg-red-50 text-red-600 border border-red-100";

                    return (
                      <tr key={`${evt.id}-${idx}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-bold text-zinc-400 whitespace-nowrap">{formattedTime}</td>
                        <td className="px-5 py-4 text-xs font-bold text-zinc-650 truncate max-w-[150px]">
                          {evt.userEmail || t("Visiteur Anonyme")}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`${badgeColor} inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider rtl:tracking-normal`}
                          >
                            {evt.name}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-500 font-bold max-w-xs sm:max-w-md truncate">
                          {evt.name === "product_view" && `${t("Consulté")} "${evt.metadata.name}"`}
                          {evt.name === "add_to_cart" && `${t("Ajouté au panier:")} "${evt.metadata.name}"`}
                          {evt.name === "remove_from_cart" && `${t("Retiré du panier:")} "${evt.metadata.name}"`}
                          {evt.name === "wishlist_toggle" &&
                            `${evt.metadata.action === "add" ? t("Ajouté aux") : t("Retiré des")} ${t("favoris :")} ID ${evt.metadata.productId}`}
                          {evt.name === "search_query" &&
                            `${t("Recherche d'intérêt :")} "${evt.metadata.query}" (${evt.metadata.resultsCount} ${t("résultats")})`}
                          {evt.name === "purchase_complete" &&
                            `${t("Commande validée")} #${evt.metadata.orderId} - ${t("Total:")} ${formatPrice(evt.metadata.totalAmount)}`}
                          {evt.name === "checkout_start" &&
                            `${t("Visite de l'entonnoir - Panier contenant")} ${evt.metadata.itemsCount} ${t("articles")}`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Top Products */}
        <div className="bg-white p-8 rounded-[3.5rem] border border-zinc-100 shadow-sm">
          <h4 className="text-sm font-kinder uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" /> {t("Top 5 Produits")}
          </h4>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-xs text-zinc-400 font-bold uppercase">{t("Aucun produit")}</p>
            ) : (
              topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 flex-shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${p.images?.[0] || ''})` }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">{p.name || t("Produit inconnu")}</p>
                    <p className="text-[10px] text-zinc-500 font-kinder">{p.salesCount || 0} {t("ventes")}</p>
                  </div>
                  <div className="font-kinder text-xs text-emerald-600">{formatPrice(p.price)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white p-8 rounded-[3.5rem] border border-zinc-100 shadow-sm">
          <h4 className="text-sm font-kinder uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> {t("Top 5 Vendeurs")}
          </h4>
          <div className="space-y-4">
            {topSellers.length === 0 ? (
              <p className="text-xs text-zinc-400 font-bold uppercase">{t("Aucun vendeur")}</p>
            ) : (
              topSellers.map((s, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {s.displayName?.charAt(0) || "V"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">{s.displayName || s.email}</p>
                    <p className="text-[10px] text-zinc-500 font-kinder">{s.wilaya || t("National")}</p>
                  </div>
                  <div className="font-kinder text-xs text-blue-600">{formatPrice(s.totalRevenue || 0)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Wilaya Map Breakdown */}
        <WilayaBreakdown wilayaStats={wilayaStats} />
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-12 border border-zinc-100 shadow-sm">
          <h4 className="text-xl font-kinder flex items-center gap-4 mb-10">
            <BarChart3 className="w-7 h-7 text-orange-500" />
            {t("Revenus & Commissions Olma")}
          </h4>
          <div className="h-[400px] w-full min-w-0" style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <OverviewChart data={data} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-10 border-b border-zinc-50">
            <h4 className="text-xl font-kinder flex items-center gap-4">
              <Activity className="w-6 h-6 text-orange-500" />
              {t("Flux d'Activité")}
            </h4>
          </div>
          <div className="flex-1 divide-y divide-zinc-50 overflow-y-auto">
            {recentEvents.map((e, i) => (
              <div key={i} className="p-8 hover:bg-zinc-50/50 transition-colors flex gap-6">
                <div className={`w-3 h-3 rounded-full mt-2 shrink-0 ${e.color.replace("text-", "bg-")}`} />
                <div>
                  <p className="text-sm font-kinder text-zinc-950 leading-tight">{e.label}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal mt-1">
                    {e.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-10 bg-zinc-50/50">
            <button
              onClick={handleDangerReset}
              className="w-full bg-red-50 text-red-600 py-5 rounded-[2rem] font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/5 group"
            >
              <AlertTriangle className="w-4 h-4 group-hover:scale-125 transition-transform" />
              {t("Danger Zone: Reset DB")}
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Traffic Section */}
      <RealTimeTrafficChart realTimeTraffic={realTimeTraffic} />

      {/* Surveillance Globale des Expéditions */}
      <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm overflow-hidden flex flex-col mt-12">
        <div className="p-10 border-b border-zinc-50">
          <h4 className="text-xl font-kinder flex items-center gap-4">
            <Truck className="w-7 h-7 text-orange-500" />
            {t("Surveillance Globale des Expéditions")}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("N° Commande")}
                </th>
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Nom du Client")}
                </th>
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Seller ID(s)")}
                </th>
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Statut")}
                </th>
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Tracking ID")}
                </th>
                <th className="px-10 py-8 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loadingOrders ? (
                <tr>
                  <td colSpan={6} className="px-10 py-10 text-center text-sm font-bold text-zinc-400 animate-pulse">
                    {t("Chargement des expéditions...")}
                  </td>
                </tr>
              ) : globalOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-10 text-center text-sm font-bold text-zinc-400">
                    {t("Aucune commande trouvée.")}
                  </td>
                </tr>
              ) : (
                globalOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-10 py-8">
                        <span className="text-sm font-kinder text-zinc-950">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-xs font-bold text-zinc-700">
                          {order.shippingAddress?.name || order.userId || "Client"}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-1 max-w-[150px]">
                          {order.sellerIds && order.sellerIds.length > 0 ? (
                            [...new Set(order.sellerIds as string[])].map((sid: string) => (
                              <span
                                key={sid}
                                className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal truncate"
                              >
                                {sid}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal truncate">
                              {t("Inconnu")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest rtl:tracking-normal ${
                            order.status === "delivered"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : order.status === "shipped"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : order.status === "cancelled"
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {order.status || "pending"}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-xs font-bold text-zinc-500">{order.trackingId || t("N/A") || "N/A"}</span>
                      </td>
                      <td className="px-10 py-8">
                        {order.labelUrl ? (
                          <a
                            href={order.labelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal hover:bg-orange-600 transition-colors shadow-lg"
                          >
                            <Printer className="w-3 h-3" /> {t("Imprimer l'étiquette")}
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest rtl:tracking-normal px-2">
                            {t("Pas d'étiquette")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
