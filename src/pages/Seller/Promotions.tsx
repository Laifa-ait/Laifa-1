import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types';
import { Percent, Tag, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatPrice } from '../../utils/format';

export const Promotions: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('sellerId', '==', currentUser.uid));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        toast.error("Erreur de chargement des produits");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [currentUser]);

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (discountPercent <= 0 || discountPercent > 90) {
      toast.error("La remise doit être entre 1% et 90%");
      return;
    }
    if (!endDate) {
      toast.error("Date de fin requise");
      return;
    }

    try {
      const discountPrice = selectedProduct.price * (1 - discountPercent / 100);
      await updateDoc(doc(db, 'products', selectedProduct.id), {
        discountPrice,
        discountEndDate: new Date(endDate).toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, discountPrice, discountEndDate: new Date(endDate).toISOString() } 
          : p
      ));
      
      toast.success("Promotion appliquée avec succès !");
      setSelectedProduct(null);
      setDiscountPercent(0);
      setEndDate('');
    } catch (err) {
      toast.error("Erreur lors de l'application de la promotion");
    }
  };

  const handleRemoveDiscount = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        discountPrice: null,
        discountEndDate: null,
        updatedAt: new Date().toISOString()
      });
      
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, discountPrice: undefined, discountEndDate: undefined } 
          : p
      ));
      toast.success("Promotion retirée");
    } catch (err) {
      toast.error("Erreur lors du retrait");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3C2B22]">Promotions & Soldes</h1>
          <p className="text-stone-500 text-sm mt-1">Créez des ventes flash pour booster vos ventes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-fit">
          <h2 className="font-bold text-[#3C2B22] flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-amber-500" />
            Nouvelle Promotion
          </h2>
          <form onSubmit={handleApplyDiscount} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Sélectionner un produit</label>
              <select 
                className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-stone-50 text-sm focus:ring-2 focus:ring-amber-500"
                value={selectedProduct?.id || ''}
                onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}
                required
              >
                <option value="">-- Choisir un produit --</option>
                {products.filter(p => !p.discountPrice).map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({formatPrice(p.price)})</option>
                ))}
              </select>
            </div>
            {selectedProduct && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pourcentage de réduction (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="number"
                      min="1"
                      max="90"
                      className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                {discountPercent > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
                    Nouveau prix : <span className="font-bold text-amber-600">{formatPrice(selectedProduct.price * (1 - discountPercent / 100))}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Date de fin</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="datetime-local"
                      className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 bg-[#3C2B22] text-white rounded-xl font-bold hover:bg-black transition-colors">
                  Lancer la Vente Flash
                </button>
              </>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-[#3C2B22] mb-4">Promotions Actives</h2>
          {products.filter(p => p.discountPrice).length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
              <Tag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-500">Aucune promotion active pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.filter(p => p.discountPrice).map(product => {
                const isExpired = product.discountEndDate && new Date(product.discountEndDate) < new Date();
                return (
                  <div key={product.id} className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col gap-3 relative overflow-hidden">
                    {isExpired && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center"><span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">Expirée</span></div>}
                    <div className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                        {product.images[0] && <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-[#3C2B22] truncate">{product.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-amber-600 font-bold">{formatPrice(product.discountPrice!)}</span>
                          <span className="text-stone-400 text-xs line-through">{formatPrice(product.price)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Clock className="w-3.5 h-3.5" />
                        Jusqu'au {new Date(product.discountEndDate!).toLocaleDateString('fr-DZ')}
                      </div>
                      <button 
                        onClick={() => handleRemoveDiscount(product.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded-lg"
                      >
                        Arrêter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
