import React from "react";
import { Tag, Percent, Trash2, Power, PowerOff, Copy, User, Check, Layers, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { fr, arDZ } from "date-fns/locale";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import toast from "react-hot-toast";

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  expiresAt: any;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
  limitedToCategories?: string[];
  limitedToSellers?: string[];
  singleUsePerClient?: boolean;
  clickCount?: number;
}

interface CouponCardProps {
  coupon: Coupon;
  toggleStatus: (coupon: Coupon) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  sellersList: { id: string; name: string }[];
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  toggleStatus,
  handleDelete,
  sellersList,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "ar" ? arDZ : fr;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success(t("Code copié dans le presse-papiers !"));
      // Increment click count in Firestore
      await updateDoc(doc(db, "coupons", coupon.id), {
        clickCount: increment(1),
      });
    } catch (err) {
      console.error("Error copying coupon code:", err);
    }
  };

  // Map seller IDs to names
  const getSellerNames = (sellerIds?: string[]) => {
    if (!sellerIds || sellerIds.length === 0) return null;
    return sellerIds
      .map((id) => {
        const found = sellersList.find((s) => s.id === id);
        return found ? found.name : id;
      })
      .join(", ");
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden group hover:border-zinc-300 transition-all">
      {/* Status Bar */}
      <div
        className={`absolute top-0 start-0 w-1.5 h-full ${
          coupon.isActive ? "bg-green-500" : "bg-red-500"
        }`}
      />

      <div className="flex justify-between items-start mb-4 ps-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl text-lg font-kinder text-zinc-900 tracking-widest rtl:tracking-normal inline-flex items-center gap-2 transition-colors active:scale-95 cursor-pointer"
              title={t("Cliquer pour copier le code")}
            >
              <span>{coupon.code}</span>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider rtl:tracking-normal">
            {coupon.discountType === "percentage" ? (
              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                <Percent className="w-3 h-3" /> {t("Pourcentage")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3" /> {t("Montant Fixe")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleStatus(coupon)}
            className={`p-2 rounded-full transition-colors ${
              coupon.isActive
                ? "text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                : "text-red-500 bg-red-50 hover:bg-red-100"
            }`}
            title={coupon.isActive ? t("Désactiver") : t("Activer")}
          >
            {coupon.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </button>
          <button
            onClick={() => handleDelete(coupon.id)}
            className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-4 ps-2 font-sans">
        <div className="flex justify-between items-center text-sm">
          <span className="text-zinc-500 font-medium">{t("Valeur")}</span>
          <span className="font-kinder text-zinc-900 text-lg">
            {coupon.discountType === "percentage"
              ? `${coupon.discountValue}%`
              : `${coupon.discountValue} ${t("DA")}`}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-t border-zinc-100 pt-3">
          <span className="text-zinc-500 font-medium">{t("Min. d'achat")}</span>
          <span className="font-bold text-zinc-800">
            {coupon.minOrderValue} {t("DA")}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-t border-zinc-100 pt-3">
          <span className="text-zinc-500 font-medium">{t("Expiration")}</span>
          <span className="font-bold text-zinc-800">
            {coupon.expiresAt
              ? format(coupon.expiresAt.toDate(), "dd MMM yyyy, HH:mm", { locale: dateLocale })
              : t("N/A")}
          </span>
        </div>

        {/* Categories limitations */}
        <div className="flex justify-between items-start text-xs border-t border-zinc-100 pt-3 gap-2">
          <span className="text-zinc-500 font-medium shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {t("Catégories")}
          </span>
          <span className="font-semibold text-zinc-800 text-end break-all line-clamp-2">
            {coupon.limitedToCategories && coupon.limitedToCategories.length > 0 ? (
              coupon.limitedToCategories.map((cat, i) => (
                <span
                  key={cat}
                  className="inline-block bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded-md text-[10px] m-0.5 font-bold uppercase"
                >
                  {t(cat)}
                </span>
              ))
            ) : (
              <span className="text-zinc-400 italic font-medium">{t("Toutes catégories")}</span>
            )}
          </span>
        </div>

        {/* Sellers limitations */}
        <div className="flex justify-between items-start text-xs border-t border-zinc-100 pt-3 gap-2">
          <span className="text-zinc-500 font-medium shrink-0 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {t("Vendeurs")}
          </span>
          <span className="font-semibold text-zinc-800 text-end break-all line-clamp-2">
            {coupon.limitedToSellers && coupon.limitedToSellers.length > 0 ? (
              getSellerNames(coupon.limitedToSellers)
            ) : (
              <span className="text-zinc-400 italic font-medium">{t("Tous vendeurs")}</span>
            )}
          </span>
        </div>

        {/* Single use per client */}
        <div className="flex justify-between items-center text-xs border-t border-zinc-100 pt-3">
          <span className="text-zinc-500 font-medium flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            {t("Usage unique client")}
          </span>
          <span
            className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
              coupon.singleUsePerClient
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {coupon.singleUsePerClient ? t("Oui") : t("Non")}
          </span>
        </div>
      </div>

      <div className="bg-zinc-50 rounded-2xl p-4 flex justify-between items-center text-sm gap-2">
        <div>
          <p className="text-zinc-500 font-medium text-xs mb-1">{t("Utilisations")}</p>
          <p className="font-kinder text-zinc-900">
            {coupon.usedCount} / {coupon.usageLimit || "∞"}
          </p>
        </div>

        <div className="text-end">
          <p className="text-zinc-500 font-medium text-xs mb-1">{t("Clics / Copies")}</p>
          <p className="font-kinder text-zinc-900">{coupon.clickCount || 0}</p>
        </div>

        {coupon.usageLimit && coupon.usedCount >= coupon.usageLimit && (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
            {t("Épuisé")}
          </span>
        )}
      </div>
    </div>
  );
};
