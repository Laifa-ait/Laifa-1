import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Star,
  Tag,
  ShoppingBag,
  Eye,
  ShieldAlert,
  FileText,
  RefreshCw,
  X,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { formatPrice } from "../../utils/format";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { useConfirm } from "../../hooks/useConfirm";

interface ModerationProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  sellerId: string;
  sellerName: string;
  status: 'pending' | 'active' | 'rejected' | 'pending_deletion' | 'deleted';
  images: string[];
  category: string;
  createdAt: Timestamp;
  rejectionReason?: string;
  moderationType?: 'new' | 'update';
  [key: string]: any;
}

export const ProductModeration: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const { confirm: showConfirmModal, ConfirmationDialog } = useConfirm();
  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "rejected" | "pending_deletion">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [lastVisible, setLastVisible] = useState<any>(null);
  const PRODUCTS_PER_PAGE = 25;

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<ModerationProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const preconfiguredReasons = [
    t("Photos trop floues ou de mauvaise qualité"),
    t("Description rédigée en langage inapproprié ou SMS"),
    t("Catégorie ou classification de produit incorrecte"),
    t("Produit interdit ou non conforme à la charte luxe Olma"),
    t("Absence d'informations obligatoires (ex: Guide des tailles, caractéristiques)"),
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { limit, startAfter } = await import("firebase/firestore");
      const q = selectedCategory !== "Tous"
        ? query(
            collection(db, "products"),
            where("status", "==", activeTab),
            where("category", "==", selectedCategory),
            orderBy("createdAt", "desc"),
            limit(PRODUCTS_PER_PAGE)
          )
        : query(
            collection(db, "products"),
            where("status", "==", activeTab),
            orderBy("createdAt", "desc"),
            limit(PRODUCTS_PER_PAGE)
          );

      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ModerationProduct[];
      setProducts(items);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    } catch (err) {
      console.error("Error fetching products for moderation:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastVisible) return;
    try {
      const { limit, startAfter } = await import("firebase/firestore");
      const q = selectedCategory !== "Tous"
        ? query(
            collection(db, "products"),
            where("status", "==", activeTab),
            where("category", "==", selectedCategory),
            orderBy("createdAt", "desc"),
            startAfter(lastVisible),
            limit(PRODUCTS_PER_PAGE)
          )
        : query(
            collection(db, "products"),
            where("status", "==", activeTab),
            orderBy("createdAt", "desc"),
            startAfter(lastVisible),
            limit(PRODUCTS_PER_PAGE)
          );

      const snap = await getDocs(q);
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ModerationProduct[];
      setProducts(prev => [...prev, ...items]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeTab, selectedCategory]);

  const logModerationAction = async (action: string, productId: string, details: string) => {
    await addDoc(collection(db, "audit_logs"), {
      type: 'PRODUCT_MODERATION',
      action,
      productId,
      adminId: currentUser?.uid,
      details,
      timestamp: serverTimestamp()
    });
  };

  const handleApprove = async (product: ModerationProduct) => {
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    const toastId = toast.loading(t("Approbation en cours..."));
    try {
      const token = await currentUser?.getIdToken(true);
      if (!token) throw new Error("Non authentifié");
      const res = await fetch("/api/admin/products/" + product.id + "/approve", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      await logModerationAction('APPROVE', product.id, 'Produit approuvé');
      toast.success(
        isArabic
          ? "تمت الموافقة على المنتج " + product.name + " بنجاح!"
          : "Produit " + product.name + " approuvé avec succès !",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur lors de l'approbation du produit."), { id: toastId });
    }
  };

  const handleOpenRejectModal = (product: ModerationProduct) => {
    setTargetProduct(product);
    setRejectReason(preconfiguredReasons[0]);
    setCustomReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    if (!targetProduct) return;
    const finalReason = rejectReason === "Autre reason" ? customReason : rejectReason;
    if (!finalReason.trim()) {
      toast.error(t("Veuillez renseigner ou sélectionner un motif de refus."));
      return;
    }
    const toastId = toast.loading(t("Rejet en cours..."));
    try {
      const token = await currentUser?.getIdToken(true);
      if (!token) throw new Error("Non authentifié");
      const res = await fetch("/api/admin/products/" + targetProduct.id + "/reject", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setProducts((prev) => prev.filter((p) => p.id !== targetProduct.id));
      await logModerationAction('REJECT', targetProduct.id, `Produit rejeté: ${finalReason}`);
      setRejectModalOpen(false);
      setTargetProduct(null);
      toast.success(
        isArabic ? "تم رفض المنتج " + targetProduct.name + "." : "Le produit " + targetProduct.name + " a été rejeté.",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur lors du rejet du produit."), { id: toastId });
    }
  };

  const handleConfirmDelete = async (product: ModerationProduct) => {
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    const confirmationText = isArabic
      ? `هل تريد حذف المنتج "${product.name}" نهائيًا من الكتالوج؟`
      : `SUPPRIMER DÉFINITIVEMENT ce produit ? Cette action est irréversible.`;

    const confirmed = await showConfirmModal(confirmationText);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "products", product.id), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        deletedBy: currentUser.uid
      });
      await logModerationAction('SOFT_DELETE', product.id, 'Produit supprimé (soft delete)');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success(t("Produit supprimé (soft delete)"));
    } catch (err) {
      console.error("Error deleting product:", err);
      toast.error(t("Erreur lors de la suppression."));
    }
  };

  const handleDenyDelete = async (product: ModerationProduct) => {
    if (!currentUser || userProfile?.role !== 'admin') {
      toast.error("Action non autorisée");
      return;
    }
    const confirmationText = isArabic
      ? `هل تريد رفض الحذف والإبقاء على المنتج "${product.name}" نشطًا عبر الإنترنت؟`
      : `Voulez-vous refuser la suppression et conserver le produit "${product.name}" actif en ligne ?`;

    const confirmed = await showConfirmModal(confirmationText);
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "products", product.id), {
        status: "active",
      });
      await logModerationAction('DENY_DELETE', product.id, 'Suppression refusée, produit réactivé');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success(t("La suppression a été refusée et le produit est réactivé."));
    } catch (err) {
      console.error("Error setting product as active:", err);
      toast.error(t("Erreur lors de la réactivation."));
    }
  };

  const handleRecalculateScores = async () => {
    if (activeTab !== "active") return;
    setLoading(true);
    const toastId = toast.loading(t("Recalcul de tous les scores de pertinence..."));
    try {
      const token = await currentUser?.getIdToken(true);
      if (!token) throw new Error("Non authentifié");
      const res = await fetch("/api/admin/products/recalculate-scores", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Erreur serveur");
      await fetchProducts();
      toast.success(t("Tous les Scores de Pertinence ont été recalculés dynamiquement selon la formule de l'audit !"), {
        id: toastId,
      });
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur durant recalcul."), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const pName = (p.name || "").toLowerCase();
    const pBrand = (p.brand || "").toLowerCase();
    const pSellerName = (p.sellerName || "").toLowerCase();
    const matchesSearch =
      pName.includes(searchTerm.toLowerCase()) ||
      pBrand.includes(searchTerm.toLowerCase()) ||
      pSellerName.includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "Tous" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-10">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <h1 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-900 uppercase">
            {t("Modération des Produits")}
          </h1>
          <p className="text-xs text-zinc-500 font-semibold tracking-wider rtl:tracking-normal mt-1 uppercase">
            {t("Gouvernance Premium du Catalogue Olma")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "active" && (
            <button
              onClick={handleRecalculateScores}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100/70 text-amber-800 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("Recalculer les Scores de Pertinence")}
            </button>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-stone-200/60 p-1.5 bg-stone-100 rounded-xl max-w-2xl overflow-x-auto gap-1">
        {(["pending", "active", "rejected", "pending_deletion"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[120px] text-center py-3 rounded-lg text-[10px] select-none font-black uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer ${
              activeTab === tab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab === "pending" && "En attente ⏳"}
            {tab === "active" && "Actifs / Approuvés ✅"}
            {tab === "rejected" && "Refusés ❌"}
            {tab === "pending_deletion" && "Suppressions 🗑️"}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-2">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 py-4 text-stone-400" />
          <input
            type="text"
            className="w-full ps-12 pe-6 py-3.5 bg-white border border-stone-200/80 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:border-orange-500"
            placeholder={
              t("Rechercher par titre, marque ou vendeur...") || "Rechercher par titre, marque ou vendeur..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <select
            className="w-full px-5 py-3.5 bg-white border border-stone-200/80 rounded-xl text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-orange-500 appearance-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="Tous">{t("Toutes les catégories")}</option>
            <option value="Supermarché">{t("Supermarché")}</option>
            <option value="Maison & Déco">{t("Maison & Déco")}</option>
            <option value="Électronique">{t("Électronique")}</option>
            <option value="Électroménager">{t("Électroménager")}</option>
            <option value="Scolaire & Bureau">{t("Scolaire & Bureau")}</option>
            <option value="Mode">{t("Mode")}</option>
            <option value="Beauté & Santé">{t("Beauté & Santé")}</option>
            <option value="Auto & Moto">{t("Auto & Moto")}</option>
            <option value="Sport & Loisirs">{t("Sport & Loisirs")}</option>
            <option value="Bébé & Puériculture">{t("Bébé & Puériculture")}</option>
            <option value="Bricolage & Outillage">{t("Bricolage & Outillage")}</option>
            <option value="Jeux & Jouets">{t("Jeux & Jouets")}</option>
          </select>
        </div>
      </div>

      {/* Main content grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-stone-50 border border-stone-200/40 rounded-2xl h-80 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-stone-200/60 rounded-2xl p-16 text-center shadow-sm">
          <ShieldAlert className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h2 className="text-sm font-kinder text-zinc-800 uppercase tracking-wider rtl:tracking-normal">
            {t("Aucun produit trouvé")}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            {t("Il n'y a aucun produit conforme aux critères de recherche dans cet onglet de modération.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((p) => {
              const score =
                p.qualityScore !== undefined
                  ? p.qualityScore
                  : parseFloat(
                      (
                        (p.salesCount || 0) * 10 +
                        (p.viewsCount || 0) * 0.1 +
                        (p.sellerRating || 4.5) * 5 -
                        (p.rtoRate || 0) * 50
                      ).toFixed(2)
                    );

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-stone-150 rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-transform duration-300 group"
                >
                  {/* Image container */}
                  <div className="aspect-[4/3] bg-zinc-50 relative overflow-hidden shrink-0 border-b border-stone-100">
                    {p.image ? (
                      <img
                        loading="lazy"
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                        {t("Pas d'image")}
                      </div>
                    )}

                    {/* Floating badge */}
                    <div className="absolute top-4 start-4 flex flex-col gap-2">
                      {p.status === "pending" && (
                        <>
                          <span className="px-3 py-1.5 w-fit rounded-lg bg-orange-100 text-orange-800 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal">
                            {t("⏳ En attente de modération")}
                          </span>
                          {p.moderationType === "update" ? (
                            <span className="px-3 py-1.5 w-fit rounded-lg bg-blue-100 text-blue-800 border border-blue-500/20 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal shadow-sm flex items-center gap-1.5">
                              <RefreshCw size={12} className="inline-block" /> {t("Produit Modifié")}
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 w-fit rounded-lg bg-purple-100 text-purple-800 border border-purple-500/20 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal shadow-sm flex items-center gap-1.5">
                              <Sparkles size={12} className="inline-block" /> {t("Nouveau Produit")}
                            </span>
                          )}
                        </>
                      )}
                      {p.status === "active" && (
                        <span className="px-3 py-1.5 w-fit rounded-lg bg-emerald-100 text-emerald-800 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal">
                          {t("✅ Actif")}
                        </span>
                      )}
                      {p.status === "rejected" && (
                        <span className="px-3 py-1.5 w-fit rounded-lg bg-red-100 text-red-800 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal">
                          {t("❌ Refusé")}
                        </span>
                      )}
                      {p.status === "pending_deletion" && (
                        <span className="px-3 py-1.5 w-fit rounded-lg bg-red-100 text-red-800 text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal animate-pulse">
                          {t("🗑️ Suppression Demandée")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-kinder text-stone-400 uppercase tracking-widest rtl:tracking-normal leading-none">
                          {p.category || "Sans catégorie"}
                        </span>
                        <span className="text-[10px] font-bold text-[#E55B3C] font-mono">{p.wilaya || "N/A"}</span>
                      </div>

                      <h2 className="text-base font-kinder text-zinc-950 mt-1 lines-clamp-2 leading-tight uppercase font-sans tracking-tight rtl:tracking-normal">
                        {p.name}
                      </h2>

                      <div className="flex items-center gap-2 mt-2">
                        {p.brand && (
                          <span className="text-[9px] font-kinder px-2 py-1 rounded bg-[#F8F5F1] text-zinc-650 uppercase tracking-wide border border-stone-250">
                            {p.brand}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-zinc-500">
                          {t("Vendeur:")}
                          <b className="text-zinc-700 underline">{p.sellerName || "Inconnu"}</b>
                        </span>
                      </div>

                      {p.rejectionReason && activeTab === "rejected" && (
                        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-red-800 text-[10px] font-semibold">
                          {t("Motif de rejet:")}
                          <span className="font-normal italic">"{p.rejectionReason}"</span>
                        </div>
                      )}
                    </div>

                    {/* Stats metric drawer */}
                    <div className="grid grid-cols-2 gap-2 bg-[#FAF8F6] p-3 rounded-xl border border-stone-200/50">
                      <div className="text-center">
                        <span className="text-[8px] font-kinder text-stone-400 uppercase tracking-wide">
                          {t("Score de Qualité")}
                        </span>
                        <p className="text-xs font-kinder text-stone-800 flex items-center justify-center gap-1 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                          {score}
                        </p>
                      </div>
                      <div className="text-center border-l border-stone-300/40">
                        <span className="text-[8px] font-kinder text-stone-400 uppercase tracking-wide">
                          {t("Prix de Vente")}
                        </span>
                        <p className="text-xs font-kinder text-zinc-900 mt-0.5">{formatPrice(p.price)}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {activeTab === "pending" && (
                      <div className="grid grid-cols-2 gap-3 shrink-0 pt-2 border-t border-stone-100">
                        <button
                          onClick={() => handleOpenRejectModal(p)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer bg-white"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t("Rejeter")}
                        </button>
                        <button
                          onClick={() => handleApprove(p)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t("Approuver")}
                        </button>
                      </div>
                    )}

                    {activeTab === "pending_deletion" && (
                      <div className="grid grid-cols-2 gap-3 shrink-0 pt-2 border-t border-stone-100">
                        <button
                          onClick={() => handleDenyDelete(p)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-zinc-50 text-stone-700 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer bg-white"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          {t("Refuser (Garder)")}
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(p)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("Supprimer")}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {lastVisible && (
            <div className="flex justify-center mt-12 mb-8">
              <button
                onClick={loadMore}
                className="px-8 py-3 bg-white border border-stone-200 text-stone-900 rounded-full font-kinder text-xs uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all flex items-center gap-2 shadow-sm"
              >
                {t("Afficher plus de produits")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reject reason modal */}
      <AnimatePresence>
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModalOpen(false)}
              className="absolute inset-0 bg-black/60"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <h3 className="text-sm font-kinder text-zinc-900 uppercase tracking-wider rtl:tracking-normal flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  {t("Sélectionner un motif de rejet")}
                </h3>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="p-1 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-all bg-transparent border-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-kinder text-stone-400 uppercase tracking-widest rtl:tracking-normal">
                    {t("Raisons fréquentes :")}
                  </label>
                  {preconfiguredReasons.map((reason, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRejectReason(reason)}
                      className={`w-full text-start px-4 py-3 rounded-xl border text-[10px] font-bold leading-normal uppercase transition-all ${
                        rejectReason === reason
                          ? "border-red-500 bg-red-50 text-red-800"
                          : "border-stone-200 bg-stone-50 text-zinc-600 hover:bg-stone-100"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRejectReason("Autre reason")}
                    className={`w-full text-start px-4 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                      rejectReason === "Autre reason"
                        ? "border-red-500 bg-red-50 text-red-800"
                        : "border-stone-200 bg-stone-50 text-zinc-600 hover:bg-stone-100"
                    }`}
                  >
                    {t("Autre raison personnalisée...")}
                  </button>
                </div>

                {rejectReason === "Autre reason" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-kinder text-stone-400 uppercase tracking-widest rtl:tracking-normal">
                      {t("Saisir le motif :")}
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-250 rounded-xl text-xs font-semibold text-zinc-800 outline-none focus:border-red-500"
                      placeholder={
                        t("Indiquez clairement le problème au vendeur...") ||
                        "Indiquez clairement le problème au vendeur..."
                      }
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-600 transition-all cursor-pointer bg-white"
                >
                  {t("Annuler")}
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  className="px-4 py-3 rounded-xl bg-red-650 text-white hover:bg-red-700 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer"
                >
                  {t("Confirmer le rejet")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmationDialog />
    </div>
  );
};
