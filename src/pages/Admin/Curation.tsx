import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, XCircle, Package, Image as ImageIcon, CheckCircle2, ChevronRight, MessageSquareX } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

export const Curation: React.FC = () => {
    const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingProducts = async () => {
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (error) {
      console.error("Error fetching pending products:", error);
      toast.error("Erreur de chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const handleApprove = async (productId: string) => {
    try {
      await updateDoc(doc(db, "products", productId), {
        status: 'active',
        approvedAt: serverTimestamp(),
      });
      toast.success("Produit approuvé avec succès");
      fetchPendingProducts();
    } catch (error) {
      console.error("Error approving product:", error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async (productId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Veuillez fournir un motif de refus");
      return;
    }

    try {
      await updateDoc(doc(db, "products", productId), {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        rejectedAt: serverTimestamp(),
      });
      toast.success("Produit refusé");
      setRejectingId(null);
      setRejectionReason('');
      fetchPendingProducts();
    } catch (error) {
      console.error("Error rejecting product:", error);
      toast.error("Erreur lors du refus");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight rtl:tracking-normal">
            {t("Curation des")}<span className="text-amber-600">{t("Produits")}</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2 max-w-xl">
            {t("Examinez les nouvelles soumissions des créateurs pour garantir l'excellence et l'identité \"Premium\" d'Olma.")}</p>
        </div>
        <div className="flex bg-amber-50 rounded-2xl p-4 items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-900">{products.length}</div>
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest rtl:tracking-normal">{t("En attente")}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-[2.5rem] h-96 border border-zinc-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-20 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-zinc-300" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 mb-2">{t("Aucun produit en attente")}</h3>
          <p className="text-zinc-500 font-medium">{t("L'équipe de curation est à jour dans ses validations.")}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {products.map((product) => {
                
                return (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={product.id} 
                            className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-amber-900/5 transition-all duration-300 group flex flex-col"
                          >
                            <div className="relative aspect-square sm:aspect-video w-full bg-zinc-100 overflow-hidden shrink-0">
                              {product.image ? (
                                <img loading="lazy" src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                                  <ImageIcon className="w-16 h-16" />
                                </div>
                              )}
                              
                              {product.images && product.images.length > 1 && (
                                <div className="absolute bottom-4 end-4 bg-black/50 text-white text-[10px] font-black uppercase tracking-widest rtl:tracking-normal px-3 py-1.5 rounded-xl">
                                  +{product.images.length - 1} {t("photos")}</div>
                              )}
                            </div>

                            <div className="p-8 flex flex-col flex-1">
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div>
                                    <h3 className="text-lg font-black text-zinc-900 leading-tight mb-2 line-clamp-2 md:line-clamp-none">{product.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest rtl:tracking-normal">{product.category}</span>
                                      {product.subcategory && (
                                        <span className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest rtl:tracking-normal">{product.subcategory}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-end shrink-0">
                                    <div className="text-lg font-black text-amber-600">{product.price} {t("DA")}</div>
                                    {product.stock && <div className="text-[10px] font-bold text-zinc-400 mt-1">{t("Stock:")}{product.stock}</div>}
                                  </div>
                                </div>

                                {product.description && (
                                  <div className="mt-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 line-clamp-3 text-xs text-zinc-600 font-medium">
                                    {product.description}
                                  </div>
                                )}

                                {rejectingId === product.id ? (
                                  <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                      <label className="block text-[10px] font-black text-red-800 uppercase tracking-widest rtl:tracking-normal mb-2 flex items-center gap-2">
                                        <MessageSquareX className="w-3 h-3" /> {t("Motif du refus")}</label>
                                      <textarea
                                        autoFocus
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder={t("Ex: Photos de mauvaise qualité, description incomplète...") || "Ex: Photos de mauvaise qualité, description incomplète..."}
                                        className="w-full text-sm p-3 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 ring-red-500/20 text-red-900 resize-none h-24"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => setRejectingId(null)}
                                        className="flex-1 py-3 text-xs font-bold text-zinc-500 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50"
                                      >
                                        {t("Annuler")}</button>
                                      <button
                                        onClick={() => handleReject(product.id)}
                                        className="flex-1 py-3 text-xs font-black uppercase tracking-widest rtl:tracking-normal text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20"
                                      >
                                        {t("Confirmer le refus")}</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-8 flex items-center gap-3">
                                    <button 
                                      onClick={() => {
                                        setRejectingId(product.id);
                                        setRejectionReason('');
                                      }}
                                      className="flex-1 bg-red-50 text-red-600 py-3 rounded-2xl font-black uppercase tracking-widest rtl:tracking-normal text-[10px] hover:bg-red-100 border border-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                      <XCircle className="w-4 h-4" /> {t("Refuser")}</button>
                                    <button 
                                      onClick={() => handleApprove(product.id)}
                                      className="flex-1 bg-amber-500 text-white py-3 rounded-2xl font-black uppercase tracking-widest rtl:tracking-normal text-[10px] hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                      <ShieldCheck className="w-4 h-4" /> {t("Approuver")}</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
              })}
        </div>
      )}
    </div>
  );
};
