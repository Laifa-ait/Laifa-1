import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ShieldCheck,
  XCircle,
  Package,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  MessageSquareX,
  Edit2,
  Save,
  Smartphone,
  Sparkles,
  CheckSquare,
  AlertTriangle,
  Eye,
  Loader2,
  ArrowRight,
  RefreshCw,
  Layers,
  Copy,
  Trash2,
  Heart,
  MessageCircle,
  ShoppingBag,
  Send,
  X,
  Check,
  Info,
  ChevronLeft,
  Truck
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useShop } from "../../context/ShopContext";
import { PRODUCT_HIERARCHY } from "../../constants";
import { CurationQualityScore } from "../../components/Admin/Curation/CurationQualityScore";
import { CurationDuplicatePanel } from "../../components/Admin/Curation/CurationDuplicatePanel";
import { CurationMobilePreview } from "../../components/Admin/Curation/CurationMobilePreview";

export const Curation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { categoryHierarchy: shopHierarchy } = useShop();

  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");

  // Core pending products list
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Workspace focus state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Related products for duplicate detection
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  // Editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Rejection UI state
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Manual compliance override overrides
  const [complianceOverrides, setComplianceOverrides] = useState<Record<string, Record<string, boolean>>>({});

  // Load actual categories hierarchy
  const hierarchy = useMemo(() => {
    return Object.keys(shopHierarchy || {}).length > 0 ? shopHierarchy : PRODUCT_HIERARCHY;
  }, [shopHierarchy]);

  // Fetch pending products
  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "products"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      
      // If a product was already selected, update it or clear if no longer pending
      if (selectedProduct) {
        const stillPending = data.find((p) => p.id === selectedProduct.id);
        if (stillPending) {
          setSelectedProduct(stillPending);
        } else {
          setSelectedProduct(data[0] || null);
        }
      } else if (data.length > 0) {
        setSelectedProduct(data[0]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "products");
      toast.error(t("Erreur de chargement des produits"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  // Fetch related active products in the same category for duplicate check
  useEffect(() => {
    const fetchRelated = async () => {
      if (!selectedProduct?.category) {
        setRelatedProducts([]);
        return;
      }
      try {
        const q = query(
          collection(db, "products"),
          where("category", "==", selectedProduct.category),
          where("status", "==", "active")
        );
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRelatedProducts(list);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "products");
      }
    };
    fetchRelated();
    setIsEditMode(false);
    setEditForm(null);
    setIsRejecting(false);
    setRejectionReason("");
  }, [selectedProduct?.id]);

  // Initialize edit form
  useEffect(() => {
    if (selectedProduct) {
      setEditForm({
        name: selectedProduct.name || "",
        description: selectedProduct.description || "",
        price: selectedProduct.price || 0,
        promoPrice: selectedProduct.promoPrice || "",
        stock: selectedProduct.stock || 0,
        category: selectedProduct.category || "",
        subcategory: selectedProduct.subcategory || "",
        image: selectedProduct.image || "",
        images: selectedProduct.images || [],
        freeShipping: selectedProduct.freeShipping || false,
        wilaya: selectedProduct.wilaya || "Alger",
      });
    }
  }, [selectedProduct, isEditMode]);

  // Real-time quality score calculation
  const calculatedScore = useMemo(() => {
    const target = isEditMode && editForm ? editForm : selectedProduct;
    if (!target) return 0;

    let score = 0;

    // 1. Title Quality (15 pts)
    const nameLen = (target.name || "").trim().length;
    if (nameLen >= 15 && nameLen <= 85) score += 15;
    else if (nameLen > 0) score += 5;

    // 2. Description Quality (25 pts)
    const descLen = (target.description || "").trim().length;
    if (descLen >= 150) score += 25;
    else if (descLen >= 50) score += 15;
    else if (descLen >= 10) score += 5;

    // 3. Images richness (25 pts)
    const imagesCount = target.images?.length || (target.image ? 1 : 0);
    if (imagesCount >= 3) score += 25;
    else if (imagesCount === 2) score += 15;
    else if (imagesCount === 1) score += 10;

    // 4. Price consistency (15 pts)
    const price = Number(target.price || 0);
    if (price > 0 && price < 1000000) {
      score += 10;
      if (target.promoPrice) {
        const promo = Number(target.promoPrice);
        if (promo > 0 && promo < price) score += 5;
      } else {
        score += 5;
      }
    }

    // 5. Stock Level (10 pts)
    const stock = Number(target.stock || 0);
    if (stock >= 5) score += 10;
    else if (stock > 0) score += 5;

    // 6. Subcategory details (10 pts)
    if (target.subcategory && target.subcategory.trim() !== "") {
      score += 10;
    }

    // Deduct 20 pts if admin manual compliance overrides says photos are low quality
    const manualOverrides = complianceOverrides[target.id || ""] || {};
    if (manualOverrides["photos"] === false) {
      score = Math.max(0, score - 20);
    }
    if (manualOverrides["description"] === false) {
      score = Math.max(0, score - 15);
    }
    if (manualOverrides["pricing"] === false) {
      score = Math.max(0, score - 15);
    }

    return score;
  }, [selectedProduct, editForm, isEditMode, complianceOverrides]);

  // Pre-calculated checklist state
  const checklist = useMemo(() => {
    const target = isEditMode && editForm ? editForm : selectedProduct;
    if (!target) return [];

    const manualOverrides = complianceOverrides[target.id || ""] || {};

    const photosCount = target.images?.length || (target.image ? 1 : 0);
    const hasPhotosOk = manualOverrides["photos"] !== undefined 
      ? manualOverrides["photos"] 
      : (photosCount >= 2);

    const descLen = (target.description || "").trim().length;
    const hasDescOk = manualOverrides["description"] !== undefined 
      ? manualOverrides["description"] 
      : (descLen >= 50);

    const price = Number(target.price || 0);
    const promo = Number(target.promoPrice || 0);
    const hasPriceOk = manualOverrides["pricing"] !== undefined 
      ? manualOverrides["pricing"] 
      : (price > 100 && (!target.promoPrice || promo < price));

    const hasCategoryOk = target.category && target.subcategory;
    const hasStockOk = Number(target.stock || 0) >= 1;

    return [
      {
        key: "photos",
        title: t("Photos de haute qualité"),
        desc: t("Minimum 2 photos requises pour une fiche Premium"),
        status: hasPhotosOk,
      },
      {
        key: "description",
        title: t("Description enrichie"),
        desc: t("Au moins 50 caractères décrivant l'identité créative"),
        status: hasDescOk,
      },
      {
        key: "pricing",
        title: t("Tarification cohérente"),
        desc: t("Prix réaliste et prix promo inférieur au prix standard"),
        status: hasPriceOk,
      },
      {
        key: "category",
        title: t("Sous-catégorisation exacte"),
        desc: t("Association à une catégorie et une sous-catégorie"),
        status: !!hasCategoryOk,
      },
      {
        key: "stock",
        title: t("Stock disponible réel"),
        desc: t("Quantité disponible supérieure ou égale à 1 unité"),
        status: hasStockOk,
      },
    ];
  }, [selectedProduct, editForm, isEditMode, complianceOverrides, t]);

  // Search filter
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.sellerName || "").toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Handle manual compliance checkbox override
  const handleToggleCompliance = (key: string) => {
    if (!selectedProduct) return;
    const currentOverride = complianceOverrides[selectedProduct.id] || {};
    const previousValue = checklist.find((item) => item.key === key)?.status;

    setComplianceOverrides((prev) => ({
      ...prev,
      [selectedProduct.id]: {
        ...currentOverride,
        [key]: !previousValue,
      },
    }));
  };

  // 1. APPROVE with email + push notifications
  const handleApprove = async (productToApprove: any) => {
    if (isActionInProgress) return;
    setIsActionInProgress(true);
    const toastId = toast.loading(t("Approbation en cours..."));

    try {
      // 1. Update product in Firestore
      const pRef = doc(db, "products", productToApprove.id);
      try {
        await updateDoc(pRef, {
          status: "active",
          qualityScore: calculatedScore,
          approvedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${productToApprove.id}`);
        throw err;
      }

      // 2. Fetch Seller Profile from users collection to obtain real email/name
      let sellerEmail = "";
      let sellerDisplayName = productToApprove.sellerName || t("Partenaire");
      try {
        const sellerSnap = await getDoc(doc(db, "users", productToApprove.sellerId));
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          sellerEmail = sellerData.email || "";
          sellerDisplayName = sellerData.displayName || sellerData.shopName || sellerDisplayName;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${productToApprove.sellerId}`);
      }

      // 3. Send real push-notification record to user_notifications
      try {
        await addDoc(collection(db, "user_notifications"), {
          recipientId: productToApprove.sellerId,
          type: "PRODUCT_APPROVED",
          title: isArabic
            ? `🎉 تم قبول منتجك: ${productToApprove.name}`
            : `🎉 Votre produit "${productToApprove.name}" est en ligne !`,
          message: isArabic
            ? `تمت مراجعة منتجك وقبوله بنجاح من قبل فريق التقييم وهو الآن معروض للمشترين.`
            : `Félicitations, votre produit a été approuvé avec succès par l'équipe de curation Olmart. Il est maintenant visible par tous les clients !`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "user_notifications");
      }

      // 4. Send real mail records using Firebase Mail extension
      if (sellerEmail) {
        try {
          await addDoc(collection(db, "mail"), {
            to: sellerEmail,
            message: {
              subject: isArabic
                ? `🎉 منتجك نشط الآن على Olmart !`
                : `Votre produit "${productToApprove.name}" est approuvé et actif ! 🎉`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                  <h2 style="color: #FF5C00; text-align: center;">Félicitations ${sellerDisplayName} !</h2>
                  <p>Nous avons le plaisir de vous informer que votre fiche produit a été approuvée par l'équipe de curation d'Olmart.</p>
                  <div style="background-color: #fcfcfc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f1f1f1;">
                    <strong>Nom du produit :</strong> ${productToApprove.name}<br/>
                    <strong>Prix :</strong> ${productToApprove.price} DA<br/>
                    <strong>Score de qualité :</strong> ${calculatedScore}%
                  </div>
                  <p>Votre produit est maintenant disponible à la vente et visible par des milliers d'acheteurs sur notre plateforme e-commerce.</p>
                  <p style="text-align: center; margin-top: 30px;">
                    <a href="https://olmart-marketplace.web.app/product/${productToApprove.id}" style="background-color: #FF5C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mon produit en ligne</a>
                  </p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;"/>
                  <p style="font-size: 11px; color: #999; text-align: center;">L'équipe Curation & Qualité Olmart</p>
                </div>
              `,
            },
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "mail");
        }
      }

      toast.success(t("Produit approuvé avec notifications transmises ! 🚀"), { id: toastId });
      await fetchPendingProducts();
    } catch (error) {
      toast.error(t("Erreur durant l'approbation du produit"), { id: toastId });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // 2. REJECT with min-10 char mandatory reason
  const handleReject = async (productToReject: any) => {
    if (isActionInProgress) return;

    const trimmedReason = rejectionReason.trim();
    if (trimmedReason.length < 10) {
      toast.error(
        isArabic
          ? "يجب أن يكون سبب الرفض 10 أحرف على الأقل لشرح التعديلات المطلوبة."
          : "Le motif de refus est obligatoire et doit faire au moins 10 caractères."
      );
      return;
    }

    setIsActionInProgress(true);
    const toastId = toast.loading(t("Rejet en cours..."));

    try {
      // 1. Update status
      const pRef = doc(db, "products", productToReject.id);
      try {
        await updateDoc(pRef, {
          status: "rejected",
          rejectionReason: trimmedReason,
          rejectedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${productToReject.id}`);
        throw err;
      }

      // 2. Fetch Seller Profile from users collection
      let sellerEmail = "";
      let sellerDisplayName = productToReject.sellerName || t("Partenaire");
      try {
        const sellerSnap = await getDoc(doc(db, "users", productToReject.sellerId));
        if (sellerSnap.exists()) {
          const sellerData = sellerSnap.data();
          sellerEmail = sellerData.email || "";
          sellerDisplayName = sellerData.displayName || sellerData.shopName || sellerDisplayName;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${productToReject.sellerId}`);
      }

      // 3. Create real push notification
      try {
        await addDoc(collection(db, "user_notifications"), {
          recipientId: productToReject.sellerId,
          type: "PRODUCT_REJECTED",
          title: isArabic
            ? `⚠️ تعديل مطلوب لمنتجك: ${productToReject.name}`
            : `Action Requise ⚠️ Votre produit "${productToReject.name}" nécessite des modifications`,
          message: isArabic
            ? `تم رفض طلب النشر مؤقتاً للسبب التالي: ${trimmedReason}. يرجى التعديل وإعادة الإرسال.`
            : `Votre fiche produit a été refusée pour le motif suivant : ${trimmedReason}. Veuillez apporter les corrections requises dans votre espace vendeur.`,
          createdAt: serverTimestamp(),
          read: false,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "user_notifications");
      }

      // 4. Create real email
      if (sellerEmail) {
        try {
          await addDoc(collection(db, "mail"), {
            to: sellerEmail,
            message: {
              subject: isArabic
                ? `⚠️ إشعار بخصوص منتجك على Olmart`
                : `Action requise : Votre produit sur Olmart a été refusé ⚠️`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                  <h2 style="color: #d92727; text-align: center;">Mise à jour de votre produit</h2>
                  <p>Bonjour ${sellerDisplayName},</p>
                  <p>L'équipe de curation d'Olmart a examiné votre fiche produit <strong>${productToReject.name}</strong>.</p>
                  <p>Malheureusement, celle-ci n'a pas pu être approuvée dans son état actuel pour le motif de non-conformité suivant :</p>
                  <div style="background-color: #fff5f5; border-left: 4px solid #d92727; padding: 15px; border-radius: 8px; margin: 20px 0; color: #a61e1e; font-weight: bold;">
                    "${trimmedReason}"
                  </div>
                  <p><strong>Que devez-vous faire ?</strong><br/>
                  Connectez-vous à votre espace vendeur, accédez à votre catalogue, cliquez sur modifier le produit pour corriger ces éléments (photos, description ou prix) puis soumettez-le à nouveau à l'examen de notre équipe.</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;"/>
                  <p style="font-size: 11px; color: #999; text-align: center;">L'équipe Curation & Qualité Olmart</p>
                </div>
              `,
            },
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, "mail");
        }
      }

      toast.success(t("Produit refusé avec motifs transmis."), { id: toastId });
      setIsRejecting(false);
      setRejectionReason("");
      await fetchPendingProducts();
    } catch (error) {
      toast.error(t("Erreur durant le traitement du refus"), { id: toastId });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // 3. EDIT product details inline before approving
  const handleSaveChanges = async () => {
    if (!selectedProduct || !editForm) return;
    setIsSaving(true);
    const toastId = toast.loading(t("Enregistrement..."));

    try {
      const pRef = doc(db, "products", selectedProduct.id);
      await updateDoc(pRef, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price: Number(editForm.price),
        promoPrice: editForm.promoPrice ? Number(editForm.promoPrice) : null,
        stock: Number(editForm.stock),
        category: editForm.category,
        subcategory: editForm.subcategory || "",
        image: editForm.image ? editForm.image.trim() : "",
        images: editForm.images || [],
        freeShipping: editForm.freeShipping,
        wilaya: editForm.wilaya,
        qualityScore: calculatedScore,
        updatedAt: serverTimestamp(),
      });

      toast.success(t("Fiche produit modifiée et mise à jour en temps réel ! ✨"), { id: toastId });
      setIsEditMode(false);
      await fetchPendingProducts();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${selectedProduct.id}`);
      toast.error(t("Erreur de sauvegarde"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-140px)] animate-fade-in text-zinc-900 bg-[#FAF8F5]/30">
      
      {/* LEFT SIDEBAR: PENDING PRODUCTS LIST */}
      <div className="w-full lg:w-[350px] shrink-0 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-kinder text-zinc-900 uppercase tracking-wider">
              {t("Produits en attente")}
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-kinder px-2.5 py-1 rounded-full">
              {products.length}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("Rechercher un produit ou vendeur...")}
              className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-[#FF5C00] font-medium"
            />
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-zinc-100 text-center text-zinc-400 font-bold text-xs">
              {t("Aucun produit en attente.")}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-start p-4 rounded-3xl border transition-all duration-200 flex gap-4 cursor-pointer outline-none ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500 shadow-sm"
                      : "bg-white border-zinc-100 hover:border-zinc-200 hover:shadow-sm"
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 relative">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-kinder text-zinc-800 line-clamp-1 uppercase tracking-tight">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                        {t("Par:")} {p.sellerName || t("Créateur")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-kinder text-amber-600">
                        {p.price} DA
                      </span>
                      <span className="text-[9px] bg-zinc-100 px-2 py-0.5 rounded-md font-bold text-zinc-500">
                        {p.category}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE: DETAILED CURATION */}
      <div className="flex-1 min-w-0">
        {!selectedProduct ? (
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-20 text-center flex flex-col items-center justify-center h-full min-h-[450px]">
            <div className="w-20 h-20 bg-[#FAF8F5] rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-lg font-kinder text-zinc-900 mb-2">
              {t("Sélectionnez une fiche")}
            </h3>
            <p className="text-zinc-400 text-xs font-bold">
              {t("Choisissez un produit dans la colonne latérale pour débuter l'audit de curation.")}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* WORKSPACE HEADER: PRODUCT BANNER */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-kinder uppercase tracking-widest px-2.5 py-1 rounded-lg">
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.subcategory && (
                    <span className="bg-zinc-100 text-zinc-600 text-[9px] font-kinder uppercase tracking-widest px-2.5 py-1 rounded-lg">
                      {selectedProduct.subcategory}
                    </span>
                  )}
                  {selectedProduct.wilaya && (
                    <span className="bg-[#FAF8F5] text-zinc-500 text-[9px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-zinc-200/50">
                      <Truck className="w-3 h-3 text-amber-500" /> {selectedProduct.wilaya}
                    </span>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-kinder text-zinc-900 uppercase tracking-tight line-clamp-1">
                  {selectedProduct.name}
                </h1>
                <p className="text-xs text-zinc-400 font-bold mt-1">
                  {t("Boutique de :")} <span className="text-[#FF5C00]">{selectedProduct.sellerName || t("Vendeur")}</span>
                </p>
              </div>

              {/* ACTION TOGGLES */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-4 py-3 rounded-2xl text-xs font-kinder uppercase tracking-wider cursor-pointer border transition-colors flex items-center gap-2 ${
                    isEditMode
                      ? "bg-zinc-800 text-white border-zinc-800"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditMode ? t("Quitter l'éditeur") : t("Modifier")}
                </button>

                <button
                  onClick={() => setIsRejecting(true)}
                  disabled={isActionInProgress}
                  className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-2xl text-xs font-kinder uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t("Refuser")}
                </button>

                <button
                  onClick={() => handleApprove(selectedProduct)}
                  disabled={isActionInProgress}
                  className="px-5 py-3 bg-[#FF5C00] hover:bg-[#A94320] text-white rounded-2xl text-xs font-kinder uppercase tracking-wider cursor-pointer shadow-md shadow-orange-500/10 transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t("Approuver")}
                </button>
              </div>
            </div>

            {/* MANDATORY REJECTION DRAWER */}
            <AnimatePresence>
              {isRejecting && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-50/70 border border-red-200 rounded-[2rem] p-6 space-y-4 overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquareX className="w-5 h-5 text-red-600" />
                      <h3 className="font-kinder text-xs text-red-800 uppercase tracking-widest">
                        {t("Déclaration obligatoire du motif de refus")}
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="p-1 hover:bg-red-100 rounded-full text-red-700 border-none bg-transparent cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-red-700/80 font-medium">
                    {t("Expliquez précisément au créateur ce qui pose problème (ex: photos floues, prix erroné, etc.). Minimum 10 caractères.")}
                  </p>

                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t("Entrez les détails du refus (min. 10 caractères)...")}
                    className="w-full text-xs p-4 bg-white border border-red-200 rounded-2xl outline-none focus:ring-2 focus:ring-red-400 text-red-950 resize-none h-24"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="px-4 py-2 text-xs font-bold text-zinc-500 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                    >
                      {t("Annuler")}
                    </button>
                    <button
                      onClick={() => handleReject(selectedProduct)}
                      disabled={isActionInProgress || rejectionReason.trim().length < 10}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-kinder uppercase tracking-widest cursor-pointer disabled:opacity-50"
                    >
                      {t("Confirmer le refus")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* THREE-COLUMN AUDIT PANELS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* PANES A: COMPLIANCE, QUALITY & INLINE FORM (8/12 col) */}
              <div className="xl:col-span-7 space-y-8">
                
                {/* 1. QUALITY SCORE CARD */}
                <CurationQualityScore
                  product={isEditMode && editForm ? editForm : selectedProduct}
                  score={calculatedScore}
                />

                {/* 2. INLINE EDITOR FORM (Visible when isEditMode is active) */}
                {isEditMode && editForm ? (
                  <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-amber-400 shadow-md space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-[#FF5C00]" />
                        <h3 className="font-kinder text-xs text-zinc-900 uppercase tracking-widest">
                          {t("Éditeur de Fiche Produit")}
                        </h3>
                      </div>
                      <span className="text-[10px] text-amber-600 font-kinder uppercase bg-amber-50 px-2 py-0.5 rounded-md">
                        {t("Modifications en direct")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Titre de l'annonce")}
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Prix Standard (DA)")}
                        </label>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Prix Promotionnel (Optionnel)")}
                        </label>
                        <input
                          type="number"
                          value={editForm.promoPrice}
                          onChange={(e) => setEditForm({ ...editForm, promoPrice: e.target.value ? Number(e.target.value) : "" })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Stock initial")}
                        </label>
                        <input
                          type="number"
                          value={editForm.stock}
                          onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Région de livraison (Wilaya)")}
                        </label>
                        <input
                          type="text"
                          value={editForm.wilaya}
                          onChange={(e) => setEditForm({ ...editForm, wilaya: e.target.value })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                          placeholder="Alger, Oran..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Catégorie")}
                        </label>
                        <select
                          value={editForm.category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            const subcatList = Object.keys(hierarchy[newCat] || {});
                            setEditForm({
                              ...editForm,
                              category: newCat,
                              subcategory: subcatList[0] || "",
                            });
                          }}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        >
                          {Object.keys(hierarchy).map((catName) => (
                            <option key={catName} value={catName}>
                              {catName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Sous-catégorie")}
                        </label>
                        <select
                          value={editForm.subcategory}
                          onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                        >
                          <option value="">-- {t("Aucune")} --</option>
                          {Object.keys(hierarchy[editForm.category] || {}).map((subName) => (
                            <option key={subName} value={subName}>
                              {subName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Description détaillée")}
                        </label>
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full text-xs p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Image principale URL")}
                        </label>
                        <input
                          type="text"
                          value={editForm.image || ""}
                          onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <label className="block text-[10px] font-kinder text-zinc-400 uppercase tracking-wider">
                          {t("Images additionnelles URL (séparées par des virgules)")}
                        </label>
                        <input
                          type="text"
                          value={editForm.images ? editForm.images.join(", ") : ""}
                          onChange={(e) => {
                            const urls = e.target.value
                              .split(",")
                              .map((u) => u.trim())
                              .filter((u) => u !== "");
                            setEditForm({ ...editForm, images: urls });
                          }}
                          className="w-full text-xs px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-[#FF5C00] font-bold"
                          placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="freeShipping"
                          checked={editForm.freeShipping}
                          onChange={(e) => setEditForm({ ...editForm, freeShipping: e.target.checked })}
                          className="w-4 h-4 text-[#FF5C00] focus:ring-[#FF5C00] border-zinc-300 rounded"
                        />
                        <label htmlFor="freeShipping" className="text-xs font-bold text-zinc-700 cursor-pointer">
                          {t("Proposer la livraison gratuite pour ce produit")}
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="px-4 py-2.5 text-xs font-bold text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 cursor-pointer"
                      >
                        {t("Annuler")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-kinder uppercase tracking-widest cursor-pointer flex items-center gap-1.5"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {t("Enregistrer")}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STATIC DETAILS AUDIT PANEL */
                  <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-zinc-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                      <CheckSquare className="w-5 h-5 text-zinc-700" />
                      <h3 className="font-kinder text-xs text-zinc-900 uppercase tracking-widest">
                        {t("Checklist de conformité")}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {checklist.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-start justify-between gap-4 p-3 hover:bg-zinc-50 rounded-2xl transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleCompliance(item.key)}
                              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                                item.status
                                  ? "bg-green-100 border-green-500 text-green-700"
                                  : "bg-red-100 border-red-500 text-red-700"
                              }`}
                            >
                              {item.status ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div>
                              <h4 className="text-xs font-kinder text-zinc-800 uppercase tracking-wide">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-kinder uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              item.status
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {item.status ? t("Conforme") : t("Alerte")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. DUPLICATE CHECK COMPARISON PANEL */}
                <CurationDuplicatePanel
                  selectedProduct={selectedProduct}
                  relatedProducts={relatedProducts}
                />
              </div>

              {/* PANES B: VISUAL MOBILE PREVIEW FRAME (5/12 col) */}
              <div className="xl:col-span-5 flex justify-center">
                <CurationMobilePreview
                  product={isEditMode && editForm ? editForm : selectedProduct}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
