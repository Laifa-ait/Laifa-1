import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import { areProductNamesSimilar } from "../../../utils/textSimilarity";

interface CurationDuplicatePanelProps {
  selectedProduct: any;
  relatedProducts: any[];
}

export const CurationDuplicatePanel: React.FC<CurationDuplicatePanelProps> = ({
  selectedProduct,
  relatedProducts,
}) => {
  const { t } = useTranslation();

  const duplicates = useMemo(() => {
    if (!selectedProduct) return [];
    return relatedProducts.filter((p) => {
      if (p.id === selectedProduct.id) return false;
      return areProductNamesSimilar(selectedProduct.name, p.name);
    });
  }, [selectedProduct, relatedProducts]);

  if (!selectedProduct) return null;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-sm space-y-4">
      <div className="flex items-center gap-2 justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-zinc-700" />
          <h3 className="font-kinder text-xs text-zinc-900 uppercase tracking-widest">
            {t("Comparaison de doublons")}
          </h3>
        </div>
        <span className="text-[10px] text-zinc-400 font-bold">
          {relatedProducts.length} {t("produits dans la catégorie")}
        </span>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-green-900">
              {t("Aucune similarité suspecte détectée")}
            </h4>
            <p className="text-[10px] text-green-700 font-medium mt-0.5">
              {t("Aucun autre produit actif dans cette catégorie ne possède un nom similaire. Moins de risque de pollution du catalogue.")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-red-900">
                {t("Doublons potentiels détectés !")}
              </h4>
              <p className="text-[10px] text-red-700 font-medium mt-0.5">
                {t("Attention, des produits très similaires existent déjà. Évitez les fiches en doublon d'un même vendeur.")}
              </p>
            </div>
          </div>

          <div className="divide-y divide-zinc-100 max-h-48 overflow-y-auto pr-1">
            {duplicates.map((dup) => (
              <div key={dup.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0">
                    <img src={dup.image} alt={dup.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-zinc-800 truncate">
                      {dup.name}
                    </h5>
                    <p className="text-[9px] text-zinc-400 font-bold">
                      {t("Boutique :")} {dup.sellerName || t("Inconnu")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-900">
                    {dup.price} DA
                  </span>
                  <p className="text-[9px] text-[#FF5C00] font-bold">
                    {dup.id === selectedProduct.id ? t("Même fiche") : t("Actif")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
