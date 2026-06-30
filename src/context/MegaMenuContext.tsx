import React, { createContext, useContext, useState, useEffect } from "react";
import { defaultCategoriesData } from "../data/megaMenuData";
import { useShop } from "./ShopContext";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export interface MegaMenuLink {
  name: string;
  featuredProduct?: FeaturedProduct;
}

export interface MegaMenuSubcategory {
  name: string;
  image?: string;
  links: MegaMenuLink[];
}

export interface FeaturedProduct {
  productId: string;
}

export interface MegaMenuCategory {
  id: string;
  name: string;
  featuredProduct?: FeaturedProduct;
  sections: MegaMenuSubcategory[];
  iconUrl?: string; // custom uploaded icon
}

interface MegaMenuContextType {
  categoriesData: MegaMenuCategory[];
  isLoading: boolean;
  setCategoriesData: React.Dispatch<React.SetStateAction<MegaMenuCategory[]>>;
  updateFeaturedProduct: (categoryId: string, product: FeaturedProduct) => void;
  updateLinkFeaturedProduct: (
    categoryId: string,
    sectionName: string,
    linkName: string,
    product: FeaturedProduct | undefined
  ) => void;
  saveMegaMenuToFirestore: (customData?: MegaMenuCategory[]) => Promise<void>;
}

const MegaMenuContext = createContext<MegaMenuContextType | undefined>(undefined);

export const MegaMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { categoryHierarchy, refreshHierarchy } = useShop();
  const [categoriesData, setCategoriesData] = useState<MegaMenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const loadMegaMenu = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "settings", "megamenu");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().categoriesData) {
          if (!isCancelled) {
            setCategoriesData(docSnap.data().categoriesData);
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error fetching megamenu from Firestore, using local fallback:", err);
      }

      // Local fallback with hierarchy merge
      const saved = localStorage.getItem("olma_megamenu_data_v6");
      let existingData: MegaMenuCategory[] = [];
      if (saved) {
        try {
          existingData = JSON.parse(saved);
        } catch (e) {}
      }

      const catIdMap: Record<string, string> = {
        "Maison & Déco": "maison",
        Électronique: "electronique",
        Électroménager: "electromenager",
        Mode: "mode",
        "Beauté & Santé": "beaute",
        "Auto & Moto": "auto",
        "Sport & Loisirs": "sport",
        "Bébé & Puériculture": "bebe",
        "Bricolage & Outillage": "bricolage",
        "Jeux & Jouets": "jouets",
        Supermarché: "supermarche",
      };

      const newData: MegaMenuCategory[] = Object.entries(categoryHierarchy).map(([catName, subcats]) => {
        const existingCat = existingData.find((c) => c.name === catName);
        return {
          id: existingCat?.id || catIdMap[catName] || catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: catName,
          iconUrl: existingCat?.iconUrl,
          featuredProduct: existingCat?.featuredProduct,
          sections: Object.entries(subcats).map(([subcatName, links]) => {
            const existingSection = existingCat?.sections?.find((s) => s.name === subcatName);
            return {
              name: subcatName,
              image: existingSection?.image,
              links: links.map((linkName) => {
                const existingLink = existingSection?.links?.find((l) => l.name === linkName);
                return {
                  name: linkName,
                  featuredProduct: existingLink?.featuredProduct,
                };
              }),
            };
          }),
        };
      });

      if (!isCancelled) {
        setCategoriesData(newData);
        setIsLoading(false);
      }
    };

    loadMegaMenu();

    return () => {
      isCancelled = true;
    };
  }, [categoryHierarchy]);

  // Persist to localStorage as a fast cached layer
  useEffect(() => {
    if (categoriesData.length > 0) {
      localStorage.setItem("olma_megamenu_data_v6", JSON.stringify(categoriesData));
    }
  }, [categoriesData]);

  const saveMegaMenuToFirestore = async (customData?: MegaMenuCategory[]) => {
    const dataToSave = customData || categoriesData;
    try {
      toast.loading("Enregistrement du Mega Menu...", { id: "save-megamenu" });
      const docRef = doc(db, "settings", "megamenu");
      await setDoc(docRef, {
        categoriesData: dataToSave,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Synchronize back to categories taxonomy to keep order identical
      const hierarchyRef = doc(db, "settings", "categories");
      const newHierarchy: Record<string, Record<string, string[]>> = {};
      const sortOrder: string[] = [];

      dataToSave.forEach((cat) => {
        sortOrder.push(cat.name);
        const subMap: Record<string, string[]> = {};
        cat.sections.forEach((sec) => {
          subMap[sec.name] = sec.links.map((link) => link.name);
        });
        newHierarchy[cat.name] = subMap;
      });

      await setDoc(
        hierarchyRef,
        {
          hierarchy: newHierarchy,
          sortOrder: sortOrder,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await refreshHierarchy();

      toast.success("Mega Menu enregistré avec succès sur Firestore ! ✨🚀", { id: "save-megamenu" });
    } catch (err) {
      console.error("Error saving megamenu to Firestore:", err);
      toast.error("Erreur lors de la sauvegarde du Mega Menu", { id: "save-megamenu" });
    }
  };

  const updateFeaturedProduct = (categoryId: string, product: FeaturedProduct) => {
    setCategoriesData((current) =>
      current.map((cat) => (cat.id === categoryId ? { ...cat, featuredProduct: product } : cat))
    );
  };

  const updateLinkFeaturedProduct = (
    categoryId: string,
    sectionName: string,
    linkName: string,
    product: FeaturedProduct | undefined
  ) => {
    setCategoriesData((current) =>
      current.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          sections: cat.sections.map((sec) => {
            if (sec.name !== sectionName) return sec;
            return {
              ...sec,
              links: sec.links.map((link) => {
                if (link.name !== linkName) return link;
                return { ...link, featuredProduct: product };
              }),
            };
          }),
        };
      })
    );
  };

  return (
    <MegaMenuContext.Provider
      value={{
        categoriesData,
        isLoading,
        setCategoriesData,
        updateFeaturedProduct,
        updateLinkFeaturedProduct,
        saveMegaMenuToFirestore,
      }}
    >
      {children}
    </MegaMenuContext.Provider>
  );
};

export const useMegaMenu = () => {
  const context = useContext(MegaMenuContext);
  if (context === undefined) {
    throw new Error("useMegaMenu must be used within a MegaMenuProvider");
  }
  return context;
};
