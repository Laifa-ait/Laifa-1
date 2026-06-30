import { create } from 'zustand';
import { analyticsEngine } from '../utils/analyticsEngine';

interface WishlistState {
  wishlist: string[];
  setWishlist: (wishlist: string[]) => void;
  toggleWishlist: (id: string) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlist: [],
  setWishlist: (wishlist) => set({ wishlist }),
  toggleWishlist: (id) => {
    const { wishlist } = get();
    const isAdding = !wishlist.includes(id);
    analyticsEngine.track('wishlist_toggle', {
      productId: id,
      action: isAdding ? 'add' : 'remove',
    });
    set({
      wishlist: isAdding
        ? [...wishlist, id]
        : wishlist.filter((wishId) => wishId !== id),
    });
  },
}));
