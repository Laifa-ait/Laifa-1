import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Check,
  X,
  Image as ImageIcon,
  LayoutTemplate,
  Search,
  Save,
  Sparkles,
  Star,
  Zap,
  Flame,
  Award,
  History,
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { useFirebaseHomepage } from "../../hooks/useFirebaseHomepage";
import { useHomepageBuilder } from "../../hooks/useHomepageBuilder";
import { useAuth } from "../../context/AuthContext";
import { HomepageSection, Banner, Product } from "../../types";
import { auth, db, storage } from "../../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  limit,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { MOCK_PRODUCTS } from "../../utils/mockProducts";
import { DEFAULT_CATEGORIES } from "../../data/categories";
import { formatPrice } from "../../utils/format";
import { ALGERIA_WILAYAS, PRODUCT_HIERARCHY } from "../../constants";
import { useTranslation } from "react-i18next";

const SECTION_TYPES_METADATA = [
  {
    type: "top_picks" as const,
    title: "Top Picks (Sélection Vedette)",
    titleAr: "أفضل الاختيارات (مميز)",
    desc: "Carousel ou grille des meilleures offres triées à la main par l'équipe admin Olmart.",
    descAr: "عرض دائري أو شبكة لأفضل العروض المنسقة يدويًا بواسطة فريق الإدارة.",
    icon: "Star",
    color: "text-amber-500 bg-amber-50 border-amber-200",
    colorActive: "border-amber-500 bg-amber-500/10",
  },
  {
    type: "flash_sale" as const,
    title: "Flash Sale (Ventes Flash)",
    titleAr: "عروض فلاش السريعة",
    desc: "Ventes à temps limité avec un compte à rebours de fin d'activité et badges de remise élevés.",
    descAr: "مبيعات محدودة الوقت مع عد تنازلي وتخفيضات مغرية.",
    icon: "Zap",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    colorActive: "border-orange-600 bg-orange-600/10",
  },
  {
    type: "new_arrivals" as const,
    title: "New Arrivals (Nouveautés)",
    titleAr: "وصل حديثًا (الجديد)",
    desc: "Produits récemment ajoutés sur le marketplace, propulsés de manière automatique.",
    descAr: "المنتجات المضافة حديثًا إلى السوق والمروجة تلقائيًا.",
    icon: "Plus",
    color: "text-blue-500 bg-blue-50 border-blue-200",
    colorActive: "border-blue-500 bg-blue-500/10",
  },
  {
    type: "trending" as const,
    title: "Trending (Tendances)",
    titleAr: "المنتجات الشائعة",
    desc: "Articles les plus consultés et commandés par la communauté ces dernières 48 heures.",
    descAr: "المنتجات الأكثر مشاهدة وطلبًا من قبل المجتمع خلال الـ 48 ساعة الماضية.",
    icon: "Flame",
    color: "text-rose-500 bg-rose-50 border-rose-200",
    colorActive: "border-rose-500 bg-rose-500/10",
  },
  {
    type: "recommended" as const,
    title: "Recommended (Recommandé)",
    titleAr: "مقترح لك",
    desc: "Algorithme intelligent affichant des recommandations basées sur les visites de l'acheteur.",
    descAr: "خوارزمية ذكية تعرض توصيات مخصصة بناءً على تصفح المشتري.",
    icon: "Sparkles",
    color: "text-purple-500 bg-purple-50 border-purple-200",
    colorActive: "border-purple-500 bg-purple-500/10",
  },
  {
    type: "brands" as const,
    title: "Sellers (Vendeurs Officiels)",
    titleAr: "البائعون الرسميون",
    desc: "Grille des boutiques certifiées d'Algérie avec logo de certification officiel.",
    descAr: "شبكة من المتاجر المعتمدة في الجزائر مع شعار التوثيق الرسمي.",
    icon: "Award",
    color: "text-emerald-500 bg-emerald-50 border-emerald-200",
    colorActive: "border-emerald-500 bg-emerald-500/10",
  },
];

const getSectionIcon = (iconName: string, className = "w-4 h-4") => {
  switch (iconName) {
    case "Star": return <Star className={className} />;
    case "Zap": return <Zap className={className} />;
    case "Plus": return <Plus className={className} />;
    case "Flame": return <Flame className={className} />;
    case "Sparkles": return <Sparkles className={className} />;
    case "Award": return <Award className={className} />;
    default: return <LayoutTemplate className={className} />;
  }
};

export const HomepageBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { isLoading: hookIsLoading, fetchData: fetchHookData, saveItem: saveHookItem } = useFirebaseHomepage();
  const { deleteItem, uploadMedia } = useHomepageBuilder();
  const [activeTab, setActiveTab] = useState<"sections" | "banners" | "categories">("sections");

  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchSecProduct, setSearchSecProduct] = useState("");
  const [modalSearchCategory, setModalSearchCategory] = useState("");

  // States for the add/edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form states for Section
  const [secName, setSecName] = useState("");
  const [secType, setSecType] = useState<HomepageSection["type"]>("top_picks");
  const [secLayout, setSecLayout] = useState<HomepageSection["layout"]>("standard");
  const [secBackgroundColor, setSecBackgroundColor] = useState("#ffffff");
  const [secLimit, setSecLimit] = useState(8);
  const [secStyle, setSecStyle] = useState("premium"); // premium, glass, minimal
  const [secTheme, setSecTheme] = useState<HomepageSection["theme"]>("none");
  const [secThemeName, setSecThemeName] = useState("");
  const [secThemeImage, setSecThemeImage] = useState("");
  const [secTag, setSecTag] = useState("");
  const [secCategory, setSecCategory] = useState("");
  const [secManualProducts, setSecManualProducts] = useState("");

  const [secTitle, setSecTitle] = useState("");
  const [secSubtitle, setSecSubtitle] = useState("");
  const [secIsActive, setSecIsActive] = useState(true);
  const [secStartDate, setSecStartDate] = useState("");
  const [secEndDate, setSecEndDate] = useState("");

  const [activeModalStep, setActiveModalStep] = useState(1);
  const [secManualLinks, setSecManualLinks] = useState<string[]>(Array(18).fill(""));

  // Form states for Banner
  const [banName, setBanName] = useState("");
  const [banType, setBanType] = useState<any>("carousel");
  const [banPosition, setBanPosition] = useState<any>("hero");
  const [banLayout, setBanLayout] = useState("full");
  const [banImageUrl, setBanImageUrl] = useState("");
  const [banMobileImageUrl, setBanMobileImageUrl] = useState("");
  const [banTitle, setBanTitle] = useState("");
  const [banSubtitle, setBanSubtitle] = useState("");
  const [banCtaText, setBanCtaText] = useState("");
  const [banCtaLink, setBanCtaLink] = useState("");
  const [banLinkedProductIds, setBanLinkedProductIds] = useState<string[]>([]);
  const [banIsActive, setBanIsActive] = useState(true);
  const [banStartDate, setBanStartDate] = useState("");
  const [banEndDate, setBanEndDate] = useState("");
  const [banSponsorId, setBanSponsorId] = useState("");

  // Deep Targeting States
  const [secTargetAudience, setSecTargetAudience] = useState<"all" | "new" | "logged_in" | "vip">("all");
  const [secTargetRegions, setSecTargetRegions] = useState<string[]>([]);
  const [banTargetUserType, setBanTargetUserType] = useState<"all" | "new" | "logged_in">("all");
  const [banTargetRegions, setBanTargetRegions] = useState<string[]>([]);

  // Banner Product Search States
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Drag & drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Versioning states
  const [versions, setVersions] = useState<any[]>([]);
  const [backupName, setBackupName] = useState("");
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Real-time responsive preview states
  const [previewDeviceMode, setPreviewDeviceMode] = useState<"desktop" | "mobile">("mobile");

  const resetForm = () => {
    setEditItem(null);
    setActiveModalStep(1);
    setSecName("");
    setSecType("top_picks");
    setSecLayout("standard");
    setSecBackgroundColor("#ffffff");
    setSecLimit(8);
    setSecStyle("premium");
    setSecTheme("none");
    setSecThemeName("");
    setSecThemeImage("");
    setSecTag("");
    setSecCategory("");
    setSecManualLinks(Array(18).fill(""));
    setSecManualProducts("");
    setSecTitle("");
    setSecSubtitle("");
    setSecIsActive(true);
    setSecStartDate("");
    setSecEndDate("");
    setSecTargetAudience("all");
    setSecTargetRegions([]);

    setBanName("");
    setBanType("carousel");
    setBanPosition("hero");
    setBanLayout("full");
    setBanImageUrl("");
    setBanMobileImageUrl("");
    setBanTitle("");
    setBanSubtitle("");
    setBanCtaText("");
    setBanCtaLink("");
    setBanLinkedProductIds([]);
    setBanIsActive(true);
    setBanStartDate("");
    setBanEndDate("");
    setBanSponsorId("");
    setBanTargetUserType("all");
    setBanTargetRegions([]);
  };

  const handleAddItem = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditItem(item);
    setActiveModalStep(1);
    if (activeTab === "sections") {
      setSecName(item.name || "");
      setSecType(item.type || "top_picks");
      setSecLayout(item.layout || "standard");
      setSecBackgroundColor(item.backgroundColor || "#ffffff");
      setSecLimit(item.limit || 8);
      setSecStyle(item.style || "premium");
      setSecTheme(item.theme || "none");
      setSecThemeName(item.themeName || "");
      setSecThemeImage(item.themeImage || "");
      setSecTag(item.tag || "");
      setSecCategory(item.category || "");
      const links = item.manualProducts || [];
      setSecManualLinks(Array.from({ length: 18 }, (_, i) => links[i] || ""));
      setSecManualProducts(links.join(", "));
      setSecTitle(item.title || "");
      setSecSubtitle(item.subtitle || "");
      setSecIsActive(item.isActive !== false);
      setSecStartDate(item.startDate || "");
      setSecEndDate(item.endDate || "");
      setSecTargetAudience(item.targetAudience || "all");
      setSecTargetRegions(item.targetRegions || []);
    } else {
      setBanName(item.name || "");
      setBanType(item.type || "carousel");
      setBanPosition(item.position || "hero");
      setBanLayout(item.layout || "full");
      setBanImageUrl(item.imageUrl || "");
      setBanMobileImageUrl(item.mobileImageUrl || "");
      setBanTitle(item.title || "");
      setBanSubtitle(item.subtitle || "");
      setBanCtaText((item as Banner).ctaText || "");
      setBanCtaLink((item as Banner).ctaLink || "");
      setBanLinkedProductIds((item as Banner).linkedProductIds || []);
      setBanIsActive(item.isActive !== false);
      setBanStartDate((item as any).startDate || "");
      setBanEndDate((item as any).endDate || "");
      setBanSponsorId((item as any).sponsorId || "");
      setBanTargetUserType(item.targetUserType || "all");
      setBanTargetRegions(item.targetRegions || []);
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload =
      activeTab === "sections"
        ? {
            name: secName,
            type: secType,
            layout: secLayout,
            backgroundColor: secBackgroundColor,
            limit: secLimit,
            style: secStyle,
            theme: secTheme,
            themeName: secThemeName,
            themeImage: secThemeImage,
            tag: secTag,
            category: secCategory,
            manualProducts: secManualLinks
              .map((val) => {
                const str = val.trim();
                if (str.includes("/product/")) {
                  return str.split("/product/")[1].split("?")[0].split("/")[0].split("#")[0];
                }
                return str;
              })
              .filter((id) => id),
            title: secTitle,
            subtitle: secSubtitle,
            isActive: secIsActive,
            startDate: secStartDate || null,
            endDate: secEndDate || null,
            targetAudience: secTargetAudience,
            targetRegions: secTargetRegions,
            orderIndex: editItem ? editItem.orderIndex : sections.length + 1,
          }
        : {
            name: banName,
            type: banType,
            position: banPosition,
            layout: banLayout,
            imageUrl: banImageUrl,
            mobileImageUrl: banMobileImageUrl,
            title: banTitle,
            subtitle: banSubtitle,
            ctaText: banCtaText,
            ctaLink: banCtaLink,
            linkedProductIds: banLinkedProductIds,
            isActive: banIsActive,
            startDate: banStartDate,
            endDate: banEndDate,
            sponsorId: banSponsorId,
            targetUserType: banTargetUserType,
            targetRegions: banTargetRegions,
            orderIndex: editItem ? editItem.orderIndex : banners.length + 1,
          };

    try {
      const collectionName = activeTab === "sections" ? "homepage_sections" : "banners";

      await saveHookItem(collectionName, editItem ? editItem.id : null, payload);

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Product search for banner linking
  const handleProductSearch = async (searchQuery: string) => {
    setProductSearchQuery(searchQuery);
    if (!searchQuery || searchQuery.length < 2) {
      setProductSearchResults([]);
      return;
    }

    setIsSearchingProducts(true);
    try {
      const q = searchQuery.toLowerCase();
      // Since we don't have a full-text search backend easily available here,
      // we'll fetch a limited set or rely on a simple query if possible.
      // Easiest is fetching recent and filtering if not too many, or just doing a basic startAt query.
      // For a marketplace, a basic query by name prefix.
      const productsRef = collection(db, "products");
      const productQuery = query(productsRef, limit(40));
      const snap = await getDocs(productQuery);

      const results = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));

      setProductSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  // File upload handler for media using crypto.randomUUID() to prevent collisions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Le fichier est trop lourd ! (Maximum 15 Mo)");
      return;
    }

    try {
      toast.loading("Upload de l'image/GIF en cours...", { id: "upload-hp" });
      const uniqueFilename = `${crypto.randomUUID()}_${file.name.replace(/\s+/g, "_")}`;
      const storageRef = ref(storage, `homepage_media/${uniqueFilename}`);
      try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        setter(url);
      } catch (storageErr) {
        console.warn("Storage upload failed, falling back to base64:", storageErr);
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
      toast.success("Média importé avec succès !", { id: "upload-hp" });
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation.", { id: "upload-hp" });
    }
  };

  // Backup Versioning Functions
  const fetchVersions = async () => {
    setIsLoadingVersions(true);
    try {
      const q = query(collection(db, "homepage_versions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setVersions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching versions:", err);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleCreateBackup = async () => {
    const name = backupName.trim() || `Sauvegarde du ${new Date().toLocaleString()}`;
    try {
      toast.loading("Création de la sauvegarde...", { id: "backup" });
      const payload = {
        name,
        sections,
        banners,
        createdAt: new Date().toISOString(),
        adminEmail: currentUser?.email || "admin@olmart.dz",
      };
      await addDoc(collection(db, "homepage_versions"), payload);
      setBackupName("");
      toast.success("Point de sauvegarde créé !", { id: "backup" });
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde", { id: "backup" });
    }
  };

  const handleRestoreBackup = async (version: any) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir restaurer la version "${version.name}" ? Les paramètres actuels de la page d'accueil (sections et bannières) seront écrasés.`)) {
      return;
    }
    try {
      toast.loading("Restauration de la sauvegarde...", { id: "restore" });

      // Delete current sections
      const secSnap = await getDocs(collection(db, "homepage_sections"));
      for (const d of secSnap.docs) {
        await deleteDoc(doc(db, "homepage_sections", d.id));
      }

      // Delete current banners
      const banSnap = await getDocs(collection(db, "banners"));
      for (const d of banSnap.docs) {
        await deleteDoc(doc(db, "banners", d.id));
      }

      // Restore sections
      const savedSections = version.sections || [];
      const savedBanners = version.banners || [];

      for (const item of savedSections) {
        const { id, ...payload } = item;
        await addDoc(collection(db, "homepage_sections"), payload);
      }

      // Restore banners
      for (const item of savedBanners) {
        const { id, ...payload } = item;
        await addDoc(collection(db, "banners"), payload);
      }

      // Clear public homepage cache
      try {
        await deleteDoc(doc(db, "public", "homepage_cache"));
      } catch (_) {}

      toast.success("Restauration réussie avec succès !", { id: "restore" });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la restauration", { id: "restore" });
    }
  };

  const handleDeleteVersion = async (id: string) => {
    if (!window.confirm("Supprimer cette sauvegarde définitivement ?")) return;
    try {
      await deleteDoc(doc(db, "homepage_versions", id));
      toast.success("Sauvegarde supprimée !");
      fetchVersions();
    } catch (err) {
      console.error(err);
      toast.error("Erreur de suppression");
    }
  };

  // Categories states
  const [dbCategories, setDbCategories] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Supermarché");
  const [catTitle, setCatTitle] = useState("");
  const [catSubtitle, setCatSubtitle] = useState("");
  const [catImage, setCatImage] = useState("");
  const [catSubImages, setCatSubImages] = useState<Record<string, string>>({});
  const [catFeaturedIds, setCatFeaturedIds] = useState<string[]>([]);

  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    fetchAllProducts();
    if (activeTab !== "categories") {
      fetchData();
    } else {
      loadCategoryConfigAndProducts();
    }
  }, [activeTab, selectedCategory]);

  const fetchAllProducts = async () => {
    try {
      const { limit } = await import("firebase/firestore");
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(400));
      const snap = await getDocs(q);
      const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as Product);
      setAllProducts(prods);
    } catch (err) {
      console.error("Error fetching all products:", err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch both collections for real-time preview accuracy in both tabs
      const rawSections = await fetchHookData("homepage_sections");
      const rawBanners = await fetchHookData("banners");
      
      const sortedSections = [...(rawSections || [])].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
      const sortedBanners = [...(rawBanners || [])].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

      setSections(sortedSections as any);
      setBanners(sortedBanners as any);

      // Fetch version history too
      fetchVersions();
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryConfigAndProducts = async () => {
    setIsLoading(true);
    setIsLoadingProducts(true);
    try {
      // 1. Load config from Firestore
      const docRef = doc(db, "homepage_categories_v2", selectedCategory);
      const docSnap = await getDoc(docRef);

      let finalConfig = {
        ...DEFAULT_CATEGORIES[selectedCategory],
        featuredProductIds: [] as string[],
      };

      if (docSnap.exists()) {
        const data = docSnap.data();
        finalConfig = {
          title: data.title || DEFAULT_CATEGORIES[selectedCategory].title,
          subtitle: data.subtitle || DEFAULT_CATEGORIES[selectedCategory].subtitle,
          image: data.image || DEFAULT_CATEGORIES[selectedCategory].image,
          gradient: data.gradient || DEFAULT_CATEGORIES[selectedCategory].gradient,
          featuredProductIds: data.featuredProductIds || [],
          subCategoryImages: data.subCategoryImages || {},
        } as any;
      }

      setCatTitle(finalConfig.title || "");
      setCatSubtitle(finalConfig.subtitle || "");
      setCatImage(finalConfig.image || "");
      setCatSubImages((finalConfig as any).subCategoryImages || {});
      setCatFeaturedIds(finalConfig.featuredProductIds || []);

      // Update local set of active categories
      setDbCategories((prev) => ({
        ...prev,
        [selectedCategory]: finalConfig,
      }));

      // 2. Load products from this category to toggle featured products
      const pQuery = query(collection(db, "products"), where("category", "==", selectedCategory));
      const pSnap = await getDocs(pQuery);
      let productsLoaded = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as Product);

      // Use empty array if nothing found
      if (productsLoaded.length === 0) {
        productsLoaded = [];
      }

      setCategoryProducts(productsLoaded);
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'importation de la catégorie");
    } finally {
      setIsLoading(false);
      setIsLoadingProducts(false);
    }
  };

  const handleSaveCategory = async () => {
    setIsSavingCategory(true);
    try {
      const docRef = doc(db, "homepage_categories_v2", selectedCategory);
      await setDoc(
        docRef,
        {
          id: selectedCategory,
          title: catTitle,
          subtitle: catSubtitle,
          image: catImage,
          subCategoryImages: catSubImages,
          gradient: DEFAULT_CATEGORIES[selectedCategory]?.gradient || "from-zinc-950/80 via-zinc-950/20 to-transparent",
          featuredProductIds: catFeaturedIds,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Clear sessions caches of homepage categories so clients reload it from DB
      sessionStorage.removeItem("home_custom_categories");

      toast.success("Catégorie mise à jour avec succès !");

      // Reload matching products and active config
      loadCategoryConfigAndProducts();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde de la catégorie");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const toggleProductFeatured = (productId: string) => {
    setCatFeaturedIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleDelete = async (id: string) => {
    const success = await deleteItem(activeTab, id);
    if (success) fetchData();
  };

  // Filter products by searching
  const filteredProducts = categoryProducts.filter((p) =>
    p.name.toLowerCase().includes(searchProductQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-kinder text-zinc-950 uppercase tracking-tighter rtl:tracking-normal">
            {t("Homepage Builder")}
          </h2>
          <p className="text-sm font-bold text-zinc-950/60">
            {t("Gestion simplifiée des sections, bannières et catalogues personnalisés")}
          </p>
        </div>
        <div className="flex flex-wrap bg-zinc-50 rounded-xl p-1 border border-zinc-200">
          {(["sections", "banners", "categories"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider rtl:tracking-normal transition-all cursor-pointer ${
                activeTab === tab ? "bg-zinc-950 text-white shadow-md" : "text-zinc-950/60 hover:text-zinc-950"
              }`}
            >
              {tab === "sections" && "Sections"}
              {tab === "banners" && "Bannières"}
              {tab === "categories" && "Catégories & Vedettes"}
            </button>
          ))}
        </div>
      </div>

      {activeTab !== "categories" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold flex items-center gap-2 text-zinc-950">
              {activeTab === "sections" ? (
                <LayoutTemplate className="w-5 h-5 text-orange-600" />
              ) : (
                <ImageIcon className="w-5 h-5 text-orange-600" />
              )}
              {activeTab === "sections" ? "Sections Actives" : "Bannières Actives"}
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest rtl:tracking-normal hover:bg-orange-700 transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t("Ajouter")}
            </button>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-950/50 font-bold animate-pulse">{t("Chargement...")}</div>
            ) : (activeTab === "sections" ? sections : banners).length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-zinc-200 m-6 rounded-2xl">
                <p className="text-zinc-950/50 font-bold mb-2">{t("Aucun élément trouvé.")}</p>
                <p className="text-xs text-zinc-950/40">{t("Cliquez sur Ajouter pour commencer.")}</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200">
                {(activeTab === "sections" ? sections : banners).map((item: any) => {
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <button className="text-zinc-950/20 cursor-grab hover:text-zinc-950/50 bg-transparent border-none">
                          <GripVertical className="w-5 h-5" />
                        </button>
                        <div>
                          <h4 className="font-bold text-zinc-950">{item.name || "Sans nom"}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-orange-600/10 text-orange-600 rounded text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal">
                              {item.type || "N/A"}
                            </span>
                            {(item.themeName || item.themeImage) && (
                              <span className="px-2 py-0.5 bg-zinc-950/10 text-zinc-950 rounded text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                {item.themeName || "Saison active"}
                              </span>
                            )}
                            {item.isActive ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <Check className="w-3 h-3" /> {t("Actif")}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                <X className="w-3 h-3" /> {t("Inactif")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-2 text-zinc-950/60 hover:bg-zinc-950/5 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Custom Categories & Featured Products Dashboard Builder
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: List Categories */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <h3 className="font-kinder text-xs text-zinc-950 uppercase tracking-wider rtl:tracking-normal mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" /> {t("Catalogues Marketplace")}
            </h3>
            <div className="space-y-2">
              {Object.keys(DEFAULT_CATEGORIES).map((catName) => {
                const isSelected = selectedCategory === catName;
                return (
                  <button
                    key={catName}
                    onClick={() => setSelectedCategory(catName)}
                    className={`w-full text-start px-4 py-3.5 rounded-xl font-bold text-xs transition-all relative cursor-pointer border flex items-center justify-between ${
                      isSelected
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-md scale-[1.02]"
                        : "bg-zinc-50/40 hover:bg-zinc-50/90 text-zinc-950 border-zinc-200"
                    }`}
                  >
                    <span>{catName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600"}`}
                    >
                      {DEFAULT_CATEGORIES[catName].title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-[11px] text-orange-850 font-bold space-y-1.5">
              <span className="block uppercase tracking-wider rtl:tracking-normal text-[9px] text-orange-600 font-kinder">
                {t("ℹ️ Recommandation Connectée (IA)")}
              </span>
              <p>
                {t(
                  "L'ordre des catalogues est personnalisé dynamiquement pour chaque utilisateur. Les habitudes (visites, recherches) sont synchronisées sur le Cloud ☁️ pour une expérience cross-device."
                )}
              </p>
            </div>
          </div>

          {/* Right panel: Edit Form */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-orange-600">
                  {t("Configuration du Catalogue")}
                </span>
                <h3 className="text-xl font-kinder text-zinc-950">{selectedCategory}</h3>
              </div>
              <button
                onClick={handleSaveCategory}
                disabled={isSavingCategory}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 text-white font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-colors rounded-xl shadow-md border-none cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSavingCategory ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

            {/* Custom visual properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-500 mb-1.5">
                    {t("Titre personnalisé du Widget")}
                  </label>
                  <input
                    type="text"
                    value={catTitle}
                    onChange={(e) => setCatTitle(e.target.value)}
                    placeholder={t("Ex: Le Quotidien Pratique") || "Ex: Le Quotidien Pratique"}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-500 mb-1.5">
                    {t("Sous-titre accrocheur")}
                  </label>
                  <input
                    type="text"
                    value={catSubtitle}
                    onChange={(e) => setCatSubtitle(e.target.value)}
                    placeholder={t("Ex: Tradition des 58 Wilayas") || "Ex: Tradition des 58 Wilayas"}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-500 mb-1.5">
                    {t("Image (Média Importé ou URL)")}
                  </label>
                  <div className="space-y-2">
                    {!catImage ? (
                      <>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-50 border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100/50 rounded-xl cursor-pointer transition-all">
                          <ImageIcon className="w-5 h-5 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-600">
                            {t("Sélectionner une image depuis vos médias")}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp, image/gif"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, setCatImage)}
                          />
                        </label>
                      </>
                    ) : (
                      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-2 rounded-xl">
                        <span className="text-xs font-bold text-zinc-600 truncate max-w-[200px]">
                          {t("Image sélectionnée")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCatImage("")}
                          className="text-xs text-red-500 font-bold hover:underline px-2"
                        >
                          {t("Supprimer")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview image cover */}
              <div className="space-y-2">
                <span className="block text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-500">
                  {t("Rendu visuel (Aperçu)")}
                </span>
                <div className="relative h-[200px] rounded-2xl overflow-hidden shadow-inner bg-zinc-100 flex items-center justify-center border border-zinc-200">
                  {catImage ? (
                    <>
                      <img
                        loading="lazy"
                        src={catImage}
                        className="w-full h-full object-cover"
                        alt={t("Preview catalogue") || "Preview catalogue"}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                      <div className="absolute bottom-4 start-4 text-start">
                        <span className="bg-orange-600 inline-block text-[8px] font-bold text-white px-2 py-0.5 rounded-full mb-1">
                          {t("PRÉFÉRÉ POUR VOUS ⭐")}
                        </span>
                        <h4 className="text-sm font-kinder text-white">{catTitle || selectedCategory}</h4>
                        <p className="text-[10px] text-zinc-200 mt-0.5">
                          {catSubtitle || "L'excellence à votre portée"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-zinc-400">{t("Aucune image configurée")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subcategories Editor */}
            <div className="space-y-4 pt-6 border-t border-zinc-100">
              <div className="flex flex-col gap-1">
                <h4 className="font-kinder text-xs text-zinc-950 uppercase tracking-wider rtl:tracking-normal flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  {t("Images des Sous-Catégories")}
                </h4>
                <p className="text-[10px] text-zinc-500 font-bold">
                  {t("Personnalisez les images des sous-catégories principales qui s'affichent dans l'Univers Olma.")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(PRODUCT_HIERARCHY[selectedCategory] || {}).map((subName) => (
                  <div key={subName} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-3">
                    <span className="font-bold text-xs text-zinc-900 block truncate">{subName}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {catSubImages[subName] ? (
                          <img
                            loading="lazy"
                            src={catSubImages[subName]}
                            className="w-full h-full object-cover"
                            alt={subName}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-zinc-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-lg cursor-pointer transition-all text-[10px] font-bold text-zinc-700 w-full mb-2">
                          {t("Changer d'image")}
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(e, (url) => setCatSubImages((prev) => ({ ...prev, [subName]: url })))
                            }
                          />
                        </label>
                        {catSubImages[subName] && (
                          <button
                            onClick={() =>
                              setCatSubImages((prev) => {
                                const newImages = { ...prev };
                                delete newImages[subName];
                                return newImages;
                              })
                            }
                            className="text-[9px] text-red-500 font-bold hover:underline"
                          >
                            {t("Supprimer")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Products Association */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-kinder text-xs text-zinc-950 uppercase tracking-wider rtl:tracking-normal flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-500 fill-current" />
                    {t("Produits en Vedette (")}
                    {catFeaturedIds.length})
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-bold">
                    {t('Cochez les produits de cette catégorie pour les fixer "en vedette" sur l\'Accueil.')}
                  </p>
                </div>

                {/* Search query inside category products */}
                <div className="relative max-w-xs w-full self-start">
                  <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    placeholder={t("Filtrer les produits...") || "Filtrer les produits..."}
                    className="w-full ps-9 pe-4 py-2 bg-zinc-50 focus:bg-white rounded-xl border border-zinc-200 text-xs font-bold focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              {/* Products selection list */}
              {isLoadingProducts ? (
                <div className="py-8 text-center text-zinc-950/40 font-bold animate-pulse text-xs uppercase">
                  {t("Chargement des produits...")}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center border-dashed border-2 border-zinc-200 rounded-xl">
                  <p className="text-xs text-zinc-950/50 font-bold">
                    {t("Aucun produit trouvé dans cette catégorie.")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pe-2 custom-scrollbar">
                  {filteredProducts.map((prod) => {
                    const isFeatured = catFeaturedIds.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleProductFeatured(prod.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isFeatured
                            ? "bg-zinc-50 border-orange-200 shadow-sm"
                            : "bg-white hover:bg-zinc-50/50 border-zinc-200"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-150 shrink-0 border border-zinc-200">
                          <img
                            loading="lazy"
                            src={prod.image}
                            className="w-full h-full object-cover"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-zinc-950 truncate">{prod.name}</h5>
                          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">{formatPrice(prod.price)}</p>
                        </div>
                        <div className="shrink-0 ps-1">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isFeatured ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-300 bg-white"
                            }`}
                          >
                            {isFeatured && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white rounded-[2rem] border border-zinc-200/85 shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden">
              <div className="p-4 px-5 border-b border-zinc-200/60 flex items-center justify-between bg-zinc-50/40 shrink-0">
                <div>
                  <span className="text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal text-orange-600">
                    {editItem ? "Modification" : "Nouvel Élément"}
                  </span>
                  <h3 className="font-extrabold text-[12px] text-zinc-950 uppercase tracking-wide">
                    {activeTab === "sections" ? "Configuration Section" : "Configuration Bannière"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 px-2.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-500 hover:text-stone-850 font-bold border-none cursor-pointer transition-all active:scale-95 text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-4 px-5 space-y-3.5 flex-1 overflow-y-auto max-h-[75vh]">
                {activeTab === "sections" ? (
                  // --- SECTION FORM ---
                  <div className="space-y-3">
                    {/* Stepper Header */}
                    <div className="flex bg-zinc-50/60 rounded-xl p-0.5 border border-zinc-200/50 shrink-0">
                      {["Mise en page", "En-tête", "Produits"].map((label, idx) => {
                        const step = idx + 1;
                        return (
                          <button
                            key={step}
                            type="button"
                            onClick={() => setActiveModalStep(step)}
                            className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal rounded-lg transition-all text-center border-none cursor-pointer ${
                              activeModalStep === step
                                ? "bg-zinc-950 text-white shadow-md shadow-zinc-950/15"
                                : "bg-transparent text-zinc-950/60 hover:text-zinc-950"
                            }`}
                          >
                            {step}. {label}
                          </button>
                        );
                      })}
                    </div>

                    {activeModalStep === 1 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-end-4 duration-300">
                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Nom technique interne (Admin)")}
                          </label>
                          <input
                            type="text"
                            required
                            value={secName}
                            onChange={(e) => setSecName(e.target.value)}
                            placeholder={t("Ex: Section Nouveautés") || "Ex: Section Nouveautés"}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-stone-50/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Type de composant")}
                          </label>
                          <select
                            value={secType}
                            onChange={(e) => setSecType(e.target.value as any)}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white text-stone-800"
                          >
                            <option value="top_picks">{t("Top Picks (Sélection Vedette)")}</option>
                            <option value="flash_sale">{t("Flash Sale (Offres Flash style Jumia)")}</option>
                            <option value="new_arrivals">{t("New Arrivals (Nouveautés)")}</option>
                            <option value="trending">{t("Trending (Tendances du moment)")}</option>
                            <option value="recommended">{t("Recommended (Sélection Personnalisée)")}</option>
                            <option value="brands">{t("Sellers (Nos Vendeurs Officiels)")}</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                              {t("Agencement (Coupe)")}
                            </label>
                            <select
                              value={secLayout}
                              onChange={(e) => setSecLayout(e.target.value as any)}
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white"
                            >
                              <option value="standard">{t("Grille Standard (4 col)")}</option>
                              <option value="small">{t("Grille Petite (6 col)")}</option>
                              <option value="compact">{t("Défilement Horizontal")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                              {t("Couleur fond (Optionnelle)")}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={secBackgroundColor || "#ffffff"}
                                onChange={(e) => setSecBackgroundColor(e.target.value)}
                                className="w-8 h-7 p-0.5 rounded-md border border-zinc-200 cursor-pointer"
                              />
                              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">
                                {secBackgroundColor || "#none"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                              {t("Style Visuel")}
                            </label>
                            <select
                              value={secStyle}
                              onChange={(e) => setSecStyle(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white"
                            >
                              <option value="premium">{t("Premium (Cartes + Ombre)")}</option>
                              <option value="immersive">{t("Immersif (Contenu/Image)")}</option>
                              <option value="glass">{t("Glassmorphism")}</option>
                              <option value="minimal">{t("Minimal (Flat border)")}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                              {t("Limite d'Affichage")}
                            </label>
                            <input
                              type="number"
                              min="4"
                              max="30"
                              value={secLimit}
                              onChange={(e) => setSecLimit(parseInt(e.target.value) || 8)}
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                            />
                          </div>

                          {/* Seasonal design - very snug */}
                          <div className="col-span-2 p-2.5 bg-stone-50/70 border border-stone-200/50 rounded-xl space-y-2 mt-0.5">
                            <span className="text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950 flex items-center gap-1 shrink-0">
                              <Sparkles className="w-3 h-3 text-orange-600" />
                              {t("Design Saisonnier (Optionnel)")}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="text"
                                  value={secThemeName}
                                  onChange={(e) => {
                                    setSecThemeName(e.target.value);
                                    if (e.target.value.trim() && secTheme === "none") {
                                      setSecTheme("custom");
                                    } else if (!e.target.value.trim() && !secThemeImage) {
                                      setSecTheme("none");
                                    }
                                  }}
                                  placeholder={t("Nom: Ramadan, Été...") || "Nom: Ramadan, Été..."}
                                  className="w-full px-2 py-1 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white placeholder-stone-300"
                                />
                              </div>
                              <div>
                                {!secThemeImage ? (
                                  <div className="flex gap-1.5 w-full">
                                    <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 w-full bg-zinc-50 border border-dashed border-zinc-200 hover:border-orange-600/80 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm">
                                      <ImageIcon className="w-3.5 h-3.5 text-orange-600/80" />
                                      <span className="text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-stone-700">
                                        {t("Téléverser Image")}
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          handleFileUpload(e, (url) => {
                                            setSecThemeImage(url);
                                            setSecTheme("custom");
                                          });
                                        }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between bg-white border border-stone-200/50 p-1.5 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="w-6 h-5 rounded overflow-hidden shrink-0 border border-stone-100 bg-stone-50">
                                        <img
                                          loading="lazy"
                                          src={secThemeImage}
                                          className="w-full h-full object-cover"
                                          alt=""
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <span className="text-[8px] font-kinder text-zinc-950 truncate max-w-[50px]">
                                        {secThemeName || "Ambiance"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSecThemeImage("");
                                        if (!secThemeName.trim()) {
                                          setSecTheme("none");
                                        }
                                      }}
                                      className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all border-none cursor-pointer bg-transparent"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Target Category Selector */}
                          <div className="col-span-2 bg-stone-50/70 p-2.5 border border-stone-200/50 rounded-xl space-y-1">
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/80 flex items-center gap-1 shrink-0">
                              {t("Catégorie ciblée (Mode, Auto & Moto...)")}
                            </label>
                            <select
                              value={secCategory}
                              onChange={(e) => setSecCategory(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300/60 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white text-zinc-950"
                            >
                              <option value="">{t("-- Aucune (Tous les produits ou par Tag) --")}</option>
                              <option value="Mode">{t("Mode (Malhabiss - ملابس)")}</option>
                              <option value="Auto & Moto">{t("Auto & Moto (سيارات و دراجات)")}</option>
                              <option value="Maison & Déco">{t("Maison & Déco (أثاث و ديكور)")}</option>
                              <option value="Électronique">{t("Électronique (إلكترونيات)")}</option>
                              <option value="Alimentation">{t("Alimentation (مواد غذائية)")}</option>
                              <option value="Cosmétiques">{t("Cosmétiques (مستحضرات تجميل)")}</option>
                              <option value="Électroménager">{t("Électroménager (أجهزة كهرومنزلية)")}</option>
                              <option value="Bébés & Enfants">{t("Bébés & Enfants (أطفال و رضع)")}</option>
                              <option value="Sports & Loisirs">{t("Sports & Loisirs (رياضة و ترفيه)")}</option>
                            </select>
                            <p className="text-[8px] text-stone-500 font-bold leading-normal">
                              {t(
                                "Sélectionnez une catégorie cible pour filtrer automatiquement cette section sur la page d'accueil."
                              )}
                            </p>
                          </div>

                          {/* Refined Tag - small & sleek */}
                          <div className="col-span-2 bg-stone-50/70 p-2.5 border border-stone-200/50 rounded-xl space-y-1">
                            <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/80 flex items-center gap-1 shrink-0">
                              {t("L'Élément Tag (Lien dynamique des produits)")}
                            </label>
                            <input
                              type="text"
                              value={secTag}
                              onChange={(e) => setSecTag(e.target.value)}
                              placeholder={t("Ex: promotion, ete2024") || "Ex: promotion, ete2024"}
                              className="w-full px-2.5 py-1 rounded-lg border border-stone-300/60 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white"
                            />
                            <p className="text-[8px] text-stone-500 font-bold leading-normal">
                              {t("Utilisez ce tag pour rattacher automatiquement les articles dotés de ce tag.")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeModalStep === 2 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-end-4 duration-300">
                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Titre d'affichage (Optionnel)")}
                          </label>
                          <input
                            type="text"
                            value={secTitle}
                            onChange={(e) => setSecTitle(e.target.value)}
                            placeholder={t("Ex: Nouveautés du moment") || "Ex: Nouveautés du moment"}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Sous-titre d'affichage (Optionnel)")}
                          </label>
                          <input
                            type="text"
                            value={secSubtitle}
                            onChange={(e) => setSecSubtitle(e.target.value)}
                            placeholder={
                              t("Ex: Explorez nos créations fraîches") || "Ex: Explorez nos créations fraîches"
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                          />
                        </div>

                        <div className="flex items-center gap-2.5 py-2 px-3 bg-stone-50 rounded-xl border border-stone-200/50 mt-2">
                          <input
                            type="checkbox"
                            id="secIsActive"
                            checked={secIsActive}
                            onChange={(e) => setSecIsActive(e.target.checked)}
                            className="w-3.5 h-3.5 text-orange-600 focus:ring-[#FF5C00] border-stone-300 rounded"
                          />
                          <label
                            htmlFor="secIsActive"
                            className="text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950 select-none cursor-pointer"
                          >
                            {t("Activer immédiatement la section sur l'accueil")}
                          </label>
                        </div>

                        {/* Ciblage d'Audience & de Wilayas pour la Section */}
                        <div className="border-t border-stone-100 pt-3 mt-3 space-y-3">
                          <h4 className="text-[10px] font-kinder text-zinc-950 uppercase tracking-[0.1em] flex items-center gap-1.5">
                            {t("🎯 Ciblage d'Audience & d'Audimat (58 Wilayas)")}
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-start">
                            <div>
                              <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                                {t("Audience Cible")}
                              </label>
                              <select
                                value={secTargetAudience}
                                onChange={(e) => setSecTargetAudience(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white text-zinc-950"
                              >
                                <option value="all">{t("Tout le monde (Tous)")}</option>
                                <option value="new">{t("Nouveaux Visiteurs uniquement")}</option>
                                <option value="logged_in">{t("Utilisateurs Connectés uniquement")}</option>
                                <option value="vip">{t("Clients VIP uniquement")}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                                {t("Wilayas Cibles (")}
                                {secTargetRegions.length})
                              </label>
                              <select
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val && !secTargetRegions.includes(val)) {
                                    setSecTargetRegions([...secTargetRegions, val]);
                                  }
                                  e.target.value = "";
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white text-zinc-950"
                              >
                                <option value="">{t("+ Ajouter une Wilaya")}</option>
                                {ALGERIA_WILAYAS.map((w) => (
                                  <option key={w} value={w}>
                                    {w}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {secTargetRegions.length > 0 && (
                            <div className="flex flex-wrap gap-1 p-2 bg-stone-50 border border-stone-200/50 rounded-xl max-h-[70px] overflow-y-auto">
                              {secTargetRegions.map((w) => (
                                <span
                                  key={w}
                                  className="inline-flex items-center gap-1 bg-zinc-950/5 text-zinc-950 border border-zinc-950/15 px-2 py-0.5 rounded-md text-[8px] font-kinder"
                                >
                                  {w}
                                  <button
                                    type="button"
                                    onClick={() => setSecTargetRegions(secTargetRegions.filter((item) => item !== w))}
                                    className="hover:text-red-600 text-[8px] font-kinder leading-none ms-1 bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() => setSecTargetRegions([])}
                                className="text-red-500 hover:text-red-700 text-[8px] font-bold underline bg-transparent border-none p-0 cursor-pointer ms-auto"
                              >
                                {t("Vider tout")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeModalStep === 3 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-end-4 duration-300">
                        <div>
                          {/* Search Area */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 bg-zinc-50/80 p-2 rounded-xl border border-zinc-200/60">
                            <div>
                              <label className="block text-[9.5px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950">
                                {t("Sélection manuelle (")}
                                {secManualLinks.filter((l) => l).length}/18)
                              </label>
                              <span className="text-[7.5px] font-bold text-stone-400">
                                {t("Cliquez sur un produit pour l'ajouter ou le retirer")}
                              </span>
                            </div>
                            <div className="relative w-full sm:w-44">
                              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-600" />
                              <input
                                type="text"
                                value={searchSecProduct}
                                onChange={(e) => setSearchSecProduct(e.target.value)}
                                placeholder={t("Nom, ID, vendeur...") || "Nom, ID, vendeur..."}
                                className="w-full ps-7.5 pe-2 py-1 rounded-lg border border-zinc-200 text-[9.5px] font-bold focus:outline-none focus:border-orange-600 bg-white placeholder-stone-400"
                              />
                            </div>
                          </div>

                          {/* Quick Category Tab Filters inside Manual Selector */}
                          <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                            {[
                              { id: "", el: "Tout (الكل)" },
                              { id: "Mode", el: "Mode (ملابس)" },
                              { id: "Auto & Moto", el: "Auto & Moto (سيارات)" },
                              { id: "Maison & Déco", el: "Maison & Déco" },
                              { id: "Électronique", el: "Électronique" },
                              { id: "Alimentation", el: "Alimentation" },
                              { id: "Cosmétiques", el: "Cosmétiques" },
                              { id: "Électroménager", el: "Électroménager" },
                              { id: "Bébés & Enfants", el: "Bébés" },
                              { id: "Sports & Loisirs", el: "Sports" },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setModalSearchCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider rtl:tracking-normal whitespace-nowrap border cursor-pointer transition-all duration-200 select-none ${
                                  modalSearchCategory === cat.id
                                    ? "bg-zinc-950 text-white border-zinc-950 shadow-[0_2px_8px_rgba(44,30,22,0.15)] scale-[1.02]"
                                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-zinc-950"
                                }`}
                              >
                                {cat.el}
                              </button>
                            ))}
                          </div>

                          {/* Products Grid list with high capacity and clean styling */}
                          <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pe-1 border-t border-stone-100 pt-2">
                            {allProducts
                              .filter((p) => !modalSearchCategory || p.category === modalSearchCategory)
                              .filter((p) => {
                                if (!searchSecProduct) return true;
                                const q = searchSecProduct.toLowerCase();
                                return (
                                  p.name?.toLowerCase().includes(q) ||
                                  p.category?.toLowerCase().includes(q) ||
                                  p.tags?.some((t) => t.toLowerCase().includes(q)) ||
                                  p.id?.toLowerCase().includes(q) ||
                                  p.sellerName?.toLowerCase().includes(q)
                                );
                              })
                              .map((prod) => {
                                const isSelected = secManualLinks.includes(prod.id);
                                return (
                                  <div
                                    key={prod.id}
                                    onClick={() => {
                                      const currentSelected = secManualLinks.filter((l) => l);
                                      if (isSelected) {
                                        setSecManualLinks(secManualLinks.filter((id) => id !== prod.id));
                                      } else if (currentSelected.length < 18) {
                                        setSecManualLinks([...currentSelected, prod.id]);
                                      } else {
                                        toast.error("Limite de 18 produits atteinte.");
                                      }
                                    }}
                                    className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all cursor-pointer select-none md:hover:scale-[1.01] ${
                                      isSelected
                                        ? "bg-orange-50/70 border-orange-200 shadow-sm"
                                        : "bg-white hover:bg-stone-50 border-stone-200/60"
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 border border-stone-100">
                                      <img
                                        loading="lazy"
                                        src={prod.image}
                                        className="w-full h-full object-cover"
                                        alt=""
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[7px] font-kinder text-orange-600 uppercase tracking-wide bg-orange-100/60 px-1 rounded">
                                          {prod.category}
                                        </span>
                                      </div>
                                      <h5 className="text-[9px] font-bold text-zinc-950 truncate leading-tight">
                                        {prod.name}
                                      </h5>
                                      <p className="text-[8px] font-extrabold text-orange-600">
                                        {formatPrice(prod.price)}
                                      </p>
                                    </div>
                                    <div
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? "bg-orange-600 border-orange-600 text-white" : "border-stone-300 bg-white"}`}
                                    >
                                      {isSelected ? (
                                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-200" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {secManualLinks.filter((l) => l).length > 0 && (
                            <div className="mt-2.5 p-2 bg-zinc-50/60 rounded-xl border border-zinc-200/60">
                              <span className="block text-[8px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                                {t("Produits Sélectionnés (")}
                                {secManualLinks.filter((l) => l).length})
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto">
                                {secManualLinks
                                  .filter((l) => l)
                                  .map((id, idx) => {
                                    const p = allProducts.find((prod) => prod.id === id);
                                    return (
                                      <div
                                        key={id}
                                        className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-stone-200 text-[8px] font-bold text-zinc-950"
                                      >
                                        <span className="text-stone-400">{idx + 1}.</span>
                                        <span className="truncate max-w-[65px]">{p?.name || id}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSecManualLinks(secManualLinks.filter((i) => i !== id));
                                          }}
                                          className="text-red-400 hover:text-red-600 ms-0.5 bg-transparent border-none p-0 cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // --- BANNER FORM ---
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                        {t("Nom technique interne")}
                      </label>
                      <input
                        type="text"
                        required
                        value={banName}
                        onChange={(e) => setBanName(e.target.value)}
                        placeholder={t("Ex: Bannière Soldes Été") || "Ex: Bannière Soldes Été"}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Type de bannière")}
                        </label>
                        <select
                          value={banType}
                          onChange={(e) => setBanType(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white text-stone-800"
                        >
                          <option value="carousel">{t("Carousel (Défilant)")}</option>
                          <option value="static">{t("Static (Image simple)")}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Position")}
                        </label>
                        <select
                          value={banPosition}
                          onChange={(e) => setBanPosition(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white text-stone-800"
                        >
                          <option value="hero">{t("Hero (Haut de page)")}</option>
                          <option value="intermediate">{t("Intermédiaire")}</option>
                          <option value="inline_product_grid">{t("Grille Produits (Inline)")}</option>
                          <option value="sidebar">{t("Sidebar (Côté)")}</option>
                          <option value="footer">{t("Footer (Bas)")}</option>
                          <option value="top_bar">{t("Bandeau (Top bar)")}</option>
                          <option value="popup">{t("Popup / Modal")}</option>
                        </select>
                      </div>
                    </div>

                    {banPosition === "intermediate" && (
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Format (Taille)")}
                        </label>
                        <select
                          value={banLayout}
                          onChange={(e) => setBanLayout(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px] bg-white text-stone-800"
                        >
                          <option value="full">{t("Bannière Complète")}</option>
                          <option value="half">{t("Bannière Moitié (50/50)")}</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60">
                          {t("Bannière Ordinateur (HD)")}
                        </label>
                      </div>
                      {!banImageUrl ? (
                        <div className="flex gap-2 w-full">
                          <label className="flex items-center justify-center gap-1.5 px-4 py-2 w-full bg-white border border-dashed border-zinc-200 hover:border-orange-600 rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs">
                            <ImageIcon className="w-4 h-4 text-orange-600" />
                            <span className="text-[10px] font-kinder text-stone-700 uppercase">
                              {t("Téléverser Image")}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setBanImageUrl)}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-zinc-50 border border-stone-200/50 p-1.5 pe-2.5 rounded-lg shadow-2xs">
                          <span className="text-[9px] font-bold text-zinc-950 truncate max-w-[150px]">
                            {t("Image PC Active")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBanImageUrl("")}
                            className="text-[9px] text-red-500 font-bold hover:underline bg-transparent border-none cursor-pointer"
                          >
                            {t("Supprimer")}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60">
                        {t("Bannière Mobile (Optionnel)")}
                      </label>
                      {!banMobileImageUrl ? (
                        <div className="flex gap-2 w-full">
                          <label className="flex items-center justify-center gap-1.5 px-4 py-2 w-full bg-white border border-dashed border-zinc-200 hover:border-orange-600 rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs">
                            <ImageIcon className="w-4 h-4 text-orange-600" />
                            <span className="text-[10px] font-kinder text-stone-700 uppercase">
                              {t("Téléverser Image")}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setBanMobileImageUrl)}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-zinc-50 border border-stone-200/50 p-1.5 pe-2.5 rounded-lg shadow-2xs">
                          <span className="text-[9px] font-bold text-zinc-950 truncate max-w-[150px]">
                            {t("Image Mobile Active")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBanMobileImageUrl("")}
                            className="text-[9px] text-red-500 font-bold hover:underline bg-transparent border-none cursor-pointer"
                          >
                            {t("Supprimer")}
                          </button>
                        </div>
                      )}
                      {(banImageUrl || banMobileImageUrl) && (
                        <div className="relative rounded-lg overflow-hidden border border-zinc-200/60 max-h-[45px] aspect-[4/1] bg-stone-100 mt-1">
                          <img
                            loading="lazy"
                            src={banMobileImageUrl || banImageUrl}
                            className="w-full h-full object-cover"
                            alt={t("Aperçu") || "Aperçu"}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Titre (Optionnel)")}
                        </label>
                        <input
                          type="text"
                          value={banTitle}
                          onChange={(e) => setBanTitle(e.target.value)}
                          placeholder={t("Ex: 20% Sur l'artisanat") || "Ex: 20% Sur l'artisanat"}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Sous-titre (Optionnel)")}
                        </label>
                        <input
                          type="text"
                          value={banSubtitle}
                          onChange={(e) => setBanSubtitle(e.target.value)}
                          placeholder={t("Ex: Valable ce weekend") || "Ex: Valable ce weekend"}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Texte Bouton (CTA)")}
                        </label>
                        <input
                          type="text"
                          value={banCtaText}
                          onChange={(e) => setBanCtaText(e.target.value)}
                          placeholder={t("Ex: Découvrir") || "Ex: Découvrir"}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Lien d'action")}
                        </label>
                        <input
                          type="text"
                          value={banCtaLink}
                          onChange={(e) => setBanCtaLink(e.target.value)}
                          placeholder={t("Ex: /shop?activeCategory=Mode") || "Ex: /shop?activeCategory=Mode"}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                        {t("Produits associés à la campagne (")}
                        {banLinkedProductIds.length})
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={productSearchQuery}
                          onChange={(e) => handleProductSearch(e.target.value)}
                          placeholder={
                            t("Rechercher un produit (Nom ou Catégorie)...") ||
                            "Rechercher un produit (Nom ou Catégorie)..."
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[11px]"
                        />
                        {productSearchQuery && (
                          <div className="absolute top-full start-0 end-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                            {isSearchingProducts ? (
                              <div className="p-3 text-xs text-center text-zinc-950/60">
                                {t("Recherche en cours...")}
                              </div>
                            ) : productSearchResults.length > 0 ? (
                              productSearchResults.map((p) => (
                                <div
                                  key={p.id}
                                  className="px-3 py-2 text-[11px] font-medium border-b border-zinc-200/40 hover:bg-zinc-50 cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    if (!banLinkedProductIds.includes(p.id)) {
                                      setBanLinkedProductIds([...banLinkedProductIds, p.id]);
                                    }
                                    setProductSearchQuery("");
                                    setProductSearchResults([]);
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    {p.image && (
                                      <img
                                        loading="lazy"
                                        alt=""
                                        src={p.image}
                                        className="w-6 h-6 rounded object-cover"
                                      />
                                    )}
                                    <span className="truncate flex-1">{p.name}</span>
                                  </div>
                                  <span className="text-orange-600 font-bold">+</span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-xs text-center text-zinc-950/60">
                                {t("Aucun produit trouvé.")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {banLinkedProductIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {banLinkedProductIds.map((id) => (
                            <div
                              key={id}
                              className="bg-zinc-50 border border-zinc-200 px-2 py-1 rounded text-[10px] font-bold text-zinc-950/80 flex items-center gap-1.5"
                            >
                              <span>{id.slice(0, 8)}...</span>
                              <button
                                type="button"
                                onClick={() => setBanLinkedProductIds(banLinkedProductIds.filter((pid) => pid !== id))}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                {t("common.remove", "×")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 py-1 mt-1">
                      <input
                        type="checkbox"
                        id="banIsActive"
                        checked={banIsActive}
                        onChange={(e) => setBanIsActive(e.target.checked)}
                        className="w-3.5 h-3.5 text-orange-600 focus:ring-[#FF5C00] border-stone-300 rounded"
                      />
                      <label
                        htmlFor="banIsActive"
                        className="text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950 select-none cursor-pointer"
                      >
                        {t("Activer immédiatement cette bannière")}
                      </label>
                    </div>

                    <div className="border-t border-stone-100 pt-3 mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Date & Heure de début")}
                        </label>
                        <input
                          type="datetime-local"
                          value={banStartDate || ""}
                          onChange={(e) => setBanStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Date & Heure de fin")}
                        </label>
                        <input
                          type="datetime-local"
                          value={banEndDate || ""}
                          onChange={(e) => setBanEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                          {t("Sponsor (Vendeur ID)")}
                        </label>
                        <input
                          type="text"
                          value={banSponsorId || ""}
                          onChange={(e) => setBanSponsorId(e.target.value)}
                          placeholder={t("Laisser vide si aucun sponsor") || "Laisser vide si aucun sponsor"}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px]"
                        />
                      </div>
                    </div>

                    {/* Ciblage d me de Wilayas pour la Bannière */}
                    <div className="border-t border-stone-100 pt-3 mt-2 space-y-3">
                      <h4 className="text-[10px] font-kinder text-zinc-950 uppercase tracking-[0.1em] flex items-center gap-1.5">
                        {t("🎯 Ciblage de la Bannière (Ciblage Fin)")}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-start">
                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Audience Visée")}
                          </label>
                          <select
                            value={banTargetUserType}
                            onChange={(e) => setBanTargetUserType(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white text-zinc-950"
                          >
                            <option value="all">{t("Tout le monde")}</option>
                            <option value="new">{t("Uniquement nouveaux visiteurs")}</option>
                            <option value="logged_in">{t("Uniquement connectés")}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-kinder uppercase tracking-wider rtl:tracking-normal text-zinc-950/60 mb-1">
                            {t("Wilayas Cibles (")}
                            {banTargetRegions.length})
                          </label>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val && !banTargetRegions.includes(val)) {
                                setBanTargetRegions([...banTargetRegions, val]);
                              }
                              e.target.value = "";
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-orange-600 font-bold text-[10px] bg-white text-zinc-950"
                          >
                            <option value="">{t("+ Ajouter une Wilaya")}</option>
                            {ALGERIA_WILAYAS.map((w) => (
                              <option key={w} value={w}>
                                {w}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {banTargetRegions.length > 0 && (
                        <div className="flex flex-wrap gap-1 p-2 bg-stone-50 border border-stone-200/50 rounded-xl max-h-[70px] overflow-y-auto">
                          {banTargetRegions.map((w) => (
                            <span
                              key={w}
                              className="inline-flex items-center gap-1 bg-zinc-950/5 text-zinc-950 border border-zinc-950/15 px-2 py-0.5 rounded-md text-[8px] font-kinder"
                            >
                              {w}
                              <button
                                type="button"
                                onClick={() => setBanTargetRegions(banTargetRegions.filter((item) => item !== w))}
                                className="hover:text-red-600 text-[8px] font-kinder leading-none ms-1 bg-transparent border-none p-0 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setBanTargetRegions([])}
                            className="text-red-500 hover:text-red-700 text-[8px] font-bold underline bg-transparent border-none p-0 cursor-pointer ms-auto"
                          >
                            {t("Vider tout")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-2.5 px-3 bg-stone-50/70 rounded-xl border border-stone-200/40 text-[9px] font-bold text-stone-500 leading-normal select-none">
                  {t("💡 Les modifications s'appliquent instantanément sur la page d'accueil d'Olma Marketplace.")}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200/60 shrink-0">
                  {activeTab === "sections" && activeModalStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveModalStep((p) => p - 1)}
                      className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg font-kinder text-[9px] uppercase tracking-wider rtl:tracking-normal border-none cursor-pointer transition-all active:scale-95"
                    >
                      {t("Précédent")}
                    </button>
                  )}
                  {activeTab === "sections" && activeModalStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setActiveModalStep((p) => p + 1)}
                      className="px-5 py-2 bg-zinc-950 hover:bg-slate-800 text-white rounded-lg font-kinder text-[9px] uppercase tracking-widest rtl:tracking-normal shadow-md border-none cursor-pointer transition-all active:scale-95"
                    >
                      {t("Suivant")}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-zinc-950 rounded-lg font-kinder text-[9px] uppercase border-none cursor-pointer transition-all active:scale-95 ms-auto"
                      >
                        {t("Annuler")}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-kinder text-[9px] uppercase tracking-widest rtl:tracking-normal shadow-md border-none cursor-pointer transition-all active:scale-95"
                      >
                        {t("Sauvegarder")}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
