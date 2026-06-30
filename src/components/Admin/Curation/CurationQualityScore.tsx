import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Info } from "lucide-react";

interface CurationQualityScoreProps {
  product: any;
  score: number;
}

export const CurationQualityScore: React.FC<CurationQualityScoreProps> = ({
  product,
  score,
}) => {
  const { t } = useTranslation();

  if (!product) return null;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          <h3 className="font-kinder text-xs text-zinc-900 uppercase tracking-widest">
            {t("Score de qualité automatique")}
          </h3>
        </div>
        <span
          className={`text-sm font-kinder px-4 py-1.5 rounded-full ${
            score >= 75
              ? "bg-green-100 text-green-800"
              : score >= 50
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {score}%
        </span>
      </div>

      {/* Real-time slider representation */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 75
                ? "bg-green-500"
                : score >= 50
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Optimization recommendations */}
      <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-zinc-100 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-kinder text-zinc-500 uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-zinc-400" />
          {t("Suggestions d'optimisation")}
        </div>
        <ul className="text-xs font-medium text-zinc-600 space-y-1 pl-4 list-disc rtl:pr-4 rtl:list-disc">
          {(product.name || "").length < 15 && (
            <li>{t("Rallonger le titre pour un meilleur référencement (idéalement entre 15 et 85 caractères)")}</li>
          )}
          {(product.description || "").length < 150 && (
            <li>{t("Enrichir la description pour atteindre 150 caractères et expliquer la touche créative")}</li>
          )}
          {(product.images?.length || 0) < 3 && (
            <li>{t("Ajouter au moins 3 photos pour valoriser le rendu mobile (galerie carousel)")}</li>
          )}
          {!product.subcategory && (
            <li className="text-amber-600">{t("Indiquer une sous-catégorie pour faciliter le filtrage client")}</li>
          )}
        </ul>
      </div>
    </div>
  );
};
