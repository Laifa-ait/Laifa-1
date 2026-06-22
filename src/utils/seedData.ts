import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, limit } from 'firebase/firestore';

const SAMPLE_PRODUCTS = [
  {
    name: "Canapé Modular 'Atlas'",
    price: 145000,
    category: "Maison & Déco",
    description: "Un canapé moderne inspiré par les paysages de l'Atlas. Tissu premium et confort absolu.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Alger",
    stock: 5,
    rating: 4.8,
    tags: ["Premium", "Salon", "Moderne"]
  },
  {
    name: "Vase en Céramique d'Ait Yenni",
    price: 12500,
    category: "Supermarché",
    description: "Produits de tous les jours. Chaque pièce est unique et authentique.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Tizi Ouzou",
    stock: 12,
    rating: 4.9,
    tags: ["Supermarché", "Déco", "Tradition"]
  },
  {
    name: "Lampe 'Sahara Glow'",
    price: 32000,
    category: "Luminaires",
    description: "Une lumière d'ambiance qui rappelle les couchers de soleil du Sahara.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Ghardaïa",
    stock: 8,
    rating: 4.7,
    tags: ["Lumière", "Ambiance", "Design"]
  },
  {
    name: "Tapis Zindkh de Constantine",
    price: 85000,
    category: "Tapis",
    description: "Tapis tissé main selon la tradition séculaire de l'Est Algérien.",
    image: "https://images.unsplash.com/photo-1543332164-6e82f355badc?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Constantine",
    stock: 2,
    rating: 5.0,
    tags: ["Tapis", "Handmade", "Constantine"]
  },
  {
    name: "Machine à Café Espresso DZ",
    price: 45000,
    category: "Électroménager",
    description: "Performances professionnelles pour votre cuisine.",
    image: "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Oran",
    stock: 15,
    rating: 4.6,
    tags: ["Cuisine", "Tech", "Café"]
  }
];

export const seedProducts = async () => {
  const productsQuery = query(collection(db, "products"), limit(1));
  const snapshot = await getDocs(productsQuery);
  
  if (snapshot.empty) {
    (process.env.NODE_ENV === 'debug' ? console.log : function(){})("Seeding products...");
    for (const product of SAMPLE_PRODUCTS) {
      await addDoc(collection(db, "products"), {
        ...product,
        sellerId: "admin_seed",
        createdAt: serverTimestamp()
      });
    }
    return true;
  }
  return false;
};
