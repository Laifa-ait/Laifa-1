import { create } from 'zustand';
import { CartItem } from '../types';
import { analyticsEngine } from '../utils/analyticsEngine';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { useUIStore } from './useUIStore';

interface CartState {
  cart: CartItem[];
  setCart: (cart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  addToCart: (productOrId: any, sellerIdOrOptions?: any, options?: any) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  clearCart: (sellerId?: string) => void;
  revalidateCart: () => Promise<void>;
  getCartItemPrice: (item: CartItem) => number;
  totalPrice: () => number;
}

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
  return cartItems.map((item) => {
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
    return item;
  });
};

const productDetailsCache: Record<string, any> = {};
const activeProductFetches: Record<string, Promise<any>> = {};

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  setCart: (updater) => set((state) => ({
    cart: typeof updater === 'function' ? updater(state.cart) : updater,
  })),
  addToCart: (productOrId: any, sellerIdOrOptions?: any, options?: any) => {
    let productId: string;
    let sellerId: string;
    let actualOptions: any = {};
    let initialDetails: any = {};
    let productStock: number | undefined = undefined;

    if (productOrId && typeof productOrId === "object" && productOrId.id) {
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
      productId = productOrId;
      sellerId = sellerIdOrOptions || "";
      actualOptions = options || {};
    }

    const quantityToAdd = actualOptions?.quantity || 1;

    if (productStock !== undefined && productStock < quantityToAdd) {
      toast.error(`Stock insuffisant. Disponible : ${productStock}`);
      return;
    }

    const selectedVariant = actualOptions?.selectedVariant || null;

    set((state) => {
      const existingItemIndex = state.cart.findIndex((item) => {
        const v1 = item.selectedVariant || null;
        const v2 = selectedVariant || null;
        return item.id === productId && v1 === v2;
      });

      if (existingItemIndex !== -1) {
        const newCart = [...state.cart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + quantityToAdd,
          addedAt: Date.now(),
        };
        return { cart: newCart };
      }

      return {
        cart: [
          ...state.cart,
          {
            id: productId,
            sellerId: sellerId,
            quantity: quantityToAdd,
            selectedVariant: selectedVariant,
            addedAt: Date.now(),
            ...initialDetails,
            ...actualOptions,
          },
        ],
      };
    });

    const fetchLatestDetails = async () => {
      if (productDetailsCache[productId]) {
        const pData = productDetailsCache[productId];
        set((state) => ({
          cart: state.cart.map((item) => {
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
        }));
        return;
      }

      if (activeProductFetches[productId] !== undefined) {
        try {
          const pData = await activeProductFetches[productId];
          if (pData) {
            set((state) => ({
              cart: state.cart.map((item) => {
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
            }));
          }
        } catch (e) {
          console.warn("Deduplicated background fetch catch:", e);
        }
        return;
      }

      const fetchPromise = (async () => {
        const productSnap = await getDoc(doc(db, "products", productId));
        if (productSnap.exists()) {
          const data = productSnap.data();
          productDetailsCache[productId] = data;
          return data;
        }
        return null;
      })();

      activeProductFetches[productId] = fetchPromise;

      try {
        const pData = await fetchPromise;
        if (pData) {
          set((state) => ({
            cart: state.cart.map((item) => {
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
          }));
        }
      } catch (err) {
        console.warn("Background fetch of product details skipped:", err);
      } finally {
        delete activeProductFetches[productId];
      }
    };
    fetchLatestDetails();

    useUIStore.getState().setIsCartOpen(true);
  },
  removeFromCart: (index) => {
    set((state) => {
      const item = state.cart[index];
      if (item) {
        analyticsEngine.track("remove_from_cart", {
          productId: item.id,
          name: item.name,
          price: item.price,
        });
      }
      return { cart: state.cart.filter((_, i) => i !== index) };
    });
  },
  clearCart: (sellerId) => {
    set((state) => ({
      cart: sellerId ? state.cart.filter((item) => item.sellerId !== sellerId) : [],
    }));
  },
  updateQuantity: (index, qty) => {
    const MAX_QTY = 99;
    if (qty <= 0) {
      get().removeFromCart(index);
      return;
    }
    if (qty > MAX_QTY) {
      toast.error(`Quantité maximum : ${MAX_QTY}`);
      return;
    }
    set((state) => {
      const next = [...state.cart];
      if (next[index]) {
        next[index] = { ...next[index], quantity: qty };
      }
      return { cart: next };
    });
  },
  revalidateCart: async () => {
    const updated = await hydrateCart(get().cart);
    set({ cart: updated });
  },
  getCartItemPrice: (item: CartItem) => {
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
  },
  totalPrice: () => {
    return get().cart.reduce((sum, item) => sum + get().getCartItemPrice(item) * (item.quantity || 1), 0);
  },
}));
