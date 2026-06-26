import { Product } from "../types";

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Robe Kabyle Traditionnelle', price: 12000, promoPrice: 9500, category: 'Mode', image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?q=80&w=800', sellerName: 'Artisanat Béjaïa', rating: 4.8, description: 'Robe traditionnelle kabyle faite main.', stock: 15, sellerId: 's1', wilaya: '15', status: 'approved' },
  { id: 'p2', name: 'Service à Thé en Cuivre', price: 8500, category: 'Maison', image: 'https://images.unsplash.com/photo-1571939100310-85f67ed77839?q=80&w=800', sellerName: 'Dzair Copper', rating: 4.5, description: 'Service à thé en cuivre martelé.', stock: 10, sellerId: 's2', wilaya: '16', status: 'approved' },
  { id: 'p3', name: 'Smartphone Pro Max', price: 145000, promoPrice: 139000, category: 'Électronique', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800', sellerName: 'Digital Dz', rating: 4.9, description: 'Smartphone haute performance.', stock: 50, sellerId: 's3', wilaya: '16', status: 'approved' },
  { id: 'p4', name: 'Tapis Berbère Authentique', price: 25000, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1534889156217-d3c8ef4caac2?q=80&w=800', sellerName: 'Ghardaia Rugs', rating: 4.7, description: 'Tapis en laine naturelle fait main.', stock: 5, sellerId: 's4', wilaya: '47', status: 'approved' },
  { id: 'p5', name: 'Parfum Sahara Night', price: 4500, promoPrice: 3800, category: 'Beauté & Santé', image: 'https://images.unsplash.com/photo-1541643600914-78b08450322b?q=80&w=800', sellerName: 'Olma Beauty', rating: 4.6, description: 'Fragrance intense et orientale.', stock: 100, sellerId: 's5', wilaya: '16', status: 'approved' },
  { id: 'p6', name: 'Plat à Couscous Décoratif', price: 3200, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?q=80&w=800', sellerName: 'Constantine Arts', rating: 4.4, description: 'Plat en terre cuite peinte.', stock: 20, sellerId: 's6', wilaya: '25', status: 'approved' },
  { id: 'p7', name: 'Boutons d\'Argent Massif', price: 15000, promoPrice: 12500, category: 'Mode', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=800', sellerName: 'Bijoux Tizi', rating: 4.7, description: 'Bijoux traditionnels en argent pur.', stock: 8, sellerId: 's7', wilaya: '15', status: 'approved' },
  { id: 'p8', name: 'Machine à Café Expresso', price: 18000, category: 'Électroménager', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=800', sellerName: 'Moulinex Store', rating: 4.5, description: 'Expresso parfait à chaque tasse.', stock: 12, sellerId: 's8', wilaya: '16', status: 'approved' },
  { id: 'p9', name: 'Vase Céramique Traditionnelle', price: 5500, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?q=80&w=800', sellerName: 'Tipaza Pottery', rating: 4.3, description: 'Céramique inspirée de l\'histoire.', stock: 15, sellerId: 's9', wilaya: '42', status: 'approved' },
  { id: 'p10', name: 'Crème Visage Argan Bio', price: 2500, promoPrice: 1900, category: 'Beauté & Santé', image: 'https://images.unsplash.com/photo-1608248597481-496100c8c836?q=80&w=800', sellerName: 'Bio Sud', rating: 4.8, description: 'Soit hydratant et naturel.', stock: 30, sellerId: 's10', wilaya: '09', status: 'approved' },
  { id: 'p11', name: 'Djellaba Moderne Homme', price: 7800, category: 'Mode', image: 'https://plus.unsplash.com/premium_photo-1664201890375-f8fa405ad3ef?q=80&w=800', sellerName: 'Tlemcen Couture', rating: 4.6, description: 'Style contemporain et tradition.', stock: 25, sellerId: 's11', wilaya: '13', status: 'approved' },
  { id: 'p12', name: 'Miroir Artisanal en Osier', price: 4200, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=800', sellerName: 'Osier Design', rating: 4.4, description: 'Décoration naturelle et bohème.', stock: 18, sellerId: 's12', wilaya: '16', status: 'approved' },
  { id: 'p13', name: 'Coffret Huiles Essentielles', price: 5600, promoPrice: 4900, category: 'Beauté & Santé', image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=800', sellerName: 'Atlas Oils', rating: 4.9, description: 'Pureté des montagnes de l\'Atlas.', stock: 40, sellerId: 's13', wilaya: '06', status: 'approved' },
  { id: 'p14', name: 'Lampe en Cuivre Martelé', price: 12500, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1542718231-64d846c10565?q=80&w=800', sellerName: 'Lumières d\'Alger', rating: 4.7, description: 'Éclairage d\'ambiance artisanal.', stock: 10, sellerId: 's14', wilaya: '16', status: 'approved' },
  { id: 'p15', name: 'Table Basse Orientale', price: 45000, promoPrice: 38000, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1565412866411-886ecf130d29?q=80&w=800', sellerName: 'Meubles Azur', rating: 4.5, description: 'Bois noble travaillé finement.', stock: 5, sellerId: 's15', wilaya: '16', status: 'approved' },
  { id: 'p16', name: 'Théière en Argent Ciselé', price: 22000, category: 'Maison & Déco', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=800', sellerName: 'Argent d\'Oran', rating: 4.8, description: 'La quintessence du service à thé.', stock: 3, sellerId: 's16', wilaya: '31', status: 'approved' },
];

// Memory cache disabled in favor of SWR (Stale-While-Revalidate)
class LocalMemoryCache {
  set(key: string, data: any, durationMs = 300000) {}
  get(key: string): any | null { return null; }
  clear() {}
}

export const cacheEngine = new LocalMemoryCache();

/**
 * Returns a gorgeous customized message in dev mode of the active safe-by-design layer
 */
export function handleDevQuotaLogger(context: string, isFromCache: boolean) {
  if (process.env.NODE_ENV === "development") {
    (process.env.NODE_ENV === 'development' ? console.log : function(){})(
      `%c[Olma Dev-Safe Layer] %c${context} %c${isFromCache ? "⚡ SWR CACHED" : "📦 LIVE (Firestore)"}`,
      "color: #C95D3B; font-weight: bold;",
      "color: inherit;",
      isFromCache ? "color: #38bdf8; font-weight: bold;" : "color: #34d399; font-weight: bold;"
    );
  }
}
