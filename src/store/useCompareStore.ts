import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';
import { toast } from 'react-hot-toast';
import { t } from 'i18next';

interface CompareState {
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (isOpen: boolean) => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      compareList: [],
      isCompareOpen: false,
      addToCompare: (product) => {
        const currentList = get().compareList;
        if (currentList.find((p) => p.id === product.id)) {
          toast.error(t("Ce produit est déjà dans le comparateur."));
          return;
        }
        if (currentList.length >= 4) {
          toast.error(t("Vous ne pouvez comparer que 4 produits maximum."));
          return;
        }
        set({ compareList: [...currentList, product] });
        toast.success(t("Produit ajouté au comparateur."));
      },
      removeFromCompare: (productId) => {
        set({ compareList: get().compareList.filter((p) => p.id !== productId) });
      },
      clearCompare: () => set({ compareList: [] }),
      setIsCompareOpen: (isOpen) => set({ isCompareOpen: isOpen }),
    }),
    {
      name: 'olma_compare',
    }
  )
);
