import React, { useState, useEffect } from "react";
import {
  Star,
  Info,
  Store,
  MapPin,
  Truck,
  ShieldCheck,
  Tag,
  Sparkles,
  CalendarDays,
  Layers,
  Undo2,
  Maximize2,
  FileText,
  Check,
  UserPlus,
  UserCheck,
  Flame,
  Clock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Product, Shop } from "../../../types";
import { formatPrice } from "../../../utils/format";
import { DYNAMIC_CATEGORIES } from "../../../config/dynamicFilters";
import { PRODUCT_COLORS } from "../../../constants";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../../ui/ConfirmModal";

const MATERIAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  Coton: { fr: "Coton", en: "Cotton", ar: "قطن" },
  Laine: { fr: "Laine", en: "Wool", ar: "صوف" },
  Cuir: { fr: "Cuir", en: "Leather", ar: "جلد" },
  Argile: { fr: "Argile (Poterie)", en: "Clay (Pottery)", ar: "طين / فخار" },
  Cuivre: { fr: "Cuivre", en: "Copper", ar: "نحاس" },
  Soie: { fr: "Soie", en: "Silk", ar: "حرير" },
  Lin: { fr: "Lin", en: "Linen", ar: "كتان" },
  Or: { fr: "Or", en: "Gold", ar: "ذهب" },
  Argent: { fr: "Argent", en: "Silver", ar: "فضة" },
  Bois: { fr: "Bois", en: "Wood", ar: "خشب" },
  Céramique: { fr: "Céramique", en: "Ceramic", ar: "سيراميك" },
  Verre: { fr: "Verre", en: "Glass", ar: "زجاج" },
  "Fil d'Or": { fr: "Fil d'Or (Majboud/Fetla)", en: "Gold Thread (Fetla)", ar: "فتلة / مجبود" },
  Autre: { fr: "Autre", en: "Other", ar: "أخرى" },
};

const SEASON_TRANSLATIONS: Record<string, Record<string, string>> = {
  "Toutes Saisons": { fr: "Toutes Saisons", en: "All Seasons", ar: "كل الفصول" },
  "Printemps / Été": { fr: "Printemps / Été", en: "Spring / Summer", ar: "الربيع / الصيف" },
  "Automne / Hiver": { fr: "Automne / Hiver", en: "Autumn / Winter", ar: "الخريف / الشتاء" },
  "Collection Ramadan": { fr: "Collection Ramadan", en: "Ramadan Collection", ar: "مجموعة رمضان" },
  "Collection Traditionnelle": { fr: "Collection Traditionnelle", en: "Traditional Collection", ar: "مجموعة تقليدية" },
  "Édition Limitée": { fr: "Édition Limitée", en: "Limited Edition", ar: "طبعة محدودة" },
};

interface InfoProps {
  product: Product;
  shop: Shop | null;
  currentPrice: number;
  selectedColor: string | null;
  selectedSize: string | null;
  onSelectColor: (c: string) => void;
  onSelectSize: (s: string) => void;
  isColorOutOfStock: (c: string) => boolean;
  isSizeOutOfStock: (s: string) => boolean;
}

export const ProductInfo: React.FC<InfoProps> = ({
  product,
  shop,
  currentPrice,
  selectedColor,
  selectedSize,
  onSelectColor,
  onSelectSize,
  isColorOutOfStock,
  isSizeOutOfStock,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [isSizeGuideOpen, setIsSizeGuideOpen] = React.useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const isProductFlashActive = !!(
    product.flashSaleActive &&
    product.flashPrice &&
    (!product.flashEndDate || new Date(product.flashEndDate).getTime() > Date.now())
  );

  useEffect(() => {
    if (!isProductFlashActive) return;
    const calculateTimeLeft = () => {
      const now = new Date();
      let targetDate = new Date();
      if (product.flashEndDate) {
        targetDate = new Date(product.flashEndDate);
      } else {
        targetDate.setHours(23, 59, 59, 999);
      }
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [product.flashEndDate, isProductFlashActive]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !shop?.id) return;
      try {
        const followDoc = await getDoc(doc(db, "users", currentUser.uid, "following", shop.id));
        if (followDoc.exists()) {
          setIsFollowing(true);
        }
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    };
    checkFollowStatus();
  }, [currentUser, shop?.id]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!shop?.id || followLoading) return;

    if (isFollowing) {
      setShowConfirm(true);
      return;
    }

    executeFollowToggle();
  };

  const executeFollowToggle = async () => {
    setFollowLoading(true);
    try {
      const followRef = doc(db, "users", currentUser!.uid, "following", shop!.id);
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        toast.success(t("product.details.unfollow_success") || "Désabonnement réussi.");
      } else {
        await setDoc(followRef, {
          sellerId: shop!.id,
          name: shop!.shopName || "Boutique",
          logo: shop!.logoUrl || null,
          location: shop!.wilaya || "Algérie",
          followedAt: new Date().toISOString(),
        });
        setIsFollowing(true);
        toast.success(t("product.details.follow_success") || "Boutique suivie !");
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      toast.error(t("product.details.error_action") || "Erreur lors de l'action.");
    } finally {
      setFollowLoading(false);
      setShowConfirm(false);
    }
  };

  const currentLang = i18n.language || "fr";
  const isRTL = currentLang === "ar";

  const getTranslatedMaterials = () => {
    if (!product.materials || product.materials.length === 0) return null;
    return product.materials
      .map((m) => {
        if (MATERIAL_TRANSLATIONS[m]?.[currentLang]) {
          return MATERIAL_TRANSLATIONS[m][currentLang];
        }
        return m;
      })
      .join(", ");
  };

  const getTranslatedSeason = () => {
    if (!product.season) return null;
    if (SEASON_TRANSLATIONS[product.season]?.[currentLang]) {
      return SEASON_TRANSLATIONS[product.season][currentLang];
    }
    return product.season;
  };

  // Automated translation logic for user uploaded items
  const productName = product.translations?.[currentLang]?.name || product.name;
  const productDescription = product.translations?.[currentLang]?.description || product.description;

  // Extract custom attributes based on category
  const categoryDef = DYNAMIC_CATEGORIES[product.category || ""];
  const detailedAttributes = [];

  if (categoryDef && categoryDef.allowed_filters && product.attributes) {
    categoryDef.allowed_filters.forEach((filter) => {
      const val = product.attributes[filter.id];
      if (val) {
        detailedAttributes.push({
          label: filter.label,
          value: Array.isArray(val) ? val.join(", ") : val,
          unit: filter.unit,
        });
      }
    });
  }

  return (
    <div className="space-y-10" dir={isRTL ? "rtl" : "ltr"}>
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeFollowToggle}
        title={t("product.details.unfollow_confirm_title") || "Se désabonner"}
        message={
          t("product.details.unfollow_confirm_message") || "Voulez-vous vraiment ne plus suivre cette boutique ?"
        }
      />
      {/* HEADER SECTION */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-1.5 bg-[#121315]/10 text-[#121315] border border-[#121315]/20 rounded-full font-bold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal">
            {product.category}
          </span>
          {product.subcategory && (
            <span className="px-4 py-1.5 bg-[#121315]/5 text-[#121315]/80 border border-[#121315]/10 rounded-full font-bold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal">
              {product.subcategory}
            </span>
          )}
          {product.subSubCategory && (
            <span className="px-4 py-1.5 bg-[#121315]/5 text-[#121315]/80 border border-[#121315]/10 rounded-full font-bold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal">
              {product.subSubCategory}
            </span>
          )}
          {product.gender && product.gender !== "mixed" && (
            <span className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full font-medium text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal">
              {product.gender}
            </span>
          )}
          {product.tags &&
            product.tags.length > 0 &&
            product.tags.map((tag: any, idx: number) => (
              <span
                key={`tag-${idx}`}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full font-medium text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal"
              >
                {tag.label || tag}
              </span>
            ))}
          {product.materials && product.materials.length > 0 && (
            <span className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full font-medium text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal">
              {MATERIAL_TRANSLATIONS[product.materials[0]]?.[currentLang] || product.materials[0]}
            </span>
          )}
          {product.brand && (
            <span className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full font-medium text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal">
              {product.brand}
            </span>
          )}
          {product.condition && (
            <span className="px-3 py-1.5 bg-[#F37021]/10 text-[#F37021] border border-[#F37021]/20 rounded-full font-bold text-[10px] rtl:text-[12px] uppercase tracking-wider rtl:tracking-normal">
              {product.condition}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#121315] tracking-tight rtl:tracking-normal leading-[1.1] font-display">
          {productName}
        </h1>

        <div className="flex items-end gap-4 pt-2">
          <div className="text-4xl sm:text-5xl font-black text-[#F37021] tracking-tighter rtl:tracking-normal">
            {formatPrice(currentPrice)}
          </div>
          {isProductFlashActive ? (
            <div className="text-xl sm:text-2xl font-semibold text-stone-500/80 line-through mb-1.5">
              {formatPrice(product.price)}
            </div>
          ) : (
            product.onSale && (
              <div className="text-xl sm:text-2xl font-semibold text-stone-500/80 line-through mb-1.5">
                {formatPrice(currentPrice * 1.2)}
              </div>
            )
          )}
        </div>
      </div>

      {isProductFlashActive && (
        <div className="border-2 border-orange-500/30 bg-gradient-to-br from-[#FFFBF9] via-[#FAF3EC] to-[#FFF9F5] p-5 rounded-2xl shadow-[0_12px_30px_rgba(243,112,33,0.08)] mb-6 relative overflow-hidden">
          {/* Flame warning banner */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-[#F37021] to-yellow-500" />

          <div className="flex flex-col gap-4 relative z-10">
            {/* Header badges and title */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider animate-bounce">
                  <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                  {t("VENTE FLASH EXCLUSIVE")}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F37021]/15 text-[#F37021] text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                  {t("STOCK ULTRA-LIMITÉ")}
                </span>
              </div>
              <div className="text-[11px] font-mono font-black text-red-600 uppercase tracking-widest">
                -{Math.round(((product.price - currentPrice) / product.price) * 100)}% {t("SÉLECTION")}
              </div>
            </div>

            {/* Warning Message */}
            <p className="text-xs sm:text-sm font-medium text-stone-600 leading-relaxed">
              {currentLang === "ar"
                ? "⚠️ انتبه! هذا معروض بسعر تخفيض لاهب ولفترة محدودة للغاية. بمجرد انتهاء العداد، سيعود هذا المنتج تلقائيًا وبشكل فوري إلى سعره الأصلي ولن تتمكن من الاستفادة من هذا السعر مجددًا."
                : "⚠️ Attention ! Ce produit d'exception bénéficie d'un tarif Flash ultra-limité. Dès que le compte à rebours s'achève, cet article repassera automatiquement à son tarif d'origine sans aucun préavis."}
            </p>

            {/* Countdown grid & scarcity metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white/50 p-4 rounded-xl border border-orange-200/30">
              {/* Chrono */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono font-black text-stone-500 uppercase tracking-wider">
                  {t("L'OFFRE EXPIRE DANS :")}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="bg-[#121315] text-white font-mono font-black text-base px-2 py-0.5 rounded shadow">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </div>
                  <span className="text-red-500 font-black animate-pulse">:</span>
                  <div className="bg-[#121315] text-white font-mono font-black text-base px-2 py-0.5 rounded shadow">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </div>
                  <span className="text-red-500 font-black animate-pulse">:</span>
                  <div className="bg-red-600 text-white font-mono font-black text-base px-2 py-0.5 rounded shadow animate-pulse">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                </div>
              </div>

              {/* simulated metric */}
              <div className="flex flex-col gap-1.5 border-t sm:border-t-0 sm:border-l border-orange-200/40 pt-3 sm:pt-0 sm:pl-4">
                <div className="flex justify-between text-[11px] font-black text-[#121315]">
                  <span className="text-red-600 animate-pulse flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current inline animate-pulse" />
                    {currentLang === "ar" ? "بقي منتجات قليلة جداً!" : "Derniers articles en stock !"}
                  </span>
                  <span className="opacity-80 text-stone-500">
                    92% {currentLang === "ar" ? "محجوز" : "déjà réservé"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-[#F37021] rounded-full"
                    style={{ width: "92%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELLER PROMINENCE */}
      {shop && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#121315]/5 flex items-center justify-center overflow-hidden border border-stone-100">
              {shop.logoUrl ? (
                <img loading="lazy" src={shop.logoUrl} alt={shop.shopName} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-6 h-6 text-[#121315]" />
              )}
            </div>
            <div>
              <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal mb-0.5">
                {t("product.details.sold_by") || "Vendu par"}
              </p>
              <Link
                to={`/shop/${shop.id}`}
                className="text-sm font-black text-[#121315] hover:text-[#F37021] transition-colors line-clamp-1"
              >
                {shop.shopName}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs rtl:text-sm transition-all ${
                isFollowing
                  ? "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-red-500"
                  : "bg-[#121315] text-white hover:bg-[#1f150f] shadow-md shadow-[#121315]/10"
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  {t("product.details.following") || "Abonné"}
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  {t("product.details.follow") || "Suivre"}
                </>
              )}
            </button>
            <Link
              to={`/shop/${shop.id}`}
              className="flex-1 sm:flex-none text-center px-4 py-2.5 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl text-xs rtl:text-sm font-bold transition-colors"
            >
              {t("product.details.view_shop") || "Voir la boutique"}
            </Link>
          </div>
        </div>
      )}

      {/* DESCRIPTION */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-stone-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#F37021]/10 flex items-center justify-center">
            <Info className="w-4 h-4 text-[#F37021]" />
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#121315]">
            {t("product.details.seller_word") || "Le mot du créateur"}
          </h3>
        </div>
        <p className="text-stone-600 leading-relaxed font-medium text-sm sm:text-base whitespace-pre-wrap">
          {productDescription}
        </p>
      </div>

      {/* VARIANTS (COLOR/SIZE) */}
      {(product.colors?.length > 0 || product.sizes?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-8 p-6 bg-white rounded-3xl border border-stone-200 shadow-sm">
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[10px] rtl:text-[12px] font-bold uppercase tracking-wider rtl:tracking-normal text-stone-500 ms-1">
                {t("product.details.nuances") || "Nuances Disponibles"}
              </h4>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((c: string) => {
                  const matchingColor = PRODUCT_COLORS.find(
                    (pc) => pc.name.toLowerCase().trim() === c.toLowerCase().trim()
                  );
                  const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(c);
                  const isRgb = /^rgb/i.test(c);
                  const hasValidColorValue = matchingColor || isHex || isRgb;
                  const colorHex = matchingColor ? matchingColor.hex : isHex || isRgb ? c : "#FFFFFF";
                  const isWhiteOrLight =
                    colorHex.toLowerCase() === "#ffffff" ||
                    colorHex.toLowerCase() === "#fde68a" ||
                    colorHex.toLowerCase() === "#facc15";

                  if (hasValidColorValue) {
                    return (
                      <button
                        key={c}
                        disabled={isColorOutOfStock(c) && selectedColor !== c}
                        onClick={() => onSelectColor(c)}
                        title={c}
                        className={`w-12 h-12 rounded-full border-[3px] transition-all flex items-center justify-center ${selectedColor === c ? "border-[#F37021] scale-110 shadow-lg shadow-[#F37021]/20" : "border-stone-100 hover:border-stone-300"} ${isColorOutOfStock(c) ? "opacity-30 cursor-not-allowed relative overflow-hidden" : ""}`}
                        style={{ background: colorHex }}
                      >
                        {selectedColor === c && (
                          <Check className={`w-5 h-5 ${isWhiteOrLight ? "text-slate-900" : "text-white"}`} />
                        )}
                        {isColorOutOfStock(c) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-red-500 rotate-45"></div>
                          </div>
                        )}
                      </button>
                    );
                  } else {
                    // Render text pill if it's a custom text color like "Bleu foncé"
                    return (
                      <button
                        key={c}
                        disabled={isColorOutOfStock(c) && selectedColor !== c}
                        onClick={() => onSelectColor(c)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal transition-all ${selectedColor === c ? "bg-[#121315] text-white shadow-md shadow-[#121315]/20 border border-[#121315]" : "bg-white text-stone-600 border border-stone-200 hover:border-[#121315]"} ${isColorOutOfStock(c) ? "opacity-30 cursor-not-allowed relative overflow-hidden" : ""}`}
                      >
                        {c}
                        {isColorOutOfStock(c) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1.5px] bg-red-500 rotate-45"></div>
                          </div>
                        )}
                      </button>
                    );
                  }
                })}
              </div>
            </div>
          )}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] rtl:text-[12px] font-bold uppercase tracking-wider rtl:tracking-normal text-stone-500 ms-1">
                  {t("product.details.sizes") || "Tailles / Dimensions"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {t("product.details.size_guide") || "📐 Guide des correspondances"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s: string) => (
                  <button
                    key={s}
                    disabled={isSizeOutOfStock(s) && selectedSize !== s}
                    onClick={() => onSelectSize(s)}
                    className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal transition-all ${selectedSize === s ? "bg-[#121315] text-white shadow-lg shadow-[#121315]/20" : "bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100"} ${isSizeOutOfStock(s) ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC ATTRIBUTES BENTO GRID */}
      {detailedAttributes.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider rtl:tracking-normal text-stone-500 ms-1">
            <Tag className="w-3.5 h-3.5" /> {t("product.details.caract") || "Caractéristiques du produit"}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {detailedAttributes.map((attr, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-stone-200">
                <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal mb-1 line-clamp-1">
                  {attr.label}
                </p>
                <p className="text-sm font-black text-[#121315] line-clamp-2">
                  {attr.value} {attr.unit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FICHE TECHNIQUE & ENGAGEMENTS DE LA MAISON */}
      {(product.sku ||
        (product.materials && product.materials.length > 0) ||
        product.season ||
        product.weight ||
        product.dimensions ||
        shop?.avgPreparationTime ||
        shop?.returnPolicy) && (
        <div className="space-y-4 pt-4">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider rtl:tracking-normal text-stone-500 ms-1">
            <FileText className="w-3.5 h-3.5" />{" "}
            {t("product.details.fiche_technique") || "Fiche Technique & Garanties OLMART"}
          </h4>
          <div className="bg-white/40 backdrop-blur-md border border-stone-200/60 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-start">
              {product.sku && (
                <div className="space-y-1">
                  <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#121315]" /> {t("product.details.sku") || "Référence SKU"}
                  </p>
                  <p className="text-xs rtl:text-sm font-black text-[#121315] font-mono select-all bg-stone-50/80 px-2 py-1 rounded w-max">
                    {product.sku}
                  </p>
                </div>
              )}
              {product.season && (
                <div className="space-y-1">
                  <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-[#121315]" />{" "}
                    {t("product.details.collection") || "Collection / Saison"}
                  </p>
                  <p className="text-xs rtl:text-sm font-extrabold text-[#121315]">{getTranslatedSeason()}</p>
                </div>
              )}
              {product.materials && product.materials.length > 0 && (
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#121315]" />{" "}
                    {t("product.details.materials") || "Composition & Matière"}
                  </p>
                  <p className="text-xs rtl:text-sm font-extrabold text-[#121315] truncate">
                    {getTranslatedMaterials()}
                    {product.otherMaterial ? ` (${product.otherMaterial})` : ""}
                  </p>
                </div>
              )}
              {(product.dimensions || product.weight) && (
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-[#121315]" />{" "}
                    {t("product.details.logistics") || "Logistique & Dimensions"}
                  </p>
                  <p className="text-xs rtl:text-sm font-extrabold text-[#121315]">
                    {product.weight ? `${t("product.details.weight") || "Poids"}: ${product.weight} kg` : ""}
                    {product.weight && product.dimensions ? " | " : ""}
                    {product.dimensions ? `${t("product.details.format") || "Format"}: ${product.dimensions}` : ""}
                  </p>
                </div>
              )}
            </div>

            {(product.warranty ||
              shop?.legalStatus ||
              product.preparationTime ||
              shop?.avgPreparationTime ||
              product.returnPolicy ||
              shop?.returnPolicy) && (
              <div className="border-t border-stone-200/50 pt-4 space-y-3 text-start">
                {product.warranty && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">
                        {t("Garantie & Support")}
                      </p>
                      <p className="text-xs rtl:text-sm font-extrabold text-[#121315]">{product.warranty}</p>
                    </div>
                  </div>
                )}
                {shop?.legalStatus && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-zinc-100 flex items-center justify-center mt-0.5">
                      <Store className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">
                        {t("product.details.vendor_status") || "Statut Légal"}
                      </p>
                      <p className="text-xs rtl:text-sm font-extrabold text-[#121315]">{shop.legalStatus}</p>
                    </div>
                  </div>
                )}
                {(product.preparationTime || shop?.avgPreparationTime) && (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 shrink-0 rounded-full bg-[#F37021]/5 flex items-center justify-center mt-0.5">
                      <Truck className="w-3.5 h-3.5 text-[#F37021]" />
                    </div>
                    <div>
                      <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">
                        {t("product.details.prep_time") || "Délai Moyen de Préparation"}
                      </p>
                      <p className="text-xs rtl:text-sm font-extrabold text-[#121315]">
                        {t("product.details.prep_text", {
                          days: product.preparationTime || shop?.avgPreparationTime,
                        }) || "Prêt pour expédition"}
                      </p>
                      {product.wilaya && (
                        <p className="text-[10px] rtl:text-[12px] font-medium text-stone-500 mt-0.5">
                          {t("product.details.shipped_from") || "Expédié depuis :"}{" "}
                          <span className="font-bold">{product.wilaya}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 shrink-0 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
                    <Undo2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">
                      {t("product.details.return_policy") || "Politique de Retour & Échange"}
                    </p>
                    <p className="text-xs rtl:text-sm font-extrabold text-[#121315] italic">
                      {product.returnPolicy
                        ? t("product.details.return_14j") || "Retours acceptés sous 14 jours (Politique du produit)"
                        : shop?.returnPolicy ||
                          t("product.details.return_default") ||
                          "Voir les conditions au niveau du vendeur"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHIPPING INFOS */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-4 p-5 bg-white border border-stone-200 rounded-2xl">
          <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#121315] mb-1">
              {t("product.details.national_shipping") || "Livraison Nationale"}
            </h4>
            <p className="text-xs rtl:text-sm font-medium text-stone-500">
              {t("product.details.national_shipping_desc") || "Expédition disponible sur les 58 Wilayas d'Algérie."}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-5 bg-white border border-stone-200 rounded-2xl">
          <div className="w-10 h-10 shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#121315] mb-1">
              {t("product.details.secure_purchase") || "Achat Sécurisé"}
            </h4>
            <p className="text-xs rtl:text-sm font-medium text-stone-500">
              {t("product.details.secure_purchase_desc") || "Plateforme de confiance. Protection de l'acheteur."}
            </p>
          </div>
        </div>
      </div>

      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full p-8 md:p-10 border border-zinc-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 font-bold p-2 text-sm cursor-pointer"
            >
              {t("common.close") || "✕ Fermer"}
            </button>
            <h3 className="text-2xl font-black text-[#121315] tracking-tight rtl:tracking-normal mb-4">
              {t("product.details.size_guide_title") || "📐 Guide des Correspondances de Tailles"}
            </h3>
            <p className="text-xs rtl:text-sm text-stone-500 mb-6 leading-relaxed">
              {t("product.details.size_guide_desc") ||
                "En Algérie, les articles d'importation (Chine vs. Turquie/EUR) ou de fabrication locale ont des coupes différentes. Référez-vous à ce tableau pour éviter les erreurs de taille :"}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-stone-100 mb-6">
              <table className="w-full text-left border-collapse text-xs rtl:text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-150 font-black text-[#121315]">
                    <th className="p-3">{t("Taille EUR/Turquie")}</th>
                    <th className="p-3">{t("Équivalence Chine")}</th>
                    <th className="p-3">{t("Coupe Algérie")}</th>
                    <th className="p-3">{t("Recommandation Olma")}</th>
                  </tr>
                </thead>
                <tbody className="font-medium text-stone-600">
                  <tr className="border-b border-stone-100">
                    <td className="p-3 font-bold text-stone-900">{t("size_s_36", "S (36)")}</td>
                    <td className="p-3">{t("M (Chinois)")}</td>
                    <td className="p-3">{t("Ajusté")}</td>
                    <td className="p-3 text-orange-600 font-bold">{t("Prendre M si étiquette Chine")}</td>
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="p-3 font-bold text-stone-900">{t("size_m_38", "M (38)")}</td>
                    <td className="p-3">{t("L (Chinois)")}</td>
                    <td className="p-3">{t("Standard")}</td>
                    <td className="p-3 text-orange-600 font-bold">{t("Prendre L si étiquette Chine")}</td>
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="p-3 font-bold text-stone-900">{t("size_l_40", "L (40)")}</td>
                    <td className="p-3">{t("XL (Chinois)")}</td>
                    <td className="p-3">{t("Standard")}</td>
                    <td className="p-3 text-orange-600 font-bold">{t("Prendre XL si étiquette Chine")}</td>
                  </tr>
                  <tr className="border-b border-stone-100">
                    <td className="p-3 font-bold text-stone-900">{t("XL (42)")}</td>
                    <td className="p-3">{t("XXL (Chinois)")}</td>
                    <td className="p-3">{t("Ample")}</td>
                    <td className="p-3 text-orange-600 font-bold">{t("Prendre XXL si étiquette Chine")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl text-[11px] text-[#121315] leading-relaxed font-semibold">
              💡 <strong>{t("product.details.size_guide_tip_title") || "Astuce :"}</strong>{" "}
              {t("product.details.size_guide_tip_content") ||
                "Le standard Turquie correspond parfaitement aux tailles européennes classiques. Pour la Chine, commandez systématiquement une taille au-dessus."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
