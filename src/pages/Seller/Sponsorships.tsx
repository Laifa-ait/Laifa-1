import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Star, CheckCircle2, ChevronRight, Search, ShieldAlert, BadgeInfo, Zap, Clock, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types';
import { toast } from 'react-hot-toast';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

export const SellerSponsorships: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sponsorshipRequests, setSponsorshipRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [agreedToConditions, setAgreedToConditions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSponsorshipData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { limit } = await import('firebase/firestore');
      // 1. Fetch products
      const q = query(
        collection(db, 'products'),
        where('sellerId', '==', currentUser.uid),
        limit(500)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(data);

      // 2. Fetch requests
      const reqQ = query(
        collection(db, 'sponsorship_requests'),
        where('sellerId', '==', currentUser.uid),
        limit(100)
      );
      const reqSnapshot = await getDocs(reqQ);
      const reqData = reqSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSponsorshipRequests(reqData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsorshipData();
  }, [currentUser]);

  const handleOpenConditions = (product: Product) => {
    setSelectedProduct(product);
    setAgreedToConditions(false);
    setShowConditionsModal(true);
  };

  const handleSubmitSponsorship = async () => {
    if (!agreedToConditions || !selectedProduct || !currentUser || !userProfile) {
      toast.error("Vous devez accepter les conditions pour continuer.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'sponsorship_requests'), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productImage: selectedProduct.image,
        sellerId: currentUser.uid,
        sellerName: userProfile.storeName || userProfile.displayName || "Vendeur Inconnu",
        status: 'pending',
        tier: 'gold', // Standard tier
        requestDate: serverTimestamp(),
      });
      
      toast.success("Demande de sponsoring envoyée avec succès. OLMART examinera votre demande.");
      setShowConditionsModal(false);
      await fetchSponsorshipData();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi de la demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight rtl:tracking-normal text-zinc-950 flex items-center gap-4">
            <Megaphone className="w-10 h-10 text-orange-500" />
            {t("Sponsoring & Visibilité")}</h2>
          <p className="text-zinc-500 font-medium font-sans mt-2">{t("Boostez vos ventes en plaçant vos produits en tête de liste sur OLMART.")}</p>
        </div>
      </div>

      {/* Guide explicatif du programme de Sponsoring */}
      <div className="bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-white rounded-[3rem] border border-orange-100 p-6 sm:p-10 space-y-8">
        <div className="flex items-center gap-3.5 border-b border-orange-100 pb-5">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Comment fonctionne le Sponsoring OLMART ?")}</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider rtl:tracking-normal mt-1.5">{t("Comprendre notre algorithme de mise en avant et notre processus d'approbation")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Les Mécaniques de Visibilité */}
          <div className="space-y-5">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" /> {t("1. Effets sur la visibilité")}</h4>
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm border border-zinc-100 p-4 rounded-2xl flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-extrabold shrink-0">
                  <Zap className="w-5 h-5 fill-orange-500 text-orange-500" />
                </div>
                <div>
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Badge Premium & Mise en Avant")}</h5>
                  <p className="text-xs text-zinc-500 mt-1">{t("Vos produits reçoivent le badge lumineux")}<strong className="text-orange-600 font-black">{t("\"Sponsorisé\"")}</strong>{t(", augmentant considérablement le taux de clic (CTR).")}</p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-zinc-100 p-4 rounded-2xl flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-extrabold shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Boost de l'Algorithme de Tri")}</h5>
                  <p className="text-xs text-zinc-500 mt-1">{t("Tous les produits sponsorisés approuvés sont prioritaires et s'affichent")}<strong className="text-orange-600 font-black">{t("systématiquement tout en haut")}</strong> {t("des rayons, des recherches et des collections.")}</p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-zinc-100 p-4 rounded-2xl flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-extrabold shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Tri Équitable et Aléatoire")}</h5>
                  <p className="text-xs text-zinc-500 mt-1">{t("Si plusieurs vendeurs sponsorisent des produits dans la même catégorie, ils tournent équitablement pour garantir à chacun d'entre vous des opportunités de vente similaires.")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Les Étapes et Processus */}
          <div className="space-y-5">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> {t("2. Parcours de validation (étape par étape)")}</h4>
            <div className="space-y-4">
              <div className="flex gap-4 relative">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-black text-xs">1</div>
                  <div className="w-0.5 h-full bg-orange-100" />
                </div>
                <div className="pb-4">
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Soumission de la demande")}</h5>
                  <p className="text-xs text-zinc-500 mt-0.5">{t("Choisissez le produit ci-dessous, lisez et signez nos conditions d'engagement énumérées.")}</p>
                </div>
              </div>

              <div className="flex gap-4 relative">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">2</div>
                  <div className="w-0.5 h-full bg-orange-100" />
                </div>
                <div className="pb-4">
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Validation par l'équipe administrative (24h/48h)")}</h5>
                  <p className="text-xs text-zinc-500 mt-0.5">{t("L'équipe examine la qualité de vos visuels et de vos descriptions. Le respect des prix réels du marché en Algérie est un critère primordial pour éviter la tromperie.")}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">3</div>
                </div>
                <div>
                  <h5 className="font-extrabold text-sm text-zinc-950">{t("Activation & Suivi Qualité")}</h5>
                  <p className="text-xs text-zinc-500 mt-0.5">{t("Une fois actif, le sponsoring reste en place. Cependant, si le taux de rejet ou de retour (RTO) de vos commandes augmente, l'équipe admin peut révoquer l'accès pour protéger l'expérience d'achat.")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <h3 className="text-xl font-black text-zinc-950 uppercase tracking-widest rtl:tracking-normal">{t("Choisir un produit à sponsoriser")}</h3>
           <div className="relative w-full md:w-96">
             <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" />
             <input 
               type="text"
               className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:border-orange-500 transition-colors"
               placeholder={t("Rechercher dans votre catalogue...") || "Rechercher dans votre catalogue..."}
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-zinc-100 rounded-3xl" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">
            {t("Aucun produit trouvé.")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const productRequests = sponsorshipRequests.filter(r => r.productId === product.id);
              const pendingRequest = productRequests.find(r => r.status === 'pending');
              const approvedRequest = productRequests.find(r => r.status === 'approved');
              const isCurrentlySponsored = product.isSponsored || !!approvedRequest;

              return (
                <div key={product.id} className="border border-zinc-100 rounded-[2rem] p-4 flex gap-4 hover:shadow-lg hover:border-orange-100 transition-all bg-white group">
                  <img loading="lazy" src={getOptimizedImageUrl(product.image, 200) || 'https://via.placeholder.com/150'} alt={product.name} className="w-24 h-24 rounded-2xl object-cover shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0 py-1">
                    <h4 className="font-black text-sm text-zinc-950 truncate" title={product.name}>{product.name}</h4>
                    <p className="text-xs font-black text-orange-600 mt-1">{product.price} {t("DA")}</p>
                    
                    <div className="mt-auto">
                      {isCurrentlySponsored ? (
                        <div className="w-full mt-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] uppercase font-black tracking-widest rtl:tracking-normal text-center flex items-center justify-center gap-1.5 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {t("Sponsorisé Actif")}</div>
                      ) : pendingRequest ? (
                        <div className="w-full mt-3 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-[10px] uppercase font-black tracking-widest rtl:tracking-normal text-center flex items-center justify-center gap-1.5 border border-orange-100">
                          <Clock className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                          {t("En Attente d'Approbation")}</div>
                      ) : (
                        <button 
                          onClick={() => handleOpenConditions(product)}
                          className="w-full mt-3 py-2.5 rounded-xl bg-zinc-950 text-white text-[10px] uppercase font-black tracking-widest rtl:tracking-normal hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
                        >
                          <Zap className="w-3.5 h-3.5 text-orange-400" />
                          {t("Sponsoriser")}</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requests History */}
      {sponsorshipRequests.length > 0 && (
        <div className="bg-zinc-50 rounded-[3rem] p-10 border border-zinc-100">
          <h3 className="text-xl font-black text-zinc-950 uppercase tracking-widest rtl:tracking-normal mb-6">{t("Suivi de vos demandes")}</h3>
          <div className="space-y-4">
            {sponsorshipRequests.map((req) => {
                  
                  return (
                              <div key={req.id} className="bg-white border border-zinc-100 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                  <img loading="lazy" src={getOptimizedImageUrl(req.productImage, 100) || 'https://via.placeholder.com/150'} alt={req.productName} className="w-12 h-12 rounded-xl object-cover" />
                                  <div>
                                    <h4 className="font-extrabold text-sm text-zinc-950">{req.productName}</h4>
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      {t("Demandé le :")}{req.requestDate?.toDate ? req.requestDate.toDate().toLocaleDateString('fr-FR') : 'Date Inconnue'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rtl:tracking-normal rounded-lg ${
                                    req.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    'bg-red-50 text-red-600 border border-red-100'
                                  }`}>
                                    {req.status === 'pending' ? 'En Attente' : req.status === 'approved' ? 'Actif' : 'Rejeté'}
                                  </span>
                                </div>
                              </div>
                            );
                })}
          </div>
        </div>
      )}

      {/* T&C Modal */}
      <AnimatePresence>
        {showConditionsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          >
            <motion.div 
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 20 }}
               className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
               <div className="p-8 border-b border-zinc-100 bg-zinc-50 flex items-center gap-4 shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-zinc-950 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Formulaire d'engagement Sponsoring")}</h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-2">{selectedProduct?.name}</p>
                  </div>
               </div>

               <div className="p-8 overflow-y-auto space-y-6 flex-1 text-sm font-medium text-zinc-600">
                 <p className="font-bold text-zinc-900 border-l-4 border-orange-500 pl-4 py-1 bg-orange-50/50">
                    {t("Veuillez lire attentivement nos conditions avant de demander un placement sponsorisé. OLMART se réserve le droit d'approuver ou de refuser toute demande.")}</p>
                 
                 <div className="space-y-4">
                   <div className="bg-zinc-50 p-5 rounded-2xl">
                     <h4 className="font-black text-zinc-900 text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 mb-2"><BadgeInfo className="w-4 h-4 text-orange-500" /> {t("1. Qualité du format")}</h4>
                     <p>{t("Le produit doit présenter des images de haute qualité, sans textes superposés, ni filigranes agressifs. La description doit être précise et complète.")}</p>
                   </div>
                   <div className="bg-zinc-50 p-5 rounded-2xl">
                     <h4 className="font-black text-zinc-900 text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> {t("2. Exactitude des prix & stock")}</h4>
                     <p>{t("Toute manipulation de prix afin de tromper l'algorithme entraînera un ban permanent du programme de sponsoring. Le produit doit être disponible en stock local.")}</p>
                   </div>
                   <div className="bg-zinc-50 p-5 rounded-2xl">
                     <h4 className="font-black text-zinc-900 text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-orange-500" /> {t("3. Garantie de Taux de Rejet minimal")}</h4>
                     <p>{t("Le vendeur s'engage à expédier rapidement les produits sponsorisés. Un Taux de Retour (RTO) supérieur à la moyenne annulera la priorité de ce produit, même parrainé.")}</p>
                   </div>
                   <div className="bg-zinc-50 p-5 rounded-2xl">
                     <h4 className="font-black text-zinc-900 text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 mb-2"><BadgeInfo className="w-4 h-4 text-orange-500" /> {t("4. Traitement des requêtes")}</h4>
                     <p>{t("Un grand nombre de vendeurs souhaitant sponsoriser implique une compétition. Le panneau d'administration étudie les requêtes manuellement selon la performance globale de votre boutique OLMART.")}</p>
                   </div>
                 </div>
               </div>

               <div className="p-8 border-t border-zinc-100 bg-zinc-50 space-y-6 shrink-0">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="pt-1">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${agreedToConditions ? 'bg-orange-500 border-orange-500' : 'bg-white border-zinc-300 group-hover:border-orange-400'}`}>
                        {agreedToConditions && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={agreedToConditions} 
                      onChange={(e) => setAgreedToConditions(e.target.checked)} 
                    />
                    <span className="font-black tracking-tight rtl:tracking-normal text-zinc-900 flex-1 leading-snug">
                      {t("J'accepte et je m'engage à respecter les conditions de sponsoring d'OLMART. J'atteste que mon produit répond aux normes e-commerce Premium.")}</span>
                  </label>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowConditionsModal(false)}
                      className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-900 font-black text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-zinc-50 transition-colors"
                    >
                      {t("Annuler")}</button>
                    <button 
                      onClick={handleSubmitSponsorship}
                      disabled={!agreedToConditions || isSubmitting}
                      className="flex-1 py-4 bg-orange-600 text-white font-black text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/20"
                    >
                      {isSubmitting ? 'Traitement...' : 'Soumettre la requête'}
                    </button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
