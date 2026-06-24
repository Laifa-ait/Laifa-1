import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Save,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Pin,
  X,
  Search,
  Check,
  Star,
  Sparkles,
  ArrowRight,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { auth, db, storage } from "../../lib/firebase";
import { collection, doc, getDocs, getDoc, setDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Product } from "../../types";
import { PRODUCT_HIERARCHY, CATEGORY_ICONS } from "../../constants";
import { LayoutGrid, Trash2, Edit2, Globe } from "lucide-react";
import { useShop } from "../../context/ShopContext";
import { useTranslation } from "react-i18next";

const ALL_STORE_CATEGORIES = [
  "Supermarché",
  "Maison & Déco",
  "Mode",
  "Beauté & Santé",
  "Électronique",
  "Électroménager",
  "Scolaire & Bureau",
  "Auto & Moto",
  "Sport & Loisirs",
  "Bébé & Puériculture",
  "Bricolage & Outillage",
  "Jeux & Jouets",
];

const DEFAULT_CATEGORIES_METADATA: Record<
  string,
  { title: string; subtitle: string; image: string; gradient: string }
> = {
  Supermarché: {
    title: "Supermarché",
    subtitle: "Quotidien & Essentiels",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-[#3C2B22]/80 via-[#3C2B22]/20 to-transparent",
  },
  "Maison & Déco": {
    title: "Maison & Design",
    subtitle: "Modernité algérienne",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
  Mode: {
    title: "Mode & Style",
    subtitle: "Collections Saisonnières",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
  "Beauté & Santé": {
    title: "Beauté & Pureté",
    subtitle: "Soins naturels & Bio",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
  Électronique: {
    title: "Tech & Performance",
    subtitle: "Gadgets connectés",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
  Électroménager: {
    title: "Électroménager",
    subtitle: "Pour la maison",
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
  "Scolaire & Bureau": {
    title: "Scolaire & Bureau",
    subtitle: "Livres, fournitures & rentrée",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop",
    gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
  },
};

export const CategoriesAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");
  const { categoryHierarchy: globalHierarchy, refreshHierarchy } = useShop();
  const [hierarchy, setHierarchy] = useState<Record<string, Record<string, string[]>>>(globalHierarchy);
  const [activeTab, setActiveTab] = useState<"visuals" | "hierarchy">("visuals");

  const [hierarchyCategories, setHierarchyCategories] = useState<string[]>(Object.keys(globalHierarchy));
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Category specific customizations
  const [catTitle, setCatTitle] = useState("");
  const [catSubtitle, setCatSubtitle] = useState("");
  const [catImage, setCatImage] = useState("");
  const [colorTheme, setColorTheme] = useState("");

  // Products associated values
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [subCategoryImages, setSubCategoryImages] = useState<Record<string, string>>({});
  const [uploadingSub, setUploadingSub] = useState<string | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Load Hierarchy Categories
  useEffect(() => {
    setHierarchy(globalHierarchy);
    setHierarchyCategories(Object.keys(globalHierarchy));
    if (Object.keys(globalHierarchy).length > 0 && !selectedCategory) {
      setSelectedCategory(Object.keys(globalHierarchy)[0]);
    }
  }, [globalHierarchy]);

  // Load the configuration and category products
  const loadCategoryData = async (catName: string) => {
    if (!catName) return;
    setIsLoading(true);
    setSearchQuery("");
    try {
      // 1. Fetch config from custom database
      const docRef = doc(db, "homepage_categories_v2", catName);
      const docSnap = await getDoc(docRef);

      const defaultMeta = DEFAULT_CATEGORIES_METADATA[catName] || {
        title: catName,
        subtitle: "Découvrez notre collection",
        image: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=600",
        gradient: "from-zinc-950/80 via-zinc-950/20 to-transparent",
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCatTitle(data.title || defaultMeta.title);
        setCatSubtitle(data.subtitle || defaultMeta.subtitle);
        setCatImage(data.image || defaultMeta.image);
        setFeaturedProductIds(data.featuredProductIds || []);
        setSubCategoryImages(data.subCategoryImages || {});
        setColorTheme(data.color_theme || "");
      } else {
        setCatTitle(defaultMeta.title);
        setCatSubtitle(defaultMeta.subtitle);
        setCatImage(defaultMeta.image);
        setFeaturedProductIds([]);
        setSubCategoryImages({});
        setColorTheme("");
      }

      // 2. Fetch category products
      const { limit } = await import("firebase/firestore");
      const pQuery = query(collection(db, "products"), where("category", "==", catName), limit(50));
      const pSnap = await getDocs(pQuery);
      const products = pSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as Product);
      setCategoryProducts(products);
    } catch (err) {
      console.error("Error loading category parameters:", err);
      toast.error(t("Erreur d'importation des réglages de la catégorie"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData(selectedCategory);
  }, [selectedCategory]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("Image trop lourde (Max 5Mo)"));
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Upload de la photo de catégorie...");
    try {
      const storageRef = ref(storage, `categories_covers/${selectedCategory.replace(/\s+/g, "_")}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setCatImage(downloadURL);
      toast.success(t("Image importée avec succès ! 📸"), { id: toastId });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(t("Erreur de téléversement de l'image."), { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // Move product to premier features
  const pinProduct = (productId: string) => {
    if (featuredProductIds.includes(productId)) return;
    setFeaturedProductIds((prev) => [...prev, productId]);
  };

  // Remove product from premier features
  const unpinProduct = (productId: string) => {
    setFeaturedProductIds((prev) => prev.filter((id) => id !== productId));
  };

  // Shift rank position (up/down)
  const movePinnedRank = (index: number, direction: "up" | "down") => {
    const nextArr = [...featuredProductIds];
    if (direction === "up" && index > 0) {
      const temp = nextArr[index];
      nextArr[index] = nextArr[index - 1];
      nextArr[index - 1] = temp;
    } else if (direction === "down" && index < nextArr.length - 1) {
      const temp = nextArr[index];
      nextArr[index] = nextArr[index + 1];
      nextArr[index + 1] = temp;
    }
    setFeaturedProductIds(nextArr);
  };

  // Save changes to homepage_categories_v2
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // 1. Save Visuels
      const docRef = doc(db, "homepage_categories_v2", selectedCategory);
      await setDoc(
        docRef,
        {
          id: selectedCategory,
          title: catTitle.trim(),
          subtitle: catSubtitle.trim(),
          image: catImage,
          gradient: "from-[#1h4356]/80 via-zinc-950/20 to-transparent",
          featuredProductIds: featuredProductIds,
          subCategoryImages: subCategoryImages,
          color_theme: colorTheme.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Save Hierarchy
      const hierarchyRef = doc(db, "settings", "categories");
      await setDoc(
        hierarchyRef,
        {
          hierarchy,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Refresh global context
      await refreshHierarchy();

      // Clear sessions storage so clients pull fresh images and products listings
      sessionStorage.removeItem("home_custom_categories");
      toast.success(t("Catégorie et hiérarchie mis à jour avec succès ! ✨🚀"));

      // Auto-translate if hierarchy changed
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const harvestedKeys: string[] = [];
        Object.keys(hierarchy).forEach((cat) => {
          harvestedKeys.push(cat);
          if (hierarchy[cat]) {
            Object.keys(hierarchy[cat]).forEach((sub) => {
              harvestedKeys.push(sub);
              if (Array.isArray(hierarchy[cat][sub])) {
                hierarchy[cat][sub].forEach((ss) => harvestedKeys.push(ss));
              }
            });
          }
        });

        fetch("/api/admin/translate-ui", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ harvestedKeys }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.count > 0) {
              toast.success(`${data.count} nouveaux termes traduits automatiquement ! 🌍`);
            }
          });
      } catch (tErr) {
        console.warn("Auto-translation error:", tErr);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      const errorCode = err?.code ? ` [Code: ${err.code}]` : "";
      toast.error(`Erreur lors de la sauvegarde : ${err?.message || err || "Erreur inconnue"}${errorCode}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, subName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("Image trop lourde (Max 5Mo)"));
      return;
    }

    setUploadingSub(subName);
    const toastId = toast.loading(`Upload de l'image de la sous-catégorie ${subName}...`);
    try {
      const storageRef = ref(
        storage,
        `subcategories_images/${selectedCategory.replace(/\s+/g, "_")}_${subName.replace(/\s+/g, "_")}_${Date.now()}`
      );
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setSubCategoryImages((prev) => ({
        ...prev,
        [subName]: downloadURL,
      }));
      toast.success(`Image de "${subName}" importée ! 📸`, { id: toastId });
    } catch (err) {
      console.error("Subcategory upload error:", err);
      toast.error(t("Erreur de téléversement de l'image."), { id: toastId });
    } finally {
      setUploadingSub(null);
    }
  };

  // Split products into pinned products and other products
  const pinnedProductsList = useMemo(() => {
    return featuredProductIds.map((id) => categoryProducts.find((p) => p.id === id)).filter((p): p is Product => !!p);
  }, [featuredProductIds, categoryProducts]);

  const otherProductsList = useMemo(() => {
    const unpinned = categoryProducts.filter((p) => !featuredProductIds.includes(p.id));
    if (!searchQuery.trim()) return unpinned;
    return unpinned.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categoryProducts, featuredProductIds, searchQuery]);

  // Hierarchy Management Functions
  const addCategory = () => {
    const promptText = isArabic ? "اسم الفئة الجديدة:" : "Nom de la nouvelle catégorie :";
    const name = prompt(promptText);
    if (!name || hierarchy[name]) return;
    setHierarchy((prev) => ({ ...prev, [name]: {} }));
    toast.success(isArabic ? `تمت إضافة الفئة "${name}" بنجاح.` : `Catégorie "${name}" ajoutée.`);
  };

  const removeCategory = (name: string) => {
    const confirmText = isArabic
      ? `هل تريد حذف الفئة "${name}" وجميع فئاتها الفرعية؟`
      : `Supprimer la catégorie "${name}" et toutes ses sous-catégories ?`;
    if (!window.confirm(confirmText)) return;
    setHierarchy((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    if (selectedCategory === name) setSelectedCategory("");
    toast.success(isArabic ? `تم حذف الفئة "${name}".` : `Catégorie "${name}" supprimée.`);
  };

  const addSubCategory = (catName: string) => {
    const promptText = isArabic ? `اسم الفئة الفرعية لـ "${catName}":` : `Nom de la sous-catégorie pour "${catName}" :`;
    const name = prompt(promptText);
    if (!name || hierarchy[catName][name]) return;
    setHierarchy((prev) => ({
      ...prev,
      [catName]: { ...prev[catName], [name]: [] },
    }));
    toast.success(isArabic ? `تمت إضافة الفئة الفرعية "${name}".` : `Sous-catégorie "${name}" ajoutée.`);
  };

  const removeSubCategory = (catName: string, subName: string) => {
    const confirmText = isArabic
      ? `هل تريد حذف الفئة الفرعية "${subName}"؟`
      : `Supprimer la sous-catégorie "${subName}" ?`;
    if (!window.confirm(confirmText)) return;
    setHierarchy((prev) => ({
      ...prev,
      [catName]: Object.fromEntries(Object.entries(prev[catName]).filter(([k]) => k !== subName)),
    }));
    toast.success(isArabic ? `تم حذف الفئة الفرعية "${subName}".` : `Sous-catégorie "${subName}" supprimée.`);
  };

  const addSubSubCategory = (catName: string, subName: string) => {
    const promptText = isArabic ? `اسم العنصر لـ "${subName}":` : `Nom de l'élément pour "${subName}" :`;
    const name = prompt(promptText);
    if (!name || hierarchy[catName][subName].includes(name)) return;
    setHierarchy((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        [subName]: [...prev[catName][subName], name],
      },
    }));
    toast.success(isArabic ? `تمت إضافة العنصر "${name}".` : `Élément "${name}" ajouté.`);
  };

  const removeSubSubCategory = (catName: string, subName: string, subSubName: string) => {
    setHierarchy((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        [subName]: prev[catName][subName].filter((s) => s !== subSubName),
      },
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <span className="text-[10px] font-kinder uppercase text-[#FF5C00] tracking-widest rtl:tracking-normal leading-none">
            {t("Espace Administrateur")}
          </span>
          <h2 className="text-3xl font-kinder text-[#3C2B22] uppercase tracking-tighter rtl:tracking-normal mt-1">
            {t("Gestion du Catalogue")}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setActiveTab("visuals")}
              className={`text-xs font-black uppercase tracking-widest rtl:tracking-normal px-4 py-2 rounded-xl transition-all border-none cursor-pointer ${
                activeTab === "visuals" ? "bg-[#3C2B22] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {t("Visuels & Tri")}
            </button>
            <button
              onClick={() => setActiveTab("hierarchy")}
              className={`text-xs font-black uppercase tracking-widest rtl:tracking-normal px-4 py-2 rounded-xl transition-all border-none cursor-pointer ${
                activeTab === "hierarchy" ? "bg-[#3C2B22] text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {t("Hiérarchie (Structure)")}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const idToken = await auth.currentUser?.getIdToken();
              const harvestedKeys: string[] = [];
              Object.keys(hierarchy).forEach((cat) => {
                harvestedKeys.push(cat);
                if (hierarchy[cat]) {
                  Object.keys(hierarchy[cat]).forEach((sub) => {
                    harvestedKeys.push(sub);
                    if (Array.isArray(hierarchy[cat][sub])) {
                      hierarchy[cat][sub].forEach((ss) => harvestedKeys.push(ss));
                    }
                  });
                }
              });

              toast.promise(
                fetch("/api/admin/translate-ui", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({ harvestedKeys }),
                }).then((r) => r.json()),
                {
                  loading: "Lancement de la traduction AI...",
                  success: (data) =>
                    `${data.count || 0} termes traduits ! ${data.remaining > 0 ? `(Encore ${data.remaining} à faire, recliquez...)` : ""}`,
                  error: "Erreur lors de la traduction.",
                }
              );
            }}
            className="flex items-center justify-center gap-2 px-4 py-3.5 bg-zinc-800 hover:bg-black text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-all rounded-2xl shadow-lg border-none cursor-pointer self-start md:self-center shrink-0"
          >
            <Globe className="w-4 h-4" />
            {t("Traduire AI")}
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FF5C00] hover:bg-[#A94320] disabled:bg-zinc-300 text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-all rounded-2xl shadow-lg border-none cursor-pointer self-start md:self-center shrink-0"
          >
            <Save className="w-4.5 h-4.5" />
            {isSaving ? "Envoi..." : "Tout Enregistrer"}
          </button>
        </div>
      </div>

      {activeTab === "hierarchy" ? (
        <div className="bg-white rounded-3xl border border-[#FF5C00] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-kinder text-[#3C2B22] uppercase tracking-wider rtl:tracking-normal">
                {t("Structure du Catalogue")}
              </h3>
              <p className="text-xs font-bold text-zinc-400 mt-1">
                {t("Ajoutez, modifiez ou supprimez les catégories et sous-catégories de votre boutique.")}
              </p>
            </div>
            <button
              onClick={addCategory}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-kinder uppercase tracking-widest rtl:tracking-normal transition-all border-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("Catégorie")}
            </button>
          </div>

          <div className="space-y-6 mt-8">
            {Object.entries(hierarchy).map(([catName, subCats]) => (
              <div key={catName} className="border border-zinc-100 rounded-3xl p-6 bg-zinc-50/30">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-[#FF5C00]" />
                    <h4 className="text-base font-kinder text-[#3C2B22] uppercase">{catName}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addSubCategory(catName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-600 hover:text-black border border-zinc-200 rounded-lg text-[10px] font-kinder uppercase cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t("Sous-catégorie")}
                    </button>
                    <button
                      onClick={() => removeCategory(catName)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(subCats).map(([subName, subSubs]) => {
                    return (
                      <div key={subName} className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-kinder text-[#3C2B22] uppercase truncate pe-2">
                            {subName}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => addSubSubCategory(catName, subName)}
                              className="p-1 text-zinc-400 hover:text-green-600 bg-transparent border-none cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeSubCategory(catName, subName)}
                              className="p-1 text-zinc-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subSubs.map((subSub) => (
                            <div
                              key={subSub}
                              className="flex items-center gap-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg group"
                            >
                              <span className="text-[9px] font-bold text-zinc-500">{subSub}</span>
                              <button
                                onClick={() => removeSubSubCategory(catName, subName, subSub)}
                                className="p-0.5 text-zinc-300 group-hover:text-red-500 bg-transparent border-none cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          {subSubs.length === 0 && <span className="text-[9px] italic text-zinc-300">{t("Vide")}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(subCats).length === 0 && (
                    <div className="col-span-full py-4 text-center text-zinc-400 text-[10px] font-bold border border-dashed border-zinc-200 rounded-2xl">
                      {t("Aucune sous-catégorie définie.")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Categories selector list */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#FF5C00] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-kinder uppercase text-[#3C2B22] tracking-wider rtl:tracking-normal mb-2">
              {t("🏷️ Liste des Catégories")}
            </h3>
            <div className="flex flex-col gap-2">
              {hierarchyCategories.map((catName) => {
                const isSelected = selectedCategory === catName;
                const Icon = CATEGORY_ICONS[catName] || LayoutGrid;
                return (
                  <button
                    key={catName}
                    onClick={() => setSelectedCategory(catName)}
                    className={`w-full text-start px-5 py-4 rounded-2xl font-black text-xs transition-all relative cursor-pointer border flex items-center justify-between group ${
                      isSelected
                        ? "bg-[#3C2B22] text-white border-[#3C2B22] shadow-md scale-[1.01]"
                        : "bg-[#FDF9EC]/20 hover:bg-[#FDF9EC]/60 text-[#3C2B22] border-[#FF5C00]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-orange-400" : "text-[#FF5C00]"}`} />
                      <span className="tracking-wide">{catName}</span>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isSelected ? "text-white" : "text-[#FF5C00]"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: Category customization details & products order block */}
          <div className="lg:col-span-8 space-y-8">
            {isLoading ? (
              <div className="bg-white rounded-3xl border border-[#FF5C00] p-24 text-center">
                <span className="text-sm font-bold text-zinc-400 animate-pulse">
                  {t("Chargement de la catégorie")}
                  {selectedCategory}...
                </span>
              </div>
            ) : (
              <>
                {/* Section 1: Photos applies */}
                <div className="bg-white rounded-3xl border border-[#FF5C00] p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                    <span className="text-lg">🎨</span>
                    <h3 className="text-base font-kinder text-[#3C2B22] uppercase tracking-wider rtl:tracking-normal">
                      {t("Visuel & Couverture")}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal mb-1">
                          {t("Titre personnalisé (Affichage boutique)")}
                        </label>
                        <input
                          type="text"
                          value={catTitle}
                          onChange={(e) => setCatTitle(e.target.value)}
                          placeholder={t("Ex: Tissage & Tapis...") || "Ex: Tissage & Tapis..."}
                          className="w-full px-4 py-3 border border-zinc-200 focus:outline-none focus:border-[#FF5C00] rounded-xl font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal mb-1">
                          {t("Sous-titre / Description Courte")}
                        </label>
                        <input
                          type="text"
                          value={catSubtitle}
                          onChange={(e) => setCatSubtitle(e.target.value)}
                          placeholder={t("Ex: Tapis berbères tissés main...") || "Ex: Tapis berbères tissés main..."}
                          className="w-full px-4 py-3 border border-zinc-200 focus:outline-none focus:border-[#FF5C00] rounded-xl font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal mb-1">
                          {t("Couleur de thème de la catégorie (Code Hex)")}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={
                              colorTheme && colorTheme.startsWith("#") && colorTheme.length === 7
                                ? colorTheme
                                : "#FF5C00"
                            }
                            onChange={(e) => setColorTheme(e.target.value)}
                            className="w-11 h-11 p-1 border border-zinc-200 rounded-xl cursor-pointer shrink-0 bg-white"
                            title={t("Sélecteur de couleur") || "Sélecteur de couleur"}
                          />
                          <input
                            type="text"
                            value={colorTheme}
                            onChange={(e) => setColorTheme(e.target.value)}
                            placeholder={t("Ex: #FF5C00 ou #3C2B22") || "Ex: #FF5C00 ou #3C2B22"}
                            className="flex-1 px-4 py-3 border border-zinc-200 focus:outline-none focus:border-[#FF5C00] rounded-xl font-bold text-xs"
                          />
                          {colorTheme && (
                            <button
                              type="button"
                              onClick={() => setColorTheme("")}
                              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-650 font-bold px-3 py-1 text-xs rounded-xl cursor-pointer border hover:border-zinc-300 transition-colors"
                            >
                              {t("Réinitialiser")}
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-zinc-400 mt-1">
                          {t(
                            "Utilisez un code hexadécimal à 6 caractères (ex: #FF5C00) pour définir la teinte d'accent de cette catégorie."
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal mb-1">
                          {t("Photo de couverture de la Catégorie")}
                        </label>
                        <div className="space-y-3">
                          {!catImage ? (
                            <label className="flex flex-col items-center justify-center p-6 bg-zinc-50 border-2 border-dashed border-zinc-200 hover:border-[#FF5C00] rounded-2xl cursor-pointer transition-all">
                              <ImageIcon className="w-8 h-8 text-zinc-300 mb-2" />
                              <span className="text-xs font-bold text-zinc-600">
                                {t("Sélectionner une photo de couverture")}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-bold mt-1">
                                {t("Max 5Mo • PNG, JPG, WEBP")}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                              />
                            </label>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                              <span className="text-xs font-bold text-zinc-600 truncate max-w-[280px]">
                                {t("Image active")}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCatImage("")}
                                className="text-xs text-red-500 font-bold hover:underline bg-transparent border-none cursor-pointer"
                              >
                                {t("Supprimer")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rendering mock card layout */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal">
                        {t("Rendu de la bannière sur la page d'accueil")}
                      </span>
                      <div className="relative h-64 rounded-3xl overflow-hidden shadow-sm bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                        {catImage ? (
                          <>
                            <img
                              loading="lazy"
                              src={catImage}
                              className="w-full h-full object-cover"
                              alt={t("Category Cover") || "Category Cover"}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />
                            <div className="absolute bottom-6 start-6 text-start">
                              <span className="bg-[#FF5C00] text-[8px] font-kinder uppercase text-white px-2 py-0.5 rounded-full mb-1 inline-block tracking-widest rtl:tracking-normal">
                                {t("EXPLORER ⭐")}
                              </span>
                              <h4 className="text-base font-kinder text-white uppercase tracking-tight rtl:tracking-normal">
                                {catTitle || selectedCategory}
                              </h4>
                              <p className="text-xs text-zinc-200 mt-1">
                                {catSubtitle || "Nos pièces sélectionnées d'excellence"}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-6 text-zinc-300">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-zinc-250 animate-pulse" />
                            <p className="text-xs font-bold">{t("Veuillez importer ou assigner une photo")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Photos des Sous-Catégories */}
                <div className="bg-white rounded-3xl border border-[#FF5C00] p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <h3 className="text-base font-kinder text-[#3C2B22] uppercase tracking-wider rtl:tracking-normal">
                        {t("Photos des Sous-Catégories (")}
                        {selectedCategory})
                      </h3>
                    </div>
                    <span className="text-[10px] font-kinder text-[#FF5C00] uppercase tracking-widest rtl:tracking-normal bg-orange-50 px-3 py-1.5 rounded-full">
                      {Object.keys(PRODUCT_HIERARCHY[selectedCategory] || {}).length} {t("sous-catégories")}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-zinc-500">
                    {t(
                      "Définissez des photos de haute qualité pour chaque sous-catégorie. Ces bannières s'ouvriront directement sur le menu de navigation de l'application mobile."
                    )}
                  </p>

                  <div className="flex flex-col gap-8">
                    {Object.entries(PRODUCT_HIERARCHY[selectedCategory] || {}).map(([subName, subSubCategories]) => (
                      <div key={subName} className="space-y-4">
                        {/* En-tête Sous-Catégorie */}
                        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2">
                          <span className="text-xl">📁</span>
                          <h4 className="text-sm font-kinder text-[#3C2B22] uppercase tracking-widest rtl:tracking-normal">
                            {subName}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sous-catégorie elle-même */}
                          <div className="flex flex-col gap-3 p-4 border-2 border-[#3C2B22]/20 bg-[#FDF9EC]/20 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 end-0 bg-[#3C2B22] text-white text-[8px] font-kinder uppercase px-2 py-1 rounded-bl-xl z-10">
                              {t("Sous-catégorie")}
                            </div>
                            <div className="flex items-center justify-between min-w-0 mt-2">
                              <span className="text-xs font-kinder text-[#3C2B22] truncate uppercase tracking-tight rtl:tracking-normal">
                                {subName}
                              </span>
                              {subCategoryImages[subName] ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubCategoryImages((prev) => {
                                      const updated = { ...prev };
                                      delete updated[subName];
                                      return updated;
                                    });
                                  }}
                                  className="text-[9px] text-red-500 font-kinder uppercase hover:underline cursor-pointer bg-transparent border-none relative z-20"
                                >
                                  {t("Réinitialiser")}
                                </button>
                              ) : (
                                <span className="text-[9px] font-kinder text-amber-500 uppercase tracking-widest rtl:tracking-normal italic relative z-20">
                                  {t("Image par défaut")}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-4 items-center">
                              {/* Image preview box */}
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 relative flex items-center justify-center">
                                {uploadingSub === subName ? (
                                  <div className="w-4 h-4 rounded-full border-2 border-[#3C2B22] border-t-transparent animate-spin" />
                                ) : subCategoryImages[subName] ? (
                                  <img
                                    loading="lazy"
                                    src={subCategoryImages[subName]}
                                    className="w-full h-full object-cover"
                                    alt={subName}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[10px] font-kinder text-zinc-300">{t("N/A") || "N/A"}</span>
                                )}
                              </div>

                              {/* Image Upload triggers */}
                              <div className="flex-1 space-y-2 relative z-20">
                                <div className="flex w-full">
                                  <label className="cursor-pointer w-full text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-[#FF5C00] hover:text-[#A94320] bg-orange-50 border border-dashed border-orange-200 hover:border-orange-300 px-3 py-2 rounded-lg text-center transition-colors">
                                    {t("Téléverser Image")}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploadingSub !== null}
                                      onChange={(e) => handleSubCategoryFileUpload(e, subName)}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sous-sous catégories liées */}
                          {subSubCategories.map((subSubName) => {
                            const customImg = subCategoryImages[subSubName] || "";
                            const isUploadingThis = uploadingSub === subSubName;

                            return (
                              <div
                                key={subSubName}
                                className="flex flex-col gap-3 p-4 border border-[#FF5C00] hover:border-orange-300/40 rounded-2xl bg-white transition-all ms-4 md:ms-0"
                              >
                                <div className="flex items-center justify-between min-w-0">
                                  <span className="text-[10px] font-kinder text-zinc-600 truncate uppercase tracking-tight rtl:tracking-normal flex items-center gap-2">
                                    <span className="text-orange-400">↳</span> {subSubName}
                                  </span>
                                  {customImg ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSubCategoryImages((prev) => {
                                          const updated = { ...prev };
                                          delete updated[subSubName];
                                          return updated;
                                        });
                                      }}
                                      className="text-[9px] text-red-500 font-kinder uppercase hover:underline cursor-pointer bg-transparent border-none"
                                    >
                                      {t("Réinitialiser")}
                                    </button>
                                  ) : (
                                    <span className="text-[8px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal italic">
                                      {t("Nécessite une image")}
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-4 items-center">
                                  {/* Image preview box */}
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FDF9EC]/50 border border-zinc-100 shrink-0 relative flex items-center justify-center">
                                    {isUploadingThis ? (
                                      <div className="w-3 h-3 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                                    ) : customImg ? (
                                      <img
                                        loading="lazy"
                                        src={customImg}
                                        className="w-full h-full object-cover"
                                        alt={subSubName}
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="text-[8px] font-kinder text-zinc-300">{t("N/A") || "N/A"}</span>
                                    )}
                                  </div>

                                  {/* Image Upload triggers */}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex w-full">
                                      <label className="cursor-pointer w-full text-[9px] font-bold uppercase tracking-wider rtl:tracking-normal text-zinc-600 hover:text-black bg-zinc-50 border-zinc-300 border-dashed border hover:border-zinc-400 px-2 py-2 rounded-lg text-center transition-colors">
                                        {t("Téléverser Image")}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={uploadingSub !== null}
                                          onChange={(e) => handleSubCategoryFileUpload(e, subSubName)}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Choose Products displaying first */}
                <div className="bg-white rounded-3xl border border-[#FF5C00] p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <h3 className="text-base font-kinder text-[#3C2B22] uppercase tracking-wider rtl:tracking-normal">
                        {t("Produits à afficher en premier")}
                      </h3>
                    </div>
                    <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal bg-zinc-100 px-3 py-1.5 rounded-full">
                      {pinnedProductsList.length} {t("produits épinglés")}
                    </span>
                  </div>

                  {/* Sub-block A: Priority Rank list */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-kinder uppercase text-[#FF5C00] tracking-wider rtl:tracking-normal">
                      {t("🚀 Ordre de priorité (Le premier s'affiche en tête de liste)")}
                    </span>

                    {pinnedProductsList.length === 0 ? (
                      <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-8 text-center text-zinc-400">
                        <Star className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs font-bold">{t("Aucun produit configuré en premier pour le moment.")}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          {t("Associez des produits depuis la liste ci-dessous.")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pe-1">
                        <AnimatePresence initial={false}>
                          {pinnedProductsList.map((product, index) => {
                            return (
                              <motion.div
                                key={product.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 450,
                                  damping: 38,
                                  layout: { duration: 0.3, type: "spring" },
                                }}
                                className="flex items-center justify-between border border-orange-100 bg-orange-50/40 hover:bg-orange-50/80 p-3.5 rounded-2xl transition-all"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-kinder text-[#FF5C00] w-6 text-center">
                                    #{index + 1}
                                  </span>
                                  <img
                                    loading="lazy"
                                    alt=""
                                    src={
                                      product?.images?.[0] ||
                                      "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=80"
                                    }
                                    className="w-10 h-10 object-cover rounded-xl border border-[#FF5C00]"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-kinder text-[#3C2B22] truncate">{product.name}</h4>
                                    <p className="text-[10px] text-zinc-400 font-bold">
                                      {product.price} {t("DZD • par")}
                                      <span className="text-zinc-500">{product.sellerName || "Vendeur"}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Sort Actions Up/Down */}
                                  <button
                                    type="button"
                                    onClick={() => movePinnedRank(index, "up")}
                                    disabled={index === 0}
                                    className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 disabled:opacity-30 rounded-lg bg-transparent border-none cursor-pointer"
                                    title={t("Déplacer vers le haut") || "Déplacer vers le haut"}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePinnedRank(index, "down")}
                                    disabled={index === pinnedProductsList.length - 1}
                                    className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 disabled:opacity-30 rounded-lg bg-transparent border-none cursor-pointer"
                                    title={t("Déplacer vers le bas") || "Déplacer vers le bas"}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => unpinProduct(product.id)}
                                    className="p-1 hover:bg-red-50 text-red-500 hover:bg-red-100/50 rounded-lg ms-2 bg-transparent border-none cursor-pointer"
                                    title={t("Retirer la priorité") || "Retirer la priorité"}
                                  >
                                    <X className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Sub-block B: Other products in the selected category */}
                  <div className="space-y-3 pt-4 border-t border-zinc-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="block text-[10px] font-kinder uppercase text-zinc-400 tracking-wider rtl:tracking-normal">
                        {t("🛍️ Tous les autres produits (")}
                        {selectedCategory})
                      </span>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute start-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("Rechercher par nom...") || "Rechercher par nom..."}
                          className="w-full ps-9 pe-4 py-2 border border-zinc-200 focus:outline-none focus:border-[#FF5C00] rounded-xl font-bold text-[11px]"
                        />
                      </div>
                    </div>

                    {otherProductsList.length === 0 ? (
                      <div className="text-center p-8 text-zinc-400 text-xs border border-dashed border-zinc-100 rounded-2xl">
                        {t("Aucun produit disponible d'autre ou correspondant à la recherche.")}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pe-1">
                        {otherProductsList.map((product) => {
                          return (
                            <div
                              key={product.id}
                              className="flex items-center justify-between border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 p-3 rounded-2xl transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  loading="lazy"
                                  alt=""
                                  src={
                                    product?.images?.[0] ||
                                    "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=80"
                                  }
                                  className="w-9 h-9 object-cover rounded-xl border border-[#FF5C00]"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-[#3C2B22] truncate">{product.name}</h4>
                                  <p className="text-[10px] text-zinc-400">
                                    {product.price} {t("DZD • par")}
                                    {product.sellerName || "Vendeur"}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => pinProduct(product.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-orange-50 text-zinc-650 hover:text-[#FF5C00] rounded-xl text-[10px] font-kinder uppercase border-none cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> {t("Épingler")}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
