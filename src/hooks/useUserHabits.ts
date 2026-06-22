import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Interface définissant la structure de nos données d'habitudes
export interface UserHabits {
  historique_recherches: string[];
  categories_visitees: Record<string, number>;
}

export function useUserHabits() {
  // 1. État pour vérifier si l'utilisateur a déjà répondu à la bannière de consentement
  const [aReponduConsentement, setAReponduConsentement] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("olma_consentement") !== null;
    }
    return false;
  });

  // 2. État pour le consentement actif (RGPD)
  const [consentementAccepte, setConsentementAccepte] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("olma_consentement") === "true";
    }
    return false;
  });

  // 3. État des habitudes de l'utilisateur
  const [habitudes, setHabitudes] = useState<UserHabits>(() => {
    // Sécurité : On vérifie que window existe (pour éviter le crash SSR)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("olma_habitudes");
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error("Erreur lors de la lecture du localStorage", error);
      }
    }
    return { historique_recherches: [], categories_visitees: {} };
  });

  // NEW: Sync with Firestore for authenticated users
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && consentementAccepte) {
        try {
          const userRef = doc(db, "user_habits", user.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const data = snap.data() as UserHabits;
            // Merge local and remote
            setHabitudes((prev) => {
              const mergedHabits: UserHabits = {
                historique_recherches: Array.from(
                  new Set([...prev.historique_recherches, ...(data.historique_recherches || [])])
                ).slice(0, 10),
                categories_visitees: { ...data.categories_visitees },
              };
              // Add counts from local to remote if they differ
              Object.entries(prev.categories_visitees).forEach(([cat, count]) => {
                mergedHabits.categories_visitees[cat] =
                  (mergedHabits.categories_visitees[cat] || 0) + (count as number);
              });
              return mergedHabits;
            });
          } else {
            // First time user, upload local habits
            await setDoc(userRef, habitudes);
          }
        } catch (e) {
          console.error("Firestore habits sync error:", e);
        }
      }
    });

    return () => unsub();
  }, [consentementAccepte]);

  // Synchronisation des habitudes avec le localStorage à chaque modification (si consentement donné)
  useEffect(() => {
    if (consentementAccepte && typeof window !== "undefined") {
      localStorage.setItem("olma_habitudes", JSON.stringify(habitudes));

      // Also update Firestore if logged in (debounced ideally, but here direct for simplicity)
      if (auth.currentUser) {
        const userRef = doc(db, "user_habits", auth.currentUser.uid);
        setDoc(userRef, habitudes, { merge: true }).catch((err) =>
          (process.env.NODE_ENV === "debug" ? console.log : function () {})("Habits up error", err)
        );
      }
    }
  }, [habitudes, consentementAccepte]);

  // Fonctions de gestion du consentement
  const accepterConsentement = () => {
    setConsentementAccepte(true);
    setAReponduConsentement(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("olma_consentement", "true");
    }
  };

  const refuserConsentement = () => {
    setConsentementAccepte(false);
    setAReponduConsentement(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("olma_consentement", "false");
      // On peut aussi nettoyer les anciennes données si l'utilisateur refuse.
      localStorage.removeItem("olma_habitudes");
      setHabitudes({ historique_recherches: [], categories_visitees: {} });
    }
  };

  // Fonction de tracking : Clic sur une catégorie
  const trackCategorie = (categorieId: string) => {
    if (!consentementAccepte) return; // Pas de tracking sans consentement

    setHabitudes((prev) => {
      const currentCount = prev.categories_visitees[categorieId] || 0;
      return {
        ...prev,
        categories_visitees: {
          ...prev.categories_visitees,
          [categorieId]: currentCount + 1,
        },
      };
    });
  };

  // Fonction de tracking : Soumission d'une recherche
  const trackRecherche = (motCle: string) => {
    const terme = motCle.trim();
    if (!consentementAccepte || !terme) return;

    setHabitudes((prev) => {
      // Ajoute le nouveau terme au début, en supprimant les doublons, max 5 éléments
      const historiquePropre = prev.historique_recherches.filter((k) => k.toLowerCase() !== terme.toLowerCase());
      const nvxHistorique = [terme, ...historiquePropre].slice(0, 5);

      return {
        ...prev,
        historique_recherches: nvxHistorique,
      };
    });
  };

  // Algorithme d'extraction de la catégorie favorite avec tolérance au bruit
  const getCategorieFavorite = (): string | null => {
    // Check if there is a simulated/forced category in session storage for presentation review
    const forced = typeof window !== "undefined" ? sessionStorage.getItem("olma_simulated_category") : null;
    if (forced) return forced;

    const categories = Object.entries(habitudes.categories_visitees);
    if (categories.length === 0) return null;

    // Trie pour trouver celle avec le plus grand compte
    categories.sort((a, b) => (b[1] as number) - (a[1] as number));
    return categories[0][0]; // Retourne la clé de la catégorie favorite
  };

  // Helper pour obtenir la liste complète des catégories triées par préférence de l'utilisateur
  const getSortedCategories = (defaultCategories: string[]): string[] => {
    const favorite = getCategorieFavorite();
    if (!favorite) return defaultCategories;

    // Placer la favorite en premier, puis les autres
    const filtered = defaultCategories.filter((cat) => cat !== favorite);
    return [favorite, ...filtered];
  };

  // Permet de simuler/forcer instantanément une catégorie pour tester la personnalisation sans clic répété
  const forceCategorieFavorite = (category: string | null) => {
    if (typeof window !== "undefined") {
      if (category) {
        sessionStorage.setItem("olma_simulated_category", category);
        // Also feed habits state to keep them aligned
        setHabitudes((prev) => ({
          ...prev,
          categories_visitees: {
            ...prev.categories_visitees,
            [category]: (prev.categories_visitees[category] || 0) + 10,
          },
        }));
      } else {
        sessionStorage.removeItem("olma_simulated_category");
      }
    }
  };

  const clearHabits = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("olma_habitudes");
      sessionStorage.removeItem("olma_simulated_category");
      setHabitudes({ historique_recherches: [], categories_visitees: {} });
    }
  };

  return {
    consentementAccepte,
    aReponduConsentement,
    accepterConsentement,
    refuserConsentement,
    trackCategorie,
    trackRecherche,
    getCategorieFavorite,
    getSortedCategories,
    forceCategorieFavorite,
    clearHabits,
    categoriesVisiteesCount: habitudes.categories_visitees,
    historiqueRecherches: habitudes.historique_recherches,
  };
}
