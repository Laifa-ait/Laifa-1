import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PremiumProduct, SelectionExceptionDocument } from "../types";

interface UseSelectionExceptionResult {
  data: PremiumProduct[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch the "Selection Exception" (Premium Curated Selection).
 * Strategy: Fetch 1 singleton document, randomize subset client-side for dynamic feel.
 */
export function useSelectionException(): UseSelectionExceptionResult {
  const [data, setData] = useState<PremiumProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSelection() {
      setIsLoading(true);
      setError(null);

      try {
        const docRef = doc(db, "ui_elements", "selection_exception");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const docData = snap.data() as SelectionExceptionDocument;
          const allProducts = docData.products || [];

          // Utility: Randomize and pick 4-6 items
          if (allProducts.length > 0) {
            const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
            const subsetCount = Math.min(Math.max(4, Math.floor(Math.random() * 3) + 4), shuffled.length);
            setData(shuffled.slice(0, subsetCount));
          } else {
            setData([]);
          }
        } else {
          setData([]);
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, "ui_elements/selection_exception");
        setError(err.message || "Error loading premium selection");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSelection();
  }, []);

  return { data, isLoading, error };
}
