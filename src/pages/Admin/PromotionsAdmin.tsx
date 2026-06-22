import React, { useState, useEffect } from "react";
import { Tag, Plus, Search, Percent, Edit2, Trash2, X, Check, AlertCircle, Power, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { format } from "date-fns";
import { fr, arDZ } from "date-fns/locale";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  expiresAt: any;
  isActive: boolean;
  usageLimit?: number;
  usedCount: number;
}

export const PromotionsAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  useEffect(() => {
    const q = query(collection(db, "coupons"), orderBy("expiresAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const couponsData: Coupon[] = [];
        snapshot.forEach((doc) => {
          couponsData.push({ id: doc.id, ...doc.data() } as Coupon);
        });
        setCoupons(couponsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching coupons:", err);
        setError(t("Erreur de chargement des coupons"));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const parsedValue = parseFloat(discountValue);
      const parsedMinPurchase = parseFloat(minOrderValue);
      const parsedUsageLimit = usageLimit ? parseInt(usageLimit, 10) : null;
      const parsedExpiry = new Date(expiresAt);

      if (!code.trim() || isNaN(parsedValue) || isNaN(parsedMinPurchase) || isNaN(parsedExpiry.getTime())) {
        throw new Error(t("Veuillez remplir tous les champs obligatoires correctement."));
      }

      if (discountType === "percentage" && (parsedValue <= 0 || parsedValue > 100)) {
        throw new Error(t("Le pourcentage doit être compris entre 1 et 100."));
      }

      await addDoc(collection(db, "coupons"), {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parsedValue,
        minOrderValue: parsedMinPurchase,
        expiresAt: Timestamp.fromDate(parsedExpiry),
        isActive: true,
        usedCount: 0,
        createdAt: Timestamp.now(),
        ...(parsedUsageLimit !== null ? { usageLimit: parsedUsageLimit } : {}),
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || t("Erreur lors de la création du coupon."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinOrderValue("");
    setExpiresAt("");
    setUsageLimit("");
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, "coupons", coupon.id), {
        isActive: !coupon.isActive,
      });
    } catch (err) {
      console.error("Error updating status:", err);
      alert(t("Erreur lors de la mise à jour du statut."));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("Êtes-vous sûr de vouloir supprimer ce coupon ?"))) {
      try {
        await deleteDoc(doc(db, "coupons", id));
      } catch (err) {
        console.error("Error deleting coupon:", err);
        alert(t("Erreur lors de la suppression."));
      }
    }
  };

  const dateLocale = i18n.language === "ar" ? arDZ : fr;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950 uppercase">
            {t("Codes Promo & Campagnes")}
          </h2>
          <p className="text-zinc-500 font-medium">
            {t("Gérez les réductions globales, les coupons vendeurs et les offres spéciales.")}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg"
        >
          <Plus className="w-4 h-4" /> {t("Créer un Coupon")}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden p-12 text-center text-zinc-500">
          <Tag className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-zinc-900 mb-2">{t("Aucun code promo créé")}</h3>
          <p className="text-sm">{t("Créez votre première campagne promotionnelle pour stimuler les ventes.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm relative overflow-hidden group"
            >
              {/* Status Indicator Indicator */}
              <div
                className={`absolute top-0 start-0 w-1.5 h-full ${coupon.isActive ? "bg-green-500" : "bg-red-500"}`}
              ></div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="bg-zinc-100 px-3 py-1 rounded-lg text-lg font-black text-zinc-900 tracking-widest rtl:tracking-normal mb-2 inline-block">
                    {coupon.code}
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
                    className={`p-2 rounded-full transition-colors ${coupon.isActive ? "text-zinc-400 hover:bg-zinc-100 hover:text-red-600" : "text-red-500 bg-red-50 hover:bg-red-100"}`}
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

              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">{t("Valeur")}</span>
                  <span className="font-black text-zinc-900 text-lg">
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
              </div>

              <div className="bg-zinc-50 rounded-2xl p-4 flex justify-between items-center text-sm">
                <div>
                  <p className="text-zinc-500 font-medium text-xs mb-1">{t("Utilisations")}</p>
                  <p className="font-black text-zinc-900">
                    {coupon.usedCount} / {coupon.usageLimit || "∞"}
                  </p>
                </div>
                {coupon.usageLimit && (
                  <span className="bg-zinc-100 text-zinc-700 text-xs font-bold px-2 py-1 rounded-lg">
                    {coupon.usageLimit}
                  </span>
                )}
                {coupon.usageLimit && coupon.usedCount >= coupon.usageLimit && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">{t("Épuisé")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-zinc-900 uppercase">{t("Nouveau Coupon")}</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">{t("Code Promo")}</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t("EX: RAMADAN26")}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono uppercase focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">{t("Type de remise")}</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="percentage">{t("Pourcentage (%)")}</option>
                      <option value="fixed">{t("Montant Fixe (DA)")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">{t("Valeur")}</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "percentage" ? t("Ex: 15") : t("Ex: 1000")}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">
                      {t("Min. d'achat")} ({t("DA")})
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder={t("Ex: 5000")}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">{t("Limite d'utilisation")}</label>
                    <input
                      type="number"
                      min={1}
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder={t("Optionnel (Ex: 100)")}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">{t("Date d'expiration")}</label>
                  <input
                    type="datetime-local"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-3 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  {t("Annuler")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-zinc-950 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> {t("Créer")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
