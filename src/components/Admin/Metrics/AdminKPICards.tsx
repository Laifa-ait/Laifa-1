import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Users, AlertTriangle, TrendingUp, ArrowUp } from "lucide-react";
import { formatPrice } from "../../../utils/format";

interface AdminKPICardsProps {
  stats: {
    totalOrders: number;
    activeVendors: number;
    pendingVendors: number;
    netRevenue: number;
    revenueChange: number;
    ordersChange: number;
  };
  disputeCount: number;
}

export const AdminKPICards: React.FC<AdminKPICardsProps> = ({ stats, disputeCount }) => {
  const { t } = useTranslation();

  const cardsData = [
    {
      label: t("Total Commandes"),
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      inc: stats.ordersChange > 0 ? `+${stats.ordersChange.toFixed(1)}%` : `${stats.ordersChange.toFixed(1)}%`,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: t("Vendeurs / En Attente"),
      value: `${stats.activeVendors} / ${stats.pendingVendors}`,
      icon: Users,
      inc: stats.pendingVendors > 0 ? t("Urgent") : t("À jour"),
      color: stats.pendingVendors > 0 ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600",
    },
    {
      label: t("Litiges & Retours"),
      value: disputeCount,
      icon: AlertTriangle,
      inc: t("Urgences"),
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: t("Revenu Net Olma"),
      value: formatPrice(stats.netRevenue),
      icon: TrendingUp,
      inc: stats.revenueChange > 0 ? `+${stats.revenueChange.toFixed(1)}%` : `${stats.revenueChange.toFixed(1)}%`,
      color: "bg-zinc-950 text-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {cardsData.map((k, i) => (
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
          <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5">
            {k.label}
          </p>
          <h4 className="text-3xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal mb-4">
            {k.value}
          </h4>
          <div
            className={`flex items-center gap-2 font-kinder text-[10px] uppercase tracking-widest rlt:tracking-normal ${
              k.inc.includes("-") ? "text-red-500" : "text-emerald-500"
            }`}
          >
            <ArrowUp className={`w-3 h-3 ${k.inc.includes("-") ? "rotate-180" : ""}`} />
            {k.inc}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
