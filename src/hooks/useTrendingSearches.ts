import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const CACHE_KEY = "olma_trending_searches";
const CACHE_EXPIRATION_MS = 1 * 60 * 60 * 1000; // 1 heure (R20)

export const useTrendingSearches = () => {
  const { t } = useTranslation();

  const getFallbackTrends = () => [
    t("trending.tapis", "Tapis Berbère"),
    t("trending.robe", "Robe Kabyle"),
    t("trending.poterie", "Poterie"),
    t("trending.bijoux", "Bijoux en Argent"),
    t("trending.burnous", "Burnous"),
    t("trending.tajine", "Tajine Algérien")
  ];

  const [trends, setTrends] = useState<string[]>([]);

  useEffect(() => {
    // Initialise avec les fallbacks traduits pour éviter l'état vide
    setTrends(getFallbackTrends());

    const fetchTrends = async () => {
      const fallbacks = getFallbackTrends();
      try {
        let cached: string | null = null;
        try {
          cached = localStorage.getItem(CACHE_KEY);
        } catch (err) {
          console.warn("localStorage read blocked in useTrendingSearches:", err);
        }

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Si le cache a moins d'une heure, on l'utilise sans appel à la base de données
          if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
            setTrends(data);
            return;
          }
        }

        // Sinon, on fait UNE SEULE lecture serveur
        const docRef = doc(db, "platform_stats", "trending_searches");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().terms && Array.isArray(docSnap.data().terms)) {
          const fetchedTrends = docSnap.data().terms.slice(0, 8);
          setTrends(fetchedTrends);
          // On sauvegarde en cache avec l'heure exacte
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                data: fetchedTrends,
                timestamp: Date.now(),
              })
            );
          } catch (err) {
            console.warn("localStorage write failed in useTrendingSearches:", err);
          }
        } else {
          // Si pas de document, on cache les valeurs de secours pour éviter d'autres lectures inutiles
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                data: fallbacks,
                timestamp: Date.now(),
              })
            );
          } catch (err) {
            console.warn("localStorage fallback write failed in useTrendingSearches:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching trending searches from Firestore platform_stats:", error);
      }
    };

    fetchTrends();
  }, [t]);

  return trends;
};
