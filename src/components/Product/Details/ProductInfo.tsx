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
import { motion, AnimatePresence } from "motion/react";
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

  const [openAccordion, setOpenAccordion] = useState<string | null>("description");
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

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
        {product.condition && (
          <div className="flex flex-wrap items-center gap-2">
             <span className="text-[10px] rtl:text-[12px] uppercase tracking-widest text-black/60 font-medium">
              {product.condition}
            </span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-sans text-black uppercase tracking-wide leading-tight break-words">
          {productName}
        </h1>

        <div className="flex items-end gap-3 pt-1">
           <div className="text-2xl sm:text-3xl font-sans font-medium text-black">
            {formatPrice(currentPrice)}
          </div>
          {isProductFlashActive ? (
             <div className="text-lg sm:text-xl text-black/40 line-through mb-1 font-sans">
              {formatPrice(product.price)}
            </div>
          ) : (
            product.onSale && (
               <div className="text-lg sm:text-xl text-black/40 line-through mb-1 font-sans">
                {formatPrice(currentPrice * 1.2)}
              </div>
            )
          )}
        </div>
      </div>

      {isProductFlashActive && (
         <div className="border border-black/10 p-4 sm:p-5 mb-6 relative">
          <div className="flex flex-col gap-4 relative z-10">
            {/* Header badges and title */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
              <div className="flex items-center gap-2">
                 <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest text-black">
                  {t("VENTE FLASH EXCLUSIVE")}
                </span>
                 <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest text-red-600">
                  {t("STOCK LIMITÉ")}
                </span>
              </div>
               <div className="text-[11px] font-sans font-medium tracking-tight text-black uppercase">
                -{Math.round(((product.price - currentPrice) / product.price) * 100)}%
              </div>
            </div>

            {/* Warning Message */}
             <p className="text-xs text-black/60 leading-relaxed font-sans">
              {currentLang === "ar"
                ? "⚠️ انتبه! هذا معروض بسعر تخفيض لاهب ولفترة محدودة للغاية."
                : "⚠️ Offre à durée limitée. Le prix d'origine sera rétabli à la fin du compte à rebours."}
            </p>

            {/* Countdown grid & scarcity metrics */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Chrono */}
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-medium text-black/40 uppercase tracking-widest">
                  {t("EXPIRE DANS")}
                </span>
                <div className="flex items-center gap-1 font-sans font-medium text-lg">
                   <div className="text-black">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </div>
                   <span className="text-black/40">:</span>
                  <div className="text-black">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </div>
                  <span className="text-black/40">:</span>
                  <div className="text-black">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                </div>
              </div>

              {/* simulated metric */}
              <div className="flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-black/10 pt-3 sm:pt-0 sm:pl-4">
                <div className="flex justify-between text-[10px] font-medium uppercase tracking-widest text-black/60">
                  <span>{currentLang === "ar" ? "محجوز" : "Réservé"}</span>
                  <span>92%</span>
                </div>
                <div className="w-full h-[2px] bg-black/5 overflow-hidden">
                  <div
                    className="h-full bg-black"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-y border-black/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden border border-black/10">
              {shop.logoUrl ? (
                <img loading="lazy" src={shop.logoUrl} alt={shop.shopName} className="w-full h-full object-cover mix-blend-multiply" />
              ) : (
                <Store className="w-5 h-5 text-black" />
              )}
            </div>
            <div>
              <p className="text-[10px] rtl:text-[12px] font-medium text-black/40 uppercase tracking-widest rtl:tracking-normal mb-0.5">
                {t("product.details.sold_by") || "Vendu par"}
              </p>
              <Link
                to={`/shop/${shop.id}`}
                className="text-sm font-sans font-medium text-black hover:underline transition-all line-clamp-1"
              >
                {shop.shopName}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 font-medium text-[11px] uppercase tracking-widest transition-all border ${
                isFollowing
                  ? "bg-white text-black border-black/20"
                  : "bg-black text-white border-black hover:bg-white hover:text-black"
              }`}
            >
              {isFollowing ? (
                <>
                  {t("product.details.following") || "Abonné"}
                </>
              ) : (
                <>
                  {t("product.details.follow") || "Suivre"}
                </>
              )}
            </button>
            <Link
              to={`/shop/${shop.id}`}
              className="flex-1 sm:flex-none text-center px-4 py-2 bg-white text-black border border-black/20 text-[11px] font-medium uppercase tracking-widest transition-colors hover:border-black"
            >
              {t("product.details.view_shop") || "Boutique"}
            </Link>
          </div>
        </div>
      )}

      {/* VARIANTS (COLOR/SIZE) */}
      {(product.colors?.length > 0 || product.sizes?.length > 0) && (
        <div className="space-y-6 py-4">
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] rtl:text-[12px] font-medium uppercase tracking-widest text-black/60">
                {t("product.details.nuances") || "Couleurs"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c: string) => {
                  const matchingColor = PRODUCT_COLORS.find(
                    (pc) => pc.name.toLowerCase().trim() === c.toLowerCase().trim()
                  );
                  const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(c);
                  const isRgb = /^rgb/i.test(c);
                  const colorHex = matchingColor ? matchingColor.hex : isHex || isRgb ? c : "#FFFFFF";
                  const isWhiteOrLight =
                    colorHex.toLowerCase() === "#ffffff" ||
                    colorHex.toLowerCase() === "#fde68a" ||
                    colorHex.toLowerCase() === "#facc15";

                  return (
                    <button
                      key={c}
                      disabled={isColorOutOfStock(c) && selectedColor !== c}
                      onClick={() => onSelectColor(c)}
                      className={`flex items-center justify-center p-0.5 border transition-all ${
                        selectedColor === c 
                          ? "border-black" 
                          : "border-transparent hover:border-black/30"
                      } ${isColorOutOfStock(c) ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      <div 
                        className="w-8 h-8 border border-black/10 flex items-center justify-center relative"
                        style={{ background: colorHex }}
                      >
                        {selectedColor === c && (
                          <Check className={`w-3.5 h-3.5 ${isWhiteOrLight ? "text-black" : "text-white"}`} />
                        )}
                        {isColorOutOfStock(c) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-[1px] bg-black rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-black/10">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] rtl:text-[12px] font-medium uppercase tracking-widest text-black/60">
                  {t("product.details.sizes") || "Tailles"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-[10px] rtl:text-[12px] font-medium uppercase tracking-widest text-black hover:underline transition-all cursor-pointer"
                >
                  {t("product.details.size_guide") || "Guide des tailles"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s: string) => (
                  <button
                    key={s}
                    disabled={isSizeOutOfStock(s) && selectedSize !== s}
                    onClick={() => onSelectSize(s)}
                    className={`px-6 py-2.5 font-sans font-medium text-[11px] uppercase tracking-widest rtl:tracking-normal transition-all border ${
                      selectedSize === s 
                        ? "bg-black text-white border-black" 
                        : "bg-white border-black/20 text-black hover:border-black"
                    } ${isSizeOutOfStock(s) ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACCORDIONS (DESCRIPTION/FIT, COMPOSITION/CARE, DELIVERY/RETURNS) */}
      <div className="space-y-0 border-t border-b border-black/10 py-0">
        {/* Accordion 1: Description / taillant */}
        <div className="border-b border-black/10">
          <button
            onClick={() => toggleAccordion("description")}
            className="w-full flex items-center justify-between py-4 text-start font-sans font-medium text-[11px] uppercase tracking-widest text-black"
          >
            <span>
              {t("Description / taillant")}
            </span>
            <span className="text-black/40 font-light text-lg transition-transform duration-200">
              {openAccordion === "description" ? "−" : "+"}
            </span>
          </button>
          
          <AnimatePresence initial={false}>
            {openAccordion === "description" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-5 px-1 space-y-4">
                  <p className="text-black/80 text-sm whitespace-pre-wrap leading-relaxed font-sans font-light">
                    {productDescription}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-black/10">
                    <span className="text-[10px] font-medium text-black/60 uppercase tracking-widest">
                      {t("Coupe standard / Regular Fit")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="text-[10px] font-medium text-black hover:underline uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      {t("Guide des tailles")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 2: Composition / entretien */}
        <div className="border-b border-black/10">
          <button
            onClick={() => toggleAccordion("composition")}
            className="w-full flex items-center justify-between py-4 text-start font-sans font-medium text-[11px] uppercase tracking-widest text-black"
          >
            <span>
              {t("Composition / entretien")}
            </span>
            <span className="text-black/40 font-light text-lg transition-transform duration-200">
              {openAccordion === "composition" ? "−" : "+"}
            </span>
          </button>
          
          <AnimatePresence initial={false}>
            {openAccordion === "composition" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-5 px-1 space-y-3 text-sm text-black/80 font-light font-sans">
                  {product.sku && (
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-black/40 font-medium text-[10px] uppercase tracking-widest">{t("Référence / SKU")}</span>
                      <span className="font-mono text-xs text-black select-all">{product.sku}</span>
                    </div>
                  )}
                  {product.materials && product.materials.length > 0 && (
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-black/40 font-medium text-[10px] uppercase tracking-widest">{t("Matière principale")}</span>
                      <span className="text-black">
                        {getTranslatedMaterials()}
                        {product.otherMaterial ? ` (${product.otherMaterial})` : ""}
                      </span>
                    </div>
                  )}
                  {(product.weight || product.dimensions) && (
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-black/40 font-medium text-[10px] uppercase tracking-widest">{t("Dimensions & Poids")}</span>
                      <span className="text-black">
                        {product.weight ? `${product.weight} kg` : ""}
                        {product.weight && product.dimensions ? " | " : ""}
                        {product.dimensions ? `${product.dimensions}` : ""}
                      </span>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex justify-between border-b border-black/5 pb-2">
                      <span className="text-black/40 font-medium text-[10px] uppercase tracking-widest">{t("Marque")}</span>
                      <span className="text-black">{product.brand}</span>
                    </div>
                  )}
                  <div className="pt-2 text-xs font-light leading-relaxed text-black/60 italic">
                    {t("Conseil d'entretien : Laver sur l'envers à 30°C avec des coloris similaires. Repassage doux recommandé.")}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 3: Livraison / retour */}
        <div className="border-b-0">
          <button
            onClick={() => toggleAccordion("shipping")}
            className="w-full flex items-center justify-between py-4 text-start font-sans font-medium text-[11px] uppercase tracking-widest text-black"
          >
            <span>
              {t("Livraison / retour")}
            </span>
            <span className="text-black/40 font-light text-lg transition-transform duration-200">
              {openAccordion === "shipping" ? "−" : "+"}
            </span>
          </button>
          
          <AnimatePresence initial={false}>
            {openAccordion === "shipping" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-5 px-1 space-y-4 text-sm text-black/80 font-light font-sans">
                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center text-black font-medium text-[10px] shrink-0 mt-0.5">✓</div>
                    <div>
                      <p className="font-medium text-black">{t("Livraison sur les 58 Wilayas d'Algérie")}</p>
                      <p className="text-xs text-black/60">{t("Paiement sécurisé en espèces à la livraison.")}</p>
                    </div>
                  </div>
                  {(product.preparationTime || shop?.avgPreparationTime) && (
                    <div className="flex gap-3 items-start border-t border-black/5 pt-3">
                      <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center text-black font-medium text-[10px] shrink-0 mt-0.5">⏱</div>
                      <div>
                        <p className="font-medium text-black">{t("Délai de préparation du vendeur")}</p>
                        <p className="text-xs text-black/60">
                          {t("Prêt pour expédition en")} {product.preparationTime || shop?.avgPreparationTime || "24-48h"}.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 items-start border-t border-black/5 pt-3">
                    <div className="w-5 h-5 rounded-full border border-black/20 flex items-center justify-center text-black font-medium text-[10px] shrink-0 mt-0.5">↺</div>
                    <div>
                      <p className="font-medium text-black">{t("Politique d'échange et retour d'Olmart")}</p>
                      <p className="text-xs text-black/60">
                        {product.returnPolicy
                          ? t("Retours acceptés sous 14 jours si le produit est dans son emballage d'origine.")
                          : t("Les retours et échanges dépendent des conditions générales du vendeur.")}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-10 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-6 right-6 text-stone-400 hover:text-slate-800 font-bold p-2 text-sm cursor-pointer transition-colors"
            >
              {t("common.close") || "✕ Fermer"}
            </button>
            <h3 className="text-2xl font-sans font-bold tracking-tight text-slate-800 tracking-tight rtl:tracking-normal mb-4">
              {t("product.details.size_guide_title") || "📐 Guide des Correspondances de Tailles"}
            </h3>
            <p className="text-xs rtl:text-sm text-stone-500 mb-6 leading-relaxed">
              {t("product.details.size_guide_desc") ||
                "En Algérie, les articles d'importation (Chine vs. Turquie/EUR) ou de fabrication locale ont des coupes différentes. Référez-vous à ce tableau pour éviter les erreurs de taille :"}
            </p>
            <div className="overflow-x-auto rounded-3xl border border-stone-100 mb-6">
              <table className="w-full text-left border-collapse text-xs rtl:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-stone-150 font-sans font-bold tracking-tight text-slate-800">
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
            <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl text-[11px] text-slate-800 leading-relaxed font-semibold">
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
