import { Product, Language } from "../types";

export function getTranslatedField(product: Product, field: 'name' | 'description', lang: Language): string {
  if (product.translations && product.translations[lang] && product.translations[lang][field]) {
    return product.translations[lang][field];
  }
  return (product as any)[field] || "";
}

export const getCategoryTranslation = (text: string, t: any) => {
  if (!text) return "";
  
  // Handle special cases for the "All Categories" filter
  if (text === "Tous" || text === "all" || text === "Toutes" || text === "Toutes les catégories") {
    return t("all_categories") || "Toutes les catégories";
  }

  // Use the raw text as the key. i18next will return the translation if it exists,
  // or the raw text (the key) if it doesn't, which is exactly what we want for French.
  return t(text);
};
