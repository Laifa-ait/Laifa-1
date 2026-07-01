import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Product, Shop } from "../types";

export const useProductLogic = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showStickyBuyBar, setShowStickyBuyBar] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      // Auto scroll to top on new product view
      window.scrollTo({ top: 0, behavior: "smooth" });

      try {
        const prodDoc = await getDoc(doc(db, "products", id));
        if (prodDoc.exists()) {
          const data = { id: prodDoc.id, ...prodDoc.data() } as Product;
          setProduct(data);

          if (data.colors && data.colors.length > 0) {
            setSelectedColor(data.colors[0]);
          }
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(data.sizes[0]);
          }

          // Track recently viewed products
          try {
            const stored = localStorage.getItem("olma_recently_viewed");
            let recents: string[] = stored ? JSON.parse(stored) : [];
            // Remove if already exists to move to top
            recents = recents.filter((productId) => productId !== data.id);
            // Add to start
            recents.unshift(data.id);
            // Limit to max 20 items
            if (recents.length > 20) recents = recents.slice(0, 20);
            localStorage.setItem("olma_recently_viewed", JSON.stringify(recents));
          } catch (storageErr) {
            console.error("Could not update recently viewed:", storageErr);
          }

          // Fetch reviews
          try {
            const reviewsQuery = query(
              collection(db, "reviews"),
              where("productId", "==", id),
              limit(100)
            );
            const reviewsSnap = await getDocs(reviewsQuery);
            const loadedReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
            loadedReviews.sort((a, b) => {
               const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds || 0) * 1000;
               const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds || 0) * 1000;
               return tb - ta;
            });
            setReviews(loadedReviews);
          } catch (reviewErr) {
            console.error("Could not fetch reviews:", reviewErr);
          }
        }
      } catch (err) {
        console.error("Error fetching product", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    return [product.images?.[0] || product.image, ...(product.images?.slice(1) || [])].filter((img) => img);
  }, [product]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const isFlashActive = !!(
      product.flashSaleActive &&
      product.flashPrice &&
      (!product.flashEndDate || new Date(product.flashEndDate).getTime() > Date.now())
    );
    if (isFlashActive) return product.flashPrice;
    return product.promoPrice || product.price;
  }, [product]);

  return {
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
    currentPrice,
    reviews,
  };
};
