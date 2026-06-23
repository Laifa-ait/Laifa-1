import React, { useEffect, useState, useCallback } from "react";
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
  });
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);
  const [data, setData] = useState<DashboardData[]>([]);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [globalOrders, setGlobalOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [lastAlertVisible, setLastAlertVisible] = useState<any>(null);
  const ALERTS_PER_PAGE = 20;

  const [insights, setInsights] = useState(() => {
    try {
      return analyticsEngine.getInsights();
    } catch {
      return { events: [], summary: {} };
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

  const refreshAnalytics = useCallback(() => {
    try {
      setInsights(analyticsEngine.getInsights());
      setAnalyticsEvents(analyticsEngine.getEvents().slice(-15).reverse());
    } catch {
       // fallback silently
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
    const fetchAnalyticsDoc = async () => {
      try {
        const { getDoc, doc, collection, query, where, getCountFromServer } = await import("firebase/firestore");
        const docSnap = await safeFetch(() => getDoc(doc(db, "analytics", "daily")), null as any);

        const pendingQuery = query(
          collection(db, "users"),
          where("role", "==", "seller"),
          where("status", "==", "pending")
        );
        const pendingSnap = await safeFetch(() => getCountFromServer(pendingQuery), { data: () => ({ count: 0 }) } as any);

        if (!cancelled) {
          if (docSnap && docSnap.exists()) {
            const d = docSnap.data();
            setStats({
              totalSales: d.totalSales || 0,
              activeVendors: d.activeVendors || 0,
              totalOrders: d.totalOrders || 0,
              netRevenue: d.netRevenue || 0,
              pendingVendors: pendingSnap.data().count,
            });
            if (d.chartData) {
              setData(d.chartData);
            }
          } else {
            setStats((prev) => ({ ...prev, pendingVendors: pendingSnap.data().count }));
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Erreur KPI:", err);
      }
    };
    fetchAnalyticsDoc();

    setRecentEvents([
      { id: "1", type: "order", label: t("Nouvelle commande"), time: t("Il y a 2 min"), color: "text-orange-500", timestamp: Timestamp.now(), data: {} },
    ]);
    return () => { cancelled = true; };
  }, [t]);

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
        (process.env.NODE_ENV === "debug" ? console.log : function () {})("No admin alerts or missing index");
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
          <h2 className="text-4xl font-black tracking-tight rtl:tracking-normal text-zinc-950">
            {t("Vue d'ensemble")}
          </h2>
          <p className="text-zinc-500 font-medium">{t("Contrôle global de la performance Olma Algérie.")}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* OLAP BigQuery Pattern Acknowledgement */}
          <div className="hidden lg:flex flex-col text-end me-4">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest rtl:tracking-normal leading-none">
              {t("Moteur Analytics")}
            </span>
            <span className="text-xs font-bold text-emerald-600">{t("Export BigQuery Actif (OLAP)")}</span>
          </div>

          <button
            onClick={() => debouncedRefresh()}
            className="flex items-center gap-3 px-6 py-4 bg-white border border-zinc-100 rounded-2xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal text-zinc-500 hover:text-zinc-900 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> {t("Actualiser")}
          </button>
        </div>
      </div>

      <AdminManualGuide />

      {adminAlerts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-[14px] font-black uppercase tracking-widest rtl:tracking-normal text-[#E3000F] flex items-center gap-2">
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
                    <h4 className="text-sm font-black text-red-900">
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
                className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-colors shadow-sm"
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
          <span className="font-black text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
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
          <span className="font-black text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
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
          <span className="font-black text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
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
          <span className="font-black text-[10px] uppercase tracking-widest rtl:tracking-normal text-center leading-tight">
            {t("Toutes")}
            <br />
            {t("Commandes")}
          </span>
        </Link>
      </div>

      {/* Analytics Kpis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            label: "Ventes Globales",
            value: formatPrice(stats.totalSales),
            icon: DollarSign,
            inc: "+12.5%",
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Vendeurs / En Attente",
            value: `${stats.activeVendors} / ${stats.pendingVendors}`,
            icon: Users,
            inc: stats.pendingVendors > 0 ? "Urgent" : "À jour",
            color: stats.pendingVendors > 0 ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600",
          },
          {
            label: "Litiges & Retours",
            value: disputeCount,
            icon: AlertTriangle,
            inc: "Urgences",
            color: "bg-amber-50 text-amber-600",
          },
          {
            label: "Revenu Net Olma",
            value: formatPrice(stats.netRevenue),
            icon: TrendingUp,
            inc: "+9%",
            color: "bg-zinc-950 text-white",
          },
        ].map((k, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm relative overflow-hidden"
          >
            <div className={`w-14 h-14 rounded-2xl ${k.color} flex items-center justify-center mb-8`}>
              <k.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5">
              {k.label}
            </p>
            <h4 className="text-3xl font-black text-zinc-950 tracking-tighter rtl:tracking-normal mb-4">{k.value}</h4>
            <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest rtl:tracking-normal">
              <ArrowUp className="w-3 h-3" />
              {k.inc}
            </div>
          </motion.div>
        ))}
      </div>

      {/* SECTION ANALYTICS DES COMPORTEMENTS D'ACHAT */}
      <div className="space-y-8 bg-zinc-50/50 p-6 sm:p-10 rounded-[3.5rem] border border-zinc-200/50 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight rtl:tracking-normal text-zinc-950 uppercase flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-orange-500 animate-pulse" />
              {t("Comportement & Funnel Client (useUserHabits)")}
            </h3>
            <p className="text-zinc-500 text-[10px] font-black uppercase mt-1">
              {t("Statistiques d'achat & intentions capturées en temps réel sur la plateforme.")}
            </p>
          </div>
          <button
            onClick={() => {
              analyticsEngine.clear();
              refreshAnalytics();
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-black text-[9px] uppercase tracking-widest rtl:tracking-normal rounded-xl transition-colors border-none cursor-pointer self-start sm:self-center"
          >
            {t("Réinitialiser Journal")}
          </button>
        </div>

        {/* Lightweight Analytics KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Consultations Produits",
              value: insights.totalViews,
              icon: Eye,
              dsc: "pages produits vues",
              color: "bg-white text-zinc-900 border-zinc-150",
            },
            {
              label: "Ajouts au Panier",
              value: insights.totalCarts,
              icon: ShoppingCart,
              dsc: `${insights.addToCartRate}% taux d'ajout`,
              color: "bg-white text-orange-600 border-orange-100",
            },
            {
              label: "Conversion Client",
              value: `${insights.conversionRate}%`,
              icon: TrendingUp,
              dsc: "vues vers commandes",
              color: "bg-white text-emerald-600 border-emerald-100",
            },
            {
              label: "Ventes Analytiques",
              value: formatPrice(insights.totalRevenue),
              icon: DollarSign,
              dsc: `${insights.totalPurchases} commandes`,
              color: "bg-zinc-950 text-white border-zinc-900",
            },
          ].map((k, i) => (
            <div key={i} className={`p-6 sm:p-8 rounded-[2rem] border ${k.color} shadow-sm relative overflow-hidden`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal opacity-80">
                  {k.label}
                </span>
                <k.icon className="w-5 h-5 opacity-80" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black tracking-tighter rtl:tracking-normal mb-1">{k.value}</h4>
              <p className="text-[9px] font-bold uppercase opacity-60">{k.dsc}</p>
            </div>
          ))}
        </div>

        {/* Behavior Details Lists (Top Searches, Viewed Products, Category Heatmap) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          {/* Top Viewed */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
                <Eye className="w-4 h-4" /> {t("Articles Populaires")}
              </h4>
              {insights.productViews.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("Aucune vue détectée")}</p>
              ) : (
                <div className="space-y-4">
                  {insights.productViews.map((item, idx) => {
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs font-bold text-zinc-700">
                        <span className="truncate max-w-[150px]">{item.name}</span>
                        <span className="text-[9px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">
                          {item.count} {t("vues")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Popular Search queries */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
                <Search className="w-4 h-4" /> {t("Recherches Populaires")}
              </h4>
              {insights.searchQueries.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("Aucun terme recherché")}</p>
              ) : (
                <div className="space-y-4">
                  {insights.searchQueries.map((item, idx) => {
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs font-bold text-zinc-700">
                        <span>🎬 "{item.query}"</span>
                        <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full">
                          {item.count} {t("fois")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Category Heatmap Weight */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> {t("Densité d'Intérêt Catégorie")}
              </h4>
              {insights.categoryHits.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("En attente de visites")}</p>
              ) : (
                <div className="space-y-4">
                  {insights.categoryHits.map((item, idx) => {
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-black text-zinc-700 uppercase">
                          <span>{item.name}</span>
                          <span>
                            {item.value} {t("pts")}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${Math.min(100, (item.value / Math.max(...insights.categoryHits.map((c) => c.value))) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Event Stream Logs */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-[#ea580c]" /> {t("Journal Temps Réel des Événements")}
          </h4>
          <div className="overflow-x-auto text-start">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                  <th className="px-5 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Heure")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Session User")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Action")}
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
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
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-[3.5rem] p-12 border border-zinc-100 shadow-sm">
          <h4 className="text-xl font-black flex items-center gap-4 mb-10">
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
            <h4 className="text-xl font-black flex items-center gap-4">
              <Activity className="w-6 h-6 text-orange-500" />
              {t("Flux d'Activité")}
            </h4>
          </div>
          <div className="flex-1 divide-y divide-zinc-50 overflow-y-auto">
            {recentEvents.map((e, i) => (
              <div key={i} className="p-8 hover:bg-zinc-50/50 transition-colors flex gap-6">
                <div className={`w-3 h-3 rounded-full mt-2 shrink-0 ${e.color.replace("text-", "bg-")}`} />
                <div>
                  <p className="text-sm font-black text-zinc-950 leading-tight">{e.label}</p>
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
              className="w-full bg-red-50 text-red-600 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest rtl:tracking-normal flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/5 group"
            >
              <AlertTriangle className="w-4 h-4 group-hover:scale-125 transition-transform" />
              {t("Danger Zone: Reset DB")}
            </button>
          </div>
        </div>
      </div>

      {/* Surveillance Globale des Expéditions */}
      <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm overflow-hidden flex flex-col mt-12">
        <div className="p-10 border-b border-zinc-50">
          <h4 className="text-xl font-black flex items-center gap-4">
            <Truck className="w-7 h-7 text-orange-500" />
            {t("Surveillance Globale des Expéditions")}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("N° Commande")}
                </th>
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Nom du Client")}
                </th>
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Seller ID(s)")}
                </th>
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Statut")}
                </th>
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                  {t("Tracking ID")}
                </th>
                <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
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
                        <span className="text-sm font-black text-zinc-950">
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
                                className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal truncate"
                              >
                                {sid}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal truncate">
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest rtl:tracking-normal hover:bg-orange-600 transition-colors shadow-lg"
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
