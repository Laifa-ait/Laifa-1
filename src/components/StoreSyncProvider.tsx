import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db, withTimeout } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useCartStore } from "../store/useCartStore";
import { useWishlistStore } from "../store/useWishlistStore";

export const StoreSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let auth: any;
  try {
    auth = useAuth();
  } catch (e) {
    auth = { currentUser: null };
  }

  const prevUserRef = useRef<any>(null);
  const getWishlistKey = () => (auth.currentUser ? `olma_wishlist_${auth.currentUser.uid}` : "olma_wishlist_guest");
  const getCartKey = () => (auth.currentUser ? `olma_cart_${auth.currentUser.uid}` : "olma_cart_guest");

  const { cart, setCart, revalidateCart } = useCartStore();
  const { wishlist, setWishlist } = useWishlistStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(false);
    const handleAuthChange = async () => {
      let finalCart: any[] = [];
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
          const userCartKey = getCartKey();
          const userWishlistKey = getWishlistKey();

          const cartRef = doc(db, `users/${auth.currentUser.uid}/cart`, "active");
          const wishRef = doc(db, `users/${auth.currentUser.uid}/wishlist`, "active");

          let cartSnap: any = null;
          let wishSnap: any = null;
          try {
            const [cSnap, wSnap] = await withTimeout(
              Promise.all([getDoc(cartRef), getDoc(wishRef)]),
              15000,
              "Le chargement a expiré."
            );
            cartSnap = cSnap;
            wishSnap = wSnap;
          } catch (err) {
            console.warn("StoreSync: Firestore fetch failed. Falling back to local storage.", err);
          }

          let cloudCart = cartSnap && cartSnap.exists() ? cartSnap.data().items || [] : [];
          let cloudWishlist = wishSnap && wishSnap.exists() ? wishSnap.data().items || [] : [];

          if (cloudCart.length === 0) {
            const localUserCart = localStorage.getItem(userCartKey);
            if (localUserCart) cloudCart = safeParse(localUserCart, []);
          }
          if (cloudWishlist.length === 0) {
            const localUserWish = localStorage.getItem(userWishlistKey);
            if (localUserWish) cloudWishlist = safeParse(localUserWish, []);
          }

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

          if (!prevUserRef.current && guestWishlist.length > 0) {
            guestWishlist.forEach((wId: string) => {
              if (!cloudWishlist.includes(wId)) cloudWishlist.push(wId);
            });
            localStorage.removeItem("olma_wishlist_guest");
          }

          finalCart = cloudCart;
          finalWishlist = cloudWishlist;
        } else {
          finalCart = guestCart;
          finalWishlist = guestWishlist;
        }

        setCart(finalCart);
        setWishlist(finalWishlist);
        
        await revalidateCart();
        
      } catch (globalErr) {
        console.error("StoreSync: Error during auth change sync:", globalErr);
        setCart(guestCart);
        setWishlist(guestWishlist);
      }

      setIsInitialized(true);
      prevUserRef.current = auth.currentUser;
    };

    handleAuthChange();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!isInitialized) return;

    const userCartKey = getCartKey();
    const userWishlistKey = getWishlistKey();

    localStorage.setItem(userCartKey, JSON.stringify(cart));
    localStorage.setItem(userWishlistKey, JSON.stringify(wishlist));

    if (auth.currentUser) {
      const cartRef = doc(db, `users/${auth.currentUser.uid}/cart`, "active");
      const wishRef = doc(db, `users/${auth.currentUser.uid}/wishlist`, "active");

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

  return <>{children}</>;
};
