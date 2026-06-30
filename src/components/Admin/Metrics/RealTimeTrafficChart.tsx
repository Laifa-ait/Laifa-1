import React from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

interface RealTimeTrafficChartProps {
  realTimeTraffic: Array<{
    time: string;
    views: number;
    carts: number;
  }>;
}

export const RealTimeTrafficChart: React.FC<RealTimeTrafficChartProps> = ({ realTimeTraffic }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-[3.5rem] p-12 border border-zinc-100 shadow-sm mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h4 className="text-xl font-kinder flex items-center gap-4 text-zinc-900">
            <Activity className="w-7 h-7 text-indigo-500 animate-pulse" />
            {t("Graphique de Trafic & Conversions en Temps Réel")}
          </h4>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            {t("Visualisez l'activité des utilisateurs (vues de produits et ajouts au panier) sur les dernières heures.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-kinder uppercase tracking-widest text-zinc-500">
            {t("Mise à jour en direct")}
          </span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={realTimeTraffic} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCarts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f4f4f5" strokeDasharray="5 5" vertical={false} />
            <XAxis dataKey="time" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
            <RechartsTooltip
              contentStyle={{
                borderRadius: "16px",
                border: "none",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                padding: "12px",
              }}
              labelStyle={{ fontWeight: "bold", marginBottom: "8px", color: "#18181b", fontSize: "12px" }}
            />
            <Area
              type="monotone"
              dataKey="views"
              name={t("Vues Produits")}
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorViews)"
            />
            <Area
              type="monotone"
              dataKey="carts"
              name={t("Ajouts au Panier")}
              stroke="#ea580c"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCarts)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
