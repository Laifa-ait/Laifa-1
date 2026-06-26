import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, ArrowRight, User, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from '../../constants';
import { useTranslation } from 'react-i18next';
import { hasExternalChannel } from '../../utils/masking';

const MARKETPLACE_CATEGORIES = [
  { id: 'mode', label: 'Mode & Habillement', icon: '👕' },
  { id: 'electro', label: 'Électronique & High-Tech', icon: '📱' },
  { id: 'maison', label: 'Maison & Décoration', icon: '🏠' },
  { id: 'beaute', label: 'Beauté & Santé', icon: '✨' },
  { id: 'sport', label: 'Sport & Loisirs', icon: '⚽' },
  { id: 'jouets', label: 'Jouets & Enfants', icon: '🧸' },
];

export const Onboarding: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: currentUser?.displayName || '',
    phone: '',
    wilaya: 'Alger',
    address: '',
    role: 'buyer',
    interests: [] as string[]
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth', { replace: true });
      return;
    }
    if (userProfile?.onboardingCompleted) {
      navigate('/');
    }
  }, [currentUser, userProfile, navigate]);

  const toggleInterest = (id: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter(item => item !== id)
        : [...prev.interests, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    if (step === 1) {
      if (hasExternalChannel(formData.name) || hasExternalChannel(formData.address)) {
        toast.error(t("external_channel_blocked", "Les coordonnees de communication exterieure (messages, liens ou reseaux) ne sont pas autorisees dans ce champ de texte. Tout contact doit s'effectuer exclusivement via la plateforme OLMART."));
        return;
      }
      if (formData.phone.length < 9) {
        toast.error(t("invalid_phone", "Le numéro de téléphone est invalide."));
        return;
      }
      if (!formData.address.trim()) {
        toast.error(t("address_required", "L'adresse est requise."));
        return;
      }
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // 1. Client-side write (Highly reliable because rules are 'allow write: if true')
      const batch = writeBatch(db);
      const userRef = doc(db, "users", currentUser.uid);
      
      const updateObj: any = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: formData.name,
        phone: formData.phone,
        wilaya: formData.wilaya,
        address: formData.address,
        "preferences.interests": formData.interests,
        "preferences.updatedAt": serverTimestamp(),
        isVerified: false,
        onboardingCompleted: true,
        createdAt: serverTimestamp()
      };

      // Ensure we don't accidentally downgrade an admin
      if (userProfile?.role !== 'admin') {
        updateObj.role = formData.role;
        if (formData.role === 'seller') {
          updateObj.trustScore = 50;
          updateObj.status = 'pending_verification';
          
          // Hydrate default regulated shipping tariffs
          const defaultTariffs: Record<string, number> = {};
          ALGERIA_WILAYAS.forEach((w) => {
            const cleanName = w.replace(/^\d+\s+/, "").trim();
            const known = ALGERIA_SHIPPING_DATA[cleanName] || ALGERIA_SHIPPING_DATA.Default;
            defaultTariffs[w] = known.price;
          });
          updateObj.shippingTariffs = defaultTariffs;
        }
      }

      batch.set(userRef, updateObj, { merge: true });
      await batch.commit();
      (process.env.NODE_ENV === 'development' ? console.log : function(){})("Onboarding: Success via Client SDK");

      // 2. Server-side notification (Fully optional / non-blocking)
      try {
        const idToken = await currentUser.getIdToken();
        fetch("/api/auth/onboard", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            wilaya: formData.wilaya,
            address: formData.address,
            role: formData.role,
            interests: formData.interests
          })
        }).catch(e => console.warn("Optional server sync failed", e));
      } catch (e) {}
      
      toast.success(t("profile_completed", "Profil complété avec succès !"));
      navigate('/');
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error(t("profile_creation_error", "Erreur lors de la création du profil."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF9EC] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-10 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white rounded-[2rem] p-10 border border-zinc-100 shadow-2xl relative z-10"
      >
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-kinder text-zinc-950 mb-2 tracking-tight rtl:tracking-normal">
            {step === 1 ? t("complete_profile_title", "Finalisons votre profil") : t("select_interests", "Vos centres d'intérêt")}
          </h2>
          <p className="text-zinc-500 font-medium">
            {step === 1 ? t("complete_profile_desc", "Olma a besoin de vos coordonnées pour la livraison.") : t("interests_desc", "Quels thèmes vous intéressent le plus ?")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <div className="flex bg-zinc-50 rounded-2xl p-2 border border-zinc-100 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'buyer' })}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${
                      formData.role === 'buyer' 
                        ? 'bg-zinc-950 text-white shadow-xl' 
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {t("buyer_role", "Acheteur")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'seller' })}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${
                      formData.role === 'seller' 
                        ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' 
                        : 'text-zinc-500 hover:text-orange-500'
                    }`}
                  >
                    {t("seller_role", "Vendeur")}
                  </button>
                </div>
              </div>

              <div className="relative">
                <User className="absolute start-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder={t("full_name", "Nom complet") as string} 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full ps-14 pe-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute start-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  <input 
                    type="tel" 
                    placeholder={t("phone_placeholder", "05 55 55 55 55") as string} 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full ps-14 pe-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>
                <div className="relative">
                  <select 
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none"
                  >
                    {ALGERIA_WILAYAS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <MapPin className="absolute end-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <MapPin className="absolute start-5 top-5 w-5 h-5 text-zinc-400 pointer-events-none" />
                <textarea 
                  placeholder={t("detailed_address", "Adresse de livraison détaillée") as string} 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  rows={3}
                  className="w-full ps-14 pe-6 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              {MARKETPLACE_CATEGORIES.map(cat => {
                const active = formData.interests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleInterest(cat.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-semibold transition-all duration-300 ${
                      active 
                        ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-300/20' 
                        : 'bg-zinc-50 border-zinc-100 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-orange-600 text-white rounded-2xl font-kinder text-xs uppercase tracking-[0.2em] hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{step === 1 ? t("continue", "Continuer") : t("finish", "Terminer")}</span>
                <ArrowRight className={`w-4 h-4 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
