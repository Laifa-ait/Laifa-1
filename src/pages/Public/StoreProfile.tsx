import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, SearchX, Star, Package, ChevronLeft, Store, Truck, Undo2, Building2, Info, UserPlus, UserCheck, Users, Camera, Search, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, startAfter, getCountFromServer, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ProductCard } from '../../components/Product/ProductCard';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

import { Spinner } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ImageAdjusterModal } from '../../components/ui/ImageAdjusterModal';
import { AnimatePresence } from 'motion/react';
import { ALGERIA_REGIONS } from '../../data/algeriaRegions';
import { maskSensitiveData, hasExternalChannel } from '../../utils/masking';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

export const StoreProfile: React.FC = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'fr';
  const isRTL = currentLang === 'ar';
  
  const d = (key: string) => {
    const dict = {
      fr: {
        legalStatus: "Statut Légal",
        prepTime: "Préparation Moyenne",
        returnPolicy: "Politiques & Retours",
        notExist: "Boutique Introuvable",
        notExistDesc: "Ce vendeur n'existe pas ou la boutique a été fermée.",
        backToCatalog: "Retour au Catalogue",
        articles: "Articles",
        newSeller: "Nouveau Vendeur",
        welcome: "Bienvenue dans ma boutique sur Olma.",
        featured: "Mis en avant",
        allArticles: "Tous les articles",
        loadMore: "Voir plus d'articles",
        loading: "Chargement...",
        emptyStore: "Boutique Vide",
        emptyDesc: "Ce vendeur n'a pas encore ajouté d'articles actifs.",
        subscribers: "Abonnés",
        editCover: "Modifier la couverture",
        uploadingCover: "Mise en ligne de la couverture...",
        editProfile: "Modifier la photo",
        uploadingProfile: "Mise en ligne du profil..."
      },
      en: {
        legalStatus: "Legal Status",
        prepTime: "Average Prep Time",
        returnPolicy: "Policies & Returns",
        notExist: "Store Not Found",
        notExistDesc: "This seller does not exist or the store has been closed.",
        backToCatalog: "Back to Catalog",
        articles: "Items",
        newSeller: "New Seller",
        welcome: "Welcome to my store on Olma.",
        featured: "Featured",
        allArticles: "All items",
        loadMore: "Load more items",
        loading: "Loading...",
        emptyStore: "Empty Store",
        emptyDesc: "This seller hasn't added any active items yet.",
        subscribers: "Subscribers",
        editCover: "Edit Cover",
        uploadingCover: "Uploading cover...",
        editProfile: "Edit Profile Info",
        uploadingProfile: "Uploading profile..."
      },
      ar: {
        legalStatus: "الوضع القانوني",
        prepTime: "متوسط وقت التحضير",
        returnPolicy: "السياسات والإرجاع",
        notExist: "المتجر غير موجود",
        notExistDesc: "هذا البائع غير موجود أو تم إغلاق المتجر.",
        backToCatalog: "العودة إلى الكتالوج",
        articles: "منتجات",
        newSeller: "بائع جديد",
        welcome: "مرحبا بكم في متجري على Olma.",
        featured: "مميز",
        allArticles: "جميع المنتجات",
        loadMore: "عرض المزيد من المنتجات",
        loading: "جاري التحميل...",
        emptyStore: "متجر فارغ",
        emptyDesc: "لم يضف هذا البائع أي منتجات نشطة بعد.",
        subscribers: "متابعون",
        editCover: "تعديل الغلاف",
        uploadingCover: "جاري رفع الغلاف...",
        editProfile: "تعديل الصورة",
        uploadingProfile: "جاري رفع الصورة..."
      }
    };
    return (dict as any)[currentLang]?.[key] || (dict as any)["fr"][key];
  };

  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Follow logic
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Local Pagination state
  const INITIAL_LIMIT = typeof window !== 'undefined' ? (window.innerWidth >= 1024 ? 10 : window.innerWidth >= 768 ? 8 : 6) : 6;
  const LOAD_MORE_LIMIT = 6;
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Edit "About" state for Owner
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [editForm, setEditForm] = useState({
    shopName: '',
    shopDescription: '',
    wilaya: '',
    legalStatus: '',
    avgPreparationTime: '',
    returnPolicy: ''
  });

  // Direct upload capability for owner
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const isOwner = currentUser?.uid === sellerId;

  // Image adjust state
  const [adjustingImage, setAdjustingImage] = useState<{ file: File; type: 'logo' | 'banner'; src: string } | null>(null);

  // Redesign state: active tab, category search & key-searching
  const [activeTab, setActiveTab] = useState<'products' | 'about'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? "الحجم الأقصى للملف هو 5 ميجابايت" : "Taille maximale 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAdjustingImage({
        file,
        type: 'logo',
        src: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? "الحجم الأقصى لغلاف الصفحة هو 5 ميجابايت" : "Taille de couverture maximale 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAdjustingImage({
        file,
        type: 'banner',
        src: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveAdjustedImage = async (blob: Blob) => {
    if (!adjustingImage || !sellerId) return;
    const { type } = adjustingImage;
    setAdjustingImage(null);

    const isLogo = type === 'logo';
    if (isLogo) {
      setUploadingLogo(true);
    } else {
      setUploadingBanner(true);
    }

    const toastId = toast.loading(isRTL ? "جاري رفع الصورة المعدلة..." : "Envoi de l'image ajustée...");

    try {
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../../lib/firebase');

      const fileExtension = 'jpg';
      const fileRef = storageRef(storage, `shops/${sellerId}/${type}_${Date.now()}.${fileExtension}`);
      
      // Upload the generated Blob with content type header
      try {
        await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      } catch (err: any) {
        toast.error("Firebase Storage Error: " + err.message, { id: toastId });
        return;
      }
      
      const url = await getDownloadURL(fileRef);

      // Save to Firebase Firestore
      const updateData: any = {};
      if (isLogo) {
        updateData.logoUrl = url;
      } else {
        updateData.bannerUrl = url;
      }

      try {
        await updateDoc(doc(db, "users", sellerId), updateData);
      } catch (err: any) {
        toast.error("Firestore users error: " + err.message, { id: toastId });
        return;
      }

      try {
        await setDoc(doc(db, "publicProfiles", sellerId), updateData, { merge: true });
      } catch (err: any) {
        toast.error("Firestore publicProfiles error: " + err.message, { id: toastId });
        return;
      }

      // Update State
      setStoreInfo((prev: any) => ({ ...prev, ...updateData }));
      toast.success(
        isRTL 
          ? "تم تحديث الصورة بنجاح !" 
          : "Photo mise à jour avec succès !", 
        { id: toastId }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(isRTL ? "حدث خطأ أثناء الرفع." : "Échec du chargement.", { id: toastId });
    } finally {
      if (isLogo) {
        setUploadingLogo(false);
      } else {
        setUploadingBanner(false);
      }
    }
  };

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      if (!sellerId) return;
      setLoading(true);
      try {
        // Fetch Seller Profile
        const userDoc = await getDoc(doc(db, "publicProfiles", sellerId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setStoreInfo(data);
          setEditForm({
            shopName: data.shopName || '',
            shopDescription: data.shopDescription || '',
            wilaya: data.wilaya || '',
            legalStatus: data.legalStatus || '',
            avgPreparationTime: data.avgPreparationTime || '',
            returnPolicy: data.returnPolicy || ''
          });
        }

        // Fetch recent products for local display (FINOPS: avoid fetching full inventory)
        const q = query(
          collection(db, "products"),
          where("sellerId", "==", sellerId),
          where("status", "==", "active"),
          limit(30)
        );
        const snap = await getDocs(q);
        const fetchedProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as Product);
        setProducts(fetchedProducts);
        setTotalCount(fetchedProducts.length);
      } catch (err) {
        console.error("Error fetching store data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStoreAndProducts();
  }, [sellerId]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !sellerId) return;
      try {
        const followDoc = await getDoc(doc(db, "users", currentUser.uid, "following", sellerId));
        if (followDoc.exists()) {
          setIsFollowing(true);
        }
      } catch (err) {
        console.error("Error checking follow status:", err);
      }
    };
    checkFollowStatus();
  }, [currentUser, sellerId]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!sellerId || followLoading || !storeInfo) return;
    
    if (isFollowing) {
      setShowConfirm(true);
      return;
    }

    executeFollowToggle();
  };

  const executeFollowToggle = async () => {
    setFollowLoading(true);
    try {
      const followRef = doc(db, "users", currentUser!.uid, "following", sellerId!);
      const sellerPublicRef = doc(db, "publicProfiles", sellerId!);
      const sellerPrivateRef = doc(db, "users", sellerId!);

      if (isFollowing) {
        await deleteDoc(followRef);
        
        // Decrement followersCount in publicProfiles
        await updateDoc(sellerPublicRef, {
          followersCount: increment(-1)
        }).catch(err => (process.env.NODE_ENV === 'debug' ? console.log : function(){})("PublicProfile follow count dec error", err));

        // Decrement followersCount in users
        await updateDoc(sellerPrivateRef, {
          followersCount: increment(-1)
        }).catch(err => (process.env.NODE_ENV === 'debug' ? console.log : function(){})("UserProfile follow count dec error", err));

        setIsFollowing(false);
        // Update local state smoothly
        setStoreInfo((prev: any) => ({
          ...prev,
          followersCount: Math.max(0, (prev?.followersCount || 0) - 1)
        }));

        toast.success("Désabonnement réussi.");
      } else {
        await setDoc(followRef, {
          sellerId,
          name: storeInfo.shopName || storeInfo.displayName || 'Boutique',
          logo: storeInfo.logoUrl || null,
          location: storeInfo.wilaya || 'Algérie',
          followedAt: new Date().toISOString()
        });

        // Increment followersCount in publicProfiles
        await updateDoc(sellerPublicRef, {
          followersCount: increment(1)
        }).catch(err => (process.env.NODE_ENV === 'debug' ? console.log : function(){})("PublicProfile follow count inc error", err));

        // Increment followersCount in users
        await updateDoc(sellerPrivateRef, {
          followersCount: increment(1)
        }).catch(err => (process.env.NODE_ENV === 'debug' ? console.log : function(){})("UserProfile follow count inc error", err));

        setIsFollowing(true);
        // Update local state smoothly
        setStoreInfo((prev: any) => ({
          ...prev,
          followersCount: (prev?.followersCount || 0) + 1
        }));

        toast.success("Boutique suivie !");
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      toast.error("Erreur lors de l'action.");
    } finally {
      setFollowLoading(false);
      setShowConfirm(false);
    }
  };

  const loadMoreProducts = () => {
    setDisplayLimit(prev => prev + LOAD_MORE_LIMIT);
  };

  const saveAboutInfo = async () => {
    if (!sellerId) return;
    
    if (
      hasExternalChannel(editForm.shopName) || 
      hasExternalChannel(editForm.shopDescription) || 
      hasExternalChannel(editForm.legalStatus) || 
      hasExternalChannel(editForm.returnPolicy) ||
      hasExternalChannel(editForm.avgPreparationTime)
    ) {
      toast.error(t("external_channel_blocked", "Les coordonnees de communication exterieure (messages, liens ou reseaux) ne sont pas autorisees dans ce champ de texte. Tout contact doit s'effectuer exclusivement via la plateforme OLMART."));
      return;
    }

    setSavingAbout(true);
    const toastId = toast.loading(isRTL ? "جاري الحفظ..." : "Enregistrement en cours...");
    try {
      const maskedForm = {
        ...editForm,
        shopName: maskSensitiveData(editForm.shopName || ''),
        shopDescription: maskSensitiveData(editForm.shopDescription || ''),
        legalStatus: maskSensitiveData(editForm.legalStatus || ''),
        returnPolicy: maskSensitiveData(editForm.returnPolicy || ''),
        avgPreparationTime: maskSensitiveData(editForm.avgPreparationTime || '')
      };

      await updateDoc(doc(db, "users", sellerId), maskedForm);
      await setDoc(doc(db, "publicProfiles", sellerId), maskedForm, { merge: true });
      setStoreInfo((prev: any) => ({ ...prev, ...maskedForm }));
      setIsEditingAbout(false);
      toast.success(isRTL ? "تم تحديث المعلومات بنجاح" : "Informations mises à jour.", { id: toastId });
    } catch(err) {
      console.error(err);
      toast.error(isRTL ? "خطأ أثناء الحفظ" : "Erreur lors de l'enregistrement", { id: toastId });
    } finally {
      setSavingAbout(false);
    }
  };

  const storeCategories = Array.from(new Set(products?.map(p => p.category))).filter((cat): cat is string => Boolean(cat));
  
  const getCategoryCount = (catName: string) => {
    return products.filter(p => p.category === catName).length;
  };

  // Smart search helper
  const normalizeText = (text?: string): string => {
    if (!text) return "";
    return text.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove Latin diacritics
      .replace(/[\u064B-\u065F]/g, "") // Remove Arabic diacritics (tashkeel)
      .replace(/[أإآ]/g, "ا") // Normalize Arabic Alef
      .replace(/ة/g, "ه") // Normalize Teh Marbuta
      .toLowerCase();
  };

  const matchesSmartSearch = (product: any, query: string): boolean => {
    if (!query) return true;
    
    // Multi-lingual synonyms groups (fr, en, ar)
    const synonymGroups = [
      ['chaussure', 'chaussures', 'soulier', 'souliers', 'basket', 'baskets', 'sneaker', 'sneakers', 'botte', 'bottes', 'sandale', 'sandales', 'shoes', 'shoe', 'حذاء', 'احذيه', 'سباط'],
      ['vetement', 'vetements', 'habit', 'habits', 'clothes', 'clothing', 'ملابس', 'لباس', 'كسوه'],
      ['pantalon', 'pantalons', 'pants', 'trousers', 'سروال', 'سراويل'],
      ['chemise', 'chemises', 'shirt', 'shirts', 'قميص', 'قمصان'],
      ['tshirt', 'tshirts', 't-shirt', 't-shirts', 'تيشيرت', 'تي شيرت'],
      ['veste', 'vestes', 'manteau', 'manteaux', 'jacket', 'coat', 'ستره', 'معطف', 'فيستا'],
      ['robe', 'robes', 'dress', 'dresses', 'فستان', 'فساتين', 'روبه'],
      ['telephone', 'telephones', 'smartphone', 'smartphones', 'portable', 'portables', 'mobile', 'mobiles', 'phone', 'phones', 'هاتف', 'هواتف', 'تليفون', 'موبايل'],
      ['pc', 'ordinateur', 'ordinateurs', 'laptop', 'laptops', 'macbook', 'computer', 'حاسوب', 'كمبيوتر', 'ميكرو'],
      ['velo', 'velos', 'bicyclette', 'bicyclettes', 'vtt', 'bike', 'bicycle', 'دراجه', 'دراجات', 'فيلو'],
      ['montre', 'montres', 'horloge', 'horloges', 'smartwatch', 'watch', 'watches', 'ساعه', 'ساعات', 'مكانه'],
      ['femme', 'femmes', 'fille', 'filles', 'dame', 'dames', 'women', 'woman', 'girl', 'امراه', 'نساء', 'بنت', 'بنات'],
      ['homme', 'hommes', 'garcon', 'garcons', 'monsieur', 'men', 'man', 'boy', 'رجل', 'رجال', 'ولد', 'اولاد'],
      ['enfant', 'enfants', 'bebe', 'bebes', 'kids', 'child', 'children', 'baby', 'طفل', 'اطفال', 'رضيع'],
      ['sac', 'sacs', 'bag', 'bags', 'حقيبه', 'حقائب', 'ساك']
    ];

    const searchTerms = normalizeText(query).split(/\s+/).filter(Boolean);
    
    const searchableText = normalizeText([
      product.title,
      product.name,
      product.description,
      product.category,
      product.subcategory,
      product.subSubCategory,
      product.gender,
      product.brand,
      ...(product.tags || []),
      ...(product.materials || [])
    ].filter(Boolean).join(" "));

    return searchTerms.every(term => {
      // Check the exact term
      if (searchableText.includes(term)) return true;
      
      // Check multi-lingual synonyms
      for (const group of synonymGroups) {
        if (group.some(g => g.includes(term) || term.includes(g))) {
           if (group.some(syn => searchableText.includes(syn))) return true;
        }
      }

      // Handle simple plurals (if term ends with 's' or 'x', try without it)
      if (term.endsWith('s') || term.endsWith('x')) {
        const singular = term.slice(0, -1);
        if (searchableText.includes(singular)) return true;
      }
      
      // Also check partial matching for the word root (extremely basic stemming)
      if (term.length > 4 && searchableText.includes(term.slice(0, -1))) return true;
      if (term.length > 5 && searchableText.includes(term.slice(0, -2))) return true;

      return false;
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = matchesSmartSearch(product, searchQuery);
    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const paginatedProducts = filteredProducts.slice(0, displayLimit);
  const currentHasMore = displayLimit < filteredProducts.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!storeInfo) {
    return (
      <div className="min-h-screen bg-[#faf8f5] pt-32 pb-20 flex items-center justify-center">
         <div className="text-center space-y-6">
            <Store className="w-20 h-20 text-zinc-300 mx-auto" />
            <h1 className="text-3xl font-black text-zinc-900">{d('notExist')}</h1>
            <p className="text-zinc-500 font-medium">{d('notExistDesc')}</p>
            <button onClick={() => navigate('/shop')} className="px-8 py-4 bg-zinc-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-800 transition-colors">
               {d('backToCatalog')}
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-32" dir={isRTL ? "rtl" : "ltr"}>
      <ConfirmModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeFollowToggle}
        title={t("Se désabonner") || "Se désabonner"}
        message="Voulez-vous vraiment ne plus suivre cette boutique ?"
      />
      {/* Dynamic Banner Cover */}
      <div className="h-60 sm:h-72 md:h-96 w-full bg-zinc-950 relative overflow-hidden">
         {storeInfo.bannerUrl ? (
            <img loading="lazy" src={getOptimizedImageUrl(storeInfo.bannerUrl, 1200)} alt={t("Store Banner") || "Store Banner"} className="w-full h-full object-cover opacity-70 transition-transform duration-700 hover:scale-[1.03]" />
         ) : (
            <div className="w-full h-full bg-gradient-to-tr from-zinc-900 via-zinc-900 to-amber-950/40 opacity-90" />
         )}
         
         <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
         
         {/* Navigation Back Button */}
         <button 
            onClick={() => navigate('/shop')}
            className="absolute top-6 left-4 sm:left-8 w-11 h-11 bg-white/10 hover:bg-white/25 backdrop-blur-lg rounded-full flex items-center justify-center text-white border border-white/20 transition-all shadow-md z-20 hover:scale-105 active:scale-95"
         >
            <ChevronLeft className="w-5 h-5" />
         </button>

         {/* Cover Banner Edit Button for Owner */}
         {isOwner && (
            <div className="absolute top-6 right-4 sm:right-8 rtl:left-4 rtl:right-auto rtl:sm:left-8 rtl:sm:right-auto z-20 animate-fade-in">
               <label className="w-11 h-11 bg-white/15 backdrop-blur-lg hover:bg-white/35 text-white border border-white/25 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95">
                  <Camera className="w-4 h-5" />
                  <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={handleBannerFileSelect} 
                     disabled={uploadingBanner}
                  />
               </label>
            </div>
         )}

         {uploadingBanner && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30">
               <div className="bg-zinc-950 border border-zinc-800 px-5 py-3.5 rounded-2xl flex items-center gap-3 text-white font-extrabold text-[11px] uppercase tracking-widest shadow-2xl">
                  <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>{d('uploadingCover')}</span>
               </div>
            </div>
         )}
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 relative -mt-24 sm:-mt-28 md:-mt-32 z-10 animate-fade-in">
         {/* Premium Store Header Card */}
         <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 border border-zinc-200/50">
            {/* Store Logo with Double-circle design */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 bg-white rounded-3xl p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.06)] relative group border border-zinc-100 flex-none -mt-20 sm:-mt-24 md:-mt-28">
               <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-50 flex items-center justify-center relative border border-zinc-100">
                  {storeInfo.logoUrl ? (
                     <img loading="lazy" src={getOptimizedImageUrl(storeInfo.logoUrl, 400)} alt={t("Store Logo") || "Store Logo"} className="w-full h-full object-cover" />
                  ) : (
                     <Store className="w-12 h-12 text-zinc-300" />
                  )}
                  {uploadingLogo && (
                     <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-10 animate-fade-in">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     </div>
                  )}
               </div>
               
               {isOwner && (
                  <label className="absolute -bottom-1 -right-1 w-9 h-9 bg-zinc-950 hover:bg-zinc-900 border-2 border-white shadow-xl rounded-xl flex items-center justify-center text-white cursor-pointer transition-all hover:scale-105 active:scale-95 z-20">
                     <Camera className="w-4 h-4" />
                     <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleLogoFileSelect} 
                        disabled={uploadingLogo} 
                     />
                  </label>
               )}
            </div>

            {/* Store Information Content */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full">
               <div className="flex flex-col md:flex-row items-center md:justify-between w-full gap-4">
                  <div className="space-y-1">
                     <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight rtl:tracking-normal">
                           {storeInfo.shopName || storeInfo.displayName || 'Boutique'}
                        </h1>
                        {/* Status Verification Badge */}
                        {storeInfo.status === 'ACTIVE' && (
                           <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{t("store_profile.verified", "Vérifié")}</span>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Owner Status Tag or Follow Button */}
                  <div className="shrink-0">
                     {isOwner ? (
                       <div className="bg-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#F37021] border border-zinc-800 shadow-sm select-none">
                          {isRTL ? "متجرك الخاص" : "Votre Boutique"}
                       </div>
                     ) : (
                       <button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all duration-300 ${
                             isFollowing 
                                ? 'bg-zinc-100 text-zinc-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent'
                                : 'bg-zinc-950 text-white hover:bg-zinc-850 hover:shadow-lg hover:shadow-zinc-950/10 active:scale-95 border border-zinc-900'
                          }`}
                       >
                          {isFollowing ? (
                             <>
                                <UserCheck className="w-3.5 h-3.5" />
                                {isRTL ? "متابع" : "Abonné"}
                             </>
                          ) : (
                             <>
                                <UserPlus className="w-3.5 h-3.5" />
                                {isRTL ? "متابعة" : "S'abonner"}
                             </>
                          )}
                       </button>
                     )}
                  </div>
               </div>

               {/* Elegant modern pill-based Statistics Highlights */}
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-2.5 py-1">
                     <MapPin className="w-3.5 h-3.5 text-orange-500" />
                     {storeInfo.wilaya || 'Algérie'}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-2.5 py-1">
                     <Package className="w-3.5 h-3.5 text-emerald-500" />
                     {totalCount !== null ? totalCount : "..."} {d('articles')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-2.5 py-1">
                     <Users className="w-3.5 h-3.5 text-indigo-500" />
                     {(storeInfo.followersCount || 0)} {d('subscribers')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50/50 border border-amber-100 rounded-lg px-2.5 py-1">
                     <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                     {d('newSeller')}
                  </span>
               </div>
               
               <p className="text-zinc-500 font-medium max-w-2xl text-xs sm:text-sm leading-relaxed text-center md:text-left rtl:md:text-right">
                  {storeInfo.shopDescription || d('welcome')}
               </p>

               {/* Modern Tab navigation to separate catalog and store details */}
               <div className="flex border-b border-zinc-100 gap-8 pt-6 w-full justify-center md:justify-start">
                  <button
                     onClick={() => { setActiveTab('products'); setSelectedCategory(null); setSearchQuery(''); }}
                     className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                        activeTab === 'products' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-600'
                     }`}
                  >
                     <Package className="w-3.5 h-3.5" />
                     <span>{isRTL ? "المنتجات" : "Boutique"}</span>
                     {activeTab === 'products' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full animate-fade-in" />
                     )}
                  </button>
                  <button
                     onClick={() => setActiveTab('about')}
                     className={`pb-3 px-1 font-black text-[10px] uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                        activeTab === 'about' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-600'
                     }`}
                  >
                     <Info className="w-3.5 h-3.5" />
                     <span>{isRTL ? "حول المتجر" : "À propos & Garanties"}</span>
                     {activeTab === 'about' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-950 rounded-full animate-fade-in" />
                     )}
                  </button>
               </div>
            </div>
         </div>

         {/* Dynamic content rendering based on active tab */}
         <div className="mt-12">
            {activeTab === 'products' ? (
               <div className="space-y-10">
                  {/* Dynamic Products Search & Filter Panel */}
                  {products.length > 0 && (
                     <div className="bg-white border border-zinc-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                           {/* Live Search inside Store */}
                           <div className="relative flex-1">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input
                                 type="text"
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 placeholder={isRTL ? "بحث في هذا المتجر..." : "Rechercher dans cette boutique..."}
                                 className="w-full pl-11 pr-10 py-3 bg-zinc-50 border border-zinc-150 rounded-xl text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:bg-white transition-all shadow-inner"
                              />
                              {searchQuery && (
                                 <button 
                                    onClick={() => setSearchQuery('')} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                 >
                                    <X className="w-3.5 h-3.5" />
                                 </button>
                              )}
                           </div>
                           
                           {/* Category Horizontal Scrolling Pills */}
                           {storeCategories.length > 0 && (
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 max-w-full lg:max-w-2xl xl:max-w-3xl">
                                 <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                                       selectedCategory === null 
                                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                                          : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:bg-zinc-100'
                                    }`}
                                 >
                                    {isRTL ? "الكل" : "Tout voir"}
                                 </button>
                                 {storeCategories.map(cat => (
                                    <button
                                       key={cat}
                                       onClick={() => setSelectedCategory(cat)}
                                       className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                                          selectedCategory === cat
                                             ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                                             : 'bg-zinc-50/50 text-zinc-600 border-zinc-100 hover:bg-zinc-100 hover:border-zinc-200'
                                       }`}
                                    >
                                       <span>{cat}</span>
                                       <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                          selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'
                                       }`}>
                                          {getCategoryCount(cat)}
                                       </span>
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>

                        {/* Search Indicator bar */}
                        {(searchQuery || selectedCategory) && (
                           <div className="flex items-center justify-between text-xs font-bold text-zinc-500 bg-zinc-50/60 p-2.5 px-4 rounded-xl border border-zinc-100">
                              <div className="flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                 <span>
                                    {isRTL 
                                       ? `تم العثور على ${filteredProducts.length} من المنتجات المطابقة`
                                       : `${filteredProducts.length} articles correspondent à vos filtres`}
                                 </span>
                              </div>
                              <button 
                                 onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                 className="text-orange-600 hover:text-orange-700 underline text-[10px] uppercase font-black tracking-wider"
                              >
                                 {isRTL ? "إعادة تعيين" : "Réinitialiser"}
                              </button>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Products Grid rendering */}
                  {filteredProducts.length > 0 ? (
                     <div className="space-y-12">
                        {/* 1. Default Standard Store Presentation (No Active Queries) */}
                        {!searchQuery && !selectedCategory ? (
                           <>
                              {/* Featured items shelf */}
                              {filteredProducts.filter((p: any) => p.isStoreFeatured).length > 0 && (
                                 <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-4">
                                       <h2 className="text-lg font-black text-zinc-900 uppercase tracking-widest">{d('featured')}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                       {filteredProducts.filter((p: any) => p.isStoreFeatured).map((product, i) => (
                                          <div key={product.id} className="col-span-1 transform transition-transform hover:scale-[1.015]">
                                             <ProductCard product={product} index={i} />
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}

                              {/* All listings grid */}
                              {filteredProducts.filter((p: any) => !p.isStoreFeatured).length > 0 && (
                                 <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-l-4 border-zinc-950 pl-4">
                                       <h2 className="text-lg font-black text-zinc-900 uppercase tracking-widest">{d('allArticles')}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                                       {filteredProducts.filter((p: any) => !p.isStoreFeatured).slice(0, displayLimit).map((product, i) => (
                                          <div key={product.id} className="col-span-1 transform transition-transform hover:scale-[1.015]">
                                             <ProductCard product={product} index={i} />
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </>
                        ) : (
                           /* 2. Unified Grid for Filtered / Searched items */
                           <div className="space-y-6">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                                 {paginatedProducts.map((product, i) => (
                                    <div key={product.id} className="col-span-1 transform transition-transform hover:scale-[1.015]">
                                       <ProductCard product={product} index={i} />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {currentHasMore && (
                           <div className="flex justify-center mt-6">
                              <button
                                 onClick={loadMoreProducts}
                                 className="px-8 py-3.5 bg-zinc-950 text-white hover:bg-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-3 cursor-pointer"
                              >
                                 {d('loadMore')}
                              </button>
                           </div>
                        )}
                     </div>
                  ) : (
                     /* Empty Catalog or Search results state */
                     <div className="py-24 bg-white border border-zinc-100 rounded-3xl flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300 border border-zinc-100">
                           <SearchX className="w-9 h-9" />
                        </div>
                        <div className="space-y-1">
                           <h3 className="text-lg font-black text-zinc-900">
                              {(searchQuery || selectedCategory) ? (isRTL ? "لا توجد نتائج" : "Aucun article trouvé") : d('emptyStore')}
                           </h3>
                           <p className="text-zinc-400 max-w-sm text-xs font-bold leading-relaxed">
                              {(searchQuery || selectedCategory) 
                                 ? (isRTL ? "حاول تغيير كلمات البحث أو إعادة تعيين عامل التصفية." : "Votre recherche n'a retourné aucun produit pour ce vendeur.") 
                                 : d('emptyDesc')}
                           </p>
                        </div>
                        {(searchQuery || selectedCategory) && (
                           <button 
                              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                              className="px-6 py-2.5 bg-zinc-950 text-white text-[10px] uppercase tracking-widest font-black rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
                           >
                              {isRTL ? "إعادة تعيين البحث" : "Réinitialiser la recherche"}
                           </button>
                        )}
                     </div>
                  )}
               </div>
            ) : (
               /* ABOUT & GUARANTEES TAB - High contrast Bento structure */
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
                  {/* Left Column: Brand Story */}
                  <div className="lg:col-span-5 space-y-6">
                     <div className="bg-white border border-zinc-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                           <div className="flex items-center gap-3">
                              <Store className="w-5 h-5 text-orange-500" />
                              <h3 className="text-sm font-black uppercase text-zinc-900 tracking-wider">
                                 {isRTL ? "عن العلامة التجارية" : `La Boutique ${storeInfo.shopName || 'Boutique'}`}
                              </h3>
                           </div>
                           {isOwner && (
                              <button
                                 onClick={() => setIsEditingAbout(!isEditingAbout)}
                                 className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border border-orange-100"
                              >
                                 {isEditingAbout ? (isRTL ? "إلغاء التعديل" : "Annuler") : (isRTL ? "تعديل" : "Modifier")}
                              </button>
                           )}
                        </div>

                        {isEditingAbout ? (
                           <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "اسم المتجر" : "Nom de la boutique"}</label>
                                 <input
                                    type="text"
                                    value={editForm.shopName}
                                    onChange={(e) => setEditForm(prev => ({...prev, shopName: e.target.value}))}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                    placeholder={isRTL ? "اسم متجرك..." : "Nom de votre boutique..."}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "وصف المتجر" : "Description de la boutique"}</label>
                                 <textarea
                                    value={editForm.shopDescription}
                                    onChange={(e) => setEditForm(prev => ({...prev, shopDescription: e.target.value}))}
                                    rows={4}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                    placeholder={isRTL ? "وصف متجرك..." : "Décrivez votre boutique..."}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "الولاية" : "Wilaya"}</label>
                                 <select
                                    value={editForm.wilaya}
                                    onChange={(e) => setEditForm(prev => ({...prev, wilaya: e.target.value}))}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                 >
                                    <option value="">{isRTL ? "اختر الولاية" : "Sélectionnez votre Wilaya"}</option>
                                    {Object.values(ALGERIA_REGIONS).map((w) => (
                                       <option key={w.code} value={`${w.code} ${w.name}`}>{w.code} {w.name}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>
                        ) : (
                           <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed font-semibold">
                              {storeInfo.shopDescription || (isRTL ? "مرحبًا بكم في متجرنا الرسمي على Olma. لقد تم التحقق من متجرنا لتزويدك بأفضل السلع والخدمات بأمان تام." : "Bienvenue dans notre boutique officielle sur Olma. Découvrez notre rigoureuse sélection d'articles d'excellence aux meilleurs prix du marché.")}
                           </p>
                        )}

                        <div className="space-y-3 pt-2">
                           {!isEditingAbout && (
                              <div className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2.5">
                                 <span className="text-zinc-400 font-bold">{isRTL ? "موقع البائع" : "Région d'expédition"}</span>
                                 <span className="text-zinc-800 font-extrabold">{storeInfo.wilaya || 'Algérie'}</span>
                              </div>
                           )}
                           <div className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2.5">
                              <span className="text-zinc-400 font-bold">{isRTL ? "تاريخ الانضمام" : "Partenaire depuis"}</span>
                              <span className="text-zinc-800 font-extrabold">2026</span>
                           </div>
                           <div className="flex justify-between items-center text-xs border-b border-zinc-50 pb-2.5">
                              <span className="text-zinc-400 font-bold">{isRTL ? "إجمالي المنتجات" : "Total d'articles actifs"}</span>
                              <span className="text-zinc-800 font-extrabold">{totalCount || 0}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-400 font-bold">{isRTL ? "المتابعون" : "Abonnés vérifiés"}</span>
                              <span className="text-indigo-600 font-extrabold">{(storeInfo.followersCount || 0)}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Policies and Seals */}
                  <div className="lg:col-span-7 space-y-6">
                     <div className="bg-white border border-zinc-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                           <div className="flex items-center gap-3">
                              <ShieldCheck className="w-5 h-5 text-emerald-500" />
                              <h3 className="text-sm font-black uppercase text-zinc-900 tracking-wider">
                                 {isRTL ? "التزامات المتجر وخدمة العملاء" : "Engagements & Service Client"}
                              </h3>
                           </div>
                           {isOwner && (
                              <button
                                 onClick={() => setIsEditingAbout(!isEditingAbout)}
                                 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                              >
                                 {isEditingAbout ? (isRTL ? "إلغاء التعديل" : "Annuler") : (isRTL ? "تعديل" : "Modifier")}
                              </button>
                           )}
                        </div>

                        {isEditingAbout ? (
                           <div className="space-y-5">
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "الوضع القانوني (اختياري)" : "Statut Légal (Optionnel)"}</label>
                                 <input
                                    type="text"
                                    value={editForm.legalStatus}
                                    onChange={(e) => setEditForm(prev => ({...prev, legalStatus: e.target.value}))}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                    placeholder="SARL, EURL, Auto-entrepreneur..."
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "متوسط وقت التحضير" : "Délai moyen de préparation"}</label>
                                 <input
                                    type="text"
                                    value={editForm.avgPreparationTime}
                                    onChange={(e) => setEditForm(prev => ({...prev, avgPreparationTime: e.target.value}))}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                    placeholder="ex: 24 - 48 heures"
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">{isRTL ? "سياسة الإرجاع" : "Politique de retour et garantie"}</label>
                                 <textarea
                                    value={editForm.returnPolicy}
                                    onChange={(e) => setEditForm(prev => ({...prev, returnPolicy: e.target.value}))}
                                    rows={3}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800"
                                    placeholder={isRTL ? "أدخل سياسة الإرجاع..." : "Saisissez votre politique..."}
                                 />
                              </div>

                              <div className="pt-4 flex justify-end">
                                 <button
                                    onClick={saveAboutInfo}
                                    disabled={savingAbout}
                                    className="px-8 py-3.5 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                                 >
                                    {savingAbout ? (isRTL ? "جاري الحفظ..." : "Enregistrement...") : (isRTL ? "حفظ التغييرات" : "Enregistrer les modifications")}
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-6">
                              {/* Legal Status badge */}
                              {storeInfo.legalStatus && (
                                 <div className="flex gap-4 p-4 rounded-2xl bg-zinc-50/50 border border-zinc-100">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center shrink-0 shadow-sm">
                                       <Building2 className="w-4 h-4 text-zinc-500" />
                                    </div>
                                    <div>
                                       <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{d('legalStatus')}</h4>
                                       <p className="text-xs font-black text-zinc-800 mt-0.5">{storeInfo.legalStatus}</p>
                                       <p className="text-[11px] text-zinc-400 font-medium mt-1">{t("store_profile.verified_desc", "Vendeur certifié ayant fourni ses documents d'immatriculation officiels.")}</p>
                                    </div>
                                 </div>
                              )}

                              {/* Ship timeline / average prep speed */}
                              {storeInfo.avgPreparationTime && (
                                 <div className="flex gap-4 p-4 rounded-2xl bg-orange-50/20 border border-orange-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-orange-100/50 flex items-center justify-center shrink-0 shadow-sm">
                                       <Truck className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <div className="flex-1">
                                       <h4 className="text-[10px] font-black text-orange-700 uppercase tracking-wider">{d('prepTime')}</h4>
                                       <p className="text-xs font-black text-zinc-800 mt-0.5">{storeInfo.avgPreparationTime}</p>
                                       <p className="text-[11px] text-zinc-500 font-semibold mt-1">{t("store_profile.dispatch_desc", "Délai estimé pour confier votre commande à l'agence d'expédition agréée.")}</p>
                                    </div>
                                 </div>
                              )}

                              {/* Returns & Exchange Guarantee Policies */}
                              {storeInfo.returnPolicy && (
                                 <div className="flex gap-4 p-4 rounded-2xl bg-blue-50/20 border border-blue-100/50">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-blue-100/50 flex items-center justify-center shrink-0 shadow-sm">
                                       <Undo2 className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                       <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-wider">{d('returnPolicy')}</h4>
                                       <p className="text-xs font-black text-zinc-800 leading-relaxed mt-1 italic">
                                          "{storeInfo.returnPolicy}"
                                       </p>
                                       <p className="text-[11px] text-zinc-400 font-medium mt-2">{t("store_profile.guarantee_desc", "La conformité de la marchandise est garantie selon la législation algérienne sur le commerce électronique.")}</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>

      <AnimatePresence>
        {adjustingImage && (
          <ImageAdjusterModal
            src={adjustingImage.src}
            type={adjustingImage.type}
            isRTL={isRTL}
            onClose={() => setAdjustingImage(null)}
            onConfirm={handleSaveAdjustedImage}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
