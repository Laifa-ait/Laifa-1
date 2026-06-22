import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Tag,
  Plus,
  Trash2,
  LayoutGrid,
  Star,
  Ticket,
  ChevronRight,
  ChevronDown,
  Folder,
  Layers,
  CornerDownRight,
  X,
  RotateCcw,
  FolderOpen,
  Percent,
  Calendar,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PRODUCT_HIERARCHY } from "../../constants";
import { toast } from "react-hot-toast";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { formatPrice } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import { useMarketingData } from "../../hooks/useMarketingData";

export const Marketing: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { createCoupon, updateCoupon, deleteCoupon, saveCategoryHierarchy, logAudit } = useMarketingData();
  const [activeTab, setActiveTab] = useState<"categories" | "coupons" | "featured">("categories");

  // Real-time hierarchy state with local persistence
  const [hierarchy, setHierarchy] = useState<Record<string, Record<string, string[]>>>(PRODUCT_HIERARCHY);

  // Track expanded categories and subcategories
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    "Maison & Déco": true, // expand first by default for nice UX
  });
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({});

  // Form states
  const [newCatName, setNewCatName] = useState("");
  const [newSubcatNames, setNewSubcatNames] = useState<Record<string, string>>({});
  const [newSubSubcatNames, setNewSubSubcatNames] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Coupon management states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  // New coupon form states
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "",
    minOrderValue: "",
    maxDiscount: "",
    usageLimit: "",
    expiryDate: "",
    isActive: true,
  });
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCoupons(data);
        setCouponsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "coupons");
        setCouponsLoading(false);
      }
    );

    // Load category hierarchy
    const unsubCat = onSnapshot(doc(db, "settings", "categories"), (snap) => {
      if (snap.exists() && snap.data().hierarchy) {
        setHierarchy(snap.data().hierarchy);
      }
    });

    return () => {
      unsubscribe();
      unsubCat();
    };
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponForm.code.trim().toUpperCase();
    if (!code) {
      toast.error(t("Veuillez entrer un code coupon."));
      return;
    }
    const val = parseFloat(couponForm.discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error(t("Valeur de remise invalide."));
      return;
    }

    // Percent limit
    if (couponForm.discountType === "percent" && val > 100) {
      toast.error(t("Le pourcentage de remise ne peut pas dépasser 100%."));
      return;
    }

    if (!couponForm.expiryDate) {
      toast.error(t("Veuillez sélectionner une date d'expiration."));
      return;
    }

    setIsCreatingCoupon(true);
    try {
      const payload = {
        code,
        description: couponForm.description.trim(),
        discountType: couponForm.discountType,
        discountValue: val,
        minOrderValue: couponForm.minOrderValue ? parseFloat(couponForm.minOrderValue) : 0,
        maxDiscount: couponForm.maxDiscount ? parseFloat(couponForm.maxDiscount) : null,
        usageLimit: couponForm.usageLimit ? parseInt(couponForm.usageLimit) : null,
        usedBy: [],
        usageCount: 0,
        expiryDate: new Date(couponForm.expiryDate).toISOString(),
        isActive: couponForm.isActive,
      };

      await createCoupon(payload);

      setCouponForm({
        code: "",
        description: "",
        discountType: "percent",
        discountValue: "",
        minOrderValue: "",
        maxDiscount: "",
        usageLimit: "",
        expiryDate: "",
        isActive: true,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCouponActive = async (id: string, currentStatus: boolean, code: string) => {
    try {
      await updateCoupon(id, { isActive: !currentStatus }, code);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (true) {
      try {
        await deleteCoupon(id, code);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const saveHierarchy = async (newHierarchy: Record<string, Record<string, string[]>>) => {
    setHierarchy(newHierarchy);
    try {
      await saveCategoryHierarchy(newHierarchy);
    } catch (err) {
      console.error("Error saving hierarchy:", err);
    }
  };

  const handleResetToDefault = () => {
    if (true) {
      saveHierarchy(PRODUCT_HIERARCHY);
      toast.success(t("Arbre des catégories réinitialisé aux valeurs par défaut !"));
    }
  };

  // Level 1 logic
  const handleAddCat = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (hierarchy[trimmed]) {
      toast.error(t("Cette catégorie existe déjà."));
      return;
    }
    const updated = { ...hierarchy, [trimmed]: {} };
    saveHierarchy(updated);
    setExpandedCats((prev) => ({ ...prev, [trimmed]: true }));
    setNewCatName("");
    toast.success(t("Ajouté avec succès."));
  };

  const handleRemoveCat = (catName: string) => {
    if (true) {
      const updated = { ...hierarchy };
      delete updated[catName];
      saveHierarchy(updated);
      toast.success(t("Supprimé."));
    }
  };

  // Level 2 logic
  const handleAddSubcat = (catName: string) => {
    const trimmed = (newSubcatNames[catName] || "").trim();
    if (!trimmed) return;

    if (hierarchy[catName]?.[trimmed]) {
      toast.error(t("Cette sous-catégorie existe déjà dans cette catégorie."));
      return;
    }

    const updated = { ...hierarchy };
    if (!updated[catName]) updated[catName] = {};
    updated[catName] = { ...updated[catName], [trimmed]: [] };

    saveHierarchy(updated);
    setExpandedSubs((prev) => ({ ...prev, [`${catName}_${trimmed}`]: true }));
    setNewSubcatNames((prev) => ({ ...prev, [catName]: "" }));
    toast.success(t("Ajouté avec succès."));
  };

  const handleRemoveSubcat = (catName: string, subcatName: string) => {
    if (true) {
      const updated = { ...hierarchy };
      if (updated[catName]) {
        delete updated[catName][subcatName];
        saveHierarchy(updated);
        toast.success(t("Supprimé."));
      }
    }
  };

  // Level 3 logic
  const handleAddSubSubcat = (catName: string, subcatName: string) => {
    const key = `${catName}_${subcatName}`;
    const trimmed = (newSubSubcatNames[key] || "").trim();
    if (!trimmed) return;

    const list = hierarchy[catName]?.[subcatName] || [];
    if (list.includes(trimmed)) {
      toast.error(t("Cette sous-sous-catégorie existe déjà."));
      return;
    }

    const updated = { ...hierarchy };
    updated[catName][subcatName] = [...list, trimmed];
    saveHierarchy(updated);
    setNewSubSubcatNames((prev) => ({ ...prev, [key]: "" }));
    toast.success(t("Ajouté avec succès."));
  };

  const handleRemoveSubSubcat = (catName: string, subcatName: string, itemToRemove: string) => {
    const updated = { ...hierarchy };
    if (updated[catName]?.[subcatName]) {
      updated[catName][subcatName] = updated[catName][subcatName].filter((x) => x !== itemToRemove);
      saveHierarchy(updated);
      toast.success(t("Supprimé."));
    }
  };

  const toggleCat = (catName: string) => {
    setExpandedCats((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const toggleSub = (catName: string, subcatName: string) => {
    const key = `${catName}_${subcatName}`;
    setExpandedSubs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTranslateAll = async () => {
    setIsTranslating(true);
    try {
      const response = await fetch("/api/admin/translate-ui", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          harvestedKeys: [], // backend will harvest from settings/categories
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de la traduction");

      const data = await response.json();
      toast.success(`${data.count} termes traduits avec succès !`);

      // Force reload to pick up new translations if needed
      // window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t("Échec de la traduction automatique."));
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight rtl:tracking-normal text-zinc-950">
            {t("Marketing & Catalogue")}
          </h2>
          <p className="text-zinc-500 font-medium font-sans">
            {t("Gérez les structures de données, catégories multi-niveaux et codes de promotions.")}
          </p>
        </div>
        <div className="flex bg-zinc-100 p-2 rounded-[2rem] shadow-inner">
          {["categories", "coupons", "featured"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest rtl:tracking-normal transition-all ${
                activeTab === tab ? "bg-zinc-950 text-white shadow-xl" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "categories" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="cat"
            className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm p-12 space-y-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-8">
              <h4 className="text-xl font-black flex items-center gap-4">
                <LayoutGrid className="w-7 h-7 text-orange-500 animate-pulse" />
                {t("Arbre des Catégories Interactif")}
              </h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-2xl transition-all self-start disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? "animate-spin" : ""}`} />
                  {isTranslating ? "Traduction en cours..." : "AI Traduire tout le Catalogue"}
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] bg-orange-50 hover:bg-orange-100 px-5 py-3 rounded-2xl transition-all self-start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("Réinitialiser par défaut")}
                </button>
              </div>
            </div>

            {/* Add Root Category input */}
            <div className="bg-zinc-50/60 p-6 rounded-[2.5rem] border border-zinc-100/80 flex flex-col md:flex-row items-center gap-4 max-w-2xl">
              <div className="p-3 bg-white rounded-2xl border border-zinc-150">
                <Folder className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 w-full">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1">
                  {t("Nouveau Niveau 1")}
                </p>
                <input
                  type="text"
                  placeholder={
                    t("Ajouter une nouvelle catégorie principale (ex: Auto & Moto)...") ||
                    "Ajouter une nouvelle catégorie principale (ex: Auto & Moto)..."
                  }
                  className="w-full bg-transparent outline-none font-bold text-sm text-zinc-900 border-b border-transparent focus:border-orange-500 pb-1"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCat()}
                />
              </div>
              <button
                onClick={handleAddCat}
                className="w-full md:w-auto px-8 py-4 bg-zinc-950 text-white rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 text-xs font-black uppercase tracking-widest rtl:tracking-normal transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" /> {t("Créer")}
              </button>
            </div>

            {/* Collapsible multi-level categories list */}
            <div className="space-y-6">
              {Object.entries(hierarchy).length === 0 ? (
                <div className="p-16 border-2 border-dashed border-zinc-100 rounded-[2.5rem] text-center text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs">
                  {t("Aucune catégorie disponible. Veuillez en ajouter une ci-dessus.")}
                </div>
              ) : (
                Object.entries(hierarchy).map(([catName, subcategories]) => {
                  const isCatExpanded = !!expandedCats[catName];
                  const subcatCount = Object.keys(subcategories).length;
                  const subSubcatCount = Object.values(subcategories).reduce((acc, curr) => acc + curr.length, 0);

                  return (
                    <div
                      key={catName}
                      className="border border-zinc-100/80 bg-zinc-50/30 rounded-[2.5rem] overflow-hidden transition-all hover:shadow-md/5"
                    >
                      {/* Level 1 Category Row */}
                      <div
                        onClick={() => toggleCat(catName)}
                        className="p-6 md:p-8 bg-white border-b border-zinc-100/60 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50/40 select-none transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className={`p-3 rounded-2xl transition-colors ${isCatExpanded ? "bg-orange-500 text-white" : "bg-zinc-100 text-zinc-500"}`}
                          >
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-black text-zinc-950 text-sm tracking-tight rtl:tracking-normal uppercase">
                              {catName}
                            </h5>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">
                              {subcatCount} {subcatCount > 1 ? "Sous-catégories" : "Sous-catégorie"} • {subSubcatCount}{" "}
                              {subSubcatCount > 1 ? "Éléments" : "Élément"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCat(catName);
                            }}
                            className="p-3 bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-xl transition-colors"
                            title={t("Supprimer la catégorie principale") || "Supprimer la catégorie principale"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="p-3 bg-zinc-50 rounded-xl text-zinc-400">
                            {isCatExpanded ? (
                              <ChevronDown className="w-4 h-4 text-zinc-900" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Level 2 Area */}
                      <AnimatePresence initial={false}>
                        {isCatExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-[#fafafc]/50"
                          >
                            <div className="p-6 md:p-8 gap-6 space-y-6">
                              {/* Grid of existing Subcategories */}
                              <div className="space-y-4">
                                {Object.entries(subcategories || {}).map(([subcatName, items]) => {
                                  const subKey = `${catName}_${subcatName}`;
                                  const isSubExpanded = !!expandedSubs[subKey];

                                  return (
                                    <div
                                      key={subcatName}
                                      className="bg-white rounded-[2rem] border border-zinc-100/80 p-6 shadow-sm"
                                    >
                                      {/* Level 2 Subcategory Header */}
                                      <div
                                        onClick={() => toggleSub(catName, subcatName)}
                                        className="flex items-center justify-between gap-4 cursor-pointer hover:opacity-90 select-none"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-500">
                                            <Layers className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <h6 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider rtl:tracking-normal">
                                              {subcatName}
                                            </h6>
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-0.5">
                                              {items.length}{" "}
                                              {items.length > 1 ? "Sous-sous-catégories" : "Sous-sous-catégorie"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveSubcat(catName, subcatName);
                                            }}
                                            className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                                            title={t("Supprimer la sous-catégorie") || "Supprimer la sous-catégorie"}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                          <div className="p-2 text-zinc-400">
                                            {isSubExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-zinc-800" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5" />
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Level 3 Sub-subcategories Area */}
                                      <AnimatePresence initial={false}>
                                        {isSubExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="overflow-hidden"
                                          >
                                            <div className="pt-6 border-t border-zinc-100 mt-6 space-y-4">
                                              {/* Tag pills list */}
                                              <div className="flex flex-wrap gap-2.5">
                                                {items.length === 0 ? (
                                                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal py-1">
                                                    {t("Aucune sous-sous-catégorie")}
                                                  </p>
                                                ) : (
                                                  items.map((item) => (
                                                    <div
                                                      key={item}
                                                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-50 border border-zinc-100 hover:border-orange-200 rounded-full group/pill transition-colors"
                                                    >
                                                      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest rtl:tracking-normal">
                                                        {item}
                                                      </span>
                                                      <button
                                                        onClick={() => handleRemoveSubSubcat(catName, subcatName, item)}
                                                        className="p-0.5 bg-white text-zinc-400 hover:text-red-500 hover:scale-115 rounded-full shadow-sm transition-all"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </div>
                                                  ))
                                                )}
                                              </div>

                                              {/* Add Sub-subcat Input Inside */}
                                              <div className="flex items-center gap-2 max-w-sm pt-2">
                                                <input
                                                  type="text"
                                                  placeholder={
                                                    t("Ajouter sous-sous-catégorie...") ||
                                                    "Ajouter sous-sous-catégorie..."
                                                  }
                                                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:border-orange-500"
                                                  value={newSubSubcatNames[subKey] || ""}
                                                  onChange={(e) =>
                                                    setNewSubSubcatNames({
                                                      ...newSubSubcatNames,
                                                      [subKey]: e.target.value,
                                                    })
                                                  }
                                                  onKeyDown={(e) =>
                                                    e.key === "Enter" && handleAddSubSubcat(catName, subcatName)
                                                  }
                                                />
                                                <button
                                                  onClick={() => handleAddSubSubcat(catName, subcatName)}
                                                  className="p-3 bg-zinc-950 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all hover:scale-105"
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Quick Add Subcategory L2 Input */}
                              <div className="bg-white p-5 rounded-[2rem] border border-dashed border-zinc-200 flex items-center gap-3">
                                <div className="text-zinc-400 ps-1">
                                  <CornerDownRight className="w-5 h-5" />
                                </div>
                                <input
                                  type="text"
                                  placeholder={`Ajouter sous-catégorie à "${catName}"...`}
                                  className="flex-1 bg-transparent px-2 outline-none font-bold text-xs"
                                  value={newSubcatNames[catName] || ""}
                                  onChange={(e) => setNewSubcatNames({ ...newSubcatNames, [catName]: e.target.value })}
                                  onKeyDown={(e) => e.key === "Enter" && handleAddSubcat(catName)}
                                />
                                <button
                                  onClick={() => handleAddSubcat(catName)}
                                  className="px-5 py-2.5 bg-zinc-900 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest rtl:tracking-normal transition-all"
                                >
                                  <Plus className="w-3 h-3 inline me-1" /> {t("Ajouter")}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "coupons" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="coupons"
            className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm p-12"
          >
            <div className="flex items-center justify-between mb-10">
              <h4 className="text-2xl font-black flex items-center gap-4 text-zinc-950">
                <Ticket className="w-8 h-8 text-orange-500" />
                {t("Codes Promos & Coupons de la Plateforme (Actifs)")}
              </h4>
              <button
                id="btn-toggle-coupon-form"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal flex items-center gap-2.5 transition-all shadow-md ${showAddForm ? "bg-zinc-900 text-white" : "bg-orange-600 text-white hover:bg-orange-700"}`}
              >
                {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAddForm ? "Fermer le Panel" : "Nouveau Coupon"}
              </button>
            </div>

            {/* Create Coupon Form Panel */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateCoupon}
                  className="bg-zinc-50 border border-zinc-100 p-10 rounded-[2.5rem] overflow-hidden grid md:grid-cols-2 gap-8"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                        {t("Code Coupon *")}
                      </label>
                      <input
                        type="text"
                        required
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-black text-sm uppercase tracking-widest rtl:tracking-normal"
                        placeholder={t("EX: AID2026") || "EX: AID2026"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                        {t("Description")}
                      </label>
                      <input
                        type="text"
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-bold text-sm"
                        placeholder={t("Ex: Remise d'ouverture de boutique") || "Ex: Remise d'ouverture de boutique"}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Type de Réduction")}
                        </label>
                        <select
                          value={couponForm.discountType}
                          onChange={(e) =>
                            setCouponForm({ ...couponForm, discountType: e.target.value as "percent" | "fixed" })
                          }
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-black text-xs uppercase cursor-pointer"
                        >
                          <option value="percent">{t("Pourcentage (%)")}</option>
                          <option value="fixed">{t("Montant Fixe (DA)")}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Valeur de la Remise *")}
                        </label>
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="any"
                          value={couponForm.discountValue}
                          onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-black text-sm"
                          placeholder={couponForm.discountType === "percent" ? "Ex: 15" : "Ex: 500"}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Minimum Achat (DA)")}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={couponForm.minOrderValue}
                          onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-bold text-sm"
                          placeholder={t("Ex: 2000") || "Ex: 2000"}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Remise Max (DA)")}
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={couponForm.discountType !== "percent"}
                          value={couponForm.maxDiscount}
                          onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-bold text-sm disabled:opacity-50"
                          placeholder={t("Ex: 1000") || "Ex: 1000"}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Usage Max (Limité)")}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={couponForm.usageLimit}
                          onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-bold text-sm"
                          placeholder={t("Laisser vide pour infini") || "Laisser vide pour infini"}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1 font-mono">
                          {t("Date d'Expiration *")}
                        </label>
                        <input
                          type="date"
                          required
                          value={couponForm.expiryDate}
                          onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                          className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-xl outline-none font-bold text-sm cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={couponForm.isActive}
                          onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                          className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
                        />
                        <label
                          className="text-xs font-black text-zinc-950 uppercase tracking-wide rtl:tracking-normal cursor-pointer"
                          htmlFor="isActive"
                        >
                          {t("Activer immédiatement le coupon")}
                        </label>
                      </div>
                      <button
                        id="submit-create-coupon"
                        type="submit"
                        disabled={isCreatingCoupon}
                        className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest rtl:tracking-normal rounded-xl disabled:opacity-50 transition-colors shadow-lg"
                      >
                        {isCreatingCoupon ? "Création..." : "Valider & Créer"}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Coupons Listing */}
            <div className="space-y-6">
              {couponsLoading ? (
                <div className="py-20 text-center text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs space-y-4 animate-pulse">
                  <Clock className="w-10 h-10 mx-auto text-zinc-300 animate-spin" />
                  <span>{t("Chargement des coupons de la plateforme...")}</span>
                </div>
              ) : coupons.length === 0 ? (
                <div className="p-20 border-2 border-dashed border-zinc-100 rounded-[2.5rem] text-center space-y-4">
                  <Ticket className="w-16 h-16 text-zinc-100 mx-auto animate-pulse" />
                  <p className="text-zinc-500 font-black text-xs uppercase tracking-widest rtl:tracking-normal">
                    {t("Aucun coupon promotionnel actif.")}
                  </p>
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest rtl:tracking-normal">
                    {t("Lancez vos ventes en créant un nouveau code ci-dessus !")}
                  </p>
                </div>
              ) : (
                coupons.map((coupon) => {
                  const expiry = new Date(coupon.expiryDate);
                  const isExpired = expiry <= new Date();
                  const percentageUsed = coupon.usageLimit
                    ? Math.round(((coupon.usageCount || 0) / coupon.usageLimit) * 100)
                    : null;

                  return (
                    <div
                      key={coupon.id}
                      className={`p-8 rounded-[2.5rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:shadow-zinc-200/20 ${!coupon.isActive ? "bg-zinc-50/50 border-zinc-100 opacity-60" : isExpired ? "bg-red-50/20 border-red-100" : "bg-white border-zinc-100 shadow-sm"}`}
                    >
                      <div className="flex items-start gap-6">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${isExpired ? "bg-red-50 text-red-500 border-red-100" : !coupon.isActive ? "bg-zinc-100 text-zinc-400 border-zinc-200" : "bg-orange-50 text-orange-600 border-orange-100"}`}
                        >
                          {coupon.discountType === "percent" ? (
                            <Percent className="w-6 h-6" />
                          ) : (
                            <Ticket className="w-6 h-6" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h5 className="text-xl font-black text-zinc-950 uppercase tracking-widest rtl:tracking-normal leading-none mt-1 font-mono">
                              {coupon.code}
                            </h5>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest rtl:tracking-normal ${isExpired ? "bg-red-100 text-red-700" : !coupon.isActive ? "bg-zinc-200 text-zinc-600" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              {isExpired ? "Expiré" : !coupon.isActive ? "Désactivé" : "Actif"}
                            </span>
                            {coupon.minOrderValue > 0 && (
                              <span className="bg-zinc-100 text-zinc-600 border border-zinc-200/60 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest rtl:tracking-normal font-mono">
                                {t("Min:")}
                                {formatPrice(coupon.minOrderValue)}
                              </span>
                            )}
                          </div>
                          {coupon.description && (
                            <p className="text-xs text-zinc-500 font-medium">{coupon.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal flex-wrap pt-1 font-mono">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3" /> {t("Remise de -")}
                              {coupon.discountType === "percent"
                                ? `${coupon.discountValue}%`
                                : formatPrice(coupon.discountValue)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3" /> {t("Expiration:")}
                              {expiry.toLocaleDateString("fr-FR")}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3" /> {t("Utilisé")}
                              {coupon.usageCount || 0} {t("fois")}
                              {coupon.usageLimit ? ` / ${coupon.usageLimit}` : " (ILIMITÉ)"}
                            </span>
                          </div>

                          {percentageUsed !== null && (
                            <div className="w-48 pt-2">
                              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-orange-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, percentageUsed)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleToggleCouponActive(coupon.id, coupon.isActive, coupon.code)}
                          className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest rtl:tracking-normal transition-colors ${coupon.isActive ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-850"}`}
                        >
                          {coupon.isActive ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="p-3 bg-red-50 text-red-500 hover:bg-[#ffe4e6] rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "featured" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="featured"
            className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm p-12"
          >
            <h4 className="text-xl font-black flex items-center gap-4 mb-10">
              <Star className="w-7 h-7 text-orange-500 fill-orange-500" />
              {t("Produits mis en avant")}
            </h4>
            <p className="text-zinc-500 font-medium mb-10">
              {t('Sélectionnez les articles qui apparaîtront sur le "Featured Grid" de la page d\'accueil.')}
            </p>
            <div className="p-20 border-2 border-dashed border-zinc-100 rounded-[3rem] text-center">
              <LayoutGrid className="w-16 h-16 text-zinc-100 mx-auto mb-6" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs">
                {t('Utilisez le module Modération pour flagger un produit comme "Featured".')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
