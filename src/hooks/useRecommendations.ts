import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Recommendation } from '../types';

interface UseRecommendationsResult {
  data: Recommendation[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch pre-computed recommendations.
 * Following the cost-optimized NoSQL strategy:
 * 1. Try fetching specific user recommendations.
 * 2. Fallback to global trending if user-specific ones don't exist.
 * 3. Default to global trending for guests.
 */
export function useRecommendations(userId: string | null | undefined): UseRecommendationsResult {
  const [data, setData] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      setIsLoading(true);
      setError(null);

      try {
        let recommendations: Recommendation[] = [];

        // PART 1: Try Authenticated User Recommendation
        if (userId) {
          const userRecRef = doc(db, 'user_recommendations', userId);
          const userRecSnap = await getDoc(userRecRef);

          if (userRecSnap.exists()) {
            recommendations = userRecSnap.data().products || [];
          }
        }

        // PART 2: Fallback to Global Trending (or directly for Guests)
        if (recommendations.length === 0) {
          const globalRecRef = doc(db, 'ui_elements', 'global_trending');
          const globalRecSnap = await getDoc(globalRecRef);

          if (globalRecSnap.exists()) {
            recommendations = globalRecSnap.data().products || [];
          }
        }

        setData(recommendations);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, userId ? `user_recommendations/${userId}` : 'ui_elements/global_trending');
        setError(err.message || 'Error loading recommendations');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecommendations();
  }, [userId]);

  return { data, isLoading, error };
}
