import React, { useState, useEffect } from 'react';
import { useMegaMenu, FeaturedProduct } from '../../context/MegaMenuContext';
import { useShop } from '../../context/ShopContext';
import { Save, Image as ImageIcon, Link as LinkIcon, Grip, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../../types';
import { useTranslation } from "react-i18next";

export const MegaMenuSettings: React.FC = () => {
    const { t } = useTranslation();
  const { categoriesData, updateLinkFeaturedProduct } = useMegaMenu();
  const { fetchProductsByIds } = useShop();
  
  const [editingCategory, setEditingCategory] = useState<string | null>(categoriesData[0]?.id || null);
  const [editingSection, setEditingSection] = useState<string | null>(categoriesData[0]?.sections[0]?.name || null);
  const [editingLink, setEditingLink] = useState<string | null>(categoriesData[0]?.sections[0]?.links[0]?.name || null);

  const currentCategory = categoriesData.find(cat => cat.id === editingCategory);
  const currentSection = currentCategory?.sections.find(sec => sec.name === editingSection);
  const currentLink = currentSection?.links.find(link => link.name === editingLink);
  
  const [productUrl, setProductUrl] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Mettre à jour le formulaire quand on change de lien
  useEffect(() => {
    if (currentLink && currentLink.featuredProduct) {
      setProductUrl(`/product/${currentLink.featuredProduct.productId}`);
    } else {
      setProductUrl('');
    }
  }, [currentLink]);

  const extractProductId = (url: string) => {
    const match = url.match(/\/product\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const selectedProductId = extractProductId(productUrl);

  useEffect(() => {
    if (selectedProductId) {
       fetchProductsByIds([selectedProductId]).then(prods => {
          setSelectedProduct(prods[0] || null);
       });
    } else {
       setSelectedProduct(null);
    }
  }, [selectedProductId, fetchProductsByIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCategory && currentSection && currentLink) {
      if (!selectedProductId) {
         updateLinkFeaturedProduct(currentCategory.id, currentSection.name, currentLink.name, undefined);
         toast.success('Produit lié retiré');
         return;
      }
      
      const product: FeaturedProduct = {
        productId: selectedProductId
      };
      updateLinkFeaturedProduct(currentCategory.id, currentSection.name, currentLink.name, product);
      toast.success('Produit mis en avant mis à jour');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-zinc-900 tracking-tighter rtl:tracking-normal uppercase">{t("Mega Menu")}</h1>
        <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-1">
          {t("Gérer les produits mis en avant pour chaque sous-catégorie")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal px-3 mb-2">{t("1. Catégorie")}</h2>
            <div className="flex flex-col gap-1">
              {categoriesData.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setEditingCategory(cat.id);
                    const firstSec = cat.sections[0];
                    setEditingSection(firstSec?.name || null);
                    setEditingLink(firstSec?.links[0]?.name || null);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                    editingCategory === cat.id 
                      ? 'bg-zinc-950 text-white shadow-md' 
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent hover:border-zinc-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {currentCategory && (
            <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal px-3 mb-2">{t("2. Section")}</h2>
              <div className="flex flex-col gap-1">
                {currentCategory.sections.map(sec => (
                  <button
                    key={sec.name}
                    onClick={() => {
                      setEditingSection(sec.name);
                      setEditingLink(sec.links[0]?.name || null);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                      editingSection === sec.name 
                        ? 'bg-orange-500 text-white shadow-md' 
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent hover:border-zinc-100'
                    }`}
                  >
                    {sec.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentSection && (
            <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal px-3 mb-2">{t("3. Sous-catégorie")}</h2>
              <div className="flex flex-col gap-1">
                {currentSection.links.map(link => (
                  <button
                    key={link.name}
                    onClick={() => setEditingLink(link.name)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                      editingLink === link.name 
                        ? 'bg-zinc-200 text-zinc-900 shadow-sm' 
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent hover:border-zinc-100'
                    }`}
                  >
                    <ChevronRight className="w-3 h-3 opacity-50" />
                    {link.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulaire d'édition */}
        <div className="lg:col-span-3">
          {currentLink ? (
            <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm sticky top-24">
              <div className="mb-8 border-b border-zinc-100 pb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-zinc-900">{t("Produit lié")}</h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    {t("Modifiez le produit affiché au survol de")}<span className="font-bold text-zinc-900">« {currentLink.name} »</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-widest rtl:tracking-normal uppercase text-zinc-500 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      {t("Lien du produit (URL)")}</label>
                    <input
                      type="text"
                      value={productUrl}
                      onChange={e => setProductUrl(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-zinc-900 focus:border-zinc-400 transition-colors"
                      placeholder={t("Ex: /product/123 ou 123") || "Ex: /product/123 ou 123"}
                    />
                    <p className="text-[10px] uppercase font-bold text-zinc-400 mt-2">{t("Copiez et collez le lien du produit de la boutique.")}</p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-black uppercase tracking-widest rtl:tracking-normal text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                  >
                    <Save className="w-4 h-4" />
                    {t("Enregistrer les modifications")}</button>
                </form>

                {/* Prévisualisation */}
                <div className="flex flex-col h-full ps-0 md:ps-12 md:border-l border-zinc-100">
                  <h3 className="text-xs font-bold tracking-widest rtl:tracking-normal text-zinc-400 mb-4 uppercase">{t("Prévisualisation")}</h3>
                  <div className="group flex flex-col pointer-events-none relative rounded-[1.5rem] overflow-hidden w-[240px] aspect-[4/5] bg-zinc-200/80 shadow-md">
                     {selectedProduct ? (
                       <>
                         <img loading="lazy" 
                           src={selectedProduct.images?.[0] || selectedProduct.image} 
                           alt={selectedProduct.name}
                           className="w-full h-full object-cover mix-blend-multiply" 
                         />
                         <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-transparent opacity-100" />
                         
                         <div className="absolute top-4 end-4">
                            <div className="p-2.5 rounded-xl bg-white/20 text-white border border-white/20">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </div>
                         </div>

                         <div className="absolute bottom-6 start-5 end-5 flex flex-col">
                            <h4 className="text-[17px] font-black text-white leading-tight mb-3 tracking-tighter rtl:tracking-normal">{selectedProduct.name}</h4>
                            <div className="flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-lg font-black text-white tracking-tighter rtl:tracking-normal leading-none">{selectedProduct.price.toLocaleString('fr-DZ')}</span>
                                 <span className="text-xs font-bold text-white uppercase tracking-widest rtl:tracking-normal mt-1">{t("DA")}</span>
                               </div>
                               <div className="px-4 py-2.5 bg-white text-zinc-950 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal">
                                  {t("Découvrir")}</div>
                            </div>
                         </div>
                       </>
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                          <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal text-center px-4">{t("Aucun produit configuré ou introuvable")}</span>
                       </div>
                     )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
             <div className="bg-white p-12 rounded-3xl border border-zinc-100 shadow-sm text-center">
                <p className="text-zinc-500 font-medium">{t("Sélectionnez une sous-catégorie pour éditer son produit mis en avant.")}</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};
