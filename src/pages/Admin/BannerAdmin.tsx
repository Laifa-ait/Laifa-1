import React, { useState, useEffect } from 'react';
import { auth, storage, db } from '../../lib/firebase';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, query, getDocs, orderBy, addDoc, deleteDoc, doc, updateDoc, writeBatch, limit } from 'firebase/firestore';
import { 
  Plus, Edit, Trash2, ArrowUp, ArrowDown, ImageIcon, 
  Upload, Check, X, AlertCircle, Eye, Tag, Paintbrush, 
  ChevronRight, ArrowLeftRight, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { ALGERIA_WILAYAS } from '../../constants';
import { useTranslation } from "react-i18next";

export interface DbBanner {
  id: string;
  title: string;
  title_color?: string;
  subtitle?: string;
  subtitle_color?: string;
  button_text: string;
  btn_bg_color?: string;
  btn_text_color?: string;
  desktop_image: string;
  mobile_image?: string | null;
  tag_id: string;
  sort_order: number;
  is_active: boolean;
  featured_products?: string[];
  created_at?: any;
}

export interface TagType {
  id: string;
  name: string;
  slug: string;
}

export const BannerAdmin: React.FC = () => {
    const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'banners' | 'tags'>('banners');
  
  // Data state
  const [banners, setBanners] = useState<DbBanner[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal or Form state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<DbBanner | null>(null);

  // New Banner Fields
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerTitleColor, setBannerTitleColor] = useState('#FFFFFF');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerSubtitleColor, setBannerSubtitleColor] = useState('#FFFFFF');
  const [bannerButtonText, setBannerButtonText] = useState('Découvrir');
  const [bannerBtnBgColor, setBannerBtnBgColor] = useState('#FFFFFF');
  const [bannerBtnTextColor, setBannerBtnTextColor] = useState('#18181B');
  const [bannerDesktopImage, setBannerDesktopImage] = useState('');
  const [bannerMobileImage, setBannerMobileImage] = useState('');
  const [bannerTagId, setBannerTagId] = useState('');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerFeaturedProducts, setBannerFeaturedProducts] = useState<string[]>([]);

  // Deep Targeting States
  const [bannerTargetUserType, setBannerTargetUserType] = useState<"all" | "new" | "logged_in">("all");
  const [bannerTargetRegions, setBannerTargetRegions] = useState<string[]>([]);
  
  // Search state for product selector
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Upload state indicators
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [uploadProgressDesktop, setUploadProgressDesktop] = useState(0);
  const [uploadProgressMobile, setUploadProgressMobile] = useState(0);

  // New Tag Fields
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  // Drag State (for HTML5 drag & drop)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch all initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Banners
      const qBanners = query(collection(db, 'banners'), orderBy('sort_order', 'asc'));
      const snapBanners = await getDocs(qBanners);
      setBanners(snapBanners.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DbBanner));

      // 2. Fetch Tags
      const snapTags = await getDocs(query(collection(db, 'tags'), limit(300)));
      setTags(snapTags.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TagType));
      
      // 3. Fetch all Products for selector
      const qProducts = query(collection(db, 'products'), limit(100));
      const snapProducts = await getDocs(qProducts);
      setAllProducts(snapProducts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Erreur réseau lors de la récupération des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler for tag slug auto generation
  const handleTagNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagName(val);
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setTagSlug(slug);
  };

  // Create Tag
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName || !tagSlug) {
      toast.error('Veuillez remplir le nom et le slug du tag');
      return;
    }

    try {
      await addDoc(collection(db, 'tags'), { name: tagName, slug: tagSlug });
      toast.success(`Tag "${tagName}" créé !`);
      setTagName('');
      setTagSlug('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création du tag');
    }
  };

  // Delete Tag
  const handleDeleteTag = async (id: string, name: string) => {
    

    try {
      await deleteDoc(doc(db, 'tags', id));
      toast.success('Tag supprimé avec succès');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  // Try to compress and resize image client-side before uploading (extremely fast, robust & dimensions matching)
  const compressAndResize = (file: File, targetW: number, targetH: number): Promise<{ blob: Blob; base64: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Impossible d'initialiser le processeur d'image"));
            return;
          }

          // Calculate aspect ratio scaling (cover effect)
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const targetRatio = targetW / targetH;
          
          let drawW = targetW;
          let drawH = targetH;
          let offsetX = 0;
          let offsetY = 0;

          if (imgRatio > targetRatio) {
            // Image is wider than target ratio
            drawW = targetH * imgRatio;
            offsetX = (targetW - drawW) / 2;
          } else {
            // Image is taller than target ratio
            drawH = targetW / imgRatio;
            offsetY = (targetH - drawH) / 2;
          }

          // Draw and center image
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

          // Get blob and base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ blob, base64: dataUrl });
            } else {
              reject(new Error("Échec de la compression de l'image"));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
      reader.readAsDataURL(file);
    });
  };

  // Upload banner images (Firebase Storage with automatic local server & base64 state fallbacks)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check type validation
    const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      toast.error('Format incorrect ! Seuls les formats JPG, PNG, WebP sont acceptés.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Le fichier est trop lourd ! (Maximum 15 Mo)');
      return;
    }

    const reqW = type === 'desktop' ? 1920 : 800;
    const reqH = type === 'desktop' ? 800 : 1000;

    if (type === 'desktop') setIsUploadingDesktop(true);
    else setIsUploadingMobile(true);

    try {
      toast.loading(`Optimisation, redimensionnement et traitement de l'image ${type === 'desktop' ? 'bureau' : 'mobile'}...`, { id: 'upload-toast' });
      
      const { blob, base64 } = await compressAndResize(file, reqW, reqH);
      
      let finalUrl = "";
      
      // Attempt Firebase Storage upload
      try {
        console.log("Attempting Firebase Storage image upload...");
        const storageRef = ref(storage, `banners/${Date.now()}_${type}_${file.name.replace(/\s+/g, '_')}`);
        
        finalUrl = await new Promise((resolve, reject) => {
           const uploadTask = uploadBytesResumable(storageRef, blob);
           uploadTask.on('state_changed',
              (snapshot) => {
                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                 if (type === 'desktop') setUploadProgressDesktop(Math.round(progress));
                 else setUploadProgressMobile(Math.round(progress));
              },
              (error) => reject(error),
              async () => {
                 try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(url);
                 } catch (e) {
                    reject(e);
                 }
              }
           );
        });

        console.log("Firebase Storage success:", finalUrl);
      } catch (storageErr: any) {
        console.error("Firebase Storage failed:", storageErr);
        throw new Error("Échec du téléchargement vers Firebase Storage: " + (storageErr.message || ""));
      }

      if (type === 'desktop') {
        setBannerDesktopImage(finalUrl);
      } else {
        setBannerMobileImage(finalUrl);
      }
      
      toast.success('Image importée et validée aux dimensions idéales ! 📸', { id: 'upload-toast' });
    } catch (err: any) {
      toast.error(`Erreur d'importation: ${err.message || "Veuillez réessayer."}`, { id: 'upload-toast' });
      console.error(err);
    } finally {
      if (type === 'desktop') setIsUploadingDesktop(false);
      else setIsUploadingMobile(false);
    }
  };

  // Open Banner Modal for editing or creation
  const handleOpenBannerModal = (banner: DbBanner | null = null) => {
    setSelectedBanner(banner);
    setIsUploadingDesktop(false);
    setIsUploadingMobile(false);
    if (banner) {
      // Edit mode fields
      setBannerTitle(banner.title);
      setBannerTitleColor(banner.title_color || '#FFFFFF');
      setBannerSubtitle(banner.subtitle || '');
      setBannerSubtitleColor(banner.subtitle_color || '#FFFFFF');
      setBannerButtonText(banner.button_text);
      setBannerBtnBgColor(banner.btn_bg_color || '#FFFFFF');
      setBannerBtnTextColor(banner.btn_text_color || '#18181B');
      setBannerDesktopImage(banner.desktop_image);
      setBannerMobileImage(banner.mobile_image || '');
      setBannerTagId(banner.tag_id);
      setBannerIsActive(banner.is_active);
      setBannerFeaturedProducts(banner.featured_products || []);
      setBannerTargetUserType((banner as any).targetUserType || 'all');
      setBannerTargetRegions((banner as any).targetRegions || []);
    } else {
      // Create mode default fields
      setBannerTitle('');
      setBannerTitleColor('#FFFFFF');
      setBannerSubtitle('');
      setBannerSubtitleColor('#FFFFFF');
      setBannerButtonText('Découvrir la Collection');
      setBannerBtnBgColor('#FFFFFF');
      setBannerBtnTextColor('#18181B');
      setBannerDesktopImage('');
      setBannerMobileImage('');
      setBannerTagId(tags[0]?.id || '');
      setBannerIsActive(true);
      setBannerFeaturedProducts([]);
      setBannerTargetUserType('all');
      setBannerTargetRegions([]);
    }
    setIsBannerModalOpen(true);
  };

  // Submit Banner Creation or Modification
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerButtonText || !bannerDesktopImage || !bannerTagId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const payload = {
        title: bannerTitle.trim(),
        title_color: bannerTitleColor,
        subtitle: bannerSubtitle.trim(),
        subtitle_color: bannerSubtitleColor,
        button_text: bannerButtonText.trim(),
        btn_bg_color: bannerBtnBgColor,
        btn_text_color: bannerBtnTextColor,
        desktop_image: bannerDesktopImage.trim(),
        mobile_image: bannerMobileImage.trim() || null,
        tag_id: bannerTagId,
        is_active: bannerIsActive,
        featured_products: bannerFeaturedProducts,
        targetUserType: bannerTargetUserType,
        targetRegions: bannerTargetRegions
      };

      let res;
      if (selectedBanner) {
        // Edit
        await updateDoc(doc(db, 'banners', selectedBanner.id), payload);
        toast.success('Bannière modifiée !');
      } else {
        // Create
        await addDoc(collection(db, 'banners'), { ...payload, sort_order: banners.length + 1 });
        toast.success('Bannière créée avec succès !');
      }

      setIsBannerModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  // Delete Banner
  const handleDeleteBanner = async (id: string, title: string) => {
    

    try {
      await deleteDoc(doc(db, 'banners', id));
      toast.success('Bannière supprimée');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  // Index shifting / movement trigger
  const shiftIndex = async (index: number, direction: 'up' | 'down') => {
    const updatedBanners = [...banners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= updatedBanners.length) return;

    // Swap elements
    const element = updatedBanners[index];
    updatedBanners[index] = updatedBanners[targetIndex];
    updatedBanners[targetIndex] = element;

    // Direct UI Feedback for premium smoothness
    setBanners(updatedBanners);

    // Call API to store new orders
    await saveNewReorder(updatedBanners);
  };

  // Helper with batch API reordering
  const saveNewReorder = async (list: DbBanner[]) => {
    try {
      const batch = writeBatch(db);
      list.forEach((b, index) => {
        batch.update(doc(db, 'banners', b.id), { sort_order: index + 1 });
      });
      await batch.commit();

      toast.success('Ordre de tri réordonné avec succès !');
      fetchData(); // Sync with DB server
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde du re-tri');
    }
  };

  // Drag and Drop HTML5 handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updatedBanners = [...banners];
    const draggedItem = updatedBanners[draggedIndex];
    
    // Remove from old slot and insert in new slot
    updatedBanners.splice(draggedIndex, 1);
    updatedBanners.splice(dropIndex, 0, draggedItem);

    setDraggedIndex(null);
    setBanners(updatedBanners);
    await saveNewReorder(updatedBanners);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tighter rtl:tracking-normal uppercase flex items-center gap-2">
            <Settings className="w-8 h-8 text-orange-500" />
            {t("Carousel & Design")}</h1>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-1">
            {t("Gérez vos bannières marketing et vos tags de redirection d'accueil")}</p>
        </div>

        {/* Action switch button */}
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl w-fit self-start shrink-0 border border-zinc-200">
          <button
            onClick={() => setActiveTab('banners')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer ${
              activeTab === 'banners' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-950'
            }`}
          >
            {t("Bannières")}</button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer ${
              activeTab === 'tags' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-zinc-950'
            }`}
          >
            {t("Tags Produits")}</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 bg-white rounded-3xl border border-zinc-100 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest rtl:tracking-normal">{t("Hydratation des données...")}</span>
        </div>
      ) : activeTab === 'banners' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 uppercase tracking-wider rtl:tracking-normal">
              {t("Bannières de l'affichage (")}{banners.length})
            </h2>
            <button
              onClick={() => handleOpenBannerModal(null)}
              className="flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal hover:bg-orange-500 transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t("Nouvelle Bannière")}</button>
          </div>

          {banners.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border-2 border-dashed border-zinc-200">
              <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-zinc-700 uppercase">{t("Aucune bannière configurée")}</h3>
              <p className="text-zinc-500 text-xs mt-1">
                {t("La page d'accueil affiche les bannières actives en ordre de tri. Créez-en une maintenant !")}</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-zinc-50/50 border-b border-zinc-100 text-[10px] uppercase font-black tracking-widest rtl:tracking-normal text-zinc-400 grid grid-cols-1 md:grid-cols-12 gap-4 hidden md:grid">
                <div className="col-span-1 text-center">{t("Tri")}</div>
                <div className="col-span-4">{t("Visuels (bureau / mobile)")}</div>
                <div className="col-span-3">{t("Détails Marketing")}</div>
                <div className="col-span-2 text-center">{t("Tag Lié")}</div>
                <div className="col-span-1 text-center">{t("Statut")}</div>
                <div className="col-span-1 text-center">{t("Actions")}</div>
              </div>

              <div className="divide-y divide-zinc-100">
                {banners.map((banner, index) => {
                    
                  const associatedTag = tags.find((t) => t.id === banner.tag_id);
                  return (
                    <div
                      key={banner.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-6 hover:bg-zinc-50/50 transition-colors cursor-move relative ${
                        draggedIndex === index ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Tri controls and visual move buttons */}
                      <div className="col-span-full md:col-span-1 flex flex-row md:flex-col items-center justify-center gap-1">
                        <button
                          disabled={index === 0}
                          onClick={() => shiftIndex(index, 'up')}
                          className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 disabled:opacity-20 cursor-pointer"
                          title={t("Reculer") || "Reculer"}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-black text-zinc-800 bg-zinc-100 px-2.5 py-1 rounded-md min-w-[24px] text-center shrink-0">
                          {banner.sort_order || index + 1}
                        </span>
                        <button
                          disabled={index === banners.length - 1}
                          onClick={() => shiftIndex(index, 'down')}
                          className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 disabled:opacity-20 cursor-pointer"
                          title={t("Avancer") || "Avancer"}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Micro visual previews */}
                      <div className="col-span-full md:col-span-4 space-y-2">
                        <div className="flex gap-2.5 justify-center md:justify-start">
                          <div className="relative aspect-[21/9] w-32 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                            <img loading="lazy"
                              src={banner.desktop_image}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1 start-1 px-1 bg-black/60 rounded text-[8px] text-white uppercase font-black">{t("Desktop")}</div>
                          </div>
                          {banner.mobile_image ? (
                            <div className="relative aspect-[4/5] w-12 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                              <img loading="lazy"
                                src={banner.mobile_image}
                                alt=""
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-1 start-1 px-1 bg-black/60 rounded text-[8px] text-white uppercase font-black">{t("Mobile")}</div>
                            </div>
                          ) : (
                            <div className="w-12 aspect-[4/5] rounded-lg border border-dashed border-zinc-200 flex flex-col items-center justify-center text-[8px] text-zinc-400 font-bold text-center uppercase p-1 leading-none shrink-0" title={t("Pas de visuel mobile, fallback desktop activé") || "Pas de visuel mobile, fallback desktop activé"}>
                              <span>{t("Mobi")}</span><span>{t("Fallback")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content strings text */}
                      <div className="col-span-full md:col-span-3 space-y-1 text-center md:text-start">
                        <h4 
                          className="text-sm font-extrabold truncate"
                          style={{ color: banner.title_color }}
                        >
                          {banner.title}
                        </h4>
                        <div className="flex items-center justify-center md:justify-start gap-1.5 text-[10px] font-bold text-zinc-500 uppercase">
                          <span>{t("Bouton :")}</span>
                          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                            {banner.button_text}
                          </span>
                        </div>
                      </div>

                      {/* Associated redirection tag */}
                      <div className="col-span-full md:col-span-2 flex items-center justify-center md:block">
                        {associatedTag ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-[10px] uppercase font-bold tracking-wider rtl:tracking-normal">
                            <Tag className="w-3 h-3 shrink-0" />
                            {associatedTag.name}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full flex items-center gap-1 mx-auto md:mx-0 w-fit">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {t("Tag inexistant")}</span>
                        )}
                      </div>

                      {/* Active published state indicator */}
                      <div className="col-span-full md:col-span-1 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest rtl:tracking-normal ${
                          banner.is_active 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          {banner.is_active ? 'Publié' : 'Brouillon'}
                        </span>
                      </div>

                      {/* CRUD Modifying Actions */}
                      <div className="col-span-full md:col-span-1 flex items-center justify-center gap-1.5 text-zinc-400">
                        <button
                          onClick={() => handleOpenBannerModal(banner)}
                          className="p-2.5 bg-zinc-100 md:bg-transparent text-zinc-800 md:text-zinc-400 hover:bg-zinc-200 hover:text-zinc-950 rounded-xl transition-all cursor-pointer flex items-center gap-1 px-4 md:px-2"
                          title={t("Modifier") || "Modifier"}
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase md:hidden">{t("Modifier")}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(banner.id, banner.title)}
                          className="p-2.5 bg-red-50 md:bg-transparent text-red-600 md:text-zinc-400 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all cursor-pointer flex items-center gap-1 px-4 md:px-2"
                          title={t("Supprimer") || "Supprimer"}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase md:hidden">{t("Supprimer")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick tips label footer */}
          <div className="flex items-center gap-2.5 p-4 bg-orange-50 border border-orange-100/50 rounded-2xl text-[11px] font-bold uppercase tracking-wider rtl:tracking-normal text-orange-700">
            <ArrowLeftRight className="w-4 h-4 shrink-0 text-orange-600 animate-pulse" />
            <span>{t("Astuce : Vous pouvez également glisser-déposer les listes de bannières pour réordonner l'ordre de défilement de l'accueil.")}</span>
          </div>
        </div>
      ) : (
        /* TAG MANAGER SUBSECTION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Creating tag form */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm h-fit space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-zinc-950 uppercase tracking-wide">
                {t("Créer un Nouveau Tag")}</h3>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider rtl:tracking-normal mt-0.5">
                {t("Les tags groupent les produits et lient les bannières")}</p>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Nom du Tag (ex: Soldes d'été)")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("Nom du tag...") || "Nom du tag..."}
                  value={tagName}
                  onChange={handleTagNameChange}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Slug d'URL (ex: soldes-ete)")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("slug-url") || "slug-url"}
                  value={tagSlug}
                  onChange={(e) => setTagSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm bg-zinc-50 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-orange-600 text-white rounded-xl font-black text-xs uppercase tracking-widest rtl:tracking-normal hover:bg-orange-500 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("Créer le Tag")}</button>
            </form>
          </div>

          {/* Tags table results grid list */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-zinc-950 uppercase tracking-wide">
              {t("Tags Existants (")}{tags.length})
            </h3>

            {tags.length === 0 ? (
              <div className="p-12 text-center bg-zinc-50 rounded-2xl border border-dashed text-zinc-400 uppercase text-xs font-bold font-mono">
                {t("Aucun tag existant. Créez-en un à gauche.")}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pe-2">
                {tags.map((tag) => {
                  
                  return (
                                  <div
                                    key={tag.id}
                                    className="flex justify-between items-center p-3 border border-zinc-100 rounded-2xl hover:border-zinc-300 transition-all bg-[#fafafa]/50"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="text-xs font-black text-zinc-950 truncate flex items-center gap-1.5">
                                        <Tag className="w-3 h-3 text-orange-500 shrink-0" />
                                        {tag.name}
                                      </div>
                                      <div className="text-[9px] font-mono text-zinc-400 font-bold tracking-wider rtl:tracking-normal truncate">
                                        {t("slug:")}{tag.slug}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0 cursor-pointer"
                                      title={t("Supprimer ce tag") || "Supprimer ce tag"}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDIT / CREATE BANNER PANEL */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transition-transform scale-100 border border-zinc-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight rtl:tracking-normal">
                  {selectedBanner ? 'Modifier la Bannière' : 'Créer une Bannière d\'Accueil'}
                </h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-0.5">
                  {t("Remplissez et validez soigneusement les dimensions requises")}</p>
              </div>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Grid content */}
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto flex-1">
              
              {/* Form parameters */}
              <form onSubmit={handleSaveBanner} className="space-y-5">
                
                {/* Title and Title Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Titre de la Bannière *")}</label>
                    <input
                      type="text"
                      required
                      placeholder={t("ex: Sélection Premium") || "ex: Sélection Premium"}
                      value={bannerTitle}
                      onChange={(e) => setBannerTitle(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-orange-300 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Couleur Titre")}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={bannerTitleColor}
                        onChange={(e) => setBannerTitleColor(e.target.value)}
                        className="w-11 h-11 rounded-xl cursor-pointer border border-zinc-200 shrink-0 select-none bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder={t("#FFFFFF") || "#FFFFFF"}
                        value={bannerTitleColor}
                        onChange={(e) => setBannerTitleColor(e.target.value)}
                        className="w-full h-11 px-2.5 border border-zinc-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:border-orange-300 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtitle and Subtitle Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-3">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Sous-titre de la Bannière")}</label>
                    <input
                      type="text"
                      placeholder={t("ex: Découvrez notre nouvelle collection en exclusivité") || "ex: Découvrez notre nouvelle collection en exclusivité"}
                      value={bannerSubtitle}
                      onChange={(e) => setBannerSubtitle(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-orange-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Couleur Sous-titre")}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={bannerSubtitleColor}
                        onChange={(e) => setBannerSubtitleColor(e.target.value)}
                        className="w-11 h-11 rounded-xl cursor-pointer border border-zinc-200 shrink-0 select-none bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder={t("#FFFFFF") || "#FFFFFF"}
                        value={bannerSubtitleColor}
                        onChange={(e) => setBannerSubtitleColor(e.target.value)}
                        className="w-full h-11 px-2.5 border border-zinc-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Button CTA text and styling */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Texte du Bouton *")}</label>
                    <input
                      type="text"
                      required
                      placeholder={t("ex: Découvrir") || "ex: Découvrir"}
                      value={bannerButtonText}
                      onChange={(e) => setBannerButtonText(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-orange-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Fond du Bouton")}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={bannerBtnBgColor}
                        onChange={(e) => setBannerBtnBgColor(e.target.value)}
                        className="w-11 h-11 rounded-xl cursor-pointer border border-zinc-200 shrink-0 select-none bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder={t("#FFFFFF") || "#FFFFFF"}
                        value={bannerBtnBgColor}
                        onChange={(e) => setBannerBtnBgColor(e.target.value)}
                        className="w-full h-11 px-2.5 border border-zinc-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Écriture Bouton")}</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={bannerBtnTextColor}
                        onChange={(e) => setBannerBtnTextColor(e.target.value)}
                        className="w-11 h-11 rounded-xl cursor-pointer border border-zinc-200 shrink-0 select-none bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="#18181B"
                        value={bannerBtnTextColor}
                        onChange={(e) => setBannerBtnTextColor(e.target.value)}
                        className="w-full h-11 px-2.5 border border-zinc-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:border-orange-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop and Mobile Images Upload controls */}
                <div className="space-y-4 pt-1 border-t border-zinc-100">
                  
                  {/* Desktop configuration */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Image Bureau * (1920x800 px)")}</label>
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 rounded">{t("Obligatoire")}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {bannerDesktopImage ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 text-xs font-semibold">
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="truncate flex-1">{t("Image bureau sélectionnée avec succès !")}</span>
                          <button
                            type="button"
                            onClick={() => setBannerDesktopImage('')}
                            className="text-[10px] text-zinc-500 hover:text-red-500 border border-zinc-200 hover:border-red-200 bg-white px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {t("Effacer")}</button>
                        </div>
                      ) : null}
                      
                      <label 
                        className={`w-full h-11 px-4 rounded-xl border-2 border-dashed flex items-center justify-between cursor-pointer transition-all select-none group ${
                          bannerDesktopImage 
                            ? 'border-zinc-200 hover:border-orange-300 hover:bg-zinc-50/50' 
                            : 'border-orange-500 hover:border-orange-600 bg-orange-50/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-zinc-700 font-bold text-xs uppercase tracking-wider rtl:tracking-normal">
                          <Upload className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                          <span>{bannerDesktopImage ? 'Remplacer l\'image' : 'Importer une photo de bureau'}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-medium">{t("PNG, JPG, WEBP")}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'desktop')}
                          disabled={isUploadingDesktop}
                        />
                      </label>
                    </div>
                    {isUploadingDesktop && (
                      <div className="flex flex-col gap-1 mt-1">
                         <div className="text-[9px] text-orange-600 font-bold uppercase transition flex items-center justify-between">
                            <span>{t("Chargement...")}</span>
                            <span>{uploadProgressDesktop}%</span>
                         </div>
                         <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${uploadProgressDesktop}%` }} />
                         </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile configuration */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Image Mobile (800x1000 px)")}</label>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">{t("Optionnel")}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {bannerMobileImage ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 text-xs font-semibold">
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="truncate flex-1">{t("Image mobile sélectionnée avec succès !")}</span>
                          <button
                            type="button"
                            onClick={() => setBannerMobileImage('')}
                            className="text-[10px] text-zinc-500 hover:text-red-500 border border-zinc-200 hover:border-red-200 bg-white px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {t("Effacer")}</button>
                        </div>
                      ) : null}
                      
                      <label 
                        className={`w-full h-11 px-4 rounded-xl border-2 border-dashed flex items-center justify-between cursor-pointer transition-all select-none group ${
                          bannerMobileImage 
                            ? 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50' 
                            : 'border-zinc-300 hover:border-zinc-500 bg-zinc-50/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-zinc-700 font-bold text-xs uppercase tracking-wider rtl:tracking-normal">
                          <Upload className="w-4 h-4 text-zinc-500 group-hover:scale-110 transition-transform" />
                          <span>{bannerMobileImage ? 'Remplacer l\'image' : 'Importer une photo mobile (Optionnelle)'}</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-medium font-semibold">{t("Optionnel")}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'mobile')}
                          disabled={isUploadingMobile}
                        />
                      </label>
                    </div>
                    {isUploadingMobile && (
                      <div className="flex flex-col gap-1 mt-1">
                         <div className="text-[9px] text-zinc-600 font-bold uppercase transition flex items-center justify-between">
                            <span>{t("Chargement...")}</span>
                            <span>{uploadProgressMobile}%</span>
                         </div>
                         <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-zinc-500 h-full transition-all duration-300" style={{ width: `${uploadProgressMobile}%` }} />
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tag ID selection (required) */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-100">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Tag de Redirection d'Accueil *")}</label>
                    <span className="text-[9px] font-bold text-zinc-400">{t("Clic → Filtre Catalogue")}</span>
                  </div>
                  {tags.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold font-mono">
                      {t("Veuillez d'abord créer au moins un Tag dans l'onglet tags avant d'ajouter une bannière !")}</div>
                  ) : (
                    <select
                      required
                      value={bannerTagId}
                      onChange={(e) => setBannerTagId(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-orange-500 bg-white"
                    >
                      <option value="">{t("Sélectionnez un tag...")}</option>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name} (/{tag.slug})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Featured Products Selection */}
                <div className="space-y-3 pt-3 border-t border-zinc-100">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Produits Mis en Avant (VIP)")}</label>
                    <span className="text-[9px] font-bold text-zinc-400">{t("Seront affichés en premier")}</span>
                  </div>
                  
                  {/* Selected products visualization */}
                  {bannerFeaturedProducts.length > 0 && (
                     <div className="flex flex-wrap gap-2 mb-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                       {bannerFeaturedProducts.map(prodId => {
                         const p = allProducts.find(x => x.id === prodId);
                         return p ? (
                            <div key={prodId} className="flex items-center gap-1.5 bg-white border border-orange-200 ps-2 pe-1 py-1 rounded-lg shadow-sm text-xs group">
                               <img loading="lazy" src={p.image} className="w-5 h-5 rounded-md object-cover" alt="" />
                               <span className="font-semibold text-zinc-800 max-w-[120px] truncate">{p.name}</span>
                               <button 
                                 type="button" 
                                 onClick={() => setBannerFeaturedProducts(prev => prev.filter(id => id !== prodId))}
                                 className="p-0.5 text-zinc-400 hover:text-red-500 bg-zinc-50 hover:bg-red-50 rounded-md transition-colors"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                            </div>
                         ) : null;
                       })}
                     </div>
                  )}

                  {/* Add Product Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t("Rechercher un produit à mettre en avant...") || "Rechercher un produit à mettre en avant..."}
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-500 bg-zinc-50"
                    />
                    {productSearchTerm.length > 1 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {allProducts
                          .filter(p => !bannerFeaturedProducts.includes(p.id))
                          .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                          .map((p) => {
                                
                                return (
                                                          <div 
                                                            key={p.id}
                                                            onClick={() => {
                                                              setBannerFeaturedProducts(prev => [...prev, p.id]);
                                                              setProductSearchTerm('');
                                                            }}
                                                            className="flex items-center gap-3 p-2 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-b-0"
                                                          >
                                                            <img loading="lazy" src={p.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                            <div className="flex-1 min-w-0">
                                                              <p className="text-xs font-semibold text-zinc-900 truncate">{p.name}</p>
                                                              <p className="text-[10px] text-zinc-500">{p.price} {t("DA")}</p>
                                                            </div>
                                                            <Plus className="w-4 h-4 text-orange-500 shrink-0" />
                                                          </div>
                                                      );
                              })}
                        {allProducts.filter(p => !bannerFeaturedProducts.includes(p.id) && p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
                          <div className="p-3 text-center text-[10px] text-zinc-500 font-bold uppercase">{t("Aucun résultat")}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Published Draft slider */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="space-y-0.5">
                    <label className="text-xs font-extrabold text-zinc-950 uppercase">{t("Statut de la publication")}</label>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">{t("Visible en page d'accueil si coché")}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={bannerIsActive}
                    onChange={(e) => setBannerIsActive(e.target.checked)}
                    className="w-6 h-6 text-orange-500 border-zinc-300 rounded focus:ring-orange-500 accent-orange-600 shrink-0 cursor-pointer"
                  />
                </div>

                {/* Ciblage d'Audience & de Wilayas pour la Bannière */}
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-extrabold text-zinc-950 uppercase flex items-center gap-1.5">
                      <span>{t("🎯 Ciblage Fin & Personnalisation")}</span>
                    </label>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">{t("Ajustez l'affichage de la bannière sur l'accueil")}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-start">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider rtl:tracking-normal text-zinc-700 mb-1">
                        {t("Audience Cible")}</label>
                      <select
                        value={bannerTargetUserType}
                        onChange={(e) => setBannerTargetUserType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-800 font-bold text-[10px] bg-white text-zinc-850"
                      >
                        <option value="all">{t("Tout le monde (Tous)")}</option>
                        <option value="new">{t("Nouveaux Visiteurs uniquement")}</option>
                        <option value="logged_in">{t("Utilisateurs Connectés uniquement")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider rtl:tracking-normal text-zinc-700 mb-1">
                        {t("Wilayas Cibles (")}{bannerTargetRegions.length})
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !bannerTargetRegions.includes(val)) {
                            setBannerTargetRegions([...bannerTargetRegions, val]);
                          }
                           e.target.value = "";
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-800 font-bold text-[10px] bg-white text-zinc-850"
                      >
                        <option value="">{t("+ Ajouter une Wilaya")}</option>
                        {ALGERIA_WILAYAS.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {bannerTargetRegions.length > 0 && (
                    <div className="flex flex-wrap gap-1 p-2 bg-white border border-zinc-200 rounded-xl max-h-[70px] overflow-y-auto">
                      {bannerTargetRegions.map(w => (
                        <span key={w} className="inline-flex items-center gap-1 bg-zinc-900/5 text-zinc-900 border border-zinc-900/10 px-2 py-0.5 rounded-md text-[8px] font-black">
                          {w}
                          <button
                            type="button"
                            onClick={() => setBannerTargetRegions(bannerTargetRegions.filter(item => item !== w))}
                            className="hover:text-red-600 text-[8px] font-black leading-none ms-1 bg-transparent border-none p-0 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBannerTargetRegions([])}
                        className="text-red-500 hover:text-red-700 text-[8px] font-bold underline bg-transparent border-none p-0 cursor-pointer ms-auto"
                      >
                        {t("Vider tout")}</button>
                    </div>
                  )}
                </div>

                {/* Confirm saving */}
                <button
                  type="submit"
                  disabled={isUploadingDesktop || isUploadingMobile}
                  className="w-full h-12 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl font-black text-xs uppercase tracking-widest rtl:tracking-normal transition-colors select-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t("Enregistrer la Bannière")}</span>
                </button>
              </form>

              {/* REAL-TIME PREVIEW PANEL (Desktop & Mobile) */}
              <div className="space-y-6">
                <div className="sticky top-0 space-y-5">
                  <h4 className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-orange-600 animate-pulse" />
                    {t("Aperçu en Temps Réel")}</h4>

                  {/* Desktop Preview Card (Ratio 21:9) */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block">{t("Format Bureau (Aperçu)")}</span>
                    <div className="w-full aspect-[2.4/1] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 relative shadow-md">
                      {bannerDesktopImage ? (
                        <img loading="lazy" 
                          src={bannerDesktopImage} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-zinc-400 text-center uppercase gap-1 text-[10px] font-mono">
                          <ImageIcon className="w-8 h-8 opacity-40 shrink-0" />
                          <span>{t("Pas d'image desktop")}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute inset-y-0 start-0 w-2/3 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
                      
                      {/* Marketing data overlays */}
                      <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                        {tags.find(t => t.id === bannerTagId) && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white/15 tracking-widest rtl:tracking-normal uppercase font-black text-[7px] w-fit mb-1">
                            {tags.find(t => t.id === bannerTagId)?.name}
                          </span>
                        )}
                        <h3 
                          className="text-sm font-black tracking-tight rtl:tracking-normal leading-none mb-0.5 shadow-sm uppercase shrink-0"
                          style={{ color: bannerTitleColor }}
                        >
                          {bannerTitle || 'Titre de la Bannière'}
                        </h3>
                        {bannerSubtitle && (
                          <p 
                            className="text-[9px] font-semibold leading-normal mb-1 tracking-wide select-none drop-shadow-sm"
                            style={{ color: bannerSubtitleColor }}
                          >
                            {bannerSubtitle}
                          </p>
                        )}
                        <button 
                          style={{ backgroundColor: bannerBtnBgColor, color: bannerBtnTextColor }}
                          className="rounded-lg py-1 px-3 text-[8px] uppercase tracking-widest rtl:tracking-normal font-black shrink-0 w-fit pointer-events-none mt-1 shadow-sm transition-colors duration-150"
                        >
                          {bannerButtonText}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Preview Frame Phone Mockup (Ratio 4:5) */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block">{t("Format Téléphone (Aperçu)")}</span>
                    <div className="w-44 aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200 relative mx-auto shadow-md">
                      {bannerMobileImage ? (
                        <img loading="lazy" 
                          src={bannerMobileImage} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : bannerDesktopImage ? (
                        <div className="w-full h-full relative">
                          <img loading="lazy" 
                            src={bannerDesktopImage} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1.5 start-1.5 px-1.5 py-0.5 bg-orange-600/90 rounded text-[7px] font-black text-white uppercase tracking-wider rtl:tracking-normal select-none leading-none">{t("Desktop Fallback")}</div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-zinc-400 text-center uppercase gap-1 text-[9px] font-mono">
                          <ImageIcon className="w-6 h-6 opacity-40 shrink-0" />
                          <span>{t("Pas d'image")}</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
                      
                      {/* Mobile mockup detail */}
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        {tags.find(t => t.id === bannerTagId) && (
                          <span className="inline-block tracking-widest rtl:tracking-normal uppercase font-black text-[6px] text-zinc-300 drop-shadow mb-0.5">
                            {tags.find(t => t.id === bannerTagId)?.name}
                          </span>
                        )}
                        <h4 
                          className="text-[10px] font-black leading-tight mb-0.5 uppercase select-none tracking-tight rtl:tracking-normal drop-shadow truncate"
                          style={{ color: bannerTitleColor }}
                        >
                          {bannerTitle || 'Titre de la Bannière'}
                        </h4>
                        {bannerSubtitle && (
                          <p 
                            className="text-[7px] font-semibold leading-tight mb-1 opacity-95 truncate"
                            style={{ color: bannerSubtitleColor }}
                          >
                            {bannerSubtitle}
                          </p>
                        )}
                        <button 
                          style={{ backgroundColor: bannerBtnBgColor, color: bannerBtnTextColor }}
                          className="rounded py-1 px-2.5 text-[7px] uppercase tracking-widest rtl:tracking-normal font-black shrink-0 w-fit pointer-events-none block shadow-sm mt-0.5"
                        >
                          {bannerButtonText}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
