import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { defaultCategoriesData } from '../data/megaMenuData';
import { useShop } from './ShopContext';

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
}

interface MegaMenuContextType {
  categoriesData: MegaMenuCategory[];
  updateFeaturedProduct: (categoryId: string, product: FeaturedProduct) => void;
  updateLinkFeaturedProduct: (categoryId: string, sectionName: string, linkName: string, product: FeaturedProduct | undefined) => void;
}

const MegaMenuContext = createContext<MegaMenuContextType | undefined>(undefined);

export const MegaMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { categoryHierarchy } = useShop();

  const [categoriesData, setCategoriesData] = useState<MegaMenuCategory[]>([]);

  useEffect(() => {
    // Merge Hierarchy with existing featured products from local storage if any
    const saved = localStorage.getItem('olma_megamenu_data_v6');
    let existingData: MegaMenuCategory[] = [];
    if (saved) {
      try {
        existingData = JSON.parse(saved);
      } catch (e) {}
    }

    const catIdMap: Record<string, string> = {
      "Maison & Déco": "maison",
      "Électronique": "electronique",
      "Électroménager": "electromenager",
      "Mode": "mode",
      "Beauté & Santé": "beaute",
      "Auto & Moto": "auto",
      "Sport & Loisirs": "sport",
      "Bébé & Puériculture": "bebe",
      "Bricolage & Outillage": "bricolage",
      "Jeux & Jouets": "jouets",
      "Supermarché": "supermarche"
    };

    const newData: MegaMenuCategory[] = Object.entries(categoryHierarchy).map(([catName, subcats]) => {
      const existingCat = existingData.find(c => c.name === catName);
      return {
        id: existingCat?.id || catIdMap[catName] || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: catName,
        featuredProduct: existingCat?.featuredProduct,
        sections: Object.entries(subcats).map(([subcatName, links]) => {
           const existingSection = existingCat?.sections?.find(s => s.name === subcatName);
           return {
             name: subcatName,
             image: existingSection?.image,
             links: links.map(linkName => {
                const existingLink = existingSection?.links?.find(l => l.name === linkName);
                return { 
                  name: linkName,
                  featuredProduct: existingLink?.featuredProduct
                };
             })
           };
        })
      };
    });

    setCategoriesData(newData);
  }, [categoryHierarchy]);

  useEffect(() => {
    if (categoriesData.length > 0) {
      localStorage.setItem('olma_megamenu_data_v6', JSON.stringify(categoriesData));
    }
  }, [categoriesData]);

  const updateFeaturedProduct = (categoryId: string, product: FeaturedProduct) => {
    setCategoriesData(current =>
      current.map(cat => 
        cat.id === categoryId 
          ? { ...cat, featuredProduct: product }
          : cat
      )
    );
  };

  const updateLinkFeaturedProduct = (categoryId: string, sectionName: string, linkName: string, product: FeaturedProduct | undefined) => {
    setCategoriesData(current => 
      current.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          sections: cat.sections.map(sec => {
            if (sec.name !== sectionName) return sec;
            return {
              ...sec,
              links: sec.links.map(link => {
                if (link.name !== linkName) return link;
                return { ...link, featuredProduct: product };
              })
            };
          })
        };
      })
    );
  };

  return (
    <MegaMenuContext.Provider value={{ categoriesData, updateFeaturedProduct, updateLinkFeaturedProduct }}>
      {children}
    </MegaMenuContext.Provider>
  );
};

export const useMegaMenu = () => {
  const context = useContext(MegaMenuContext);
  if (context === undefined) {
    throw new Error('useMegaMenu must be used within a MegaMenuProvider');
  }
  return context;
};
