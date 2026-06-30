import { create } from 'zustand';

interface UIState {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isRecentlyViewedOpen: boolean;
  setIsRecentlyViewedOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  setIsCartOpen: (open) => set({ isCartOpen: open }),
  isWishlistOpen: false,
  setIsWishlistOpen: (open) => set({ isWishlistOpen: open }),
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  isRecentlyViewedOpen: false,
  setIsRecentlyViewedOpen: (open) => set({ isRecentlyViewedOpen: open }),
}));
