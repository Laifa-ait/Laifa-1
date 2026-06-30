import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Eye, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";
import { formatPrice } from "../../../utils/format";

interface BehaviorFunnelProps {
  insights: {
    totalViews: number;
    totalCarts: number;
    addToCartRate: string | number;
    conversionRate: string | number;
    totalRevenue: number;
    totalPurchases: number;
  };
  onReset: () => void;
}

export const BehaviorFunnel: React.FC<BehaviorFunnelProps> = ({ insights, onReset }) => {
  const { t } = useTranslation();

  const funnelItems = [
    {
      label: t("Consultations Produits"),
      value: insights.totalViews,
      icon: Eye,
      dsc: t("pages produits vues"),
      color: "bg-white text-zinc-900 border-zinc-150",
    },
    {
      label: t("Ajouts au Panier"),
      value: insights.totalCarts,
      icon: ShoppingCart,
      dsc: `${insights.addToCartRate}% ` + t("taux d'ajout"),
      color: "bg-white text-orange-600 border-orange-100",
    },
    {
      label: t("Conversion Client"),
      value: `${insights.conversionRate}%`,
      icon: TrendingUp,
      dsc: t("vues vers commandes"),
      color: "bg-white text-emerald-600 border-emerald-100",
    },
    {
      label: t("Ventes Analytiques"),
      value: formatPrice(insights.totalRevenue),
      icon: DollarSign,
      dsc: `${insights.totalPurchases} ` + t("commandes"),
      color: "bg-zinc-950 text-white border-zinc-900",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 uppercase flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-orange-500 animate-pulse" />
            {t("Comportement & Funnel Client (useUserHabits)")}
          </h3>
          <p className="text-zinc-500 text-[10px] font-kinder uppercase mt-1">
            {t("Statistiques d'achat & intentions capturées en temps réel sur la plateforme.")}
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-kinder text-[9px] uppercase tracking-widest rtl:tracking-normal rounded-xl transition-colors border-none cursor-pointer self-start sm:self-center"
        >
          {t("Réinitialiser Journal")}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {funnelItems.map((k, i) => (
          <div key={i} className={`p-6 sm:p-8 rounded-[2rem] border ${k.color} shadow-sm relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal opacity-80">
                {k.label}
              </span>
              <k.icon className="w-5 h-5 opacity-80" />
            </div>
            <h4 className="text-xl sm:text-2xl font-kinder tracking-tighter rtl:tracking-normal mb-1">
              {k.value}
            </h4>
            <p className="text-[9px] font-bold uppercase opacity-60">{k.dsc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
