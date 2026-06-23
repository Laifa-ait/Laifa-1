import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight, ChevronLeft, Video, Upload, Loader2, Info, Palette, Text as ListTree, Image as ImageIcon, Tag, Truck, Check, Zap, Leaf, FileText } from 'lucide-react';
import { db, storage, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ALGERIA_WILAYAS } from '../../constants';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { hasExternalChannel } from '../../utils/masking';

interface ProductFormModalProps {
  onClose: () => void;
  editingProduct: any | null;
  categories: string[];
  CATEGORY_TREE: Record<string, Record<string, string[]>>;
  adminTags: any[];
  userProfile: any;
  currentUser: any;
  onSaveSuccess: (product: any, isEdit: boolean) => void;
}

const STEPS = [
  { id: 0, title: "Identité", icon: Info },
  { id: 1, title: "Caractéristiques", icon: Palette },
  { id: 2, title: "Déclinaisons", icon: ListTree },
  { id: 3, title: "Médias", icon: ImageIcon },
  { id: 4, title: "Tarification", icon: Tag },
  { id: 5, title: "Logistique", icon: Truck },
  { id: 6, title: "Récapitulatif", icon: FileText },
];

const SIZE_TYPES = [
  { id: 'adult', label: 'Pointures (18-60)', items: Array.from({ length: 43 }, (_, i) => (18 + i).toString()) },
  { id: 'baby', label: 'Âge bébé (0-36m)', items: ['Naissance', '1 mois', '3 mois', '6 mois', '9 mois', '12 mois', '18 mois', '24 mois', '36 mois'] },
  { id: 'kids', label: 'Âge enfant (2-16a)', items: Array.from({ length: 15 }, (_, i) => `${i + 2} ans`) },
  { id: 'clothing', label: 'Vêtements (XS-5XL)', items: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] }
];

import { DYNAMIC_CATEGORIES } from '../../config/dynamicFilters';
import { PRODUCT_HIERARCHY, PRODUCT_COLORS } from '../../constants';
import { useTranslation } from "react-i18next";
import { maskSensitiveData } from '../../utils/masking';
import { sanitizeXSS } from '../../utils/sanitization';
import { useConfirm } from '../../hooks/useConfirm';

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  onClose,
  editingProduct,
  categories,
  CATEGORY_TREE,
  adminTags,
  userProfile,
  currentUser,
  onSaveSuccess
}) => {
  const { t } = useTranslation();
  const { confirm: showConfirmModal, ConfirmationDialog } = useConfirm();
  const [activeStep, setActiveStep] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    promoPrice: '',
    costPrice: '',
    flashSaleActive: false,
    flashPrice: '',
    flashQuantity: '',
    flashStartDate: '',
    flashEndDate: '',
    flashLimitPerCustomer: 'illimité',
    sku: '',
    category: '',
    subcategory: '',
    subSubCategory: '',
    gender: '',
    condition: 'Neuf',
    warranty: '',
    materials: [] as string[],
    otherMaterial: '',
    season: '',
    attributes: {} as Record<string, any>,
    description: '',
    image: '',
    images: ['', '', '', '', '', '', '', ''], // Up to 8 images
    video: '',
    colors: [] as string[],
    sizes: [] as string[],
    sizeType: '',
    weight: '',
    dimensions: '',
    deliveryPrice: '',
    preparationTime: '',
    returnPolicy: false,
    autoTranslate: false,
    tags: [] as string[],
    isBannerFeatured: false,
    isStoreFeatured: false,
    variants: [] as any[],
    wilaya: userProfile?.wilaya || '',
    stock: '10',
    status: 'pending',
    translations: {
      en: { name: '', description: '' },
      ar: { name: '', description: '' }
    }
  });

  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const [tagInput, setTagInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [showAdminTagsList, setShowAdminTagsList] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      const isPromo = editingProduct.onSale && editingProduct.originalPrice;
      
      let initImages = [...(editingProduct.images || [])];
      while (initImages.length < 8) initImages.push('');

      setFormData({
        name: editingProduct.name || '',
        price: isPromo ? editingProduct.originalPrice?.toString() || '' : (editingProduct.price?.toString() || ''),
        promoPrice: isPromo ? (editingProduct.price?.toString() || '') : (editingProduct.promoPrice?.toString() || ''),
        costPrice: editingProduct.costPrice?.toString() || '',
        flashSaleActive: editingProduct.flashSaleActive || false,
        flashPrice: editingProduct.flashPrice?.toString() || '',
        flashQuantity: editingProduct.flashQuantity?.toString() || '',
        flashStartDate: editingProduct.flashStartDate || '',
        flashEndDate: editingProduct.flashEndDate || '',
        flashLimitPerCustomer: editingProduct.flashLimitPerCustomer || 'illimité',
        sku: editingProduct.sku || '',
        brand: editingProduct.brand || '',
        category: editingProduct.category || '',
        subcategory: editingProduct.subcategory || '',
        subSubCategory: editingProduct.subSubCategory || '',
        gender: editingProduct.gender || '',
        condition: editingProduct.condition || 'Neuf',
        warranty: editingProduct.warranty || '',
        materials: Array.isArray(editingProduct.materials) ? editingProduct.materials : [],
        otherMaterial: editingProduct.otherMaterial || '',
        season: editingProduct.season || '',
        attributes: editingProduct.attributes || {},
        description: editingProduct.description || '',
        images: initImages,
        image: initImages[0] || '',
        video: editingProduct.video || '',
        colors: Array.isArray(editingProduct.colors) ? editingProduct.colors : [],
        sizes: Array.isArray(editingProduct.sizes) ? editingProduct.sizes : [],
        sizeType: editingProduct.sizeType || '',
        weight: editingProduct.weight || '',
        dimensions: editingProduct.dimensions || '',
        deliveryPrice: editingProduct.deliveryPrice?.toString() || '',
        preparationTime: editingProduct.preparationTime || '',
        returnPolicy: editingProduct.returnPolicy || false,
        autoTranslate: editingProduct.autoTranslate || false,
        tags: editingProduct.tags || [],
        isBannerFeatured: editingProduct.isBannerFeatured || false,
        isStoreFeatured: editingProduct.isStoreFeatured || false,
        variants: editingProduct.variants || [],
        wilaya: editingProduct.wilaya || userProfile?.wilaya || '',
        stock: editingProduct.stock?.toString() || '0',
        status: editingProduct.status || 'pending',
        translations: editingProduct.translations || {
          en: { name: '', description: '' },
          ar: { name: '', description: '' }
        }
      });
    }
  }, [editingProduct]);

  const handleGenerateVariants = () => {
    const colorList = formData.colors.map(s => s.trim()).filter(Boolean);
    const sizeList = formData.sizes.map(s => s.trim()).filter(Boolean);
    let combos: string[] = [];
    if (colorList.length && sizeList.length) {
      colorList.forEach(c => sizeList.forEach(s => combos.push(`${c.toUpperCase()} - ${s.toUpperCase()}`)));
    } else if (colorList.length) {
      combos = [...colorList.map(c => c.toUpperCase())];
    } else if (sizeList.length) {
      combos = [...sizeList.map(s => s.toUpperCase())];
    }
    
    setFormData(prev => {
      const currentMap = new Map((prev.variants as any[]).map(v => [v.name, v]));
      const newVariants = combos.map(c => {
         return currentMap.get(c) || { name: c, stock: '0', sku: prev.sku ? `${prev.sku}-${c.replace(/\s+/g, '')}` : '', priceDiff: '', priceOverride: '', isActive: true };
      });
      const allPrevVariants = prev.variants as any[];
      const remainingPrevVariants = allPrevVariants.filter(v => !combos.includes(v.name));
      const finalVariants = [...newVariants, ...remainingPrevVariants];

      return { ...prev, variants: finalVariants };
    });
    
    toast.success(`${combos.length} variante(s) générée(s)`);
  };

  const effectiveTree = Object.keys(CATEGORY_TREE || {}).length > 0 ? CATEGORY_TREE : PRODUCT_HIERARCHY;
  const subCategories = formData.category && effectiveTree[formData.category] ? Object.keys(effectiveTree[formData.category]) : [];
  const subSubCategories = formData.category && formData.subcategory && effectiveTree[formData.category]?.[formData.subcategory] ? effectiveTree[formData.category][formData.subcategory] : [];

  const handleGenerateAiDescription = async () => {
    if (!formData.name) return toast.error("Entrez un nom de produit d'abord.");
    setAiGenerating(true);
    try {
      const idToken = await currentUser?.getIdToken() || "";
      if (!idToken) {
        toast.error("Session expirée, veuillez vous reconnecter");
        return;
      }
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ productName: formData.name, category: formData.category })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         const textError = await response.text();
         throw new Error(`Erreur serveur (${response.status}): ${textError.substring(0, 100)}`);
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur serveur");
      }
      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast.success("Description générée avec succès ! ✨");
      }
    } catch (err: any) {
      console.error("Gemini AI error:", err);
      toast.error(err.message || "Erreur lors de la génération IA.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerateSku = () => {
    const brandPrefix = formData.brand ? formData.brand.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'OLM';
    const catClean = (formData.category || 'PRD').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const catPrefix = catClean.substring(0, 3).replace(/[^A-Z0-9]/g, '');
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newSku = `${brandPrefix || 'OLM'}-${catPrefix || 'GEN'}-${randomNum}`;
    setFormData(prev => ({ ...prev, sku: newSku }));
    toast.success(`SKU généré : ${newSku} 🏷️`);
  };

  const activeSizeList = SIZE_TYPES.find(t => t.id === formData.sizeType)?.items || [];

  const toggleSize = (size: string) => {
    setFormData(prev => {
      const isSelected = prev.sizes.includes(size);
      return {
        ...prev,
        sizes: isSelected ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
      };
    });
  };

  const MAX_IMAGES = 8;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video', index?: number) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (type === 'image') {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Format non supporté. Utilisez JPG, PNG, WebP ou GIF.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Image trop lourde. Maximum 5MB.");
        return;
      }
      if (index === undefined && formData.images && formData.images.length >= MAX_IMAGES) {
        toast.error(`Maximum ${MAX_IMAGES} images par produit`);
        return;
      }
    }
    if (type === 'video' && file.size > 10 * 1024 * 1024) return toast.error("Vidéo trop lourde (Max 10Mo)");

    const uploadKey = index !== undefined ? `image-${index}` : type;
    setUploading(prev => ({ ...prev, [uploadKey]: true }));

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${currentUser.uid}_${Date.now()}_${Math.random().toString(36).substring(7)}.${type === 'image' ? 'webp' : fileExt}`;
      const storageRef = ref(storage, `products/${type}s/${fileName}`);
      
      let uploadFile: File | Blob = file;
      if (type === 'image') {
         if (index === 0) {
            toast("Traitement IA : Détourage et normalisation du fond (#FAF8F5)...", { icon: '✨', duration: 4000 });
         }
         const options = {
           maxSizeMB: 0.08,
           maxWidthOrHeight: 800,
           useWebWorker: true,
           fileType: 'image/webp',
           initialQuality: 0.8
         };
         try {
            uploadFile = await imageCompression(file, options);
         } catch (err) {
            console.error("Compression failed:", err);
         }
      }

      const uploadPromise = new Promise((resolve, reject) => {
         const uploadTask = uploadBytesResumable(storageRef, uploadFile as Blob);
         uploadTask.on('state_changed',
           (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prev => ({ ...prev, [uploadKey]: Math.round(progress) }));
           },
           (error) => reject(error),
           () => resolve(uploadTask.snapshot)
         );
      });
      const timeoutPromise = new Promise((_, reject) => 
         setTimeout(() => reject(new Error("TIMEOUT_STORAGE")), 60000)
      );

      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (type === 'image' && index !== undefined) {
        const newImages = [...formData.images];
        newImages[index] = downloadURL;
        setFormData(prev => ({ ...prev, images: newImages }));
        toast.success("Image importée ! 📸");
      } else if (type === 'video') {
        setFormData(prev => ({ ...prev, video: downloadURL }));
        toast.success("Vidéo importée ! 🎥");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      if (err.message === "TIMEOUT_STORAGE") {
         toast.error("Le délai d'envoi est dépassé. Veuillez activer 'Storage' dans votre console Firebase.", { duration: 5000 });
      } else {
         toast.error(`Erreur d'envoi: ${err.message || 'Permission refusée ou type invalide.'}`);
      }
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const updateImage = (index: number, value: string) => {
     const newImages = [...formData.images];
     newImages[index] = value;
     setFormData({ ...formData, images: newImages });
  };

  const handleSubmitProduct = async (e?: React.FormEvent, targetStatus?: string) => {
    if (e) e.preventDefault();

    if (!formData.category || formData.category.trim() === '') {
      toast.error("Veuillez sélectionner une catégorie à l'étape 1 !");
      return;
    }
    
    const subs = formData.category && effectiveTree[formData.category] ? Object.keys(effectiveTree[formData.category]) : [];
    if (subs.length > 0 && (!formData.subcategory || formData.subcategory.trim() === '')) {
      toast.error("Veuillez sélectionner une sous-catégorie à l'étape 1 !");
      return;
    }

    if (parseFloat(formData.price || '0') < 0) {
      toast.error("Le prix du produit ne peut pas être négatif !");
      return;
    }

    const subSubs = formData.category && formData.subcategory && effectiveTree[formData.category]?.[formData.subcategory] ? effectiveTree[formData.category][formData.subcategory] : [];
    if (subSubs.length > 0 && (!formData.subSubCategory || formData.subSubCategory.trim() === '')) {
      toast.error("Veuillez sélectionner une sous-sous-catégorie à l'étape 1 !");
      return;
    }

    if (!formData.name || formData.name.trim() === '') {
      toast.error("Veuillez saisir le nom du produit à l'étape 1 !");
      return;
    }

    if (hasExternalChannel(formData.name) || hasExternalChannel(formData.description || '')) {
      toast.error("Les coordonnees de communication exterieure (messages, liens ou reseaux) ne sont pas autorisees dans ce champ de texte. Tout contact doit s'effectuer exclusivement via la plateforme OLMART.");
      return;
    }

    if ((formData.colors.length > 0 || formData.sizes.length > 0) && formData.variants.length === 0) {
      toast.error("Veuillez générer les combinaisons (Variantes) à l'étape 3 avant de publier.");
      return;
    }
    
    // Strict Variant check
    if (formData.variants && formData.variants.length > 0) {
       const missingStock = formData.variants.some((v: any) => v.isActive !== false && (!v.stock || parseInt(v.stock) < 0));
       if (missingStock) {
          toast.error("Veuillez renseigner le stock pour toutes les variantes actives (Étape 3).");
          return;
       }
    }

    if (!currentUser) return;
    if (Object.values(uploading).some(isUp => isUp)) {
      toast.error("Veuillez attendre la fin des transferts de médias avant d'enregistrer.");
      return;
    }
    setLoading(true);
    try {
      let finalTranslations = formData.translations;
      
      // FORCED MULTILINGUAL REQUIREMENT: Always auto-translate if EN/AR are missing, or if autoTranslate is toggled on
      // The new system is "Smart": it detects the source language of each field.
      if ((formData.autoTranslate || !finalTranslations.en?.name || !finalTranslations.ar?.name) && formData.name && formData.description) {
         try {
            const idToken = await currentUser?.getIdToken() || "";
            if (!idToken) {
              toast.error("Session expirée, veuillez vous reconnecter");
              return;
            }
            const response = await fetch('/api/translate-product', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
               body: JSON.stringify({ name: formData.name, description: formData.description })
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
               const data = await response.json();
               if (data.name && data.description) {
                  // data format is: { name: {fr, ar, en}, description: {fr, ar, en} }
                  // We update the main name/description if they were in a different language than FR
                  // But OLMART usually assumes main fields are the primary input.
                  // We store the 3 versions.
                  setFormData(prev => ({ 
                    ...prev, 
                    name: data.name.fr, 
                    description: data.description.fr,
                    translations: {
                      en: { name: data.name.en, description: data.description.en },
                      ar: { name: data.name.ar, description: data.description.ar }
                    }
                  }));
                  
                  finalTranslations = {
                    en: { name: data.name.en, description: data.description.en },
                    ar: { name: data.name.ar, description: data.description.ar }
                  };
               }
            } else {
               console.error("Auto-translation returned non-json: ", await response.text());
            }
         } catch (e) {
            console.error("Auto-translation failed before save", e);
            const shouldContinue = await showConfirmModal("La traduction automatique a échoué. Voulez-vous continuer sans traductions ?");
            if (!shouldContinue) {
              setLoading(false);
              return;
            }
         }
      }

      const safeParseFloat = (value: string | undefined | null): number | null => {
        const trimmed = value?.trim();
        if (!trimmed) return null;
        const parsed = parseFloat(trimmed);
        if (isNaN(parsed) || !isFinite(parsed)) return null;
        if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
        return parsed;
      };

      const hasPromo = formData.promoPrice && parseFloat(formData.promoPrice) > 0;
      const parsedMainPrice = safeParseFloat(formData.price) ?? 0;
      const parsedPromoPrice = hasPromo ? (safeParseFloat(formData.promoPrice) || null) : null;
      const costPriceVal = safeParseFloat(formData.costPrice);
      
      const parsedFlashPrice = formData.flashSaleActive ? safeParseFloat(formData.flashPrice) : null;
      const parsedFlashQty = (formData.flashSaleActive && formData.flashQuantity && formData.flashQuantity.trim() !== '') ? parseInt(formData.flashQuantity.trim(), 10) : null;

    const valPrice = parsedMainPrice;
    if (!formData.price || isNaN(valPrice) || valPrice < 0) {
      toast.error("Veuillez saisir un prix de produit valide.");
      return;
    }
    
    if (formData.flashSaleActive) {
         if (!parsedFlashPrice || parsedFlashPrice >= parsedMainPrice) {
            toast.error("Le prix de vente flash doit être inférieur au prix de base !");
            setLoading(false);
            return;
         }
         if (!formData.flashStartDate || !formData.flashEndDate) {
            toast.error("Veuillez définir la période de la vente flash.");
            setLoading(false);
            return;
         }
         if (new Date(formData.flashEndDate) <= new Date(formData.flashStartDate)) {
            toast.error("La date de fin doit être postérieure à la date de début !");
            setLoading(false);
            return;
         }
         const durationHours = (new Date(formData.flashEndDate).getTime() - new Date(formData.flashStartDate).getTime()) / (1000 * 60 * 60);
         if (durationHours > 72) {
            toast.error("La durée maximale d'une vente flash est de 72 heures.");
            setLoading(false);
            return;
         }
      }

      const validImages = formData.images.filter((img: string) => img.trim() !== '');
      const isEdit = !!editingProduct;

      // Image Verification with OCR for Sellers
      if (validImages.length > 0 && !isEdit) {
         try {
           const idToken = await currentUser?.getIdToken() || "";
           if (!idToken) {
              toast.error("Session expirée");
              setLoading(false);
              return;
           }
           for (const imgUrl of validImages) {
              const ocrRes = await fetch('/api/seller/analyze-image', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                 body: JSON.stringify({ imageUrl: imgUrl })
              });
              if (ocrRes.ok) {
                 const ocrData = await ocrRes.json();
                 if (ocrData.safe === false) {
                    toast.error(`Avertissement Qualité: L'image contient du texte interdit (${ocrData.reason}).`);
                    setLoading(false);
                    return;
                 }
              }
           }
         } catch (e) {
           console.warn("OCR skip: ", e);
         }
      }

      // Sandbox Logic: New unverified sellers always go to pending
      const isVerifiedSeller = userProfile?.isVerified === true || userProfile?.role === "admin";
      let finalStatus = targetStatus || (isEdit ? editingProduct.status || "pending" : "active");
      if (!isVerifiedSeller && finalStatus === "active") {
         finalStatus = "pending";
         toast.success("Votre produit a été soumis pour validation (Sandbox). Un administrateur l'examinera sous peu.", { duration: 6000 });
      }

      const safeName = sanitizeXSS(maskSensitiveData(formData.name || ''));
      const safeDescription = sanitizeXSS(maskSensitiveData(formData.description || ''));

      const productData: any = {
        name: safeName,
        brand: formData.brand,
        price: hasPromo ? parsedPromoPrice : parsedMainPrice,
        originalPrice: hasPromo ? parsedMainPrice : null,
        promoPrice: parsedPromoPrice,
        costPrice: costPriceVal,
        flashSaleActive: formData.flashSaleActive,
        flashPrice: parsedFlashPrice,
        flashQuantity: parsedFlashQty,
        flashStartDate: formData.flashSaleActive ? formData.flashStartDate : null,
        flashEndDate: formData.flashSaleActive ? formData.flashEndDate : null,
        flashLimitPerCustomer: formData.flashSaleActive ? formData.flashLimitPerCustomer : null,
        onSale: hasPromo || formData.flashSaleActive,
        sku: formData.sku || '',
        category: formData.category || '',
        subcategory: formData.subcategory || '',
        subSubCategory: formData.subSubCategory || '',
        gender: formData.gender,
        materials: formData.materials,
        otherMaterial: formData.otherMaterial,
        season: formData.season,
        attributes: formData.attributes,
        description: safeDescription,
        image: validImages[0] || '',
        images: validImages,
        video: formData.video || '',
        colors: formData.colors.map(s => s.trim().toLowerCase()).filter(Boolean),
        sizes: formData.sizes.map(s => s.trim()).filter(Boolean),
        sizeType: formData.sizeType,
        weight: formData.weight || '',
        dimensions: formData.dimensions || '',
        deliveryPrice: (formData.deliveryPrice && formData.deliveryPrice.trim() !== '') ? parseFloat(formData.deliveryPrice.trim()) : null,
        preparationTime: formData.preparationTime || '',
        returnPolicy: formData.returnPolicy,
        autoTranslate: formData.autoTranslate,
        tags: Array.from(new Set([
          ...(formData.tags || []),
          ...(formData.gender ? [formData.gender] : []),
          ...(formData.season ? [formData.season] : []),
          ...(formData.materials || []),
          ...(formData.materials.includes("Autre") && formData.otherMaterial ? [formData.otherMaterial] : [])
        ].filter(Boolean))),
        isBannerFeatured: Boolean(formData.isBannerFeatured),
        isStoreFeatured: Boolean(formData.isStoreFeatured),
        variants: formData.variants || [],
        hasOutOfStockVariants: formData.variants && formData.variants.length > 0 ? formData.variants.some((v: any) => (parseInt(v.stock) || 0) <= 0) : false,
        stock: formData.variants && formData.variants.length > 0 ? formData.variants.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0) : (parseInt(formData.stock) || 0),
        sellerId: currentUser.uid,
        sellerName: userProfile?.displayName || '',
        wilaya: formData.wilaya || '',
        translations: finalTranslations,
        updatedAt: serverTimestamp(),
        status: finalStatus,
        rejectionReason: null
      };

      if (!productData.subcategory) delete productData.subcategory;
      if (!productData.subSubCategory) delete productData.subSubCategory;

      const { updatedAt, ...productDataWithoutTimestamp } = productData;
      const cleanProductData = {
        ...JSON.parse(JSON.stringify(productDataWithoutTimestamp)),
        updatedAt: serverTimestamp(),
      };
      
      if (editingProduct) {
        cleanProductData.createdAt = editingProduct.createdAt;
      }
      
      const arraysEqual = (a: any[], b: any[]): boolean => {
        if (!a || !b || a.length !== b.length) return false;
        const setA = new Set(a);
        return b.every(x => setA.has(x));
      };
      
      if (editingProduct) {
        if (editingProduct.sellerId !== currentUser?.uid) {
          toast.error("Produit non autorisé");
          setLoading(false);
          return;
        }

        // Validation stricte anti-fraude: Si le vendeur modifie l'identité du produit (photos, nom, description, variantes),
        // on le repasse en statut 'pending' pour forcer une validation par l'équipe Olmart
        const coreIdentityChanged = 
          editingProduct.name !== cleanProductData.name ||
          editingProduct.description !== cleanProductData.description ||
          !arraysEqual(editingProduct.images, cleanProductData.images) ||
          JSON.stringify(editingProduct.variants) !== JSON.stringify(cleanProductData.variants);
          
        if (coreIdentityChanged) {
          cleanProductData.status = 'pending';
          cleanProductData.moderationType = 'update';
          toast.success("Modification majeure détectée (Protection Olmart). Le produit repasse en modération.", { duration: 5000 });
          
          await addDoc(collection(db, "internal_notifications"), {
            type: "PRODUCT_MODIFICATION",
            title: "Produit modifié soumis à modération",
            message: `Le vendeur "${userProfile?.shopName || userProfile?.name || currentUser?.uid}" a modifié le produit "${cleanProductData.name}" (identité visuelle ou variantes modifiées).`,
            productId: editingProduct.id,
            sellerId: currentUser?.uid || "UNKNOWN",
            createdAt: serverTimestamp(),
            read: false
          });
        } else {
          // Sinon conserver le statut actuel
          cleanProductData.status = editingProduct.status;
          // Keep prior moderationType or clear it as it might not be relevant if it's already active
        }

        const productDataToSave = Object.fromEntries(
          Object.entries(cleanProductData).filter(([_, v]) =>
            v !== '' && v !== null && v !== undefined
          )
        );

        if (coreIdentityChanged) {
          await setDoc(doc(db, "products", editingProduct.id), productDataToSave);
        } else {
          await setDoc(doc(db, "products", editingProduct.id), productDataToSave, { merge: true });
        }
        onSaveSuccess({ id: editingProduct.id, ...cleanProductData }, true);
      } else {
        cleanProductData.createdAt = serverTimestamp();
        cleanProductData.status = 'pending';
        cleanProductData.moderationType = 'new';
        const docRef = await addDoc(collection(db, "products"), cleanProductData);
        onSaveSuccess({ id: docRef.id, ...cleanProductData, createdAt: new Date() }, false);
        
        await addDoc(collection(db, "internal_notifications"), {
          type: "NEW_PRODUCT_SUBMITTED",
          title: "Nouveau produit en attente",
          message: `Le vendeur "${userProfile?.shopName || userProfile?.name || currentUser?.uid}" a soumis un nouveau produit "${cleanProductData.name}".`,
          productId: docRef.id,
          sellerId: currentUser?.uid || "UNKNOWN",
          createdAt: serverTimestamp(),
          read: false
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const marginCalc = () => {
    const sale = parseFloat(formData.promoPrice || formData.price || '0');
    const cost = parseFloat(formData.costPrice || '0');
    if (sale && cost && sale > cost) {
      return { val: (sale - cost).toFixed(2), perc: (((sale - cost) / sale) * 100).toFixed(1) };
    }
    return null;
  };

  const mg = marginCalc();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full h-full md:max-w-6xl md:max-h-[90vh] md:rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border-t md:border border-slate-200 mt-safe-top md:mt-0 pb-safe md:pb-0">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-4 md:p-8 flex items-center justify-between pointer-events-auto border-b md:border-b-0 border-slate-200 md:border-transparent mb-2 md:mb-0">
            <h3 className="text-xl font-bold text-slate-900 line-clamp-1 p-2 md:p-0">{editingProduct ? 'Modifier' : 'Ajouter'} {t("Produit")}</h3>
            <button onClick={onClose} className="md:hidden w-12 h-12 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform shrink-0">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="px-4 pb-6 flex-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hide">
            {STEPS.map((step, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex flex-col md:flex-row items-center md:items-start md:gap-3 p-4 md:p-4 rounded-xl transition-all whitespace-nowrap min-w-[90px] md:min-w-0 border ${
                    isActive ? "bg-white border-blue-900 shadow-sm" : 
                    isPast ? "bg-white border-slate-200" : "bg-transparent border-transparent hover:bg-slate-100/50"
                  }`}
                >
                  <div className={`w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isActive ? "bg-blue-900 text-white border-blue-900" :
                    isPast ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}>
                    {isPast ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  </div>
                  <div className="md:flex flex-col text-center md:text-start mt-2 md:mt-0 items-center justify-center pt-1 md:pt-0">
                    <span className={`text-[10px] uppercase font-bold tracking-widest rtl:tracking-normal ${isActive ? "text-blue-900" : "text-slate-500"}`}>{t("Étape")}{idx + 1}</span>
                    <span className={`text-xs md:text-sm font-semibold hidden md:block ${isActive ? "text-slate-900" : "text-slate-600"}`}>{step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-4 border-t border-slate-200 hidden md:block">
            <button onClick={onClose} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> {t("Quitter")}</button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-48 md:pb-32">
            <form id="productForm" className="max-w-3xl mx-auto space-y-10" onSubmit={(e) => e.preventDefault()}>
              
              {/* STEP 1: IDENTITY */}
              {activeStep === 0 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Identité Produit")}</h4>
                    <p className="text-sm text-slate-500">{t("Définissez les informations principales de votre article.")}</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Nom du Produit *")}</label>
                      <input required type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder={t("Ex: Veste en cuir vintage...") || "Ex: Veste en cuir vintage..."} value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Catégorie Principale *")}</label>
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value, subcategory: '', subSubCategory: ''})}>
                          <option value="">{t("Sélectionner...")}</option>
                          {(categories.length > 0 ? categories : Object.keys(DYNAMIC_CATEGORIES)).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Marque")}</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder={t("Ex: Zara, Nike...") || "Ex: Zara, Nike..."} value={formData.brand || ''} onChange={(e) => setFormData({...formData, brand: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("État du produit")}</label>
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900" value={formData.condition || ''} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                          <option value="Neuf">{t("Neuf")}</option>
                          <option value="Très bon état">{t("Très bon état")}</option>
                          <option value="Bon état">{t("Bon état")}</option>
                          <option value="État satisfaisant">{t("État satisfaisant")}</option>
                          <option value="Reconditionné">{t("Reconditionné")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Garantie")}</label>
                        <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900 placeholder:text-slate-400" placeholder={t("Ex: 12 mois...") || "Ex: 12 mois..."} value={formData.warranty || ''} onChange={(e) => setFormData({...formData, warranty: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Cible (Genre)")}</label>
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900" value={formData.gender || ''} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                          <option value="">{t("Tous")}</option>
                          <option value="Homme">{t("Homme")}</option>
                          <option value="Femme">{t("Femme")}</option>
                          <option value="Enfant">{t("Enfant")}</option>
                          <option value="Bébé">{t("Bébé")}</option>
                        </select>
                      </div>
                    </div>
                    {(subCategories.length > 0 || subSubCategories.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {subCategories.length > 0 && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Sous-catégorie *")}</label>
                            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900" value={formData.subcategory || ''} onChange={(e) => setFormData({...formData, subcategory: e.target.value, subSubCategory: ''})}>
                              <option value="">{t("Choisir...")}</option>
                              {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                        {subSubCategories.length > 0 && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Sous-sous-catégorie *")}</label>
                            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900" value={formData.subSubCategory || ''} onChange={(e) => setFormData({...formData, subSubCategory: e.target.value})}>
                              <option value="">{t("Choisir...")}</option>
                              {subSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Characteristics have been moved to Step 1 */}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-semibold text-slate-600">{t("Description Détaillée")}</label>
                        <button type="button" onClick={handleGenerateAiDescription} disabled={aiGenerating} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-900 uppercase tracking-wider rtl:tracking-normal hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50">
                          <Sparkles className={`w-3.5 h-3.5 ${aiGenerating ? 'animate-pulse' : ''}`} />
                          {aiGenerating ? 'Génération...' : 'Générer (IA)'}
                        </button>
                      </div>
                      <textarea rows={6} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900 resize-none placeholder:text-slate-400" placeholder={t("Décrivez votre produit en détail...") || "Décrivez votre produit en détail..."} value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Mots-clés (Appuyez sur Entrée)")}</label>
                      <div className="w-full p-2 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-2 focus-within:border-blue-900 transition-all">
                        {formData.tags.map(tag => (
                          <span key={tag} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            {adminTags.find(t => t.id === tag)?.name || tag}
                            <button type="button" onClick={() => setFormData(prev => ({...prev, tags: prev.tags.filter(t => t !== tag)}))} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                        <input 
                          type="text" 
                          className="flex-1 min-w-[120px] bg-transparent outline-none px-2 py-1 text-sm font-medium placeholder:text-slate-400"
                          placeholder={t("Ajouter un tag...") || "Ajouter un tag..."}
                          value={tagInput}
                          onFocus={() => setShowAdminTagsList(true)}
                          onBlur={() => setTimeout(() => setShowAdminTagsList(false), 200)}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const t = tagInput.trim();
                              if (t && !formData.tags.includes(t)) {
                                setFormData(prev => ({...prev, tags: [...prev.tags, t]}));
                              }
                              setTagInput('');
                            }
                          }}
                        />
                      </div>
                      {showAdminTagsList && adminTags.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-10 max-h-48 overflow-y-auto">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest rtl:tracking-normal mb-3">{t("Suggestions :")}</p>
                          <div className="flex flex-wrap gap-2">
                            {adminTags.filter(t => !formData.tags.includes(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase())).map(t => (
                              <button key={t.id} type="button" onClick={() => {
                                     setFormData(prev => ({...prev, tags: [...prev.tags, t.id]})); setTagInput(''); setShowAdminTagsList(false); }} className="text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CARACTÉRISTIQUES & VARIANTES */}
              {activeStep === 1 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Caractéristiques & Variantes")}</h4>
                    <p className="text-sm text-slate-500">{t("Définissez les attributs spécifiques et générez les variantes.")}</p>
                  </div>

                  {/* Dynamic Filters from DYNAMIC_CATEGORIES */}
                  {DYNAMIC_CATEGORIES[formData.category]?.allowed_filters && DYNAMIC_CATEGORIES[formData.category].allowed_filters.length > 0 && (
                    <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-900" />
                        {t("Spécificités de la catégorie")}</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        {DYNAMIC_CATEGORIES[formData.category].allowed_filters.map((filter) => {
                              return (
                                                      <div key={filter.id}>
                                                        <label className="block text-xs font-bold text-slate-700 mb-2">{filter.label}</label>
                                                        {filter.type === "select" && (
                                                          <select 
                                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900 text-sm"
                                                            value={formData.attributes[filter.id] || ''}
                                                            onChange={(e) => setFormData({...formData, attributes: {...formData.attributes, [filter.id]: e.target.value}})}
                                                          >
                                                            <option value="">{t("Sélectionner...")}</option>
                                                            {filter.options?.map((opt: any) => {
                                                              const val = typeof opt === 'string' ? opt : opt.value;
                                                              const lbl = typeof opt === 'string' ? opt : opt.label;
                                                              return <option key={val} value={val}>{lbl}</option>;
                                                            })}
                                                          </select>
                                                        )}
                                                        {filter.type === "radio" && (
                                                          <div className="flex flex-wrap gap-2">
                                                            {filter.options?.map((opt: any) => {
                                                              const val = typeof opt === 'string' ? opt : opt.value;
                                                              const lbl = typeof opt === 'string' ? opt : opt.label;
                                                              const isSelected = formData.attributes[filter.id] === val;
                                                              return (
                                                                <button
                                                                  key={val}
                                                                  type="button"
                                                                  onClick={() => setFormData({...formData, attributes: {...formData.attributes, [filter.id]: val}})}
                                                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-blue-900 border-blue-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                                                >
                                                                  {lbl}
                                                                </button>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                        {filter.type === "multiselect" && (
                                                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                                                            {filter.options?.map((opt: any) => {
                                                              const val = typeof opt === 'string' ? opt : opt.value;
                                                              const lbl = typeof opt === 'string' ? opt : opt.label;
                                                              const currentList = formData.attributes[filter.id] || [];
                                                              const isSelected = currentList.includes(val);
                                                              return (
                                                                <label key={val} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                                                  <input
                                                                    type="checkbox"
                                                                    className="accent-blue-900 w-3.5 h-3.5"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                      const updatedList = e.target.checked ? [...currentList, val] : currentList.filter((x: string) => x !== val);
                                                                      setFormData({...formData, attributes: {...formData.attributes, [filter.id]: updatedList}});
                                                                    }}
                                                                  />
                                                                  <span className={`text-[12px] font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{lbl}</span>
                                                                </label>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                        {(filter.type === "text" || filter.type === "number") && (
                                                          <div className="relative">
                                                            <input 
                                                              type={filter.type}
                                                              placeholder={filter.label}
                                                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-medium text-slate-900 text-sm"
                                                              value={formData.attributes[filter.id] || ''}
                                                              onChange={(e) => setFormData({...formData, attributes: {...formData.attributes, [filter.id]: e.target.value}})}
                                                            />
                                                            {filter.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{filter.unit}</span>}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                            })}
                      </div>
                    </div>
                  )}

                  {/* FICHE TECHNIQUE & SPÉCIFICATIONS TECHNIQUES DE L’ARTICLE */}
                  <div className="space-y-6 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
                     <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                        <FileText className="w-4 h-4 text-[#F37021]" />
                        <div>
                           <h4 className="text-sm font-black text-[#121315] uppercase tracking-wider rtl:tracking-normal">{t("Fiche Technique OLMART")}</h4>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider rtl:tracking-normal">{t("Configurez la référence, les matières premières et l'affichage saisonnier")}</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-6">
                        {/* SKU Reference with automatic creation */}
                        <div className="space-y-1.5">
                           <label className="block text-xs font-semibold text-slate-700 font-sans">{t("Référence Unique Produit (SKU)")}</label>
                           <div className="flex gap-2">
                              <input 
                                 type="text" 
                                 placeholder={t("Ex: MAR-COT-748392") || "Ex: MAR-COT-748392"} 
                                 className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-semibold text-slate-900 text-sm"
                                 value={formData.sku || ''} 
                                 onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})} 
                              />
                              <button 
                                 type="button" 
                                 onClick={handleGenerateSku}
                                 className="px-4 py-2.5 bg-[#121315] hover:bg-[#F37021] text-white text-xs font-black uppercase tracking-wider rtl:tracking-normal rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                 <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                 {t("Générer")}</button>
                           </div>
                           <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">{t("Unique pour stock, traçabilité et livraison.")}</p>
                        </div>

                        {/* Season Selection */}
                        <div className="space-y-1.5">
                           <label className="block text-xs font-semibold text-slate-700 font-sans">{t("Saison & Collection d'affichage")}</label>
                           <select 
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-semibold text-slate-900 text-sm"
                              value={formData.season || ''} 
                              onChange={(e) => setFormData({...formData, season: e.target.value})}
                           >
                              <option value="">{t("Toutes Fêtes & Saisons (Par défaut)...")}</option>
                              {[
                                 { id: "Toutes Saisons", label: "Toutes Saisons / كل الفصول" },
                                 { id: "Printemps / Été", label: "Printemps / Été (الربيع / الصيف)" },
                                 { id: "Automne / Hiver", label: "Automne / Hiver (الخريف / الشتاء)" },
                                 { id: "Collection Ramadan", label: "Collection Ramadan (مجموعة رمضان)" },
                                 { id: "Collection Traditionnelle", label: "Collection Traditionnelle (مجموعة تقليدية)" },
                                 { id: "Édition Limitée", label: "Édition Limitée (طبعة محدودة)" }
                              ].map(s => (
                                 <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                           </select>
                           <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed font-sans">{t("Permet un filtrage saisonnier intelligent pour les acheteurs.")}</p>
                        </div>
                     </div>

                     {/* Materials multi-selection pill-tags */}
                     <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="block text-xs font-semibold text-slate-700 font-sans">{t("Matières premières & Composition")}</label>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">{t("Sélectionnez une ou plusieurs matières de fabrication algérienne ou noble :")}</p>
                        
                        <div className="flex flex-wrap gap-2">
                           {[
                              { id: "Coton", label: "Coton / قطن" },
                              { id: "Laine", label: "Laine / صوف" },
                              { id: "Cuir", label: "Cuir / جلد" },
                              { id: "Argile", label: "Argile (Poterie) / طين" },
                              { id: "Cuivre", label: "Cuivre / نحاس" },
                              { id: "Soie", label: "Soie / حرير" },
                              { id: "Lin", label: "Lin / كتان" },
                              { id: "Or", label: "Or / ذهب" },
                              { id: "Argent", label: "Argent / فضة" },
                              { id: "Bois", label: "Bois / خشب" },
                              { id: "Céramique", label: "Céramique / سيراميك" },
                              { id: "Verre", label: "Verre / زجاج" },
                              { id: "Fil d'Or", label: "Fil d'Or / فتلة" },
                              { id: "Autre", label: "Autre / أخرى" }
                           ].map(mat => {
                              const isSelected = formData.materials.includes(mat.id);
                              return (
                                 <button
                                    key={mat.id}
                                    type="button"
                                    onClick={() => {
                                       const isAct = formData.materials.includes(mat.id);
                                       const newMat = isAct 
                                          ? formData.materials.filter(m => m !== mat.id) 
                                          : [...formData.materials, mat.id];
                                       setFormData({...formData, materials: newMat});
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                       isSelected 
                                          ? 'bg-[#121315] border-[#121315] text-white shadow-sm' 
                                          : 'bg-stone-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-stone-100'
                                    }`}
                                 >
                                    {mat.label}
                                 </button>
                              );
                           })}
                        </div>

                        {formData.materials.includes("Autre") && (
                           <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                              <label className="block text-[10px] font-black text-[#121315]/60 uppercase tracking-wider rtl:tracking-normal mb-1">{t("Précisez l'autre matière")}</label>
                              <input 
                                 type="text" 
                                 placeholder={t("Ex: Céramique fine de Kabylie, Laiton martelé...") || "Ex: Céramique fine de Kabylie, Laiton martelé..."} 
                                 className="w-full max-w-md px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-semibold text-slate-900 text-xs"
                                 value={formData.otherMaterial || ''} 
                                 onChange={(e) => setFormData({...formData, otherMaterial: e.target.value})} 
                              />
                           </motion.div>
                        )}
                     </div>
                  </div>

                  {/* Variantes (Tailles & Couleurs) conditionnées */}
                  {(!DYNAMIC_CATEGORIES[formData.category] || DYNAMIC_CATEGORIES[formData.category].hasSize || DYNAMIC_CATEGORIES[formData.category].hasColor) && (
                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                      {(!DYNAMIC_CATEGORIES[formData.category] || DYNAMIC_CATEGORIES[formData.category].hasSize) && (
                        <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-900">{t("Type de Taille")}</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SIZE_TYPES.map(s => (
                              <button 
                                key={s.id} type="button" 
                                onClick={() => setFormData(prev => ({ ...prev, sizeType: s.id, sizes: [] }))}
                                className={`p-3 rounded-xl border text-center transition-all ${formData.sizeType === s.id ? 'bg-blue-900 border-blue-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                              >
                                <span className="text-xs font-semibold">{s.label}</span>
                              </button>
                            ))}
                          </div>
                          
                          {activeSizeList.length > 0 && (
                            <div className="bg-white p-4 rounded-xl border border-slate-200 mt-4">
                              <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-widest rtl:tracking-normal">{t("Sélectionnez les tailles disponibles")}</label>
                              <div className="flex flex-wrap gap-2">
                                {activeSizeList.map(s => {
                                  const isSelected = formData.sizes.includes(s);
                                  return (
                                    <button key={s} type="button" onClick={() => toggleSize(s)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${isSelected ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                      {s}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(!DYNAMIC_CATEGORIES[formData.category] || DYNAMIC_CATEGORIES[formData.category].hasColor) && (
                        <div className={`space-y-4 ${(!DYNAMIC_CATEGORIES[formData.category] || DYNAMIC_CATEGORIES[formData.category].hasSize) ? 'pt-6 border-t border-slate-200' : ''}`}>
                          <label className="block text-sm font-bold text-slate-900">{t("Couleurs (Optionnel)")}</label>
                          <div className="flex flex-wrap gap-3">
                            {PRODUCT_COLORS.map(color => {
                              const isSelected = formData.colors?.some(c => c.toLowerCase().trim() === color.name.toLowerCase().trim());
                              return (
                                <button
                                  key={color.name}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      colors: isSelected 
                                        ? prev.colors.filter(c => c.toLowerCase().trim() !== color.name.toLowerCase().trim())
                                        : [...(prev.colors || []), color.name]
                                    }));
                                  }}
                                  className={`flex flex-col items-center gap-1.5 transition-all ${isSelected ? 'scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                  title={color.name}
                                >
                                  <div 
                                    className={`w-8 h-8 rounded-full shadow-sm flex items-center justify-center ${color.border ? 'border border-slate-300' : ''}`}
                                    style={{ background: color.hex }}
                                  >
                                    {isSelected && (
                                      <Check className={`w-4 h-4 ${color.name === 'Blanc' || color.name === 'Beige' || color.name === 'Jaune' ? 'text-slate-900' : 'text-white'}`} />
                                    )}
                                  </div>
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{color.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-6">
                        <button type="button" onClick={handleGenerateVariants} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-[0.98]">
                          {t("Générer les combinaisons (")}{formData.sizes.length || 1} {t("Tailles ×")}{formData.colors.length || 1} {t("Couleurs)")}</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: DECLINAISONS (TABLE) */}
              {activeStep === 2 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1 flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{t("Inventaire Détaillé")}</h4>
                      <p className="text-sm text-slate-500">{t("Gérez le stock, les prix spéciaux et les SKU par déclinaison.")}</p>
                    </div>
                  </div>
                  
                  {formData.variants.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-start text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest rtl:tracking-normal text-[10px] font-black">
                              <tr>
                                <th className="px-5 py-4 w-12">{t("Actif")}</th>
                                <th className="px-5 py-4">{t("Variante")}</th>
                                <th className="px-5 py-4 w-32">{t("SKU (Optionnel)")}</th>
                                <th className="px-5 py-4 w-32">{t("Stock")}</th>
                                <th className="px-5 py-4 w-40">{t("Prix Spécifique (DA)")}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                              {formData.variants.map((v, i) => {
                                return (
                                                              <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${!v.isActive ? 'opacity-50' : ''}`}>
                                                                  <td className="px-5 py-3">
                                                                    <input type="checkbox" checked={v.isActive !== false} onChange={e => {
                                                                      setFormData(prev => {
                                                                          const nw = [...prev.variants];
                                                                          nw[i] = { ...nw[i], isActive: e.target.checked };
                                                                          return {...prev, variants: nw};
                                                                      })
                                                                    }} className="w-4 h-4 rounded text-blue-900 cursor-pointer" />
                                                                  </td>
                                                                  <td className="px-5 py-3 font-semibold text-slate-900">
                                                                    <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs border border-slate-200">
                                                                      {v.name}
                                                                    </span>
                                                                  </td>
                                                                  <td className="px-3 py-3">
                                                                    <input type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-xs focus:border-blue-900 disabled:bg-slate-50" placeholder={t("SKU-...") || "SKU-..."} value={v.sku || ''} disabled={v.isActive === false} onChange={e => {
                                                                        const str = e.target.value;
                                                                        setFormData(prev => {
                                                                          const nw = [...prev.variants];
                                                                          nw[i] = { ...nw[i], sku: str };
                                                                          return {...prev, variants: nw};
                                                                        });
                                                                    }} />
                                                                  </td>
                                                                  <td className="px-3 py-3">
                                                                    <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-blue-900 disabled:bg-slate-50" placeholder="0" value={v.stock} disabled={v.isActive === false} onChange={e => {
                                                                        const str = e.target.value;
                                                                        setFormData(prev => {
                                                                          const nw = [...prev.variants];
                                                                          nw[i] = { ...nw[i], stock: str };
                                                                          return {...prev, variants: nw};
                                                                        });
                                                                    }} />
                                                                  </td>
                                                                  <td className="px-3 py-3 pr-5">
                                                                    <input type="number" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-medium text-xs focus:border-blue-900 disabled:bg-slate-50 placeholder:text-slate-300" placeholder={t("Prix différent...") || "Prix différent..."} value={v.priceOverride || ''} disabled={v.isActive === false} onChange={e => {
                                                                        const str = e.target.value;
                                                                        setFormData(prev => {
                                                                          const nw = [...prev.variants];
                                                                          nw[i] = { ...nw[i], priceOverride: str };
                                                                          return {...prev, variants: nw};
                                                                        });
                                                                    }} />
                                                                  </td>
                                                              </tr>
                                                            );
                              })}
                          </tbody>
                        </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
                      <ListTree className="w-8 h-8 text-slate-300 mb-4" />
                      <h5 className="font-bold text-slate-700 mb-1">{t("Aucune variante générée")}</h5>
                      <p className="text-sm text-slate-500 mb-4">{t("Retournez à l'étape \"Variantes\" pour configurer les tailles et couleurs.")}</p>
                      <button type="button" onClick={() => setActiveStep(1)} className="px-6 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-100">
                        {t("Aller aux Variantes")}</button>
                    </div>
                  )}
                  
                  {formData.variants.length === 0 && (
                     <div className="pt-6 border-t border-slate-100">
                        <label className="block text-xs font-semibold text-slate-600 mb-2">{t("Stock Global (Produit sans variante)")}</label>
                        <input required type="number" className="w-full md:w-1/3 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-900 transition-all font-bold text-slate-900" value={formData.stock || ''} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
                     </div>
                  )}
                </motion.div>
              )}

              {/* STEP 4: MEDIAS */}
              {activeStep === 3 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Médias du Produit")}</h4>
                    <p className="text-sm text-slate-500">{t("Ajoutez des photos de haute qualité (Max 8 images, 1 vidéo).")}</p>
                  </div>
                  
                  {Object.values(uploading).some(Boolean) && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-wider rtl:tracking-normal">{t("Transfert de médias en cours... Veuillez patienter")}</span>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-semibold text-slate-900">{t("Galerie Photos")}</label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{t("PNG/JPG • Max 5Mo")}</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {formData.images.map((img, i) => {
                          return (
                                                    <label key={i} className={`relative cursor-pointer group bg-slate-50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${i === 0 ? 'aspect-square md:col-span-2 md:row-span-2' : 'aspect-square'} ${img ? 'border-slate-200 shadow-sm' : 'border-slate-200 hover:border-blue-900 hover:bg-blue-50/30'}`}>
                                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image', i)} disabled={uploading[`image-${i}`]} />
                                                      {uploading[`image-${i}`] ? (
                                                          <div className="flex flex-col items-center">
                                                             <Loader2 className="w-6 h-6 text-blue-900 animate-spin mb-2" />
                                                             <span className="text-[10px] font-bold text-blue-900">{uploadProgress[`image-${i}`] || 0}%</span>
                                                          </div>
                                                      ) : img ? (
                                                          <>
                                                            <img loading="lazy" alt="" src={img} className="w-full h-full object-cover" />
                                                            {i === 0 && <span className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded">{t("Vignette Principale")}</span>}
                                                          </>
                                                      ) : (
                                                          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-900 p-4 text-center">
                                                            <Upload className={i === 0 ? "w-8 h-8" : "w-5 h-5"} />
                                                            {i === 0 ? (
                                                              <div><p className="font-bold text-sm">{t("Image Principale")}</p><p className="text-xs opacity-70">{t("Sera utilisée comme miniature")}</p></div>
                                                            ) : (
                                                              <p className="font-bold text-xs">{t("Image")}{i + 1}</p>
                                                            )}
                                                          </div>
                                                      )}
                                                      {img && (
                                                        <button type="button" onClick={(e) => { e.preventDefault(); updateImage(i, ''); }} className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-white shadow-sm transition-all z-10">
                                                          <X className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                    </label>
                                                );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-semibold text-slate-900">{t("Vidéo de Présentation")}</label>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{t("MP4 • Max 10Mo")}</span>
                      </div>
                      <label className="relative block w-full py-8 cursor-pointer overflow-hidden border-2 border-slate-200 bg-slate-50 rounded-2xl group border-dashed hover:border-blue-900 hover:bg-blue-50/30 transition-all text-center">
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} disabled={uploading.video} />
                        {uploading.video ? (
                          <div className="flex flex-col items-center text-blue-900">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs font-bold font-medium mb-1">{t("Envoi en cours...")}</span>
                            <div className="w-48 h-2 bg-blue-100 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-900 transition-all duration-300" style={{ width: `${uploadProgress.video || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold mt-1 text-blue-900">{uploadProgress.video || 0}%</span>
                          </div>
                        ) : formData.video ? (
                          <div className="flex flex-col items-center text-emerald-600">
                              <Video className="w-8 h-8 mb-2" />
                              <span className="text-sm font-bold">{t("Vidéo importée avec succès")}</span>
                              <button onClick={(e) => { e.preventDefault(); setFormData({...formData, video: ''})}} className="mt-3 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:text-red-500">{t("Supprimer")}</button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-900">
                              <Video className="w-8 h-8 mb-2" />
                              <span className="text-sm font-bold">{t("Glissez ou cliquez pour importer")}</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: PRIX */}
              {activeStep === 4 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Tarification & Commercial")}</h4>
                    <p className="text-sm text-slate-500">{t("Fixez votre prix de vente et gérez vos marges (en Dinar Algérien - DA).")}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Prix de vente base (DA) *")}</label>
                        <input required type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-xl font-black focus:border-blue-900 text-slate-900 transition-colors" placeholder="0.00" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2 flex justify-between items-center">
                          {t("Prix comparé / Promo (DA)")}<span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{t("Optionnel")}</span>
                        </label>
                        <input type="number" className="w-full px-4 py-3 bg-white border border-orange-200 rounded-xl outline-none text-xl font-black text-orange-600 focus:border-orange-500 placeholder:text-orange-200 transition-colors" placeholder="0.00" value={formData.promoPrice || ''} onChange={(e) => setFormData({...formData, promoPrice: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-2xl border border-slate-200">
                       <h5 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> {t("Analyse de rentabilité")}</h5>
                       <div className="grid md:grid-cols-2 gap-6 items-end">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2 flex justify-between items-center">
                               {t("Coût d'achat ou revient (DA)")}<span className="text-[9px] font-bold text-slate-400 italic">{t("Privé")}</span>
                            </label>
                            <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-900 focus:border-blue-900 transition-colors" placeholder={t("Coût interne...") || "Coût interne..."} value={formData.costPrice || ''} onChange={(e) => setFormData({...formData, costPrice: e.target.value})} />
                          </div>
                          <div className={`p-4 rounded-xl border ${mg ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                             {mg ? (
                                <div className="flex justify-between items-center">
                                   <span className="text-xs font-semibold">{t("Marge Estimée")}</span>
                                   <div className="text-end">
                                      <span className="block text-lg font-black">{mg.val} {t("DA")}</span>
                                      <span className="block text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal">{mg.perc}{t("% de marge nette")}</span>
                                   </div>
                                </div>
                             ) : (
                                <span className="text-xs font-medium">{t("Entrez un prix de vente et un coût pour estimer votre marge.")}</span>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* FLASH SALE SECTION */}
                    <div className="p-6 rounded-2xl border border-slate-200 bg-white">
                       <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${formData.flashSaleActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                 <Zap className="w-5 h-5" />
                              </div>
                              <div>
                                 <h5 className="text-base font-bold text-slate-900">{t("Vente Flash")}</h5>
                                 <p className="text-xs text-slate-500">{t("Booster les ventes sur une courte durée (max 72h).")}</p>
                              </div>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                 type="checkbox" 
                                 className="sr-only peer" 
                                 checked={formData.flashSaleActive}
                                 onChange={(e) => setFormData({ ...formData, flashSaleActive: e.target.checked })} 
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                           </label>
                       </div>

                       <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200 ${formData.flashSaleActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                          <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Prix flash (DA) *")}</label>
                             <input 
                                disabled={!formData.flashSaleActive}
                                type="number" 
                                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none text-lg font-black text-blue-900 focus:border-blue-500 transition-colors" 
                                placeholder={t("Doit être < prix de base") || "Doit être < prix de base"} 
                                value={formData.flashPrice || ''} 
                                onChange={(e) => setFormData({...formData, flashPrice: e.target.value})} 
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Quantité limitée (Stock flash)")}</label>
                             <input 
                                disabled={!formData.flashSaleActive}
                                type="number" 
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" 
                                placeholder={t("Laissez vide si illimité") || "Laissez vide si illimité"} 
                                value={formData.flashQuantity || ''} 
                                onChange={(e) => setFormData({...formData, flashQuantity: e.target.value})} 
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Début de l'offre *")}</label>
                             <input 
                                disabled={!formData.flashSaleActive}
                                type="datetime-local" 
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900 focus:border-blue-900 transition-colors" 
                                value={formData.flashStartDate || ''} 
                                onChange={(e) => setFormData({...formData, flashStartDate: e.target.value})} 
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Fin de l'offre (Max 72h) *")}</label>
                             <input 
                                disabled={!formData.flashSaleActive}
                                type="datetime-local" 
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900 focus:border-blue-900 transition-colors" 
                                value={formData.flashEndDate || ''} 
                                onChange={(e) => setFormData({...formData, flashEndDate: e.target.value})} 
                             />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Limite d'achat par client")}</label>
                             <select
                                disabled={!formData.flashSaleActive}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-900 focus:border-blue-900 transition-colors"
                                value={formData.flashLimitPerCustomer || ''}
                                onChange={(e) => setFormData({...formData, flashLimitPerCustomer: e.target.value})}
                             >
                                <option value="illimité">{t("Illimité")}</option>
                                <option value="1">{t("1 article max par client")}</option>
                                <option value="2">{t("2 articles max par client")}</option>
                                <option value="3">{t("3 articles max par client")}</option>
                             </select>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: LOGISTIQUE */}
              {activeStep === 5 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Logistique & Visibilité")}</h4>
                    <p className="text-sm text-slate-500">{t("Expédition, retours et paramètres de publication finaux.")}</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Poids du Colis (kg)")}</label>
                          <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" placeholder="0.5" value={formData.weight || ''} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Dimensions (Lx lx h cm)")}</label>
                          <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" placeholder="20x15x10" value={formData.dimensions || ''} onChange={(e) => setFormData({...formData, dimensions: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2 flex justify-between">{t("Livraison (DA)")}<span className="lowercase text-[9px] font-bold text-slate-400">{t("vide=défaut")}</span></label>
                          <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" placeholder={t("Tarif fixe...") || "Tarif fixe..."} value={formData.deliveryPrice || ''} onChange={(e) => setFormData({...formData, deliveryPrice: e.target.value})} />
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Délai de préparation estimé")}</label>
                          <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" value={formData.preparationTime || ''} onChange={(e) => setFormData({...formData, preparationTime: e.target.value})}>
                            <option value="">{t("Sélectionner...")}</option>
                            <option value="1">{t("1 jour ouvré (Express)")}</option>
                            <option value="2">{t("2 jours ouvrés")}</option>
                            <option value="3">{t("3 à 5 jours ouvrés")}</option>
                            <option value="7">{t("Fabrication sur commande (7j+)")}</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">{t("Wilaya d'expédition")}</label>
                          <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-900 focus:border-blue-900 transition-colors" value={formData.wilaya || ''} onChange={(e) => setFormData({...formData, wilaya: e.target.value})}>
                            <option value="">{t("Sélectionner...")}</option>
                            {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                       <label className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-blue-900 transition-colors">
                         <div>
                            <span className="block font-bold text-slate-900 text-sm">{t("Politique de retour (14 jours)")}</span>
                            <span className="text-xs text-slate-500 font-medium">{t("Accepter les retours/échanges sous 14 jours")}</span>
                         </div>
                         <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${formData.returnPolicy ? 'bg-blue-900' : 'bg-slate-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full absolute shadow transition-transform ${formData.returnPolicy ? 'translate-x-6' : 'translate-x-1'}`} />
                         </div>
                         <input type="checkbox" className="hidden" checked={formData.returnPolicy} onChange={() => setFormData({...formData, returnPolicy: !formData.returnPolicy})} />
                       </label>
                       
                       <label className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-blue-900 transition-colors">
                         <div>
                            <span className="block font-bold text-slate-900 text-sm">{t("Mettre en avant sur la vitrine")}</span>
                            <span className="text-xs text-slate-500 font-medium">{t("Affiche le produit en grand en haut de votre boutique")}</span>
                         </div>
                         <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${formData.isStoreFeatured ? 'bg-orange-500' : 'bg-slate-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full absolute shadow transition-transform ${formData.isStoreFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                         </div>
                         <input type="checkbox" className="hidden" checked={formData.isStoreFeatured} onChange={() => setFormData({...formData, isStoreFeatured: !formData.isStoreFeatured})} />
                       </label>
                       
                       <label className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between cursor-pointer hover:border-blue-900 transition-colors">
                         <div>
                            <span className="block font-bold text-slate-900 text-sm">{t("Traduction automatique")}</span>
                            <span className="text-xs text-slate-500 font-medium">{t("Générer les versions Arabe et Anglais à l'enregistrement")}</span>
                         </div>
                         <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${formData.autoTranslate ? 'bg-blue-900' : 'bg-slate-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full absolute shadow transition-transform ${formData.autoTranslate ? 'translate-x-6' : 'translate-x-1'}`} />
                         </div>
                         <input type="checkbox" className="hidden" checked={formData.autoTranslate} onChange={() => setFormData({...formData, autoTranslate: !formData.autoTranslate})} />
                       </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 6: RECAP */}
              {activeStep === 6 && (
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} className="space-y-8 pb-10">
                  <div className="space-y-1">
                    <h4 className="text-xl font-bold text-slate-900">{t("Récapitulatif")}</h4>
                    <p className="text-sm text-slate-500">{t("Vérifiez les détails avant la publication. Les traductions seront générées automatiquement.")}</p>
                  </div>

                  <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-200">
                    <div className="p-6 flex gap-6 items-start">
                       <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm relative">
                          {formData.images.find(i => i) ? (
                            <img loading="lazy" src={formData.images.find(i => i)} className="w-full h-full object-cover" alt={t("Preview") || "Preview"} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                               <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h5 className="font-extrabold text-slate-900 text-lg truncate">{formData.name || "Sans nom"}</h5>
                          <p className="text-sm font-bold text-blue-900 mt-1">{formData.category} {formData.subcategory ? `> ${formData.subcategory}` : ''}</p>
                          <div className="flex items-center gap-3 mt-3">
                             <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-lg font-black text-slate-900">
                                {formData.price} <span className="text-xs">{t("DA")}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest rtl:tracking-normal mb-1">{t("Stock Total")}</p>
                          <p className="text-sm font-extrabold text-slate-900">
                             {formData.variants && formData.variants.length > 0 
                               ? formData.variants.reduce((acc, curr) => acc + (parseInt(curr.stock) || 0), 0) 
                               : (formData.stock || 0)} {t("unités")}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest rtl:tracking-normal mb-1">{t("SKU")}</p>
                          <p className="text-sm font-mono font-bold text-slate-700">{formData.sku || "-"}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest rtl:tracking-normal mb-1">{t("Expédition")}</p>
                          <p className="text-sm font-bold text-slate-900">{formData.wilaya} ({formData.deliveryPrice || "Défaut"} {t("DA)")}</p>
                       </div>
                       <div className="col-span-full">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest rtl:tracking-normal mb-1">{t("Description")}</p>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed font-medium">
                             {formData.description || "Aucune description fournie."}
                          </p>
                       </div>
                    </div>

                    <div className="p-6 bg-blue-50/50">
                       <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                             <Sparkles className="w-5 h-5 text-blue-900" />
                          </div>
                          <div>
                             <p className="text-sm font-extrabold text-blue-900">{t("Intelligence de Traduction Adaptative")}</p>
                             <p className="text-xs font-medium text-blue-800/80 mt-1">
                                {t("Notre système va détecter automatiquement la langue de votre saisie (FR, AR ou EN) et traduire les fiches produits vers les deux autres langues dès que vous cliquerez sur \"Confirmer & Publier\".")}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </form>
          </div>

          {/* Bottom Action Bar Fixed */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:px-10 md:py-6 bg-white border-t border-slate-200 flex flex-wrap md:flex-nowrap items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-20 gap-3">
             <div className="w-full md:w-auto">
                {activeStep > 0 && (
                   <button onClick={() => setActiveStep(activeStep - 1)} className="w-full md:w-auto px-5 py-4 md:px-6 md:py-4 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-bold text-sm uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center justify-center md:justify-start gap-2 min-h-[50px]">
                     <ChevronLeft className="w-5 h-5" /> {t("Précédent")}</button>
                )}
             </div>
             <div className="flex gap-3 w-full md:w-auto justify-end">
                {activeStep === 6 ? (
                  <>
                     <button type="button" onClick={(e) => Object.keys(formData).length && handleSubmitProduct(e, "draft")} disabled={loading || Object.values(uploading).some(Boolean)} className="flex-1 md:flex-none px-4 py-4 md:px-6 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest rtl:tracking-normal transition-colors disabled:opacity-50 min-h-[50px]">
                        {t("Brouillon")}</button>
                     <button onClick={(e) => handleSubmitProduct(e)} disabled={loading || Object.values(uploading).some(Boolean)} className="flex-[2] md:flex-none px-6 py-4 md:px-8 bg-blue-900 text-white hover:bg-blue-800 rounded-xl font-bold text-xs md:text-sm uppercase tracking-widest rtl:tracking-normal shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[50px]">
                        {loading || Object.values(uploading).some(Boolean) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {editingProduct ? "Mettre à jour" : "Confirmer & Publier"}
                     </button>
                  </>
                ) : (
                  <button onClick={() => setActiveStep(activeStep + 1)} className="w-full md:w-auto px-8 py-4 md:px-10 bg-blue-900 text-white hover:bg-blue-800 rounded-xl font-bold text-sm uppercase tracking-widest rtl:tracking-normal shadow-md transition-colors flex items-center justify-center gap-2 min-h-[50px]">
                     {t("Suivant")}<ChevronRight className="w-5 h-5" />
                  </button>
                )}
             </div>
          </div>
        </div>

      </motion.div>
      <ConfirmationDialog />
    </div>
  );
};
