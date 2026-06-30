import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

interface WilayaStat {
  wilaya: string;
  count: number;
}

interface WilayaBreakdownProps {
  wilayaStats: WilayaStat[];
}

export const WilayaBreakdown: React.FC<WilayaBreakdownProps> = ({ wilayaStats }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-8 rounded-[3.5rem] border border-zinc-100 shadow-sm">
      <h4 className="text-sm font-kinder uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-emerald-500" /> {t("Commandes par Wilaya")}
      </h4>
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {wilayaStats.length === 0 ? (
          <p className="text-xs text-zinc-400 font-bold uppercase">{t("Aucune donnée géographique")}</p>
        ) : (
          [...wilayaStats]
            .sort((a, b) => b.count - a.count)
            .map((w, i) => {
              const maxCount = Math.max(...wilayaStats.map((x) => x.count)) || 1;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-kinder text-zinc-700 uppercase">
                    <span>{w.wilaya}</span>
                    <span>
                      {w.count} {t("cmd")}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (w.count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};
