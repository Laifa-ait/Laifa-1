import React from "react";
import { useTranslation } from "react-i18next";
import { Eye, Search, Sparkles } from "lucide-react";

interface PopularInsightsProps {
  insights: {
    productViews: any[];
    searchQueries: any[];
    categoryHits: any[];
  };
}

export const PopularInsights: React.FC<PopularInsightsProps> = ({ insights }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
      {/* Top Viewed */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm flex flex-col justify-between">
        <div>
          <h4 className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
            <Eye className="w-4 h-4" /> {t("Articles Populaires")}
          </h4>
          {insights.productViews.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("Aucune vue détectée")}</p>
          ) : (
            <div className="space-y-4">
              {insights.productViews.map((item: any, idx: number) => {
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
          <h4 className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
            <Search className="w-4 h-4" /> {t("Recherches Populaires")}
          </h4>
          {insights.searchQueries.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("Aucun terme recherché")}</p>
          ) : (
            <div className="space-y-4">
              {insights.searchQueries.map((item: any, idx: number) => {
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
          <h4 className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-[#ea580c] mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> {t("Densité d'Intérêt Catégorie")}
          </h4>
          {insights.categoryHits.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 font-bold uppercase">{t("En attente de visites")}</p>
          ) : (
            <div className="space-y-4">
              {insights.categoryHits.map((item: any, idx: number) => {
                const maxVal = Math.max(...insights.categoryHits.map((c: any) => c.value)) || 1;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-kinder text-zinc-700 uppercase">
                      <span>{item.name}</span>
                      <span>
                        {item.value} {t("pts")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (item.value / maxVal) * 100)}%`,
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
  );
};
