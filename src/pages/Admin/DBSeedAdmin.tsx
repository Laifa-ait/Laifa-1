import React, { useState } from 'react';
import { Database, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, deleteDoc, doc, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

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
    name: "Jus d'Orange Pressé",
    price: 350,
    category: "Supermarché",
    description: "Jus d'orange 100% naturel sans sucre ajouté.",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Alger",
    stock: 120,
    rating: 4.9,
    tags: ["Supermarché", "Jus", "Boisson"]
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
    rating: 5,
    tags: ["Tapis", "Handmade", "Constantine"]
  },
  {
    name: "Machine à Café Espresso DZ",
    price: 45000,
    category: "Électronique & Électroménager",
    description: "Performances professionnelles pour votre cuisine.",
    image: "https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?q=80&w=1000&auto=format&fit=crop",
    wilaya: "Oran",
    stock: 15,
    rating: 4.6,
    tags: ["Cuisine", "Tech", "Café"]
  }
];

export const DBSeedAdmin: React.FC = () => {
    const { t } = useTranslation();
    const [seeding, setSeeding] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleSeed = async () => {
        setSeeding(true);
        const tId = toast.loading("Injection des produits (Seed) en cours...");
        try {
            for (const product of SAMPLE_PRODUCTS) {
                await addDoc(collection(db, "products"), {
                    ...product,
                    sellerId: "admin_seed",
                    sellerName: "Boutique Officielle",
                    originalPrice: Math.round(product.price * 1.2), // create a fake discount
                    currency: "DZD",
                    status: "active",
                    media: [{ url: product.image, type: 'image' }],
                    translations: {
                        en: { name: product.name, description: product.description },
                        ar: { name: product.name, description: product.description } // Mock translations for seed
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            toast.success("Produits de démonstration insérés avec succès !", { id: tId });
        } catch (error) {
            console.error(error);
            toast.error("Échec de l'insertion.", { id: tId });
        } finally {
            setSeeding(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer tous les produits de type 'admin_seed' ?")) return;

        setClearing(true);
        const tId = toast.loading("Suppression des produits (Seed)...");
        try {
            const q = query(collection(db, "products"), where("sellerId", "==", "admin_seed"), limit(500));
            const snapshots = await getDocs(q);
            
            if (snapshots.empty) {
                toast.success("Aucun produit de démonstration trouvé.", { id: tId });
                setClearing(false);
                return;
            }

            const deletePromises = snapshots.docs.map(d => deleteDoc(doc(db, "products", d.id)));
            await Promise.all(deletePromises);
            
            toast.success(`${snapshots.size} produits supprimés avec succès !`, { id: tId });
        } catch (error) {
            console.error(error);
            toast.error("Échec de la suppression.", { id: tId });
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-zinc-900 tracking-tighter rtl:tracking-normal uppercase">{t("Base de données")}</h1>
                <p className="text-zinc-500 font-medium mt-2">{t("Gérez les données de démonstration (Seed) pour le catalogue produit Olma.")}</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-200/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 end-0 p-12 opacity-[0.03] pointer-events-none">
                    <Database className="w-64 h-64" />
                </div>
                
                <div className="relative z-10 space-y-8">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                            <Database className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-zinc-900">{t("Remplissage Automatique (Seed)")}</h3>
                            <p className="text-sm font-medium text-zinc-500 mt-1 max-w-lg leading-relaxed">
                                {t("Injectez 5 produits phares du terroir algérien (Miel de Ghardaïa, Vase d'Aït Yenni, Tapis de Constantine...) pour peupler immédiatement la marketplace sans créer de vrais comptes vendeurs.")}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                        <button
                            onClick={handleSeed}
                            disabled={seeding || clearing}
                            className="w-full sm:w-auto px-8 py-4 bg-zinc-950 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-950/10 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {seeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {seeding ? "Injection..." : "Générer les Produits"}
                        </button>

                        <button
                            onClick={handleClear}
                            disabled={seeding || clearing}
                            className="w-full sm:w-auto px-8 py-4 bg-red-50 text-red-600 border border-red-200 rounded-3xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal hover:bg-red-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {clearing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            {clearing ? "Suppression..." : "Nettoyer le Seed"}
                        </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mt-6">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                            {t("Ces produits seront créés sous l'identifiant vendeur restreint \"")}<span className="font-black">{t("admin_seed")}</span>{t("\". Le bouton de suppression automatique nettoiera uniquement les produits liés à ce faux vendeur.")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
