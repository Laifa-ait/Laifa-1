import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, Send, Sparkles, Layout, Type, Image as ImageIcon, ShoppingBag, 
  Plus, Trash2, Smartphone, Monitor, Eye, Save, Link2, AlignLeft, AlignCenter, 
  AlignRight, FolderOpen, Search, X, Loader2, Tag, CheckCircle, HelpCircle, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { useTranslation } from "react-i18next";

const ALGERIA_STOCK_BANNERS = [
  {
    id: 'ramadan-sale',
    title: 'Solde du Ramadan (Épices & Dates)',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    category: 'Campagne'
  },
  {
    id: 'supermarche-alg',
    title: 'Supermarché & Quotidien',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    category: 'Supermarché'
  },
  {
    id: 'livraison-58',
    title: 'Livraison 58 Wilayas Express',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    category: 'Logistique'
  },
  {
    id: 'fashion-chic',
    title: 'Mode & Élégance Traditionnelle',
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    category: 'Mode'
  },
  {
    id: 'electro-alg',
    title: 'Électronique & High-Tech',
    url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=800',
    category: 'Technologie'
  },
  {
    id: 'beauty-bio',
    title: 'Cosmétiques & Beauté Naturelle',
    url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800',
    category: 'Bien-être'
  },
  {
    id: 'souk-colors',
    title: "Épices & Saveurs du Sud d'Algérie",
    url: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800',
    category: 'Gastronomie'
  },
  {
    id: 'jewels-silver',
    title: 'Bijoux & Ornements Artisans',
    url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
    category: 'Accessoires'
  }
];

export const Newsletter: React.FC = () => {
    const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Media Selector States
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [selectedBlockIdForImage, setSelectedBlockIdForImage] = useState<string | null>(null);
  const [selectedBlockIdForProduct, setSelectedBlockIdForProduct] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTab, setMediaTab] = useState<'product_catalog' | 'stock_banners' | 'custom_url' | 'file_upload'>('product_catalog');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const getJustifyClass = (align: string) => {
    if (align === 'left') return 'justify-start';
    if (align === 'right') return 'justify-end';
    return 'justify-center';
  };

  const getWidthClass = (widthStr: string) => {
    const w = widthStr || '100';
    if (w === '30') return 'w-full sm:w-[calc(33.333%-1rem)] min-w-[200px] flex-grow sm:flex-grow-0';
    if (w === '50') return 'w-full sm:w-[calc(50%-1rem)] min-w-[260px] flex-grow sm:flex-grow-0';
    if (w === '75') return 'w-full sm:w-[75%]';
    return 'w-full';
  };

  const addBlock = (type: string) => {
    let newBlock: any = { id: Math.random().toString(), type, width: '100' };
    if (type === 'title') {
      newBlock.content = 'Titre de la Newsletter';
    } else if (type === 'text') {
      newBlock.content = 'Votre texte ici...';
    } else if (type === 'image') {
      newBlock.content = ''; // Image URL
      newBlock.linkUrl = ''; // Hyperlink
      newBlock.align = 'center'; // Default is center alignment
      newBlock.aspectRatio = 'auto'; // Original aspect ratio
      newBlock.rounded = 'rounded-2xl'; // Elegant rounded corners
    } else if (type === 'product') {
      newBlock.productId = '';
      newBlock.productName = '';
      newBlock.productPrice = 0;
      newBlock.productImage = '';
      newBlock.productCategory = '';
      newBlock.linkUrl = '';
    } else {
      newBlock.content = '';
    }
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => setBlocks(blocks.filter(b => b.id !== id));

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockProperty = (id: string, property: string, value: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, [property]: value } : b));
  };

  const handleSelectProduct = (prod: any) => {
    if (selectedBlockIdForProduct) {
      setBlocks(blocks.map(b => b.id === selectedBlockIdForProduct ? {
        ...b,
        productId: prod.id,
        content: prod.name,
        productName: prod.name,
        productPrice: prod.price,
        productImage: prod.image || (prod.images && prod.images[0]) || '',
        productCategory: prod.category || '',
        linkUrl: `/products/${prod.id}`
      } : b));
      setMediaModalOpen(false);
      setSelectedBlockIdForProduct(null);
    }
  };

  useEffect(() => {
    if (mediaModalOpen) {
      const fetchProducts = async () => {
        setProductsLoading(true);
        try {
          const snap = await getDocs(query(collection(db, 'products'), limit(45)));
          setProductsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
          console.error("Erreur de chargement des produits pour la médiathèque:", err);
        } finally {
          setProductsLoading(false);
        }
      };
      fetchProducts();
    }
  }, [mediaModalOpen]);

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB).");
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Téléchargement de l\'image en cours...');
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `newsletter-images/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      handleSelectImage(url);
      toast.success('Image ajoutée avec succès.', { id: toastId });
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image :', error);
      toast.error('Échec du téléchargement.', { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSelectImage = (url: string) => {
    if (selectedBlockIdForImage) {
      updateBlockProperty(selectedBlockIdForImage, 'content', url);
      setMediaModalOpen(false);
      setSelectedBlockIdForImage(null);
    }
  };

  const generateWithAi = async () => {
    if (!aiPrompt || !currentUser) return;
    setGenerating(true);
    try {
      const currentAuthUser = auth.currentUser;
      let idToken = "";
      if (currentAuthUser) {
        idToken = await currentAuthUser.getIdToken();
      }
      const response = await fetch('/api/admin/generate-newsletter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         const textError = await response.text();
         throw new Error(`Erreur serveur (${response.status}): ${textError.substring(0, 100)}`);
      }
      
      const data = await response.json();
      if (data.subject) setSubject(data.subject);
      if (data.blocks) {
        // Adapt generated blocks to have correct defaults for images
        const adaptedBlocks = data.blocks.map((b: any) => {
          if (b.type === 'image') {
            return {
              width: '100',
              align: 'center',
              aspectRatio: 'auto',
              rounded: 'rounded-2xl',
              linkUrl: '',
              ...b
            };
          }
          return b;
        });
        setBlocks(adaptedBlocks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!subject.trim() || blocks.length === 0) {
      toast.error('Veuillez ajouter un objet et du contenu avant d\'envoyer.');
      return;
    }
    setIsSending(true);
    
    try {
      const authOptions = auth.currentUser ? { 'Authorization': `Bearer ${await auth.currentUser.getIdToken()}` } : {};
      const res = await fetch('/api/admin/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authOptions },
        body: JSON.stringify({ subject, blocks, settings: {} })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      
      toast.success(data.message || 'Campagne envoyée avec succès !', { duration: 4000, icon: '🚀' });
    } catch (e: any) {
      toast.error(e.message || "Erreur de connexion.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Newsletter 2.0")}</h2>
          <p className="text-zinc-500 font-medium">{t("Éditeur visuel intelligent alimenté par Gemini AI.")}</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
              onClick={() => setPreviewOpen(true)}
              className="px-8 py-5 bg-white border border-zinc-100 rounded-[2rem] flex items-center gap-4 font-black text-[11px] uppercase tracking-widest rtl:tracking-normal text-zinc-500 hover:text-zinc-900 transition-all shadow-sm"
           >
              <Eye className="w-5 h-5" /> {t("Prévisualiser")}</button>
           <button 
              onClick={handleSendCampaign}
              disabled={isSending}
              className="px-10 py-5 bg-[#ea580c] text-white rounded-[2rem] flex items-center gap-4 font-black text-[11px] uppercase tracking-widest rtl:tracking-normal shadow-xl shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 active:scale-95 transition-all"
           >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {t("Envoyer la campagne")}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
         {/* Sidebar Editor */}
         <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-8">
               <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-6">{t("Blocs Disponibles")}</h4>
               <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'title', icon: Type, label: 'Titre' },
                    { type: 'text', icon: Layout, label: 'Paragraphe' },
                    { type: 'image', icon: ImageIcon, label: 'Image' },
                    { type: 'product', icon: ShoppingBag, label: 'Produit' },
                  ].map((b) => (
                    <button 
                      key={b.type}
                      onClick={() => addBlock(b.type)}
                      className="flex flex-col items-center justify-center gap-3 p-6 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                    >
                       <b.icon className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                       <span className="text-[9px] font-black uppercase text-zinc-400 group-hover:text-orange-700">{b.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="bg-zinc-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 end-0 w-32 h-32 bg-orange-500/20 rounded-full  -me-10 -mt-10" />
               <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest rtl:tracking-normal mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" /> {t("Assistant IA Gemini")}</h4>
               <textarea 
                 rows={3}
                 className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-medium outline-none focus:border-orange-500 mb-4 text-white" 
                 placeholder={t("Décrivez l'e-mail à rédiger (ex: Promo Aïd)...") || "Décrivez l'e-mail à rédiger (ex: Promo Aïd)..."}
                 value={aiPrompt}
                 onChange={(e) => setAiPrompt(e.target.value)}
               />
               <button 
                 onClick={generateWithAi}
                 disabled={generating}
                 className="w-full bg-white text-zinc-950 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
               >
                  {generating ? 'IA en cours...' : 'Rédiger la Newsletter'}
               </button>
            </div>
         </div>

         {/* Visual Editor Area */}
         <div className="lg:col-span-9 space-y-6">
            <div className="bg-white border border-zinc-100 rounded-[3.5rem] shadow-sm overflow-hidden flex flex-col min-h-[800px]">
               <div className="p-8 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex-1 max-w-lg">
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ms-1">{t("Objet de l'e-mail")}</p>
                     <input 
                       type="text" 
                       placeholder={t("Ex: Prêts pour l'été ?") || "Ex: Prêts pour l'été ?"} 
                       className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-3 font-black text-zinc-950 outline-none focus:border-orange-500 transition-colors"
                       value={subject}
                       onChange={(e) => setSubject(e.target.value)}
                     />
                  </div>
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-100">
                     <button onClick={() => setView('desktop')} className={`px-4 py-2.5 rounded flex items-center gap-2 text-[10px] font-black uppercase transition-all ${view === 'desktop' ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'}`}><Monitor className="w-3.5 h-3.5" /> {t("Desktop")}</button>
                     <button onClick={() => setView('mobile')} className={`px-4 py-2.5 rounded flex items-center gap-2 text-[10px] font-black uppercase transition-all ${view === 'mobile' ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'}`}><Smartphone className="w-3.5 h-3.5" /> {t("Mobile")}</button>
                  </div>
               </div>

               <div className="flex-1 bg-zinc-100/50 p-6 md:p-12 overflow-y-auto">
                  <div className={`mx-auto bg-white shadow-2xl transition-all duration-500 ${view === 'desktop' ? 'w-full max-w-2xl' : 'w-80'} min-h-full rounded-2xl overflow-hidden`}>
                     {/* Template Header */}
                     <div className="p-10 border-b border-zinc-50 flex flex-col items-center">
                        <h1 className="text-2xl font-black tracking-tighter rtl:tracking-normal text-zinc-950">{t("OLMA MARKETPLACE")}</h1>
                     </div>

                     {/* Content Blocks */}
                     <div className="p-8 flex flex-wrap gap-6 items-start justify-start min-h-[400px]">
                        {blocks.length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-3xl w-full">
                             <Plus className="w-10 h-10 text-zinc-300 mx-auto mb-4 animate-bounce" />
                             <p className="text-zinc-500 font-black uppercase text-[10px] tracking-widest rtl:tracking-normal">{t("Ajoutez des blocs pour commencer")}</p>
                             <p className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest rtl:tracking-normal mt-1">{t("Utilisez le panneau de gauche")}</p>
                          </div>
                        )}
                        {blocks.map((b) => {
                          
                          return (
                                                  <div 
                                                     key={b.id} 
                                                     className={`relative group border border-transparent hover:border-zinc-100 rounded-[2rem] p-4 transition-all shrink-0 ${getWidthClass(b.width)}`}
                                                  >
                                                     <div className="absolute -start-4 -top-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        <button 
                                                           onClick={() => removeBlock(b.id)} 
                                                           className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-md border border-red-100"
                                                           title={t("Supprimer ce bloc") || "Supprimer ce bloc"}
                                                        >
                                                           <Trash2 className="w-4 h-4" />
                                                        </button>
                                                     </div>
                                                     
                                                     {b.type === 'title' && (
                                                       <div className="space-y-4">
                                                         <input 
                                                           className="w-full text-3xl font-black text-center tracking-tighter rtl:tracking-normal outline-none mb-1 text-zinc-900 placeholder-zinc-300 bg-transparent" 
                                                           value={b.content} 
                                                           placeholder={t("Titre de section...") || "Titre de section..."}
                                                           onChange={(e) => updateBlock(b.id, e.target.value)} 
                                                         />
                                                         <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-50/50 border border-zinc-150 p-2.5 rounded-2xl flex items-center justify-between gap-4">
                                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider rtl:tracking-normal">{t("Largeur")}</span>
                                                            <div className="flex bg-white rounded-lg p-0.5 border border-zinc-200 w-48 shrink-0">
                                                               {[30, 50, 75, 100].map((w) => (
                                                                  <button 
                                                                     key={w}
                                                                     type="button"
                                                                     onClick={() => updateBlockProperty(b.id, 'width', w.toString())}
                                                                     className={`flex-1 py-1 rounded-md font-black text-[9px] uppercase tracking-wider rtl:tracking-normal transition-all ${b.width == w ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                                                  >
                                                                     {w}%
                                                                  </button>
                                                               ))}
                                                            </div>
                                                         </div>
                                                       </div>
                                                     )}
                                                     {b.type === 'text' && (
                                                       <div className="space-y-4">
                                                         <textarea 
                                                           rows={3}
                                                           className="w-full text-zinc-500 text-center leading-relaxed font-semibold outline-none resize-none bg-transparent" 
                                                           value={b.content} 
                                                           placeholder={t("Écrivez le message de votre campagne ici...") || "Écrivez le message de votre campagne ici..."}
                                                           onChange={(e) => updateBlock(b.id, e.target.value)} 
                                                         />
                                                         <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-50/50 border border-zinc-150 p-2.5 rounded-2xl flex items-center justify-between gap-4">
                                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider rtl:tracking-normal">{t("Largeur")}</span>
                                                            <div className="flex bg-white rounded-lg p-0.5 border border-zinc-200 w-48 shrink-0">
                                                               {[30, 50, 75, 100].map((w) => (
                                                                  <button 
                                                                     key={w}
                                                                     type="button"
                                                                     onClick={() => updateBlockProperty(b.id, 'width', w.toString())}
                                                                     className={`flex-1 py-1 rounded-md font-black text-[9px] uppercase tracking-wider rtl:tracking-normal transition-all ${b.width == w ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                                                  >
                                                                     {w}%
                                                                  </button>
                                                               ))}
                                                            </div>
                                                         </div>
                                                       </div>
                                                     )}
                                                     {b.type === 'image' && (
                                                       <div className="space-y-6 text-center">
                                                         {/* Image Preview Window */}
                                                         {b.content ? (
                                                           <div className={`flex ${getJustifyClass(b.align || 'center')} w-full border border-dashed border-transparent hover:border-orange-500/30 p-2 rounded-3xl transition-all relative group/img`}>
                                                              <div className="absolute end-4 top-4 z-10 flex items-center gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/95 px-3 py-2 rounded-xl shadow-lg border border-zinc-200">
                                                                 <button 
                                                                   onClick={() => { setSelectedBlockIdForImage(b.id); setMediaModalOpen(true); }}
                                                                   className="text-[9px] font-black text-orange-600 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1.5 hover:text-orange-700"
                                                                 >
                                                                    <ImageIcon className="w-3.5 h-3.5" /> {t("Changer d'image")}</button>
                                                              </div>
                                                              
                                                              <div className={`w-full flex ${getJustifyClass(b.align || 'center')}`}>
                                                                 {b.linkUrl ? (
                                                                    <a 
                                                                       href={b.linkUrl} 
                                                                       target="_blank" 
                                                                       rel="noopener noreferrer" 
                                                                       className="inline-block hover:opacity-95 transition-opacity" 
                                                                       style={{ width: `${b.width || 100}%` }}
                                                                    >
                                                                       <img loading="lazy" 
                                                                          src={b.content} 
                                                                          alt={t("Newsletter Design Asset") || "Newsletter Design Asset"} 
                                                                          referrerPolicy="no-referrer"
                                                                          className={`${b.rounded || 'rounded-2xl'} border border-zinc-100 shadow-md transition-all duration-300 w-full object-cover`}
                                                                          style={{ aspectRatio: b.aspectRatio === 'auto' ? 'auto' : b.aspectRatio }}
                                                                       />
                                                                    </a>
                                                                 ) : (
                                                                    <div style={{ width: `${b.width || 100}%` }}>
                                                                       <img loading="lazy" 
                                                                          src={b.content} 
                                                                          alt={t("Newsletter Design Asset") || "Newsletter Design Asset"} 
                                                                          referrerPolicy="no-referrer"
                                                                          className={`${b.rounded || 'rounded-2xl'} border border-zinc-100 shadow-md transition-all duration-300 w-full object-cover`}
                                                                          style={{ aspectRatio: b.aspectRatio === 'auto' ? 'auto' : b.aspectRatio }}
                                                                       />
                                                                    </div>
                                                                 )}
                                                              </div>
                                                           </div>
                                                         ) : (
                                                           <div 
                                                              onClick={() => { setSelectedBlockIdForImage(b.id); setMediaModalOpen(true); }}
                                                              className="aspect-video bg-zinc-50 rounded-[2.5rem] flex flex-col items-center justify-center p-8 border-2 border-zinc-200 border-dashed hover:border-orange-500 hover:bg-orange-50/40 transition-all cursor-pointer group/placeholder"
                                                           >
                                                              <div className="w-16 h-16 rounded-2xl bg-white text-zinc-350 group-hover/placeholder:text-orange-500 group-hover/placeholder:scale-110 flex items-center justify-center border border-zinc-250 shadow-sm transition-all duration-300 animate-pulse">
                                                                 <ImageIcon className="w-8 h-8 font-black" />
                                                              </div>
                                                              <p className="text-zinc-700 font-black text-xs uppercase tracking-widest rtl:tracking-normal mt-4">{t("Aucune image configurée")}</p>
                                                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Sélectionner depuis la médiathèque →")}</p>
                                                           </div>
                                                         )}

                                                         {/* Customization Control HUD */}
                                                         <div className="bg-zinc-50/80 border border-zinc-200 p-5 rounded-[2rem] space-y-4 text-start transition-all">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                               {/* Width Controls */}
                                                               <div className="space-y-2">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Largeur dans le Mail (Dim.)")}</label>
                                                                  <div className="flex bg-white rounded-xl p-1 border border-zinc-200">
                                                                     {[30, 50, 75, 100].map((w) => (
                                                                        <button 
                                                                           key={w}
                                                                           type="button"
                                                                           onClick={() => updateBlockProperty(b.id, 'width', w.toString())}
                                                                           className={`flex-1 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider rtl:tracking-normal transition-all ${b.width == w ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                                                        >
                                                                           {w}%
                                                                        </button>
                                                                     ))}
                                                                  </div>
                                                               </div>

                                                               {/* Alignment Controls */}
                                                               <div className="space-y-2">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Alignement de l'Image")}</label>
                                                                  <div className="flex bg-white rounded-xl p-1 border border-zinc-200">
                                                                     {[
                                                                        { align: 'left', icon: AlignLeft, label: 'Gauche' },
                                                                        { align: 'center', icon: AlignCenter, label: 'Centré' },
                                                                        { align: 'right', icon: AlignRight, label: 'Droite' }
                                                                     ].map((item) => (
                                                                        <button 
                                                                           key={item.align}
                                                                           type="button"
                                                                           onClick={() => updateBlockProperty(b.id, 'align', item.align)}
                                                                           className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${b.align === item.align ? 'bg-zinc-950 text-white' : 'text-zinc-400 hover:text-zinc-700'}`}
                                                                           title={item.label}
                                                                        >
                                                                           <item.icon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                     ))}
                                                                  </div>
                                                               </div>
                                                            </div>

                                                            <div className="grid md:grid-cols-2 gap-4">
                                                               {/* Aspect Ratio Sizer */}
                                                               <div className="space-y-1.5">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Format & Proportion (Ratios)")}</label>
                                                                  <select 
                                                                     value={b.aspectRatio || 'auto'}
                                                                     onChange={(e) => updateBlockProperty(b.id, 'aspectRatio', e.target.value)}
                                                                     className="w-full px-3 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl outline-none font-black text-[9px] uppercase tracking-widest rtl:tracking-normal cursor-pointer"
                                                                  >
                                                                     <option value="auto">{t("Proportion d'Origine")}</option>
                                                                     <option value="1/1">{t("Carré (1:1)")}</option>
                                                                     <option value="16/9">{t("Paysage (16:9)")}</option>
                                                                     <option value="3/1">{t("Bannière Fine (3:1)")}</option>
                                                                  </select>
                                                               </div>

                                                               {/* Borders Rounding */}
                                                               <div className="space-y-1.5">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Arrondi d'angles")}</label>
                                                                  <select 
                                                                     value={b.rounded || 'rounded-2xl'}
                                                                     onChange={(e) => updateBlockProperty(b.id, 'rounded', e.target.value)}
                                                                     className="w-full px-3 py-2 bg-white border border-zinc-200 text-zinc-800 rounded-xl outline-none font-black text-[9px] uppercase tracking-widest rtl:tracking-normal cursor-pointer"
                                                                  >
                                                                     <option value="rounded-none">{t("Carré (0px)")}</option>
                                                                     <option value="rounded-lg">{t("Léger (rounded-lg)")}</option>
                                                                     <option value="rounded-2xl">{t("Moyen (rounded-2xl)")}</option>
                                                                     <option value="rounded-[2rem]">{t("Prononcé (32px)")}</option>
                                                                  </select>
                                                               </div>
                                                            </div>

                                                            {/* Hyperlink Destination URL */}
                                                            <div className="space-y-1.5 pt-1">
                                                               <div className="flex items-center justify-between">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Url de redirection au clic (Lien)")}</label>
                                                                  <span className="text-[8px] font-black text-zinc-300 uppercase tracking-wider rtl:tracking-normal font-mono">{t("Rend l'image liquide")}</span>
                                                               </div>
                                                               <div className="flex gap-2">
                                                                  <div className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 flex items-center gap-2">
                                                                     <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                                     <input 
                                                                        type="text" 
                                                                        placeholder="Lien click-through, ex: /products/ID_PRODUIT ou https://olma.dz/solde"
                                                                        className="w-full bg-transparent outline-none text-xs font-semibold text-zinc-800"
                                                                        value={b.linkUrl || ''}
                                                                        onChange={(e) => updateBlockProperty(b.id, 'linkUrl', e.target.value)}
                                                                     />
                                                                  </div>
                                                                  <button 
                                                                     type="button"
                                                                     onClick={() => { setSelectedBlockIdForImage(b.id); setMediaModalOpen(true); }}
                                                                     className="px-4 bg-white border border-zinc-200 hover:border-orange-500 hover:bg-orange-50/50 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[9.5px] font-black uppercase tracking-wider rtl:tracking-normal text-zinc-650 hover:text-orange-700"
                                                                  >
                                                                     <FolderOpen className="w-4 h-4 text-orange-500 shrink-0" /> {t("Médias")}</button>
                                                               </div>
                                                            </div>
                                                         </div>
                                                       </div>
                                                     )}
                                                     {b.type === 'product' && (
                                                       <div className="space-y-6 text-center">
                                                         {b.productImage ? (
                                                           <div className="bg-white border border-zinc-100 rounded-3xl p-4 transition-all hover:shadow-md max-w-sm mx-auto">
                                                              <div className="aspect-square bg-zinc-50 rounded-2xl overflow-hidden relative border border-zinc-100 mb-4 group/img">
                                                                 <div className="absolute end-3 top-3 z-10 opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/95 px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200">
                                                                    <button 
                                                                      type="button"
                                                                      onClick={() => { setSelectedBlockIdForProduct(b.id); setMediaTab('product_catalog'); setMediaModalOpen(true); }}
                                                                      className="text-[9px] font-black text-orange-600 uppercase tracking-widest rtl:tracking-normal flex items-center gap-1 hover:text-orange-700"
                                                                    >
                                                                       <ShoppingBag className="w-3.5 h-3.5" /> {t("Changer")}</button>
                                                                 </div>
                                                                 <img loading="lazy" 
                                                                    src={b.productImage} 
                                                                    alt={b.productName} 
                                                                    referrerPolicy="no-referrer"
                                                                    className="w-full h-full object-cover" 
                                                                 />
                                                                 {b.productCategory && (
                                                                    <span className="absolute top-3 start-3 bg-zinc-950 text-white text-[8px] font-black uppercase tracking-wider rtl:tracking-normal px-2 py-1 rounded">
                                                                       {b.productCategory}
                                                                    </span>
                                                                 )}
                                                              </div>
                                                              <h4 className="text-zinc-950 text-sm font-black tracking-tight rtl:tracking-normal line-clamp-2 text-start">{b.productName}</h4>
                                                              <div className="mt-2 flex items-center justify-between">
                                                                 <span className="text-xs font-mono font-black text-orange-600">{formatPrice(b.productPrice)}</span>
                                                                 <span className="text-[9px] font-black uppercase text-zinc-400">{t("Olma.dz")}</span>
                                                              </div>
                                                              
                                                              {/* Click Redirect Link indicator */}
                                                              {b.linkUrl && (
                                                                 <div className="mt-3 pt-3 border-t border-zinc-50 flex items-center gap-2 text-[9px] font-mono text-zinc-400">
                                                                    <Link2 className="w-3.5 h-3.5 text-zinc-300 pointer-events-none" />
                                                                    <span className="truncate max-w-xs">{b.linkUrl}</span>
                                                                 </div>
                                                              )}
                                                           </div>
                                                         ) : (
                                                           <div 
                                                              onClick={() => { setSelectedBlockIdForProduct(b.id); setMediaTab('product_catalog'); setMediaModalOpen(true); }}
                                                              className="aspect-square max-w-xs mx-auto bg-zinc-50 rounded-[2.5rem] flex flex-col items-center justify-center p-8 border-2 border-zinc-200 border-dashed hover:border-orange-500 hover:bg-orange-50/40 transition-all cursor-pointer group/placeholder animate-pulse"
                                                           >
                                                              <div className="w-16 h-16 rounded-2xl bg-white text-zinc-350 group-hover/placeholder:text-orange-500 group-hover/placeholder:scale-110 flex items-center justify-center border border-zinc-250 shadow-sm transition-all duration-300">
                                                                 <ShoppingBag className="w-8 h-8 font-black" />
                                                              </div>
                                                              <p className="text-zinc-700 font-black text-xs uppercase tracking-widest rtl:tracking-normal mt-4">{t("Aucun produit configuré")}</p>
                                                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Sélectionner depuis le catalogue d'Olma →")}</p>
                                                           </div>
                                                         )}

                                                         {/* HUD for Product Customization */}
                                                         <div className="bg-zinc-50/80 border border-zinc-200 p-5 rounded-[2rem] space-y-4 text-start transition-all">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                               <div className="space-y-2">
                                                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Largeur du Produit (Dim.)")}</label>
                                                                  <div className="flex bg-white rounded-xl p-1 border border-zinc-200">
                                                                     {[30, 50, 75, 100].map((w) => (
                                                                        <button 
                                                                           key={w}
                                                                           type="button"
                                                                           onClick={() => updateBlockProperty(b.id, 'width', w.toString())}
                                                                           className={`flex-1 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider rtl:tracking-normal transition-all ${b.width == w ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                                                        >
                                                                           {w}%
                                                                        </button>
                                                                     ))}
                                                                  </div>
                                                               </div>
                                                               <div className="space-y-2 flex flex-col justify-end">
                                                                  <button 
                                                                     type="button"
                                                                     onClick={() => { setSelectedBlockIdForProduct(b.id); setMediaTab('product_catalog'); setMediaModalOpen(true); }}
                                                                     className="w-full py-3 bg-white border border-zinc-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl flex items-center justify-center gap-1.5 transition-all text-[9.5px] font-black uppercase tracking-wider rtl:tracking-normal text-zinc-650 hover:text-orange-700"
                                                                  >
                                                                     <FolderOpen className="w-4 h-4 text-orange-500 shrink-0" /> {t("Changer de Produit")}</button>
                                                               </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                               <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Lien hypertexte personnalisé (optionnel)")}</label>
                                                               <div className="bg-white border border-zinc-200 rounded-xl px-4 py-2 flex items-center gap-2">
                                                                  <Link2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                                  <input 
                                                                     type="text" 
                                                                     placeholder={t("Ex: /products/ID_PRODUIT") || "Ex: /products/ID_PRODUIT"}
                                                                     className="w-full bg-transparent outline-none text-xs font-semibold text-zinc-800"
                                                                     value={b.linkUrl || ''}
                                                                     onChange={(e) => updateBlockProperty(b.id, 'linkUrl', e.target.value)}
                                                                  />
                                                               </div>
                                                            </div>
                                                         </div>
                                                       </div>
                                                     )}
                                                  </div>
                                                );
                        })}
                     </div>

                     {/* Template Footer */}
                     <div className="p-10 bg-zinc-50 border-t border-zinc-100 text-center">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-relaxed">
                           {t("© 2026 Olma Marketplace Algérie.")}<br />
                           {t("Vous recevez ce mail car vous êtes inscrit sur Olma.")}</p>
                        <button className="mt-6 text-[8px] font-extrabold text-zinc-300 uppercase tracking-widest rtl:tracking-normal underline underline-offset-4">{t("Se désabonner")}</button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Media Selector & Library Pop-up Dialog Modal */}
      <AnimatePresence>
         {mediaModalOpen && (
            <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center p-4 md:p-6 z-[9999] overflow-y-auto">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-[3rem] border border-zinc-100 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
               >
                  {/* Modal Header */}
                  <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                     <div>
                        <h3 className="text-xl font-black text-zinc-950 flex items-center gap-2.5">
                           <FolderOpen className="w-6 h-6 text-orange-500" />
                           {t("Médiathèque de la Plateforme Olma")}</h3>
                        <p className="text-zinc-500 text-xs font-semibold mt-1">{t("Sélectionnez ou liez n'importe quelle image pour l'intégrer.")}</p>
                     </div>
                     <button 
                        onClick={() => { setMediaModalOpen(false); setSelectedBlockIdForImage(null); }}
                        className="p-3 bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-full hover:bg-zinc-250 transition-all"
                     >
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Search Bar HUD */}
                  <div className="p-6 bg-white border-b border-zinc-50 flex flex-col md:flex-row gap-4 items-center">
                     <div className="flex-1 bg-zinc-100 border border-zinc-200/60 rounded-xl px-4 py-3.5 flex items-center gap-3 w-full">
                        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input 
                           type="text" 
                           placeholder={t("Rechercher des produits ou des bannières...") || "Rechercher des produits ou des bannières..."}
                           className="w-full bg-transparent outline-none text-xs font-semibold text-zinc-800"
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                           <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-zinc-655"><X className="w-4 h-4" /></button>
                        )}
                     </div>

                     {/* Media Tabs Selection */}
                     <div className="flex bg-zinc-100 p-1 rounded-xl self-stretch md:self-auto shrink-0">
                        <button 
                           onClick={() => setMediaTab('product_catalog')}
                           className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider rtl:tracking-normal transition-all flex items-center gap-1.5 ${mediaTab === 'product_catalog' ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-950'}`}
                        >
                           <ShoppingBag className="w-4 h-4" /> {t("Produits du Catalogue")}</button>
                        <button 
                           onClick={() => setMediaTab('stock_banners')}
                           className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider rtl:tracking-normal transition-all flex items-center gap-1.5 ${mediaTab === 'stock_banners' ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-950'}`}
                        >
                           <ImageIcon className="w-4 h-4" /> {t("Bannières Marketing")}</button>
                        <button 
                           onClick={() => setMediaTab('custom_url')}
                           className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider rtl:tracking-normal transition-all flex items-center gap-1.5 ${mediaTab === 'custom_url' ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-950'}`}
                        >
                           <Link2 className="w-4 h-4" /> {t("Entrer un URL")}</button>
                        <button 
                           onClick={() => setMediaTab('file_upload')}
                           className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider rtl:tracking-normal transition-all flex items-center gap-1.5 ${mediaTab === 'file_upload' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100'}`}
                        >
                           <Upload className="w-4 h-4" /> {t("Téléverser (Device)")}</button>
                     </div>
                  </div>

                  {/* Modal Body Container */}
                  <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
                     {mediaTab === 'product_catalog' && (
                        <div>
                           {productsLoading ? (
                              <div className="py-20 text-center text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-xs space-y-3 animate-pulse">
                                 <Loader2 className="w-10 h-10 mx-auto text-orange-500 animate-spin" />
                                 <span>{t("Chargement des produits de la startup...")}</span>
                              </div>
                           ) : productsList.length === 0 ? (
                              <div className="py-20 text-center border-2 border-dashed border-zinc-200 rounded-[2.5rem] bg-white space-y-4">
                                 <ShoppingBag className="w-12 h-12 text-zinc-200 mx-auto animate-bounce" />
                                 <p className="text-zinc-500 font-black text-xs uppercase tracking-widest rtl:tracking-normal">{t("Aucun produit actif détecté")}</p>
                                 <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest rtl:tracking-normal">{t("Les vendeurs n'ont pas encore mis d'image en ligne.")}</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                 {productsList
                                    .filter(p => {
                                       if (!searchQuery) return true;
                                       const name = (p.name || '').toLowerCase();
                                       const cat = (p.category || '').toLowerCase();
                                       const filterLow = searchQuery.toLowerCase();
                                       return name.includes(filterLow) || cat.includes(filterLow);
                                    })
                                    .map((prod) => {
                                        
                                       const mainImage = prod.image || (prod.images && prod.images[0]);
                                       if (!mainImage) return null;
                                       
                                       return (
                                          <div 
                                             key={prod.id} 
                                             onClick={() => {
                                                if (selectedBlockIdForProduct) {
                                                   handleSelectProduct(prod);
                                                } else {
                                                   handleSelectImage(mainImage);
                                                }
                                             }}
                                             className="bg-white rounded-3xl border border-zinc-200 hover:border-orange-500 hover:shadow-xl p-3 transition-all cursor-pointer group"
                                          >
                                             <div className="aspect-square rounded-2xl bg-zinc-100 overflow-hidden relative border border-zinc-100">
                                                <img loading="lazy" 
                                                   src={mainImage} 
                                                   alt={prod.name} 
                                                   referrerPolicy="no-referrer"
                                                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <span className="absolute top-2 start-2 bg-zinc-900/80 text-white text-[8px] font-black uppercase tracking-wider rtl:tracking-normal px-2 py-1 rounded">
                                                   {prod.category}
                                                </span>
                                             </div>
                                             <div className="mt-3 space-y-1">
                                                <h4 className="text-zinc-950 text-xs font-black tracking-tight rtl:tracking-normal line-clamp-1 group-hover:text-orange-600 transition-colors">{prod.name}</h4>
                                                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 font-black">
                                                   <span>{formatPrice(prod.price)}</span>
                                                   <span className="text-[8px] uppercase font-sans font-extrabold bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded-full">{t("Sélectionner")}</span>
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    })
                                 }
                              </div>
                           )}
                        </div>
                     )}

                     {mediaTab === 'stock_banners' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {ALGERIA_STOCK_BANNERS
                              .filter(b => {
                                 if (!searchQuery) return true;
                                 const title = b.title.toLowerCase();
                                 const cat = b.category.toLowerCase();
                                 const searchLow = searchQuery.toLowerCase();
                                 return title.includes(searchLow) || cat.includes(searchLow);
                              })
                              .map((banner) => {
                                
                                return (
                                                               <div 
                                                                  key={banner.id}
                                                                  onClick={() => handleSelectImage(banner.url)}
                                                                  className="bg-white rounded-3xl border border-zinc-200 hover:border-orange-500 overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col"
                                                               >
                                                                  <div className="aspect-video bg-zinc-100 overflow-hidden relative">
                                                                     <img loading="lazy" 
                                                                        src={banner.url} 
                                                                        alt={banner.title} 
                                                                        referrerPolicy="no-referrer"
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                     />
                                                                     <span className="absolute top-3 start-3 bg-orange-600 text-white text-[8px] font-black uppercase tracking-widest rtl:tracking-normal px-2.5 py-1 rounded-full shadow-md">
                                                                        {banner.category}
                                                                     </span>
                                                                  </div>
                                                                  <div className="p-4 flex items-center justify-between bg-zinc-50/40">
                                                                     <div>
                                                                        <h4 className="text-zinc-950 text-xs font-black tracking-tight rtl:tracking-normal">{banner.title}</h4>
                                                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-wider rtl:tracking-normal mt-1">{t("Haute Définition (HD)")}</p>
                                                                     </div>
                                                                     <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100 group-hover:bg-orange-600 group-hover:text-white transition-all shrink-0">
                                                                        {t("Choisir")}</span>
                                                                  </div>
                                                               </div>
                                                            );
                              })
                           }
                        </div>
                     )}

                     {mediaTab === 'custom_url' && (
                        <div className="max-w-xl mx-auto bg-white border border-zinc-205 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
                           <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-500">
                              <Link2 className="w-6 h-6" />
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wider rtl:tracking-normal">{t("Importer depuis un lien direct")}</h4>
                              <p className="text-zinc-400 text-xs font-semibold">{t("Collez l'adresse URL de n'importe quel hébergeur d'images (Imgur, Cloudinary, etc.)")}</p>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block font-mono">{t("Lien Web de l'Image (URL)")}</label>
                              <input 
                                 type="url"
                                 required
                                 className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none font-bold text-xs"
                                 placeholder="https://example.com/image.jpg"
                                 value={customImageUrl}
                                 onChange={(e) => setCustomImageUrl(e.target.value)}
                              />
                           </div>
                           <button 
                              onClick={() => {
                                 if (customImageUrl.trim()) {
                                    handleSelectImage(customImageUrl.trim());
                                    setCustomImageUrl('');
                                 }
                              }}
                              disabled={!customImageUrl.trim()}
                              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest rtl:tracking-normal rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/10"
                           >
                              {t("Valider et appliquer l'image")}</button>
                        </div>
                     )}

                     {mediaTab === 'file_upload' && (
                        <div className="max-w-xl mx-auto bg-white border border-zinc-205 p-8 rounded-[2.5rem] space-y-6 shadow-sm text-center">
                           <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-[1.5rem] flex items-center justify-center text-orange-500 mx-auto mb-4">
                              <Upload className="w-8 h-8" />
                           </div>
                           <div className="space-y-2">
                              <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wider rtl:tracking-normal">{t("Téléverser une image de votre appareil")}</h4>
                              <p className="text-zinc-400 text-xs font-semibold">{t("Formats supportés : JPG, PNG, WEBP, GIF (Max 5MB)")}</p>
                           </div>
                           
                           <label className={`block w-full py-5 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-orange-500 hover:bg-orange-50/50 cursor-pointer transition-all ${isUploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                              <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/jpeg, image/png, image/webp, image/gif"
                                 onChange={handleFileUpload}
                                 disabled={isUploadingImage}
                              />
                              <div className="flex flex-col items-center gap-3">
                                 {isUploadingImage ? (
                                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                                 ) : (
                                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                                 )}
                                 <span className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                                    {isUploadingImage ? 'Téléchargement...' : 'Cliquer pour sélectionner'}
                                 </span>
                              </div>
                           </label>
                        </div>
                     )}
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Realistic Compiled Preview Modal */}
      <AnimatePresence>
         {previewOpen && (
            <div className="fixed inset-0 bg-zinc-950/70 flex items-center justify-center p-4 md:p-8 z-[10000]">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-zinc-100 rounded-[3rem] border border-zinc-200/50 shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
               >
                  {/* Preview Header */}
                  <div className="p-6 bg-white border-b border-zinc-200/60 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                           <Eye className="w-5 h-5" />
                        </div>
                        <div className="text-start">
                           <h3 className="text-base font-black text-zinc-950">{t("Aperçu Réaliste de la Newsletter")}</h3>
                           <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">{t("Rendu final de l'e-mail.")}</p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                        {/* View device toggle */}
                        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                           <button 
                              type="button"
                              onClick={() => setView('desktop')} 
                              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase transition-all ${view === 'desktop' ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'}`}
                           >
                              <Monitor className="w-3.5 h-3.5" /> {t("Desktop")}</button>
                           <button 
                              type="button"
                              onClick={() => setView('mobile')} 
                              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase transition-all ${view === 'mobile' ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-700'}`}
                           >
                              <Smartphone className="w-3.5 h-3.5" /> {t("Mobile")}</button>
                        </div>
                        
                        <button 
                           type="button"
                           onClick={() => setPreviewOpen(false)}
                           className="p-2.5 bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-full transition-colors"
                        >
                           <X className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                  
                  {/* Preview Body Canvas */}
                  <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-zinc-200/50">
                     <div className={`bg-white shadow-xl transition-all duration-500 ${view === 'desktop' ? 'w-full max-w-2xl' : 'w-80'} rounded-2xl overflow-hidden self-start text-center`}>
                        {/* Email envelope headers mockup */}
                        <div className="bg-zinc-50/80 px-8 py-5 border-b border-zinc-100 text-start">
                           <div className="grid grid-cols-[80px_1fr] gap-2 text-xs font-semibold text-zinc-500">
                              <span>{t("De :")}</span>
                              <span className="text-zinc-800 font-bold">{t("Olma Marketplace &lt;newsletter@olma.dz&gt;")}</span>
                              <span>{t("Objet :")}</span>
                              <span className="text-zinc-950 font-black">{subject || "(Aucun objet configuré)"}</span>
                           </div>
                        </div>
                        
                        <div className="p-10 border-b border-zinc-50 flex flex-col items-center">
                           <h1 className="text-2xl font-black tracking-tighter rtl:tracking-normal text-zinc-950">{t("OLMA MARKETPLACE")}</h1>
                        </div>
                        
                        {/* Newsletter content blocks compiled accurately with exact flex wrapping */}
                        <div className="p-8 flex flex-wrap gap-6 items-start justify-start min-h-[200px]">
                           {blocks.length === 0 ? (
                             <p className="text-zinc-400 text-xs italic font-semibold text-center py-12 w-full">{t("Aucun contenu à afficher.")}</p>
                           ) : (
                             blocks.map((b) => {
                               
                               return (
                                                             <div 
                                                                key={b.id} 
                                                                className={`shrink-0 ${getWidthClass(b.width)}`}
                                                             >
                                                                {b.type === 'title' && (
                                                                   <h2 className="text-3xl font-black text-center tracking-tighter rtl:tracking-normal text-zinc-900 my-4">{b.content}</h2>
                                                                )}
                                                                {b.type === 'text' && (
                                                                   <p className="text-zinc-650 text-center leading-relaxed font-semibold whitespace-pre-wrap">{b.content}</p>
                                                                )}
                                                                {b.type === 'image' && b.content && (
                                                                   <div className={`w-full flex ${getJustifyClass(b.align || 'center')}`}>
                                                                      {b.linkUrl ? (
                                                                         <a 
                                                                            href={b.linkUrl} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="inline-block hover:opacity-95 transition-opacity" 
                                                                            style={{ width: `${b.width || 100}%` }}
                                                                         >
                                                                            <img loading="lazy" 
                                                                               src={b.content} 
                                                                               alt={t("Newsletter Design Asset") || "Newsletter Design Asset"} 
                                                                               referrerPolicy="no-referrer"
                                                                               className={`${b.rounded || 'rounded-2xl'} border border-zinc-100 shadow-md w-full object-cover`}
                                                                               style={{ aspectRatio: b.aspectRatio === 'auto' ? 'auto' : b.aspectRatio }}
                                                                            />
                                                                         </a>
                                                                      ) : (
                                                                         <div style={{ width: `${b.width || 100}%` }}>
                                                                            <img loading="lazy" 
                                                                               src={b.content} 
                                                                               alt={t("Newsletter Design Asset") || "Newsletter Design Asset"} 
                                                                               referrerPolicy="no-referrer"
                                                                               className={`${b.rounded || 'rounded-2xl'} border border-zinc-100 shadow-md w-full object-cover`}
                                                                               style={{ aspectRatio: b.aspectRatio === 'auto' ? 'auto' : b.aspectRatio }}
                                                                            />
                                                                         </div>
                                                                      )}
                                                                   </div>
                                                                )}
                                                                {b.type === 'product' && b.productImage && (
                                                                   <div className="bg-white border border-zinc-100 rounded-3xl p-4 shadow-sm hover:shadow-md max-w-sm mx-auto text-start">
                                                                      <div className="aspect-square bg-zinc-50 rounded-2xl overflow-hidden relative border border-zinc-100 mb-4 animate-opacity">
                                                                         <img loading="lazy" 
                                                                            src={b.productImage} 
                                                                            alt={b.productName} 
                                                                            referrerPolicy="no-referrer"
                                                                            className="w-full h-full object-cover" 
                                                                         />
                                                                         {b.productCategory && (
                                                                            <span className="absolute top-2.5 start-2.5 bg-zinc-950 text-white text-[8px] font-black uppercase tracking-wider rtl:tracking-normal px-2 py-1 rounded">
                                                                               {b.productCategory}
                                                                            </span>
                                                                         )}
                                                                      </div>
                                                                      <h4 className="text-zinc-950 text-xs font-black tracking-tight rtl:tracking-normal line-clamp-2">{b.productName}</h4>
                                                                      <div className="mt-2.5 flex items-center justify-between">
                                                                         <span className="text-xs font-mono font-black text-orange-600">{formatPrice(b.productPrice)}</span>
                                                                         <span className="text-[9px] font-black text-white bg-orange-600 px-3.5 py-1.5 rounded-xl uppercase tracking-wider rtl:tracking-normal transition-all hover:bg-orange-700 shadow-md shadow-orange-500/10 cursor-pointer">{t("Acheter")}</span>
                                                                      </div>
                                                                   </div>
                                                                )}
                                                             </div>
                                                          );
                             })
                           )}
                        </div>
                        
                        <div className="p-10 bg-zinc-50 border-t border-zinc-100 text-center">
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-relaxed">
                              {t("© 2026 Olma Marketplace Algérie.")}<br />
                              {t("Vous recevez ce mail car vous êtes inscrit sur Olma.")}</p>
                           <button className="mt-6 text-[8px] font-extrabold text-zinc-300 uppercase tracking-widest rtl:tracking-normal underline underline-offset-4">{t("Se désabonner")}</button>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};
