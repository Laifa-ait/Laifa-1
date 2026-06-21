export interface FilterOption {
  value: string;
  label: string;
}

export interface DynamicFilterDef {
  id: string; // The attribute key, e.g., "size", "brand", "material"
  label: string; // The display label, e.g., "Taille", "Marque"
  type: "select" | "multiselect" | "radio" | "text" | "checkbox" | "number";
  unit?: string;
  options?: FilterOption[] | string[];
}

export interface CategoryStructure {
  id: string;
  name: string;
  allowed_filters: DynamicFilterDef[];
  hasSize?: boolean;
  hasColor?: boolean;
}

export const DYNAMIC_CATEGORIES: Record<string, CategoryStructure> = {
  "Mode & Vêtements": {
    id: "fashion",
    name: "Mode & Vêtements",
    hasSize: true,
    hasColor: true,
    allowed_filters: [
      {
        id: "material",
        label: "Matière principale",
        type: "multiselect",
        options: ["Coton", "Polyester", "Lin", "Cuir", "Laine", "Coton bio", "Coton recyclé", "Synthétique", "Autre"],
      },
      {
        id: "season",
        label: "Saison",
        type: "select",
        options: ["Printemps-Été", "Automne-Hiver", "Mi-saison", "Toutes saisons"],
      }
    ],
  },
  "Bébé & Puériculture": {
    id: "baby",
    name: "Bébé & Puériculture",
    hasSize: true,
    hasColor: true,
    allowed_filters: [
      {
        id: "material",
        label: "Matière principale",
        type: "multiselect",
        options: ["Coton", "Polyester", "Lin", "Cuir", "Laine", "Coton bio", "Coton recyclé", "Synthétique", "Autre"],
      },
      {
        id: "season",
        label: "Saison",
        type: "select",
        options: ["Printemps-Été", "Automne-Hiver", "Mi-saison", "Toutes saisons"],
      }
    ],
  },
  "Électronique": {
    id: "electronics",
    name: "Électronique",
    hasColor: true,
    allowed_filters: [
      {
        id: "power_type",
        label: "Type d'alimentation",
        type: "radio",
        options: ["Piles", "Secteur", "Rechargeable", "Solaire"],
      },
      {
        id: "connectivity",
        label: "Connectivité",
        type: "multiselect",
        options: ["Bluetooth", "Wi-Fi", "Filaire", "Sans fil"],
      },
      {
        id: "warranty",
        label: "Garantie (en mois)",
        type: "number",
      },
      {
        id: "power_capacity",
        label: "Capacité / Puissance",
        type: "text",
      },
    ],
  },
  "Électroménager": {
    id: "home_appliances",
    name: "Électroménager",
    hasColor: true,
    allowed_filters: [
      {
        id: "power_type",
        label: "Type d'alimentation",
        type: "radio",
        options: ["Secteur", "Rechargeable", "Piles"],
      },
      {
        id: "energy_class",
        label: "Classe énergétique",
        type: "select",
        options: ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"],
      },
      {
        id: "warranty",
        label: "Garantie (en mois)",
        type: "number",
      },
      {
        id: "capacity",
        label: "Capacité / Volume",
        type: "text",
      },
    ],
  },
  "Maison & Déco": {
    id: "home",
    name: "Maison & Déco",
    hasColor: true,
    allowed_filters: [
      {
        id: "style",
        label: "Style",
        type: "select",
        options: ["Moderne", "Scandinave", "Industriel", "Bohème", "Classique", "Minimaliste"],
      },
      {
        id: "material",
        label: "Matériau",
        type: "select",
        options: ["Bois", "Métal", "Verre", "Céramique", "Tissu", "Plastique", "Autre"],
      },
      {
        id: "dimensions",
        label: "Dimensions (L × l × H cm)",
        type: "text",
      },
      {
        id: "weight",
        label: "Poids (kg)",
        type: "number",
      }
    ]
  },
  "Beauté & Santé": {
    id: "beauty",
    name: "Beauté & Santé",
    allowed_filters: [
      {
        id: "skin_type",
        label: "Type de peau",
        type: "radio",
        options: ["Normale", "Sèche", "Grasse", "Mixte", "Tous types"],
      },
      {
        id: "capacity",
        label: "Contenance (ml ou g)",
        type: "text",
      },
      {
        id: "composition",
        label: "Compositions",
        type: "text",
      },
      {
        id: "certifications",
        label: "Certifications",
        type: "multiselect",
        options: ["Bio", "Vegan", "Cruelty-free", "Dermatologique"],
      },
      {
        id: "expiration",
        label: "Date de péremption",
        type: "text", // Could be just simple text or date
      }
    ]
  },
  "Auto & Moto - Accessoires": {
    id: "auto",
    name: "Auto & Moto - Accessoires",
    hasColor: true,
    allowed_filters: [
      {
        id: "accessory_type",
        label: "Type d'accessoire",
        type: "radio",
        options: ["Intérieur", "Extérieur", "Entretien", "Sécurité", "Électronique", "Confort", "Décoration", "Autre"],
      },
      {
        id: "compatibility",
        label: "Compatible",
        type: "radio",
        options: ["Voiture", "Moto", "Quad", "Scooter", "Universel"],
      },
      {
        id: "material",
        label: "Matériau principal",
        type: "select",
        options: ["Plastique", "Métal", "Tissu", "Cuir", "Caoutchouc", "Autre"],
      },
      {
        id: "fixing",
        label: "Fixation",
        type: "select",
        options: ["Autocollant", "Clip", "Ventouse", "À visser", "Sans fixation", "Autre"],
      },
      {
        id: "dimensions",
        label: "Dimensions (L × l × H cm)",
        type: "text",
      }
    ]
  },
  "Sport & Loisirs": {
    id: "sport",
    name: "Sport & Loisirs",
    hasColor: true,
    allowed_filters: [
      {
        id: "level",
        label: "Niveau",
        type: "select",
        options: ["Débutant", "Intermédiaire", "Confirmé", "Professionnel"],
      },
      {
        id: "terrain",
        label: "Terrain / Usage",
        type: "radio",
        options: ["Intérieur", "Extérieur", "Mixte"],
      },
      {
        id: "weight",
        label: "Poids du produit (kg)",
        type: "number",
      }
    ]
  },
  "Bricolage & Outillage": {
    id: "diy",
    name: "Bricolage & Outillage",
    allowed_filters: [
      {
        id: "power_type",
        label: "Type d'alimentation",
        type: "select",
        options: ["Manuel", "Électrique filaire", "Électrique sans fil", "Thermique"],
      },
      {
        id: "voltage",
        label: "Voltage / Tension (V)",
        type: "number",
      },
      {
        id: "material",
        label: "Matériau principal",
        type: "select",
        options: ["Acier", "Plastique", "Aluminium", "Bois"],
      },
      {
        id: "warranty",
        label: "Garantie (en mois)",
        type: "number",
      }
    ]
  },
  "Jeux & Jouets": {
    id: "toys",
    name: "Jeux & Jouets",
    allowed_filters: [
      {
        id: "age_group",
        label: "Tranche d'âge",
        type: "radio",
        options: ["0-2 ans", "3-5 ans", "6-8 ans", "9-12 ans", "13 ans et +"],
      },
      {
        id: "toy_type",
        label: "Type de jeu",
        type: "select",
        options: ["Éducatif", "Créatif", "Sportif", "Électronique", "Construction", "Société"],
      },
      {
        id: "players",
        label: "Nombre de joueurs",
        type: "text", // e.g. 2-4
      },
      {
        id: "safety",
        label: "Norme sécurité",
        type: "select",
        options: ["CE", "EN 71", "NF"],
      },
      {
        id: "batteries",
        label: "Piles requises",
        type: "radio",
        options: ["Oui", "Non"],
      },
      {
        id: "battery_type",
        label: "Type de piles (si oui)",
        type: "text",
      }
    ]
  },
  "Supermarché": {
    id: "supermarket",
    name: "Supermarché",
    hasColor: false,
    allowed_filters: [
      {
        id: "weight_volume",
        label: "Poids / Volume",
        type: "text",
      },
      {
        id: "dietary",
        label: "Régime Alimentaire",
        type: "multiselect",
        options: ["Bio", "Sans gluten", "Vegan", "Végétarien", "Halal"],
      },
      {
        id: "packaging",
        label: "Conditionnement",
        type: "select",
        options: ["Bouteille", "Boîte", "Sachet", "Lot", "Vrac"],
      }
    ]
  }
};
