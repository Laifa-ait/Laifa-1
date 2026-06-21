import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFilteredProducts(categoryId: string, activeFilters: Record<string, any>) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchProducts() {
      setLoading(true);
      setError(null);
      
      try {
        const prodRef = collection(db, "products");
        let qConstraints: any[] = [];
        
        // Basic filter for category
        if (categoryId) {
          qConstraints.push(where("category", "==", categoryId));
        }
        
        // Only active/approved products
        qConstraints.push(where("status", "==", "active"));
        
        // Dynamic filters based on attributes
        if (activeFilters && Object.keys(activeFilters).length > 0) {
          Object.entries(activeFilters).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            
            if (Array.isArray(value) && value.length > 0) {
              // Note: Firestore array-contains-any handles OR within the same field
              // However, since attributes is an object (map), we query 'attributes.key'
              // Firebase limits 'in' operator to max 10 elements.
              qConstraints.push(where(`attributes.${key}`, "in", value));
            } else if (!Array.isArray(value)) {
              qConstraints.push(where(`attributes.${key}`, "==", value));
            }
          });
        }
        
        // Final Query Object
        const finalQuery = query(prodRef, ...qConstraints);
        const snapshot = await getDocs(finalQuery);
        
        if (isMounted) {
          const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setProducts(list);
        }
      } catch (err: any) {
        console.error("Error fetching filtered products:", err);
        // Important: Detect missing composite index error to assist in development
        if (err.message && err.message.includes('FAILED_PRECONDITION') && err.message.includes('index')) {
          console.warn("⚠️ ERROR: Missing Firestore Composite Index. Follow the link provided in the Firebase error log to build it.");
          if (isMounted) setError("Erreur: Un index de base de données est manquant. Contactez l'administrateur.");
        } else {
          if (isMounted) setError("Erreur lors de la récupération des produits.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchProducts();
    
    return () => {
      isMounted = false;
    };
  }, [categoryId, JSON.stringify(activeFilters)]); // safely stringify for deps

  return { products, loading, error };
}
