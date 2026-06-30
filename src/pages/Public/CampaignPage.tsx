import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { ProductCard } from "../../components/Product/ProductCard";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePageMetadata } from "../../hooks/usePageMetadata";

export const CampaignPage: React.FC = () => {
  const { bannerId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [banner, setBanner] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getTranslatedValue = (bannerData: any, key: string) => {
    // Check nested translation object
    if (bannerData?.translations?.[i18n.language]?.[key]) {
      return bannerData.translations[i18n.language][key];
    }
    // Check flat localized suffix keys (e.g., banner.title_ar, title_fr)
    const flatKey = `${key}_${i18n.language}`;
    if (bannerData?.[flatKey]) {
      return bannerData[flatKey];
    }
    // Fallback
    return bannerData?.[key] || '';
  };

  const pageTitle = banner ? getTranslatedValue(banner, 'title') : "";
  const pageSubtitle = banner ? getTranslatedValue(banner, 'subtitle') : "";

  const seoHelmet = usePageMetadata({
    title: pageTitle || t("Sélection Spéciale"),
    description: pageSubtitle || t("Découvrez notre sélection spéciale de produits"),
  });

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!bannerId) return;
      try {
        const bannerDoc = await getDoc(doc(db, "banners", bannerId));
        if (bannerDoc.exists()) {
          const bannerData = bannerDoc.data();
          setBanner(bannerData);
          
          if (bannerData.linkedProductIds && bannerData.linkedProductIds.length > 0) {
            // Fetch products individually to maintain possible manual order or just fetch all
            // Using Promise.all for simple fetch
            const productPromises = bannerData.linkedProductIds.map((pid: string) => getDoc(doc(db, "products", pid)));
            const productDocs = await Promise.all(productPromises);
            
            const fetchedProducts = productDocs
              .filter(d => d.exists())
              .map(d => ({ id: d.id, ...d.data() }));
              
            setProducts(fetchedProducts);
          }
        }
      } catch (error) {
        console.error("Error fetching campaign data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaignData();
  }, [bannerId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF9EC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF5C00]" />
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF9EC] px-4">
        <h1 className="text-2xl font-kinder text-[#3C2B22] mb-4 text-center">{t("Campagne introuvable")}</h1>
        <button 
          onClick={() => navigate('/shop')}
          className="px-6 py-3 bg-[#FF5C00] text-white rounded-xl font-bold hover:bg-[#c44e03] transition-colors"
        >
          {t("Retourner à la boutique")}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF9EC] pb-24 font-sans selection:bg-[#FF5C00]/30">
      {seoHelmet}

      {/* Campaign Header / Hero */}
      <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden bg-zinc-900 border-b border-[#FF5C00]">
        <img loading="lazy" 
          src={banner.imageUrl || banner.desktopImage} 
          alt={pageTitle}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3C2B22]/90 via-[#3C2B22]/50 to-transparent flex flex-col justify-end p-6 sm:p-12 md:p-16">
          <div className="max-w-[1600px] mx-auto w-full relative">
            <button 
              onClick={() => navigate(-1)}
              className="absolute -top-16 left-0 text-white/80 hover:text-white flex items-center gap-2 text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> {t("Retour")}</button>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-kinder text-white mb-3 md:mb-4 tracking-tight rtl:tracking-normal drop-shadow-md">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="text-white/90 text-sm md:text-xl font-medium max-w-2xl drop-shadow-sm">
                {pageSubtitle}
              </p>
            )}
            <div className="w-16 h-1.5 bg-[#FF5C00] mt-6 md:mt-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-16">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#FF5C00]/60">
          <h2 className="text-xl md:text-2xl font-kinder text-[#3C2B22] uppercase tracking-wider rtl:tracking-normal">
            {t("La Sélection")}</h2>
          <span className="text-sm font-bold text-[#3C2B22]/60 bg-white border border-[#FF5C00] px-3 py-1 rounded-full shadow-sm">
            {products.length} {products.length > 1 ? 'produits' : 'produit'}
          </span>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map((product, index) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#FF5C00] mb-6">
              <span className="text-4xl">🛍️</span>
            </div>
            <p className="text-[#3C2B22] font-bold text-lg mb-2">{t("Aucun produit dans cette sélection.")}</p>
            <p className="text-[#3C2B22]/60 text-sm max-w-sm mb-6">{t("Les articles associés à cette campagne ne sont peut-être plus disponibles.")}</p>
            <button 
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-white border-2 border-[#FF5C00] text-[#3C2B22] rounded-xl font-bold hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors"
            >
              {t("Explorer le catalogue")}</button>
          </div>
        )}
      </div>
    </div>
  );
};
