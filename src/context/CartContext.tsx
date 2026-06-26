import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { Product, CartItem } from "../types";
import { useAuth } from "./AuthContext";
import { analyticsEngine } from "../utils/analyticsEngine";
import { db, withTimeout } from "../lib/firebase";
import { doc, setDoc, getDoc, collection, writeBatch, getDocs, query, where, documentId } from "firebase/firestore";
import toast from "react-hot-toast";

interface CartContextType {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (productOrId: string | any, sellerIdOrOptions?: string | any, options?: any) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  clearCart: (sellerId?: string) => void;
  toggleWishlist: (id: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  revalidateCart: () => Promise<void>;
  getCartItemPrice: (item: CartItem) => number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  let auth: any;
  try {
    auth = useAuth();
  } catch (e) {
    auth = { currentUser: null };
  }
  const prevUserRef = useRef<any>(null);
  const getWishlistKey = () => (auth.currentUser ? `olma_wishlist_${auth.currentUser.uid}` : "olma_wishlist_guest");
  const getCartKey = () => (auth.currentUser ? `olma_cart_${auth.currentUser.uid}` : "olma_cart_guest");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs to prevent background fetch race conditions (Deduplication + Cache maps)
  const productDetailsCache = useRef<Record<string, any>>({});
  const activeProductFetches = useRef<Record<string, Promise<any>>>({});

  // Hydrate cart from Firestore (prices/names) to avoid stale data
  const hydrateCart = async (cartItems: any[]) => {
    if (!cartItems || cartItems.length === 0) return [];

    const uniqueIds = Array.from(new Set(cartItems.map((item) => item.id)));
    const productDataMap = new Map<string, any>();
    const chunkSize = 30;

    try {
      for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const chunk = uniqueIds.slice(i, i + chunkSize);
        const q = query(collection(db, "products"), where(documentId(), "in", chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((docSnap) => {
          productDataMap.set(docSnap.id, docSnap.data());
        });
      }
    } catch (e) {
      console.error("Hydration grouped query error:", e);
    }

    const hydrated = cartItems.map((item) => {
      const pData = productDataMap.get(item.id);
      if (pData) {
        return {
          ...item,
          addedAt: item.addedAt || Date.now(),
          name: pData.name,
          price: pData.price,
          promoPrice: pData.promoPrice,
          flashSaleActive: pData.flashSaleActive,
          flashPrice: pData.flashPrice,
          image: pData.image || pData.images?.[0] || item.image,
          variants: pData.variants || item.variants,
        };
      }
      return item; // fallback
    });
    return hydrated;
  };

  // Sync cart and merge from guest to user
  useEffect(() => {
    setIsInitialized(false);
    const handleAuthChange = async () => {
      let finalCart: CartItem[] = [];
      let finalWishlist: string[] = [];

      const safeParse = (data: string | null, fallback: any) => {
        try {
          return data ? JSON.parse(data) : fallback;
        } catch (e) {
          return fallback;
        }
      };

      const guestCartJson = localStorage.getItem("olma_cart_guest");
      const guestCart = safeParse(guestCartJson, []);
      const guestWishlistJson = localStorage.getItem("olma_wishlist_guest");
      const guestWishlist = safeParse(guestWishlistJson, []);

      try {
        if (auth.currentUser) {
          // User is logged in
          const userCartKey = getCartKey();
          const userWishlistKey = getWishlistKey();

          // 1. Fetch user data from Cloud
          const cartRef = doc(db, `users/${auth.currentUser.uid}/cart`, "active");
          const wishRef = doc(db, `users/${auth.currentUser.uid}/wishlist`, "active");

          let cartSnap: any = null;
          let wishSnap: any = null;
          try {
            const [cSnap, wSnap] = await withTimeout(
              Promise.all([getDoc(cartRef), getDoc(wishRef)]),
              15000,
              "Le chargement de votre panier et de votre liste d'envies a expiré."
            );
            cartSnap = cSnap;
            wishSnap = wSnap;
          } catch (err) {
            console.warn("CartContext: Firestore fetch failed or timed out. Falling back to local storage.", err);
          }

          let cloudCart = cartSnap && cartSnap.exists() ? cartSnap.data().items || [] : [];
          let cloudWishlist = wishSnap && wishSnap.exists() ? wishSnap.data().items || [] : [];

          // 2. Fallback to localStorage if cloud is empty
          if (cloudCart.length === 0) {
            const localUserCart = localStorage.getItem(userCartKey);
            if (localUserCart) cloudCart = safeParse(localUserCart, []);
          }
          if (cloudWishlist.length === 0) {
            const localUserWish = localStorage.getItem(userWishlistKey);
            if (localUserWish) cloudWishlist = safeParse(localUserWish, []);
          }

          // 3. MERGE Guest Cart into User Cart if transition just happened
          if (!prevUserRef.current && guestCart.length > 0) {
            guestCart.forEach((gItem: any) => {
              const existingMerge = cloudCart.find(
                (c: any) => c.id === gItem.id && c.selectedVariant === gItem.selectedVariant
              );
              if (existingMerge) {
                existingMerge.quantity += gItem.quantity || 1;
              } else {
                cloudCart.push(gItem);
              }
            });
            localStorage.removeItem("olma_cart_guest");
          }

          // Merge wishlist
          if (!prevUserRef.current && guestWishlist.length > 0) {
            guestWishlist.forEach((wId: string) => {
              if (!cloudWishlist.includes(wId)) cloudWishlist.push(wId);
            });
            localStorage.removeItem("olma_wishlist_guest");
          }

          finalCart = cloudCart;
          finalWishlist = cloudWishlist;
        } else {
          // User is guest
          finalCart = guestCart;
          finalWishlist = guestWishlist;
        }

        // Hydrate
        try {
          finalCart = await hydrateCart(finalCart);
        } catch (hydErr) {
          console.warn("CartContext: Hydration error, using raw cart:", hydErr);
        }
      } catch (globalErr) {
        console.error("CartContext: Error during auth change sync:", globalErr);
        // Fail-safe: use guest cart as absolute fallback to prevent UI blocking
        finalCart = guestCart;
        finalWishlist = guestWishlist;
      }

      setCart(finalCart);
      setWishlist(finalWishlist);
      setIsInitialized(true);
      prevUserRef.current = auth.currentUser;
    };

    handleAuthChange();
  }, [auth.currentUser]);

  // Sync to Cloud and LocalStorage whenever cart/wishlist change
  useEffect(() => {
    if (!isInitialized) return;

    const userCartKey = getCartKey();
    const userWishlistKey = getWishlistKey();

    localStorage.setItem(userCartKey, JSON.stringify(cart));
    localStorage.setItem(userWishlistKey, JSON.stringify(wishlist));

    if (auth.currentUser) {
      // Persist to Firestore
      const cartRef = doc(db, `users/${auth.currentUser.uid}/cart`, "active");
      const wishRef = doc(db, `users/${auth.currentUser.uid}/wishlist`, "active");

      // Cloud stores only pointers for cart
      const cartPointers = cart.map((item) => ({
        id: item.id,
        sellerId: item.sellerId,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant || null,
        addedAt: item.addedAt || Date.now(),
      }));

      Promise.all([
        setDoc(cartRef, { items: cartPointers, updatedAt: Date.now() }, { merge: true }),
        setDoc(wishRef, { items: wishlist }, { merge: true }),
      ]).catch((err) => console.error("Error syncing to cloud", err));
    }
  }, [cart, wishlist, isInitialized, auth.currentUser]);

  const addToCart = (productOrId: any, sellerIdOrOptions?: any, options?: any) => {
    let productId: string;
    let sellerId: string;
    let actualOptions: any = {};
    let initialDetails: any = {};
    let productStock: number | undefined = undefined;

    if (productOrId && typeof productOrId === "object" && productOrId.id) {
      // Called with (product, options)
      productId = productOrId.id;
      sellerId = productOrId.sellerId || "";
      actualOptions = sellerIdOrOptions || {};
      productStock = productOrId.stock;
      initialDetails = {
        name: productOrId.name,
        price: productOrId.price,
        promoPrice: productOrId.promoPrice,
        flashSaleActive: productOrId.flashSaleActive,
        flashPrice: productOrId.flashPrice,
        image: productOrId.image || productOrId.images?.[0],
        variants: productOrId.variants,
      };
    } else {
      // Called with (productId, sellerId, options)
      productId = productOrId;
      sellerId = sellerIdOrOptions || "";
      actualOptions = options || {};
    }

    const quantityToAdd = actualOptions?.quantity || 1;

    if (productStock !== undefined && productStock < quantityToAdd) {
      toast.error(`Stock insuffisant. Disponible : ${productStock}`);
      return;
    }
    setCart((prev) => {
      const quantityToAdd = actualOptions?.quantity || 1;
      const selectedVariant = actualOptions?.selectedVariant || null;

      const existingItemIndex = prev.findIndex((item) => {
        const v1 = item.selectedVariant || null;
        const v2 = selectedVariant || null;
        return item.id === productId && v1 === v2;
      });

      if (existingItemIndex !== -1) {
        // Increment quantity of existing item with matching variant
        const newCart = [...prev];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantityToAdd,
          addedAt: Date.now(),
        };
        return newCart;
      }

      // Add a clean pointer reference with quantity
      return [
        ...prev,
        {
          id: productId,
          sellerId: sellerId,
          quantity: quantityToAdd,
          selectedVariant: selectedVariant,
          addedAt: Date.now(),
          ...initialDetails,
          ...actualOptions,
        },
      ];
    });

    // Asynchronously fetch complete details with deduplication to ensure freshness, preventing race conditions
    const fetchLatestDetails = async () => {
      // 1. Check local cache map to instantly apply details
      if (productDetailsCache.current[productId]) {
        const pData = productDetailsCache.current[productId];
        setCart((prev) =>
          prev.map((item) => {
            if (item.id === productId) {
              return {
                ...item,
                name: pData.name,
                price: pData.price,
                promoPrice: pData.promoPrice,
                image: pData.image || pData.images?.[0] || item.image,
                variants: pData.variants || item.variants,
              };
            }
            return item;
          })
        );
        return;
      }

      // 2. If a fetch for this product is already in progress, wait for it
      if (activeProductFetches.current[productId]) {
        try {
          const pData = await activeProductFetches.current[productId];
          if (pData) {
            setCart((prev) =>
              prev.map((item) => {
                if (item.id === productId) {
                  return {
                    ...item,
                    name: pData.name,
                    price: pData.price,
                    promoPrice: pData.promoPrice,
                    image: pData.image || pData.images?.[0] || item.image,
                    variants: pData.variants || item.variants,
                  };
                }
                return item;
              })
            );
          }
        } catch (e) {
          console.warn("Deduplicated background fetch catch:", e);
        }
        return;
      }

      // 3. Spawns a single atomic fetch promise and register it
      const fetchPromise = (async () => {
        const productSnap = await getDoc(doc(db, "products", productId));
        if (productSnap.exists()) {
          const data = productSnap.data();
          productDetailsCache.current[productId] = data;
          return data;
        }
        return null;
      })();

      activeProductFetches.current[productId] = fetchPromise;

      try {
        const pData = await fetchPromise;
        if (pData) {
          setCart((prev) => {
            return prev.map((item) => {
              if (item.id === productId) {
                return {
                  ...item,
                  name: pData.name,
                  price: pData.price,
                  promoPrice: pData.promoPrice,
                  image: pData.image || pData.images?.[0] || item.image,
                  variants: pData.variants || item.variants,
                };
              }
              return item;
            });
          });
        }
      } catch (err) {
        console.warn("Background fetch of product details skipped:", err);
      } finally {
        delete activeProductFetches.current[productId];
      }
    };
    fetchLatestDetails();

    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (item) {
      analyticsEngine.track("remove_from_cart", {
        productId: item.id,
        name: item.name,
        price: item.price,
      });
    }
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = (sellerId?: string) => {
    if (sellerId) {
      setCart((prev) => prev.filter((item) => item.sellerId !== sellerId));
    } else {
      setCart([]);
    }
  };

  const updateQuantity = (index: number, qty: number) => {
    const MAX_QTY = 99;
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    if (qty > MAX_QTY) {
      toast.error(`Quantité maximum : ${MAX_QTY}`);
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], quantity: qty };
      }
      return next;
    });
  };

  const revalidateCart = async () => {
    const updated = await hydrateCart(cart);
    setCart(updated);
  };

  const getCartItemPrice = (item: CartItem) => {
    const isFlashActive = !!(
      item.flashSaleActive &&
      item.flashPrice &&
      (!item.flashEndDate || new Date(item.flashEndDate).getTime() > Date.now())
    );
    const rawPrice: any = isFlashActive
      ? item.flashPrice
      : item.promoPrice !== undefined && item.promoPrice !== null && (item.promoPrice as any) !== ""
        ? item.promoPrice
        : item.price;
    let targetPrice = 0;

    if (rawPrice !== undefined && rawPrice !== null) {
      if (typeof rawPrice === "number") {
        targetPrice = rawPrice;
      } else if (typeof rawPrice === "string" && rawPrice.trim() !== "") {
        const cleanStr = rawPrice.replace(/[^\d.]/g, "");
        targetPrice = parseFloat(cleanStr) || 0;
      }
    }

    if (item.selectedVariant && item.variants && Array.isArray(item.variants)) {
      const variant = item.variants.find((v: any) => v.name === item.selectedVariant);
      if (variant) {
        if (variant.priceOverride !== undefined && variant.priceOverride !== null && variant.priceOverride !== "") {
          targetPrice = Number(variant.priceOverride) || 0;
        } else if (variant.priceDiff) {
          targetPrice += Number(variant.priceDiff) || 0;
        }
      }
    }
    return isNaN(targetPrice) ? 0 : targetPrice;
  };

  const totalPrice = cart.reduce((sum, item) => sum + getCartItemPrice(item) * (item.quantity || 1), 0);

  const toggleWishlist = (id: string) => {
    const isAdding = !wishlist.includes(id);
    analyticsEngine.track("wishlist_toggle", {
      productId: id,
      action: isAdding ? "add" : "remove",
    });
    setWishlist((prev) => (prev.includes(id) ? prev.filter((wishId) => wishId !== id) : [...prev, id]));
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        revalidateCart,
        toggleWishlist,
        isCartOpen,
        setIsCartOpen,
        getCartItemPrice,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
