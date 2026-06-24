import React, { useState } from 'react';
import { MessageSquareWarning, Search, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useTranslation } from "react-i18next";

export const ReviewsAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [reviews, setReviews] = useState<any[]>([]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 uppercase">{t("Modération des Avis")}</h2>
          <p className="text-zinc-500 font-medium">{t("Surveillez et modérez les commentaires clients sur les produits et les vendeurs.")}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden p-12 text-center text-zinc-500">
         <MessageSquareWarning className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
         <h3 className="text-lg font-kinder text-zinc-900 mb-2">{t("Aucun avis à modérer")}</h3>
         <p className="text-sm">{t("Tous les avis récents respectent nos conditions d'utilisation.")}</p>
      </div>
    </div>
  );
};
