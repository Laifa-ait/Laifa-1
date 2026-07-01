import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DollarSign, ShoppingBag, Package, TrendingUp, Activity, BarChart3, Clock, AlertCircle, RotateCcw, Plus, List, CreditCard, HelpCircle, Star, ArrowUpRight, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, getCountFromServer, getAggregateFromServer, sum, count, Timestamp } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from "react-i18next";
import { getOptimizedImageUrl } from "../../utils/imageUtils";

export const Overview: React.FC = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    orderCount: 0,
    productCount: 0,
    growth: 'N/A',
    pendingReturns: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [payoutStats, setPayoutStats] = useState({ available: 0, nextPaymentDate: '' });
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [wilayaStats, setWilayaStats] = useState<{name: string, count: number}[]>([]);
  const [chartData, setChartData] = useState<{name: string, sales: number}[]>([]);

  // Types
  interface SellerOrder {
    id: string;
    total: number;
    createdAt: Timestamp;
    status: string;
    shippingAddress?: { wilaya: string };
    items?: Array<{ sellerId: string; id: string; name: string; quantity: number; price: number; image: string }>;
  }

  interface TopProduct {
    id: string;
    name: string;
    count: number;
    total: number;
    image: string;
  }

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { 
        return await fn(); 
      } catch (e) { 
        if (!cancelled) console.error(e); 
        return fallback; 
      }
    };

    const fetchData = async () => {
      // 1. Fetch products simply (single-field filter, no index issues)
      const pQ = query(collection(db, "products"), where("sellerId", "==", currentUser.uid));
      const productsSnap = await safeFetch(() => getDocs(pQ), { docs: [] } as any);
      const productCount = productsSnap.docs.length;

      // 2. Fetch orders simply (single-field filter, no index issues) for charts
      const oQ = query(collection(db, "orders"), where("sellerIds", "array-contains", currentUser.uid), limit(250));
      const ordersSnap = await safeFetch(() => getDocs(oQ), { docs: [] } as any);
      const allOrders = ordersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

      // Count out of stock in memory
      let outOfStock = 0;
      productsSnap.docs.forEach((doc: any) => {
        const p = doc.data();
        if ((p.stock !== undefined && p.stock <= 0) || p.hasOutOfStockVariants === true) {
          outOfStock++;
        }
      });
      if (!cancelled) setOutOfStockCount(outOfStock);

      // Fetch Global Stats from financial_summary (to avoid client-side aggregation issues)
      const { doc, getDoc } = await import("firebase/firestore");
      let totalSales = 0;
      let orderCount: number;
      let pendingReturns = 0;
      try {
        const summaryDoc = await getDoc(doc(db, `financial_summary/${currentUser.uid}`));
        if (summaryDoc.exists()) {
          const data = summaryDoc.data();
          totalSales = data.totalSales || 0;
          orderCount = data.orderCount || 0;
          pendingReturns = data.pendingReturns || 0;
        } else {
           // Fallback to client-side if doc doesn't exist yet
           orderCount = allOrders.length;
           allOrders.forEach((o: any) => {
             totalSales += (o.total || 0);
             if (o.status === "RETURN_REQUESTED") pendingReturns++;
           });
        }
      } catch (e) {
         orderCount = allOrders.length;
         allOrders.forEach((o: any) => {
           totalSales += (o.total || 0);
           if (o.status === "RETURN_REQUESTED") pendingReturns++;
         });
      }

      // 3. True Growth and Sales Calculation from the retrieved list of orders
      const now = new Date();
      
      // This Week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Start on Monday
      startOfWeek.setHours(0, 0, 0, 0);

      // Last Week
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      
      let currentWeekTotal = 0;
      let lastWeekTotal = 0;

      const thisWeekOrders: any[] = [];
      const lastWeekOrders: any[] = [];

      allOrders.forEach((o: any) => {
        if (o.createdAt) {
          const createdDate = o.createdAt.toDate();
          if (createdDate >= startOfWeek) {
            currentWeekTotal += (o.total || 0);
            thisWeekOrders.push(o);
          } else if (createdDate >= startOfLastWeek && createdDate < startOfWeek) {
            lastWeekTotal += (o.total || 0);
            lastWeekOrders.push(o);
          }
        }
      });

      let growthCalc = 'N/A';
      if (lastWeekTotal > 0) {
          const growthFactor = ((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
          growthCalc = (growthFactor > 0 ? '+' : '') + growthFactor.toFixed(1) + '%';
      }

      if (!cancelled) {
        setStats({
          totalSales,
          orderCount,
          productCount,
          growth: growthCalc,
          pendingReturns
        });
      }

      // 4. Sort and fetch recent orders in memory
      const sortedOrders = [...allOrders].sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      if (!cancelled) setRecentOrders(sortedOrders.slice(0, 5));

      // Wilaya Stats Calculation
      const wStats: Record<string, number> = {};
      sortedOrders.forEach((o: any) => {
        const w = o.shippingAddress?.wilaya;
        if (w) wStats[w] = (wStats[w] || 0) + 1;
      });
      const sortedWilayas = Object.entries(wStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      if (!cancelled) setWilayaStats(sortedWilayas);

      // 5. Chart Data (Current Week Only)
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const chartMap = { 'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0, 'Sam': 0, 'Dim': 0 };
      
      thisWeekOrders.forEach((order: any) => {
          if (order.createdAt) {
            const date = order.createdAt.toDate();
            const dayName = days[date.getDay()];
            if (chartMap[dayName as keyof typeof chartMap] !== undefined) {
              chartMap[dayName as keyof typeof chartMap] += (order.total || 0);
            }
          }
      });
      
      if (!cancelled) {
        setChartData([
          { name: 'Lun', sales: chartMap['Lun'] },
          { name: 'Mar', sales: chartMap['Mar'] },
          { name: 'Mer', sales: chartMap['Mer'] },
          { name: 'Jeu', sales: chartMap['Jeu'] },
          { name: 'Ven', sales: chartMap['Ven'] },
          { name: 'Sam', sales: chartMap['Sam'] },
          { name: 'Dim', sales: chartMap['Dim'] },
        ]);
      }

      // 6. Top Products & Payout Simulation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const productFreq: Record<string, {name: string, count: number, total: number, image: string}> = {};
      
      allOrders.forEach((o: any) => {
        const createdDate = o.createdAt ? o.createdAt.toDate() : null;
        if (createdDate && createdDate >= thirtyDaysAgo) {
          (o.items || []).forEach((item: any) => {
            if (item.sellerId === currentUser.uid) {
                if (!productFreq[item.id]) {
                  productFreq[item.id] = { name: item.name, count: 0, total: 0, image: item.image };
                }
                productFreq[item.id].count += item.quantity;
                productFreq[item.id].total += (item.price * item.quantity);
            }
          });
        }
      });

      const sortedTopProducts: TopProduct[] = Object.entries(productFreq)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      
      if (!cancelled) setTopProducts(sortedTopProducts);

      // Simulation de paiements
      const availablePayout = Math.floor(totalSales * 0.72);
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (7 - nextDate.getDay() % 7)); // Prochain Lundi
      
      if (!cancelled) {
        setPayoutStats({
          available: availablePayout,
          nextPaymentDate: nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        });
      }
    };
    
    fetchData();
    return () => { cancelled = true; };
  }, [currentUser]);

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">{t("seller.overview.hello", "Bonjour, ")}{userProfile?.shopName || userProfile?.displayName}</h2>
          <p className="text-zinc-500 font-medium">{t("seller.overview.welcome_desc", "Voici ce qui se passe dans votre boutique aujourd'hui.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {userProfile?.trustScore !== undefined && (
             <div 
                className="flex items-center gap-2 p-1 bg-white border border-zinc-100 rounded-2xl shadow-sm cursor-help" 
                title={t("seller.overview.trust_score_desc", "Votre Trust Score garantit votre visibilité sur Olmart. Une plainte ou communication hors-ligne peut le faire baisser.")}
             >
                <span className={`p-3 rounded-xl ${userProfile.trustScore >= 80 ? 'bg-emerald-50 text-emerald-500' : userProfile.trustScore >= 50 ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'}`}>
                   <ShieldCheck className="w-5 h-5" />
                </span>
                <div className="pe-4 py-2 text-start">
                   <p className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none mb-1">{t("seller.overview.trust_score", "Trust Score")}</p>
                   <p className={`text-[10px] font-black uppercase tracking-wider rtl:tracking-normal ${userProfile.trustScore >= 80 ? 'text-emerald-700' : userProfile.trustScore >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                      {userProfile.trustScore} / 100
                   </p>
                </div>
             </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 p-1 bg-white border border-zinc-100 rounded-2xl shadow-sm">
               <span className="p-3 bg-red-50 text-red-500 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
               </span>
               <div className="pr-4 py-2">
                  <p className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none mb-1">{t("seller.overview.stock_alert", "Alerte Stock")}</p>
                  <p className="text-[10px] font-kinder text-zinc-900 uppercase">{outOfStockCount} {t("seller.overview.item", "Article")}{outOfStockCount > 1 ? 's ' : ' '}{t("seller.overview.out_of_stock", "en rupture")}</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
            { label: t("seller.overview.new_product", "Nouveau Produit"), icon: Plus, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => navigate('/dashboard/seller/catalog?action=new') },
            { label: t("seller.overview.manage_orders", "Gérer Commandes"), icon: List, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => navigate('/dashboard/seller/orders') },
            { label: t("seller.overview.my_finances", "Mes Finances"), icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => navigate('/dashboard/seller/wallet') },
            { label: t("seller.overview.help_center", "Centre d'aide"), icon: HelpCircle, color: 'text-zinc-600', bg: 'bg-zinc-50', onClick: () => navigate('/dashboard/seller/support') },
         ].map((action, i) => (
            <button 
               key={i}
               onClick={action.onClick}
               className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-100 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
            >
               <div className={`w-12 h-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6" />
               </div>
               <span className="text-xs font-kinder text-zinc-950 text-center">{action.label}</span>
            </button>
         ))}
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: t("seller.overview.total_sales", "Ventes Totales"), value: formatPrice(stats.totalSales), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t("seller.overview.orders", "Commandes"), value: stats.orderCount, icon: ShoppingBag, color: 'text-[#ea580c]', bg: 'bg-orange-50' },
          { label: t("seller.overview.active_items", "Articles Actifs"), value: stats.productCount, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t("seller.overview.pending_returns", "Retours en attente"), value: stats.pendingReturns, icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-zinc-100 shadow-sm flex flex-col items-center text-center gap-3 sm:gap-4 group hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <s.icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-0.5 sm:mb-1">{s.label}</p>
              <p className="text-lg sm:text-2xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-100 shadow-sm p-6 sm:p-10 overflow-hidden relative">
              <div className="flex items-center justify-between mb-8 sm:mb-10">
                 <h4 className="text-lg sm:text-xl font-kinder flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#ea580c]" />
                    {t("seller.overview.weekly_sales", "Ventes de la Semaine")}</h4>
                 <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal">{stats.growth}</span>
                 </div>
              </div>
              <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                       <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#999' }} />
                       <Tooltip 
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900 }} 
                         itemStyle={{ color: '#ea580c' }}
                       />
                       <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Top Selling Products */}
           <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                 <h4 className="text-md font-kinder flex items-center gap-3 text-zinc-950">
                    <Zap className="w-5 h-5 text-blue-600" />
                    {t("seller.overview.top_products", "Produits les plus vendus")}</h4>
                 <button onClick={() => navigate('/dashboard/seller/catalog')} className="text-[10px] font-kinder text-blue-600 uppercase tracking-widest rtl:tracking-normal hover:underline">
                    {t("seller.overview.manage_inventory", "Gérer Inventaire")}</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {topProducts.map((p, i) => {
                   
                   return (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors group">
                                       <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-100 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                          <img loading="lazy" src={getOptimizedImageUrl(p.image, 200) || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop"} alt={p.name} className="w-full h-full object-cover" />
                                       </div>
                                       <div className="flex-1 overflow-hidden">
                                          <p className="text-xs font-kinder text-zinc-950 truncate mb-1">{p.name}</p>
                                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">{p.count} {t("seller.overview.sales_separators", "Ventes • ")}{formatPrice(p.total)}</p>
                                       </div>
                                       <button className="p-2 rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-blue-600 transition-colors">
                                          <ArrowUpRight className="w-4 h-4" />
                                       </button>
                                    </div>
                                  );
                 })}
                 {topProducts.length === 0 && (
                   <p className="col-span-2 text-center text-[10px] font-bold text-zinc-400 italic py-8">{t("seller.overview.no_products_sold", "Aucun produit vendu ce mois-ci.")}</p>
                 )}
              </div>
           </div>
        </div>

         <div className="space-y-8 flex flex-col">
            {/* Wilaya Stats */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8">
               <h4 className="text-sm font-kinder text-zinc-950 uppercase tracking-widest rtl:tracking-normal mb-8">{t("seller.overview.flash_delivery_zones", "Zones de Livraison Flash")}</h4>
               <div className="space-y-6">
                  {wilayaStats.map((w, i) => {
                    
                    return (
                                      <div key={i} className="flex flex-col gap-2">
                                         <div className="flex justify-between items-center">
                                            <span className="text-xs font-kinder text-zinc-700">{w.name}</span>
                                            <span className="text-[10px] font-bold text-zinc-400">{w.count} {t("seller.overview.order", "Commande")}{w.count > 1 ? 's' : ''}</span>
                                         </div>
                                         <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${(w.count / Math.max(...wilayaStats.map(x => x.count) || [1])) * 100}%` }}
                                              className="h-full bg-orange-500 rounded-full"
                                            />
                                         </div>
                                      </div>
                                    );
                  })}
                  {wilayaStats.length === 0 && (
                    <p className="text-[10px] font-bold text-zinc-400 text-center py-10 italic">{t("seller.overview.no_geo_data", "Pas encore assez de données géographiques.")}</p>
                  )}
               </div>
            </div>

            {/* Payout Summary */}
            <div className="bg-zinc-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CreditCard className="w-32 h-32 rotate-12" />
               </div>
               <div className="relative z-10">
                  <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-4">{t("seller.overview.balance_to_payout", "Solde à verser")}</p>
                  <h2 className="text-4xl font-kinder tracking-tighter rtl:tracking-normal mb-2">{formatPrice(payoutStats.available)}</h2>
                  <div className="flex items-center gap-2 mb-8">
                     <Clock className="w-3 h-3 text-emerald-400" />
                     <p className="text-[10px] font-bold text-zinc-400">{t("seller.overview.next_payout_date", "Prochain virement le ")}{payoutStats.nextPaymentDate}</p>
                  </div>
                  <button onClick={() => navigate('/dashboard/seller/wallet')} className="w-full py-3 bg-white text-zinc-950 rounded-2xl text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal hover:bg-orange-500 hover:text-white transition-all">
                     {t("seller.overview.payout_details", "Détails des virements")}</button>
               </div>
            </div>

            {/* Account Health */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8 flex flex-col items-center text-center">
               <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
               </div>
               <h4 className="text-sm font-kinder text-zinc-950 uppercase tracking-widest rtl:tracking-normal mb-1">{t("seller.overview.account_health", "Santé du Compte")}</h4>
               <p className="text-[10px] font-bold text-zinc-400 uppercase mb-6">{t("seller.overview.excellent", "Excellente")}</p>
               
               <div className="w-full space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight rtl:tracking-normal">
                     <span className="text-zinc-400">{t("seller.overview.seller_rating", "Note Vendeur")}</span>
                     <span className="text-zinc-950">{userProfile?.rating?.toFixed(1) || "4.8"}/5</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight rtl:tracking-normal">
                     <span className="text-zinc-400">{t("seller.overview.return_rate", "Taux de retour")}</span>
                     <span className="text-emerald-500">0.4%</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight rtl:tracking-normal">
                     <span className="text-zinc-400">{t("seller.overview.shipping_delay", "Délai d'expédition")}</span>
                     <span className="text-zinc-950">{t("seller.overview.delay_val", "1.2 jours")}</span>
                  </div>
               </div>

               <div className="mt-8 pt-8 border-t border-zinc-50 w-full">
                  <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">
                    {t("seller.overview.top_5", "\"Votre boutique est dans le top 5% des vendeurs OLMART.\"")}</p>
               </div>
            </div>
         </div>
       </div>

       <div className="grid lg:grid-cols-3 gap-8">
         {/* Activity Feed */}
         <div className="lg:col-span-3 bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden">
           <div className="p-6 sm:p-8 border-b border-zinc-50">
              <h4 className="text-md sm:text-lg font-kinder flex items-center gap-3">
                 <Activity className="w-5 h-5 text-[#ea580c]" />
                 {t("seller.overview.latest_activities", "Dernières Activités")}</h4>
           </div>
           <div className="divide-y divide-zinc-50">
              {recentOrders.map((o, i) => {
                
                return (
                              <div key={i} className="p-6 flex items-center gap-4 hover:bg-zinc-50/50 transition-colors">
                                 <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ea580c] flex items-center justify-center shrink-0">
                                    <ShoppingBag className="w-5 h-5" />
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-kinder text-zinc-950 truncate">{t("seller.overview.new_order_prefix", "Nouvelle Commande #")}{o.id.substring(0, 6)}</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">
                                       {o.createdAt && typeof o.createdAt.toDate === 'function' ? o.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t("seller.overview.recent", "Récent")}
                                    </p>
                                 </div>
                                 <div className="text-end">
                                    <p className="text-sm font-kinder text-zinc-950">{formatPrice(o.total)}</p>
                                 </div>
                              </div>
                            );
              })}
              {recentOrders.length === 0 && (
                <div className="p-6 text-center text-zinc-400 font-medium text-sm">
                  {t("Aucune activité récente.")}</div>
              )}
           </div>
           {recentOrders.length > 0 && (
             <button className="w-full py-4 text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal hover:text-orange-600 hover:bg-zinc-50 transition-all border-t border-zinc-50">
                {t("Voir tous les journaux")}</button>
           )}
        </div>
      </div>
    </div>
  );
};
