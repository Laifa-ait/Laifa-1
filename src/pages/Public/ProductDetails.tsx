import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Share2, ShieldCheck, Star, ShoppingBag, Info, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { db } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { useShop } from "../../context/ShopContext";
import { Product } from "../../types";
import { Helmet } from "react-helmet-async";
import { ProductGallery } from "../../components/Product/Details/ProductGallery";
import { ProductInfo } from "../../components/Product/Details/ProductInfo";
import { ProductBuyBox } from "../../components/Product/Details/ProductBuyBox";
import { ProductReviews } from "../../components/Product/Details/ProductReviews";
import { ProductCard } from "../../components/Product/ProductCard";
import { useProductLogic } from "../../hooks/useProductLogic";

import {
  getCategoryTranslation,
  getTranslatedField,
} from "../../utils/translations";

export const ProductDetails: React.FC = () => {

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToCart, wishlist, toggleWishlist } = useCart();
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
    setIsLightboxOpen,
    showStickyBuyBar,
    setShowStickyBuyBar,
    images,
    currentPrice
  } = useProductLogic();

  const buyBoxRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setShowStickyBuyBar(!entry.isIntersecting), { threshold: 0 });
    if(buyBoxRef.current) observer.observe(buyBoxRef.current);
    return () => observer.disconnect();
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
    let basePrice = currentPrice;
    if (selectedVariantObj) {
      if (selectedVariantObj.priceOverride !== undefined && selectedVariantObj.priceOverride !== null && selectedVariantObj.priceOverride !== '') {
         return Number(selectedVariantObj.priceOverride);
      } else if (selectedVariantObj.priceDiff) {
         return basePrice + Number(selectedVariantObj.priceDiff);
      }
    }
    return basePrice;
  }, [currentPrice, selectedVariantObj]);

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

  const handleAddToCart = () => {
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
    
    addToCart(product.id, product.sellerId, { selectedVariant });
    toast.success(t("product_added_to_cart") || "Article ajouté au panier !");
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
  if (!product) return <div className="min-h-screen flex items-center justify-center">{t("common.not_found") || "Produit non trouvé"}</div>;

  return (
    <div className="bg-gradient-to-br from-stone-50 via-[#faf8f5] to-[#f4eee6] min-h-screen pb-32 selection:bg-[#121315] selection:text-white">
      <Helmet>
        <title>{`${product.name} | OLMART`}</title>
        <meta name="description" content={product.description} />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 pb-16">
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#121315]/50 uppercase tracking-widest rtl:tracking-normal flex-wrap mb-8 lg:mb-12">
           <span className="cursor-pointer hover:text-[#121315]" onClick={() => navigate('/')}>{t("common.home") || "Accueil"}</span>
           <span>/</span>
           <span className="cursor-pointer hover:text-[#121315]" onClick={() => navigate('/shop')}>{t("common.shop") || "Boutique"}</span>
            {product.category && (
             <>
               <span>/</span>
               <span className="cursor-pointer hover:text-[#121315]" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}`)}>
                 {getCategoryTranslation(product.category, t)}
               </span>
             </>
           )}
           {product.subcategory && (
             <>
               <span>/</span>
               <span className="cursor-pointer hover:text-[#121315]" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}&subcategory=${encodeURIComponent(product.subcategory!)}`)}>
                 {getCategoryTranslation(product.subcategory, t)}
               </span>
             </>
           )}
           {(product.subSubCategory || (product as any).subsubcategory) && (
             <>
               <span>/</span>
               <span className="cursor-pointer hover:text-[#121315]" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category!)}&subcategory=${encodeURIComponent(product.subcategory!)}&subsubcategory=${encodeURIComponent(product.subSubCategory || (product as any).subsubcategory)}`)}>
                 {getCategoryTranslation(product.subSubCategory || (product as any).subsubcategory, t)}
               </span>
             </>
           )}
           <span>/</span>
           <span className="text-[#121315] truncate max-w-[200px] sm:max-w-xs">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-12 gap-10 xl:gap-16 pb-16 border-b border-slate-200/60">
          <div className="lg:col-span-6 h-max lg:sticky lg:top-28">
            <ProductGallery images={images} selectedIndex={selectedImageIndex} productName={product.name} onSelectImage={setSelectedImageIndex} showVideo={showVideo} setShowVideo={setShowVideo} productVideoUrl={product.video} onOpenLightbox={() => setIsLightboxOpen(true)} />
          </div>

          <div className="lg:col-span-6 space-y-10">
            <ProductInfo product={product} shop={shop} currentPrice={displayedPrice} selectedColor={selectedColor} selectedSize={selectedSize} onSelectColor={setSelectedColor} onSelectSize={setSelectedSize} isColorOutOfStock={isColorOutOfStock} isSizeOutOfStock={isSizeOutOfStock} />
            <ProductBuyBox product={product} isCurrentSelectionOutOfStock={isCurrentSelectionOutOfStock} onAddToCart={handleAddToCart} onToggleWishlist={() => toggleWishlist(product.id)} wishlist={wishlist} onShare={handleShare} stickyRef={buyBoxRef} isSticky={showStickyBuyBar} />
            <ProductReviews comments={[]} userCanReview={false} submittingReview={false} newReviewText="" setNewReviewText={() => {}} newReviewStars={5} setNewReviewStars={() => {}} onSubmit={async (e) => e.preventDefault()} />
          </div>
        </div>

        {/* Cohesive Recommended Products Module */}
        {!loadingRecom && recommendedProducts.length > 0 && (
          <div className="mt-16 sm:mt-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#F37021] font-black text-[10px] uppercase tracking-widest rtl:tracking-normal mb-2">
                  <Flame className="w-4 h-4 animate-pulse" /> {t("product.premium_selection") || "Sélection Premium"}
                </div>
                <h3 className="font-sans font-medium text-2xl sm:text-3xl text-[#121315] tracking-tight rtl:tracking-normal">
                  {t("product.you_might_also_like") || "Vous aimerez aussi"}
                </h3>
              </div>
              <p className="text-xs text-zinc-500 font-medium">{t("product.recommendations_subtitle") || "Recommandations exclusives adaptées à vos goûts"}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
