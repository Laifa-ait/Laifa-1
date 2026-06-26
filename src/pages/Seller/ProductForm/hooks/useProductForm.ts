import { useState, useEffect } from 'react';
import { useConfirm } from '../../../../hooks/useConfirm';

export const useProductForm = (editingProduct: any, userProfile: any) => {
  const { confirm: showConfirmModal, ConfirmationDialog } = useConfirm();
  const [activeStep, setActiveStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
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
    images: ['', '', '', '', '', '', '', ''],
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
    metaTitle: '',
    metaDescription: '',
    slug: '',
    lowStockAlert: '5',
    publishAt: '',
    internalNotes: '',
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

  const [draggedImageIdx, setDraggedImageIdx] = useState<number | null>(null);
  const [dragOverImageIdx, setDragOverImageIdx] = useState<number | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        brand: editingProduct.brand || '',
        price: editingProduct.price?.toString() || '',
        promoPrice: editingProduct.promoPrice?.toString() || '',
        costPrice: editingProduct.costPrice?.toString() || '',
        flashSaleActive: editingProduct.flashSaleActive || false,
        flashPrice: editingProduct.flashPrice?.toString() || '',
        flashQuantity: editingProduct.flashQuantity?.toString() || '',
        flashStartDate: editingProduct.flashStartDate || '',
        flashEndDate: editingProduct.flashEndDate || '',
        flashLimitPerCustomer: editingProduct.flashLimitPerCustomer || 'illimité',
        sku: editingProduct.sku || '',
        category: editingProduct.category || '',
        subcategory: editingProduct.subcategory || '',
        subSubCategory: editingProduct.subSubCategory || '',
        gender: editingProduct.gender || '',
        condition: editingProduct.condition || 'Neuf',
        warranty: editingProduct.warranty || '',
        materials: editingProduct.materials || [],
        otherMaterial: editingProduct.otherMaterial || '',
        season: editingProduct.season || '',
        attributes: editingProduct.attributes || {},
        description: editingProduct.description || '',
        image: editingProduct.image || '',
        images: [...(editingProduct.images || []), '', '', '', '', '', '', ''].slice(0, 8),
        video: editingProduct.video || '',
        colors: editingProduct.colors || [],
        sizes: editingProduct.sizes || [],
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
        stock: editingProduct.stock?.toString() || '10',
        status: editingProduct.status || 'pending',
        metaTitle: editingProduct.metaTitle || '',
        metaDescription: editingProduct.metaDescription || '',
        slug: editingProduct.slug || '',
        lowStockAlert: editingProduct.lowStockAlert?.toString() || '5',
        publishAt: editingProduct.publishAt || '',
        internalNotes: editingProduct.internalNotes || '',
        translations: editingProduct.translations || { en: { name: '', description: '' }, ar: { name: '', description: '' } }
      });
    }
  }, [editingProduct, userProfile]);

  return {
    activeStep, setActiveStep,
    showPreview, setShowPreview,
    formData, setFormData,
    loading, setLoading,
    aiGenerating, setAiGenerating,
    translating, setTranslating,
    uploading, setUploading,
    uploadProgress, setUploadProgress,
    tagInput, setTagInput,
    colorInput, setColorInput,
    showAdminTagsList, setShowAdminTagsList,
    draggedImageIdx, setDraggedImageIdx,
    dragOverImageIdx, setDragOverImageIdx,
    showConfirmModal, ConfirmationDialog
  };
};
