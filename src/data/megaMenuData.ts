import { PRODUCT_HIERARCHY } from "../constants";
import { MegaMenuCategory } from "../context/MegaMenuContext";

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

export const defaultCategoriesData: MegaMenuCategory[] = Object.entries(PRODUCT_HIERARCHY).map(([catName, subcats]) => {
  return {
    id: catIdMap[catName] || catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: catName,
    sections: Object.entries(subcats).map(([subcatName, links]) => ({
      name: subcatName,
      links: links.map((linkName) => ({ name: linkName })),
    })),
  };
});
