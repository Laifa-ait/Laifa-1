import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const FALLBACK_TRENDS = [
  "Tapis Berbère",
  "Robe Kabyle",
  "Poterie",
  "Bijoux en Argent",
  "Burnous",
  "Tajine Algérien"
];

const CACHE_KEY = 'olma_trending_searches';
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 heures

export const useTrendingSearches = () => {
  const [trends, setTrends] = useState<string[]>(FALLBACK_TRENDS);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Si le cache a moins de 24 heures, on l'utilise sans appel à la base de données
          if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
            setTrends(data);
            return;
          }
        }

        // Sinon, on fait UNE SEULE lecture serveur
        const docRef = doc(db, 'platform_stats', 'trending_searches');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().terms && Array.isArray(docSnap.data().terms)) {
          const fetchedTrends = docSnap.data().terms.slice(0, 8);
          setTrends(fetchedTrends);
          // On sauvegarde en cache avec l'heure exacte
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: fetchedTrends,
            timestamp: Date.now()
          }));
        } else {
          // Si pas de document, on cache les valeurs de secours pour éviter d'autres lectures inutiles
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: FALLBACK_TRENDS,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error("Error fetching trending searches:", error);
      }
    };

    fetchTrends();
  }, []);

  return trends;
};
