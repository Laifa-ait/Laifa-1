import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Share2, ShieldCheck, Star, ShoppingBag, Info, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { db } from "../../lib/firebase";
import { useCartStore } from "../../store/useCartStore";
import { useWishlistStore } from "../../store/useWishlistStore";
import { useShop } from "../../context/ShopContext";
import { Product } from "../../types";
import { usePageMetadata } from "../../hooks/usePageMetadata";
import { ProductGallery } from "../../components/Product/Details/ProductGallery";
import { ProductInfo } from "../../components/Product/Details/ProductInfo";
import { ProductBuyBox } from "../../components/Product/Details/ProductBuyBox";
import { ProductReviews } from "../../components/Product/Details/ProductReviews";
import { ProductLightbox } from "../../components/Product/ProductLightbox";
import { ProductCard } from "../../components/Product/ProductCard";
import { useProductLogic } from "../../hooks/useProductLogic";

import {
  getCategoryTranslation,
  getTranslatedField,
} from "../../utils/translations";

export const ProductDetails: React.FC = () => {

  const navigate = useNavigate();
  const { t } = useTranslation();
  const addToCart = useCartStore((state) => state.addToCart);
  const wishlist = useWishlistStore((state) => state.wishlist);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const { fetchCrossSellProducts } = useShop();

  const [recommendedProducts, setRecommendedProducts] = React.useState<Product[]>([]);
  const [loadingRecom, setLoadingRecom] = React.useState(true);
  
  const {
    product,
    shop,
    loading,
    selectedImageIndex,
    setSelectedImageIndex,
    selectedColor,
    setSelectedColor,
    selectedSize,
    setSelectedSize,
    showVideo,
    setShowVideo,
    isLightboxOpen,
    setIsLightboxOpen,
    showStickyBuyBar,
    setShowStickyBuyBar,
    images,
    currentPrice
  } = useProductLogic();

  const buyBoxRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowStickyBuyBar(!entry.isIntersecting), { threshold: 0 });
    const current = buyBoxRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!product) return;
      try {
        setLoadingRecom(true);
        const list = await fetchCrossSellProducts(product, 4);
        setRecommendedProducts(list);
      } catch (err) {
        console.error("Error loading recommended products", err);
      } finally {
        setLoadingRecom(false);
      }
    };
    loadRecommendations();
  }, [product, fetchCrossSellProducts]);

  const calculatedVariantKey = React.useMemo(() => {
    return [selectedColor, selectedSize].filter(Boolean).join(' - ').toUpperCase();
  }, [selectedColor, selectedSize]);

  const selectedVariantObj = React.useMemo(() => {
    if (!product || !product.variants || !Array.isArray(product.variants)) return null;
    return product.variants.find((v: any) => v.name === calculatedVariantKey) || null;
  }, [product, calculatedVariantKey]);

  const isCurrentSelectionOutOfStock = React.useMemo(() => {
    if (product && product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      if (!selectedVariantObj) return false;
      return (Number(selectedVariantObj.stock) || 0) <= 0;
    }
    return (product?.stock || 0) <= 0;
  }, [product, selectedVariantObj]);

  const displayedPrice = React.useMemo(() => {
    let basePrice = currentPrice || 0;
    if (selectedVariantObj) {
      if (selectedVariantObj.priceOverride !== undefined && selectedVariantObj.priceOverride !== null && selectedVariantObj.priceOverride !== '') {
         return Number(selectedVariantObj.priceOverride);
      } else if (selectedVariantObj.priceDiff) {
         return basePrice + Number(selectedVariantObj.priceDiff);
      }
    }
    return basePrice;
  }, [currentPrice, selectedVariantObj]);

  const seoHelmet = usePageMetadata({
    title: product?.name || 'Produit',
    description: product?.description?.substring(0, 160) || 'Découvrez ce produit sur OLMART',
    ogImage: images?.[0] || product?.images?.[0] || '',
    ogType: "product",
  });

  const isColorOutOfStock = React.useCallback((c: string) => {
    if (!product || !product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      return false;
    }
    const matchingVariants = product.variants.filter((v: any) => {
      const parts = v.name.split(" - ");
      return parts[0]?.toUpperCase() === c.toUpperCase();
    });
    if (matchingVariants.length === 0) return false;
    return matchingVariants.every((v: any) => (parseInt(v.stock) || 0) <= 0);
  }, [product]);

  const isSizeOutOfStock = React.useCallback((s: string) => {
    if (!product || !product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
      return false;
    }
    const matchingVariants = product.variants.filter((v: any) => {
      const parts = v.name.split(" - ");
      return parts[1]?.toUpperCase() === s.toUpperCase() || parts[0]?.toUpperCase() === s.toUpperCase();
    });
    if (matchingVariants.length === 0) return false;
    return matchingVariants.every((v: any) => (parseInt(v.stock) || 0) <= 0);
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    const hasColors = product.colors && product.colors.length > 0;
    const hasSizes = product.sizes && product.sizes.length > 0;
    
    if (hasColors && !selectedColor) {
      toast.error(t("product.select_color_required") || "Veuillez sélectionner une couleur.");
      return;
    }
    
    if (hasSizes && !selectedSize) {
      toast.error(t("product.select_size_required") || "Veuillez sélectionner une taille.");
      return;
    }
    
    let selectedVariant: string | null = null;
    if (hasColors || hasSizes) {
       selectedVariant = [selectedColor, selectedSize].filter(Boolean).join(' - ').toUpperCase();
    }
    
    try {
      await addToCart(product.id, product.sellerId, { selectedVariant });
      toast.success(t("product_added_to_cart") || "Article ajouté au panier !");
    } catch (err) {
      toast.error(t("checkout.error_adding_to_cart") || "Erreur lors de l'ajout au panier");
      console.error(err);
    }
  };

  const handleShare = async () => {
    try {
      if (product) await navigator.share({ title: product.name, url: window.location.href });
    } catch (e) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("product.link_copied") || "Lien copié !");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t("common.loading") || "Chargement..."}</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-slate-50">
      <ShoppingBag className="w-16 h-16 text-slate-800/30 mb-4" />
      <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-800 mb-4">{t("common.not_found") || "Produit non trouvé"}</h1>
      <button onClick={() => navigate('/shop')} className="px-8 py-3.5 bg-slate-800 hover:bg-zinc-900 text-white font-sans font-bold tracking-tight text-sm uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-md">
        {t("common.back_to_shop") || "Retour à la boutique"}
      </button>
    </div>
  );

  return (
    <div className="bg-white min-h-screen pb-32 selection:bg-black selection:text-white">
      {seoHelmet}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 pb-16">
        <nav className="mb-6 lg:mb-10">
          {/* Mobile Clean Back Button */}
          <div className="flex sm:hidden items-center justify-between">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1.5 text-black hover:opacity-70 transition-opacity font-sans font-medium text-[11px] uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" /> {t("common.back") || "Retour"}
            </button>
            <span className="text-[10px] font-medium text-black/40 uppercase tracking-widest truncate max-w-[150px]">{product.name}</span>
          </div>

          {/* Desktop Full Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-medium text-black/60 uppercase tracking-widest rtl:tracking-normal flex-wrap">
             <span className="cursor-pointer hover:text-black transition-colors" onClick={() => navigate('/')}>{t("common.home") || "Accueil"}</span>
             <span>/</span>
             <span className="cursor-pointer hover:text-black transition-colors" onClick={() => navigate('/shop')}>{t("common.shop") || "Boutique"}</span>
              {product.category && (
               <>
                 <span>/</span>
                 <span className="cursor-pointer hover:text-slate-800" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}`)}>
                   {getCategoryTranslation(product.category, t)}
                 </span>
               </>
             )}
             {product.subcategory && (
               <>
                 <span>/</span>
                 <span className="cursor-pointer hover:text-slate-800" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}&subcategory=${encodeURIComponent(product.subcategory!)}`)}>
                   {getCategoryTranslation(product.subcategory, t)}
                 </span>
               </>
             )}
             {(product.subSubCategory || (product as any).subsubcategory) && (
               <>
                 <span>/</span>
                 <span className="cursor-pointer hover:text-slate-800" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}&subcategory=${encodeURIComponent(product.subcategory!)}&subsubcategory=${encodeURIComponent(product.subSubCategory || (product as any).subsubcategory)}`)}>
                   {getCategoryTranslation(product.subSubCategory || (product as any).subsubcategory, t)}
                 </span>
               </>
             )}
             <span>/</span>
             <span className="text-black truncate max-w-[200px] sm:max-w-xs font-sans font-medium">{product.name}</span>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 xl:gap-16 pb-16">
          <div className="lg:col-span-6 h-max lg:sticky lg:top-28">
            <ProductGallery images={images} selectedIndex={selectedImageIndex} productName={product.name} onSelectImage={setSelectedImageIndex} showVideo={showVideo} setShowVideo={setShowVideo} productVideoUrl={product.video} onOpenLightbox={() => setIsLightboxOpen(true)} />
          </div>

          <div className="lg:col-span-6 space-y-10">
            <ProductInfo product={product} shop={shop} currentPrice={displayedPrice} selectedColor={selectedColor} selectedSize={selectedSize} onSelectColor={setSelectedColor} onSelectSize={setSelectedSize} isColorOutOfStock={isColorOutOfStock} isSizeOutOfStock={isSizeOutOfStock} />
            <ProductBuyBox product={product} isCurrentSelectionOutOfStock={isCurrentSelectionOutOfStock} onAddToCart={handleAddToCart} onToggleWishlist={() => toggleWishlist(product.id)} wishlist={wishlist} onShare={handleShare} stickyRef={buyBoxRef} isSticky={showStickyBuyBar} />
            <ProductReviews comments={[]} userCanReview={false} submittingReview={false} newReviewText="" setNewReviewText={() => {}} newReviewStars={5} setNewReviewStars={() => {}} onSubmit={async (e) => e.preventDefault()} />
          </div>
        </div>



        <ProductLightbox 
          isOpen={isLightboxOpen} 
          onClose={() => setIsLightboxOpen(false)} 
          imageUrl={images[selectedImageIndex]} 
          title={product.name} 
        />

        {/* Cohesive Recommended Products Module */}
        {!loadingRecom && recommendedProducts.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-2">
              <div>
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-[11px] uppercase tracking-widest rtl:tracking-normal mb-2 bg-zinc-900/5 self-start px-3 py-1 rounded-full border border-zinc-900/20 w-fit">
                  <Flame className="w-4 h-4 animate-pulse" /> {t("product.premium_selection") || "Sélection Premium"}
                </div>
                <h3 className="font-sans font-bold tracking-tight text-3xl sm:text-4xl text-slate-800 uppercase tracking-wide drop-shadow-sm">
                  {t("product.you_might_also_like") || "Vous aimerez aussi"}
                </h3>
              </div>
              <p className="text-sm font-bold text-slate-800/60">{t("product.recommendations_subtitle") || "Recommandations exclusives adaptées à vos goûts"}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {recommendedProducts.map((p, idx) => (
                <div key={p.id} className="opacity-0 animate-fade-in" style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "forwards" }}>
                  <ProductCard product={p} index={idx} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
