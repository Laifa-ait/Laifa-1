import React, { useState, useEffect, useMemo } from "react";
import { X, Check, AlertCircle, Search, Layers, User, HelpCircle, CheckSquare, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { collection, addDoc, getDoc, doc, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Coupon } from "./CouponCard";

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCoupons: Coupon[];
}

export const CouponModal: React.FC<CouponModalProps> = ({
  isOpen,
  onClose,
  existingCoupons,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [singleUsePerClient, setSingleUsePerClient] = useState(false);

  // Search/Filters lists
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [sellersList, setSellersList] = useState<{ id: string; name: string; email?: string }[]>([]);

  // Search strings
  const [categorySearch, setCategorySearch] = useState("");
  const [sellerSearch, setSellerSearch] = useState("");

  // Listen / Fetch Categories and Sellers
  useEffect(() => {
    if (!isOpen) return;

    // Load Categories Hierarchy
    const unsubCat = onSnapshot(doc(db, "settings", "categories"), (snap) => {
      if (snap.exists() && snap.data().hierarchy) {
        const hierarchy = snap.data().hierarchy;
        const catList: string[] = [];
        Object.keys(hierarchy).forEach((cat) => {
          if (!catList.includes(cat)) catList.push(cat);
          Object.keys(hierarchy[cat] || {}).forEach((sub) => {
            if (!catList.includes(sub)) catList.push(sub);
            (hierarchy[cat][sub] || []).forEach((subsub: string) => {
              if (!catList.includes(subsub)) catList.push(subsub);
            });
          });
        });
        setCategoriesList(catList);
      }
    });

    // Load Sellers
    const sellersQuery = query(collection(db, "users"), where("role", "==", "seller"));
    const unsubSellers = onSnapshot(
      sellersQuery,
      (snapshot) => {
        const list: { id: string; name: string; email?: string }[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.storeName || data.displayName || data.email || doc.id,
            email: data.email,
          });
        });
        setSellersList(list);
      },
      (err) => {
        console.error("Error loading sellers for promo modal:", err);
      }
    );

    return () => {
      unsubCat();
      unsubSellers();
    };
  }, [isOpen]);

  // Filter Categories & Sellers based on search query
  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categoriesList;
    return categoriesList.filter((cat) => t(cat).toLowerCase().includes(q) || cat.toLowerCase().includes(q));
  }, [categorySearch, categoriesList, t]);

  const filteredSellers = useMemo(() => {
    const q = sellerSearch.toLowerCase().trim();
    if (!q) return sellersList;
    return sellersList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [sellerSearch, sellersList]);

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleToggleSeller = (sellerId: string) => {
    setSelectedSellers((prev) =>
      prev.includes(sellerId) ? prev.filter((id) => id !== sellerId) : [...prev, sellerId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const uppercaseCode = code.trim().toUpperCase();

    try {
      // 1. Validate Uniqueness client-side
      const exists = existingCoupons.some((c) => c.code === uppercaseCode);
      if (exists) {
        throw new Error(
          t("Ce code promo existe déjà ({{code}}). Veuillez utiliser un code unique.", {
            code: uppercaseCode,
          })
        );
      }

      const parsedValue = parseFloat(discountValue);
      const parsedMinPurchase = parseFloat(minOrderValue);
      const parsedUsageLimit = usageLimit ? parseInt(usageLimit, 10) : null;
      const parsedExpiry = new Date(expiresAt);

      if (!uppercaseCode || isNaN(parsedValue) || isNaN(parsedMinPurchase) || isNaN(parsedExpiry.getTime())) {
        throw new Error(t("Veuillez remplir tous les champs obligatoires correctement."));
      }

      // 2. Validate percentage logic
      if (discountType === "percentage" && (parsedValue <= 0 || parsedValue > 100)) {
        throw new Error(t("Le pourcentage de remise doit être compris entre 1% et 100%."));
      }

      if (discountType === "fixed" && parsedValue <= 0) {
        throw new Error(t("La valeur de remise fixe doit être supérieure à 0."));
      }

      if (parsedMinPurchase < 0) {
        throw new Error(t("Le minimum d'achat ne peut pas être négatif."));
      }

      if (parsedExpiry <= new Date()) {
        throw new Error(t("La date d'expiration doit être dans le futur."));
      }

      // 3. Save to Firestore
      await addDoc(collection(db, "coupons"), {
        code: uppercaseCode,
        discountType,
        discountValue: parsedValue,
        minOrderValue: parsedMinPurchase,
        expiresAt: Timestamp.fromDate(parsedExpiry),
        isActive: true,
        usedCount: 0,
        clickCount: 0,
        createdAt: Timestamp.now(),
        limitedToCategories: selectedCategories,
        limitedToSellers: selectedSellers,
        singleUsePerClient,
        ...(parsedUsageLimit !== null ? { usageLimit: parsedUsageLimit } : {}),
      });

      onClose();
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
    setSelectedCategories([]);
    setSelectedSellers([]);
    setSingleUsePerClient(false);
    setCategorySearch("");
    setSellerSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/80 z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-zinc-200">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="font-kinder text-xl text-zinc-950 uppercase">{t("Créer un Code Promo")}</h3>
            <p className="text-xs text-zinc-500 font-sans mt-0.5">
              {t("Définissez des coupons avec restrictions par catégorie, vendeur, et usage unique.")}
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-2.5 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-sans leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4 font-sans">
            {/* Promo Code & Usage Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Code Promo")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t("EX: RAMADAN26")}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl font-mono uppercase focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Limite d'utilisation")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder={t("Optionnel (Ex: 100)")}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Type de remise")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value as any);
                    setDiscountValue("");
                  }}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl focus:ring-1 focus:ring-zinc-950 outline-none transition-all font-semibold"
                >
                  <option value="percentage">{t("Pourcentage (%)")}</option>
                  <option value="fixed">{t("Montant Fixe (DA)")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Valeur")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={discountType === "percentage" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? t("Ex: 15") : t("Ex: 1000")}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                />
              </div>
            </div>

            {/* Min Purchase & Expiration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Min. d'achat")} ({t("DA")}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  placeholder={t("Ex: 5000")}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {t("Date d'expiration")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                />
              </div>
            </div>

            {/* Single Use Switch */}
            <div className="flex items-center gap-3 p-4 bg-amber-50/40 border border-amber-100/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setSingleUsePerClient(!singleUsePerClient)}
                className="text-amber-700 transition-colors"
              >
                {singleUsePerClient ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5 text-zinc-400" />
                )}
              </button>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                  {t("Limiter à un usage unique par client")}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {t("Si activé, chaque client d'OLMART ne pourra utiliser ce code qu'une seule fois.")}
                </p>
              </div>
            </div>

            {/* Limitation Category Scrollbox */}
            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  {t("Limitation par Catégorie")}
                </label>
                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono font-bold">
                  {selectedCategories.length} {t("Sélectionnées")}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-2">
                {t("Laissez vide pour autoriser toutes les catégories d'OLMART.")}
              </p>

              <div className="relative mb-2">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={t("Filtrer les catégories...")}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full ps-9 pe-4 py-2 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="border border-zinc-100 rounded-2xl max-h-[140px] overflow-y-auto p-3 space-y-2.5 bg-zinc-50/30">
                {filteredCategories.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 text-center py-4">{t("Aucune catégorie trouvée")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                            isSelected
                              ? "bg-zinc-950 text-white shadow-sm"
                              : "bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <span className="truncate">{t(cat)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Limitation Seller Scrollbox */}
            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-zinc-500" />
                  {t("Limitation par Vendeur")}
                </label>
                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-mono font-bold">
                  {selectedSellers.length} {t("Sélectionnés")}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-2">
                {t("Laissez vide pour autoriser tous les vendeurs d'OLMART.")}
              </p>

              <div className="relative mb-2">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={t("Filtrer les vendeurs par boutique ou email...")}
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="w-full ps-9 pe-4 py-2 bg-zinc-50 border border-zinc-200 focus:border-zinc-950 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="border border-zinc-100 rounded-2xl max-h-[140px] overflow-y-auto p-3 space-y-2.5 bg-zinc-50/30">
                {filteredSellers.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 text-center py-4">{t("Aucun vendeur trouvé")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredSellers.map((seller) => {
                      const isSelected = selectedSellers.includes(seller.id);
                      return (
                        <button
                          key={seller.id}
                          type="button"
                          onClick={() => handleToggleSeller(seller.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                            isSelected
                              ? "bg-zinc-950 text-white shadow-sm"
                              : "bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <span className="truncate">{seller.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-6 py-3 font-sans font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors text-xs uppercase tracking-wider"
          >
            {t("Annuler")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-zinc-950 text-white font-kinder text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" /> {t("Créer le Coupon")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
