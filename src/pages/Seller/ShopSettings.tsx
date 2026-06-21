import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Truck, MapPin, Save, Image as ImageIcon, Globe, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ALGERIA_WILAYAS } from '../../constants';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { maskSensitiveData, hasExternalChannel } from '../../utils/masking';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

export const ShopSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'shipping'>('profile');
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  
  const [shopData, setShopData] = useState({
    shopName: userProfile?.shopName || userProfile?.displayName || '',
    shopDescription: userProfile?.shopDescription || '',
    logoUrl: userProfile?.logoUrl || '',
    bannerUrl: userProfile?.bannerUrl || '',
    wilaya: userProfile?.wilaya || '01-Adrar',
  });

  const [shippingTariffs, setShippingTariffs] = useState<Record<string, string>>(
    userProfile?.shippingTariffs 
    ? Object.fromEntries(Object.entries(userProfile.shippingTariffs as Record<string, any>).map(([k, v]) => [k, String(v)]))
    : ALGERIA_WILAYAS.reduce((acc, curr) => ({ ...acc, [curr]: '600' }), {})
  );

  const [globalPrice, setGlobalPrice] = useState('600');

  const applyToAll = () => {
    setShippingTariffs(ALGERIA_WILAYAS.reduce((acc, curr) => ({ ...acc, [curr]: globalPrice }), {}));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    
    if (hasExternalChannel(shopData.shopName) || hasExternalChannel(shopData.shopDescription)) {
      toast.error(t("external_channel_blocked", "Les coordonnees de communication exterieure (messages, liens ou reseaux) ne sont pas autorisees dans ce champ de texte. Tout contact doit s'effectuer exclusivement via la plateforme OLMART."));
      return;
    }

    setLoading(true);
    try {
      const safeDescription = maskSensitiveData(shopData.shopDescription || '');
        
      await updateDoc(doc(db, "users", userProfile.uid), {
        shopName: shopData.shopName,
        shopDescription: safeDescription,
        logoUrl: shopData.logoUrl,
        bannerUrl: shopData.bannerUrl,
        wilaya: shopData.wilaya,
      });

      // Update public profile for storefront viewing
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, "publicProfiles", userProfile.uid), {
        shopName: shopData.shopName,
        shopDescription: safeDescription,
        logoUrl: shopData.logoUrl,
        bannerUrl: shopData.bannerUrl,
        wilaya: shopData.wilaya,
      }, { merge: true });

      toast.success(isArabic ? "تم حفظ إعدادات المتجر بنجاح!" : "Paramètres boutique sauvegardés !");
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? "حدث خطأ أثناء الحفظ." : "Erreur de sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShipping = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      let hasError = false;
      const numericTariffs: Record<string, number | null> = {};
      
      for (const [k, v] of Object.entries(shippingTariffs)) {
        if (v === null || v === 'N/A' || v === '') {
          numericTariffs[k] = null; // null indicates does not ship
        } else {
          const parsed = parseFloat(v as string);
          if (isNaN(parsed) || parsed < 0) {
            toast.error(isArabic ? `سعر غير صالح لولاية ${k}` : `Tarif invalide pour la Wilaya ${k}`);
            hasError = true;
            break;
          }
          numericTariffs[k] = parsed;
        }
      }

      if (hasError) {
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, "users", userProfile.uid), {
        shippingTariffs: numericTariffs
      });
      toast.success(isArabic ? "تم تحديث أسعار الشحن بنجاح!" : "Tarifs de livraison mis à jour !");
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? "حدث خطأ أثناء الحفظ." : "Erreur de sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleFileChange = (field: 'logoUrl' | 'bannerUrl') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
       toast.error(isArabic ? "الملف كبير جداً (الأقصى 2 ميجابايت)" : "Le fichier est trop lourd (Max 2Mo).");
       return;
    }

    const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../../lib/firebase');

    if (field === 'logoUrl') setUploadingLogo(true);
    if (field === 'bannerUrl') setUploadingBanner(true);

    const loaderId = toast.loading(isArabic ? "جاري رفع الملف..." : "Téléchargement du fichier...");
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileRef = storageRef(storage, `shops/${userProfile?.uid || 'temp'}/${field}_${Date.now()}.${ext}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const publicUrl = await getDownloadURL(fileRef);
      setShopData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success(isArabic ? "تم تحديث الملف بنجاح!" : "Fichier mis à jour avec succès !", { id: loaderId });
    } catch (err: any) {
      console.error(err);
      toast.error((isArabic ? "فشل الرفع: " : "Échec de l'upload: ") + (err.message || ""), { id: loaderId });
    } finally {
      if (field === 'logoUrl') setUploadingLogo(false);
      if (field === 'bannerUrl') setUploadingBanner(false);
    }
  };

  const isShopValidated = userProfile?.status === 'ACTIVE' || userProfile?.status === 'active';

  return (
    <div className="max-w-5xl space-y-10">
      {!isShopValidated && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
               <div>
                  <h3 className="font-bold text-sm">{t("Boutique en attente de vérification")}</h3>
                  <p className="text-xs text-amber-700/80">{t("Vous ne pouvez pas modifier le nom de la boutique tant que votre profil n'a pas été validé par l'administration.")}</p>
               </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Paramètres Boutique")}</h2>
          <p className="text-zinc-500 font-medium">{t("Configurez votre identité visuelle et logistique.")}</p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'profile' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400'}`}
          >
            {t("Profil")}</button>
          <button 
            onClick={() => setActiveTab('shipping')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'shipping' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400'}`}
          >
            {t("Livraison")}</button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10 overflow-hidden">
           <form onSubmit={handleSaveProfile} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 ml-1">{t("Nom Public de la Boutique")}</label>
                       <input required disabled={!isShopValidated} type="text" className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed" value={shopData.shopName || ''} onChange={(e) => setShopData({...shopData, shopName: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 ml-1">{t("Wilaya du Magasin Principal")}</label>
                       <select className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold appearance-none cursor-pointer" value={shopData.wilaya || ''} onChange={(e) => setShopData({...shopData, wilaya: e.target.value})}>
                          {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 ml-1">{t("Slogan / Courte Description")}</label>
                       <textarea rows={3} className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-medium resize-none text-sm" value={shopData.shopDescription || ''} onChange={(e) => setShopData({...shopData, shopDescription: e.target.value})} />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 ml-1">{t("Logo de la Boutique")}</label>
                       <div className="flex gap-4">
                          <div className="relative flex-1 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer overflow-hidden p-4">
                             <input type="file" accept="image/*" onChange={handleFileChange('logoUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                             <div className="flex flex-col items-center flex-1 text-center gap-1 pointer-events-none">
                                 <Upload className="w-5 h-5 text-zinc-400" />
                                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal">
                                     {shopData.logoUrl ? "Changer de Logo" : "Uploader votre Logo"}
                                 </span>
                             </div>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200 flex items-center justify-center text-zinc-300">
                             {shopData.logoUrl ? <img loading="lazy" src={getOptimizedImageUrl(shopData.logoUrl, 200)} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-6 h-6" />}
                          </div>
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2 ml-1">{t("Bannière de la Boutique")}</label>
                       <div className="relative overflow-hidden w-full px-5 py-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer">
                          <input type="file" accept="image/*" onChange={handleFileChange('bannerUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="flex flex-col items-center flex-1 text-center gap-2 pointer-events-none">
                              <Upload className="w-5 h-5 text-zinc-400" />
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal truncate max-w-xs">
                                  {shopData.bannerUrl ? "Changer la Bannière" : "Uploader la Bannière"}
                              </span>
                          </div>
                       </div>
                       {shopData.bannerUrl && (
                         <div className="mt-4 aspect-[4/1] w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100">
                            <img loading="lazy" src={getOptimizedImageUrl(shopData.bannerUrl, 800)} className="w-full h-full object-cover" alt="" />
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              <button type="submit" disabled={loading || uploadingLogo || uploadingBanner} className="w-full bg-zinc-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-sm hover:bg-zinc-900 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">
                 <Save className="w-5 h-5" />
                 {loading ? 'Sauvegarde...' : (uploadingLogo || uploadingBanner) ? 'Transfert d\'image en cours...' : 'Sauvegarder le Profil'}
              </button>
           </form>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
           <div className="bg-zinc-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ea580c]/20 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                    <h3 className="text-2xl font-black mb-1 text-[#ffffff]">{t("Tarification Globale")}</h3>
                    <p className="text-zinc-400 font-medium">{t("Définissez un tarif par défaut pour toutes les Wilayas.")}</p>
                 </div>
                 <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <input 
                      type="number" 
                      className="bg-transparent text-2xl font-black w-32 px-4 outline-none text-[#ffffff]" 
                      value={globalPrice} 
                      onChange={(e) => setGlobalPrice(e.target.value)}
                    />
                    <span className="text-xs font-black uppercase text-zinc-400 pr-4">{t("DA")}</span>
                    <button 
                      onClick={applyToAll}
                      className="bg-white text-zinc-950 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:bg-orange-500 hover:text-white transition-all"
                    >
                       {t("Appliquer Partout")}</button>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {ALGERIA_WILAYAS.map((w) => {
                       
                       return (
                                         <div key={w} className="p-5 border border-zinc-50 rounded-2xl flex items-center justify-between hover:border-orange-200 transition-colors bg-zinc-50/30">
                                            <div className="flex items-center gap-3">
                                               <MapPin className="w-4 h-4 text-zinc-400" />
                                               <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal">{w}</span>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                              <div className="flex items-center gap-2">
                                                <input 
                                                  type="number" 
                                                  className={`w-20 text-end bg-white px-3 py-1.5 rounded-lg text-sm font-black border border-zinc-100 outline-none focus:border-orange-500 ${shippingTariffs[w] === null ? 'opacity-30 cursor-not-allowed' : ''}`} 
                                                  value={shippingTariffs[w] === null || shippingTariffs[w] === undefined ? '' : shippingTariffs[w]}
                                                  disabled={shippingTariffs[w] === null}
                                                  onChange={(e) => setShippingTariffs({ ...shippingTariffs, [w]: e.target.value })}
                                                />
                                                <span className={`text-[10px] font-black uppercase ${shippingTariffs[w] === null ? 'text-zinc-200' : 'text-zinc-400'}`}>{t("DA")}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                <input 
                                                   type="checkbox" 
                                                   id={`disable-${w}`} 
                                                   checked={shippingTariffs[w] === null}
                                                   onChange={(e) => {
                                                      if (e.target.checked) setShippingTariffs({ ...shippingTariffs, [w]: null as any });
                                                      else setShippingTariffs({ ...shippingTariffs, [w]: '600' });
                                                   }}
                                                   className="accent-zinc-900 cursor-pointer"
                                                />
                                                <label htmlFor={`disable-${w}`} className="text-[9px] font-black text-zinc-500 uppercase cursor-pointer hover:text-zinc-900">{t("Ne pas livrer")}</label>
                                              </div>
                                            </div>
                                         </div>
                                      );
                     })}
              </div>
              <div className="mt-12 flex justify-end">
                 <button 
                   onClick={handleSaveShipping}
                   disabled={loading}
                   className="bg-[#ea580c] text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest rtl:tracking-normal shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
                 >
                    {loading ? 'Mise à jour...' : 'Sauvegarder les Tarifs (58 Wilayas)'}
                 </button>
              </div>
           </div>
        </motion.div>
      )}
    </div>
  );
};
