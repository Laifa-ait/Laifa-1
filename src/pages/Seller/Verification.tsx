import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Upload, FileText, CheckCircle2, Clock, XCircle, Info, FileImage } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, storage, auth } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { systemUploadKYCToDrive } from '../../services/googleWorkspace';
import { hasExternalChannel } from '../../utils/masking';

export const Verification: React.FC = () => {
    const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  
  const [formData, setFormData] = useState({
    // Profil Artistique
    brandName: userProfile?.brandName || '',
    designStyle: userProfile?.designStyle || '',
    portfolioUrl: userProfile?.portfolioUrl || '',
    brandStory: userProfile?.brandStory || '',
    // Legal & Administrative
    rcNumber: userProfile?.rcNumber || '',
    nifNumber: userProfile?.nifNumber || '',
    rib: userProfile?.rib || '',
    fileRC: userProfile?.documents?.fileRC || '',
    fileId: userProfile?.documents?.fileId || '',
    fileRib: userProfile?.documents?.fileRib || '',
  });

  const [selectedFileRC, setSelectedFileRC] = useState<File | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<File | null>(null);
  const [selectedFileRib, setSelectedFileRib] = useState<File | null>(null);

  const statuses = {
    pending: { label: 'En attente de validation', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    pending_verification: { label: 'En attente de validation', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    active: { label: 'Profil Vérifié', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    rejected: { label: 'Validation Refusée', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  };

  const status = userProfile?.status || 'pending_verification';
  const currentStatus = statuses[status as keyof typeof statuses] || statuses.pending_verification;

  const simulateSubmission = async () => {
     const uid = auth.currentUser?.uid;
     if (!uid) {
       toast.error(isArabic ? "لم يتم التعرف على الهوية (Auth)" : "Non identifié (Auth)");
       return;
     }
     setLoading(true);
     try {
       toast.loading(isArabic ? "جاري تشغيل المحاكاة..." : "Simulation en cours...", { id: "sim" });
       console.log("Simulating for UID:", uid);
       
       // Simulate Update directly in 'users/uid'
       await setDoc(doc(db, "users", uid), {
         status: 'pending_verification',
         updatedAt: serverTimestamp(),
         lastSimulation: serverTimestamp()
       }, { merge: true });

       // Create Notification
       await addDoc(collection(db, "internal_notifications"), {
         type: "DOCUMENT_SUBMISSION",
         sellerId: uid,
         sellerName: userProfile?.displayName || auth.currentUser?.displayName || "Simulateur Test",
         read: false,
         createdAt: serverTimestamp(),
         message: `TEST SIMULATION: Le vendeur ${userProfile?.displayName || auth.currentUser?.displayName || "TEST"} a soumis ses documents.`
       });

       toast.success(isArabic ? "نجحت المحاكاة! سيرى المشرف إخطارًا بالتحقق." : "Simulation réussie ! L'admin devrait voir une notification.", { id: "sim" });
     } catch (err: any) {
       console.error("Simulation error detail:", err);
       toast.error((isArabic ? "خطأ في المحاكاة: " : "Erreur simulation: ") + err.message, { id: "sim" });
     } finally {
       setLoading(false);
     }
   };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error(isArabic ? "يرجى تسجيل الدخول مجدداً." : "Veuillez vous reconnecter.");
      return;
    }

    if (
      hasExternalChannel(formData.brandName) || 
      hasExternalChannel(formData.designStyle) || 
      hasExternalChannel(formData.brandStory)
    ) {
      toast.error(t("external_channel_blocked", "Les coordonnees de communication exterieure (messages, liens ou reseaux) ne sont pas autorisees dans ce champ de texte. Tout contact doit s'effectuer exclusivement via la plateforme OLMART."));
      return;
    }

    setLoading(true);
    let finalFileRC = formData.fileRC;
    let finalFileId = formData.fileId;
    let finalFileRib = formData.fileRib;

    try {
      setUploadProgress(isArabic ? "جاري رفع المستندات بأمان إلى Google Drive..." : "Upload sécurisé des documents vers Google Drive (KYC Vault)...");
      
      const uid = auth.currentUser?.uid || "unknown";

      if (selectedFileRC) {
         finalFileRC = await systemUploadKYCToDrive(selectedFileRC, uid);
      }
      if (selectedFileId) {
         finalFileId = await systemUploadKYCToDrive(selectedFileId, uid);
      }
      if (selectedFileRib) {
         finalFileRib = await systemUploadKYCToDrive(selectedFileRib, uid);
      }

      setUploadProgress(isArabic ? "جاري حفظ البيانات..." : "Sauvegarde des données...");
      
      const isRcChanged = formData.rcNumber !== (userProfile?.rcNumber || '') || selectedFileRC !== null;
      const isNifChanged = formData.nifNumber !== (userProfile?.nifNumber || '') || selectedFileId !== null;
      const isRibChanged = formData.rib !== (userProfile?.rib || '') || selectedFileRib !== null;
      const shouldReverify = isRcChanged || isNifChanged || isRibChanged;
      const finalStatus = shouldReverify ? 'pending_verification' : status;

      // Primary Write: User Profile
      console.log("Writing to users/", uid, { documents: { fileRC: !!finalFileRC, fileId: !!finalFileId, fileRib: !!finalFileRib } });
      await setDoc(doc(db, "users", uid), {
        brandName: formData.brandName,
        designStyle: formData.designStyle,
        portfolioUrl: formData.portfolioUrl,
        brandStory: formData.brandStory,
        rcNumber: formData.rcNumber,
        nifNumber: formData.nifNumber,
        rib: formData.rib,
        documents: {
          fileRC: finalFileRC,
          fileId: finalFileId,
          fileRib: finalFileRib,
        },
        status: finalStatus,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      // Secondary Write: Admin Notification (Non-blocking)
      if (shouldReverify || status !== 'active') {
         try {
            await addDoc(collection(db, "internal_notifications"), {
               type: "DOCUMENT_SUBMISSION",
               sellerId: uid,
               sellerName: userProfile?.name || userProfile?.displayName || auth.currentUser?.displayName || "Vendeur",
               read: false,
               createdAt: serverTimestamp(),
               message: `Le vendeur ${userProfile?.name || userProfile?.displayName || auth.currentUser?.displayName || "Vendeur"} a mis à jour ses documents.`
            });
         } catch (notifErr) {
            console.warn("Secondary notification failed (non-blocking):", notifErr);
         }
      }

      setFormData(prev => ({
        ...prev,
        fileRC: finalFileRC,
        fileId: finalFileId,
        fileRib: finalFileRib,
      }));
      setSelectedFileRC(null);
      setSelectedFileId(null);
      setSelectedFileRib(null);
      setUploadProgress('');
      toast.success(isArabic ? "تم إرسال المستندات للتحقق بنجاح!" : "Documents envoyés pour validation !");
    } catch (err: any) {
      console.error("Critical submission error:", err);
      toast.error(isArabic ? `خطأ: ${err.message || "فشل إرسال المستندات"}` : `Erreur: ${err.message || "Impossible d'envoyer les documents"}`);
      setUploadProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'RC' | 'Id' | 'Rib') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
         toast.error(isArabic ? "الملف كبير جداً (الأقصى 10 ميجابايت)." : "Le fichier est trop lourd (Max 10Mo).");
         return;
      }
      const previewUrl = URL.createObjectURL(file);
      if (type === 'RC') {
        setSelectedFileRC(file);
        setFormData(prev => ({ ...prev, fileRC: previewUrl }));
      } else if (type === 'Id') {
        setSelectedFileId(file);
        setFormData(prev => ({ ...prev, fileId: previewUrl }));
      } else {
        setSelectedFileRib(file);
        setFormData(prev => ({ ...prev, fileRib: previewUrl }));
      }
    }
  };

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Vérification & Documents")}</h2>
        <p className="text-zinc-500 font-medium mt-2">{t("Conformément à la Loi 18-05 du commerce électronique en Algérie.")}</p>
      </div>

      {/* Status Banner */}
      <div className={`p-8 rounded-[2.5rem] border ${currentStatus.color.replace('text-', 'border-')} ${currentStatus.bg} flex flex-col md:flex-row items-center justify-between gap-6`}>
         <div className="flex items-center gap-6 text-center md:text-start">
            <div className={`w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center ${currentStatus.color}`}>
               <currentStatus.icon className="w-8 h-8" />
            </div>
            <div>
               <h3 className={`text-xl font-black ${currentStatus.color}`}>{currentStatus.label}</h3>
               <p className="text-zinc-600 text-sm font-medium">
                 {status === 'active' 
                   ? 'Votre boutique est certifiée et vos paiements sont débloqués.' 
                   : 'Nos agents examinent vos documents (délai moyen : 24h).'}
               </p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden p-10">
         <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-start gap-4 mb-10">
             <ShieldCheck className="w-6 h-6 text-emerald-600 mt-1" />
             <div className="flex-1">
                <p className="text-emerald-900 font-black text-[12px] uppercase tracking-widest rtl:tracking-normal">{t("Mode Diagnostic Olma")}</p>
                <p className="text-emerald-700/80 text-[11px] font-medium mt-1 leading-relaxed">
                  {t("Utilisez ce bouton pour tester instantanément si l'administration reçoit vos signaux de validation.")}</p>
                <button 
                  type="button"
                  onClick={simulateSubmission}
                  disabled={loading}
                  className="mt-4 px-6 py-2.5 bg-emerald-600 text-white text-[10px] uppercase font-black tracking-widest rtl:tracking-normal rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer border-none disabled:opacity-50"
                >
                  {t("SIMULER UNE RÉCEPTION ADMIN")}</button>
             </div>
          </div>

         <form onSubmit={handleSubmit} className="space-y-10">
            {/* Étape 1 : Le Profil Artistique */}
            <div className="space-y-6 bg-zinc-50/50 p-6 rounded-3xl border border-zinc-100">
              <h4 className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-[#c2a878] flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" />
                 {t("Étape 1 : Votre Profil Artistique")}</h4>
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Nom de la marque / Atelier")}</label>
                    <input required type="text" className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-bold" value={formData.brandName || ''} onChange={(e) => setFormData({...formData, brandName: e.target.value})} placeholder={t("Ex: Maison Olma") || "Ex: Maison Olma"} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Style de design principal")}</label>
                    <select required className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-bold text-zinc-800" value={formData.designStyle || ''} onChange={(e) => setFormData({...formData, designStyle: e.target.value})}>
                      <option value="" disabled>{t("Sélectionnez un style...")}</option>
                      <option value="Contemporain">{t("Contemporain")}</option>
                      <option value="Minimaliste">{t("Minimaliste")}</option>
                      <option value="Mid-Century">{t("Mid-Century")}</option>
                      <option value="Artisanal">{t("Artisanal")}</option>
                      <option value="Industriel">{t("Industriel")}</option>
                      <option value="Autre">{t("Autre")}</option>
                    </select>
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Lien vers Portfolio (Site Web)")}</label>
                    <input required type="url" className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-bold" value={formData.portfolioUrl || ''} onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})} placeholder="https://votre-portfolio.dz" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("L'histoire de votre marque (Optionnel)")}</label>
                    <textarea className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl outline-none font-medium h-32 resize-none" value={formData.brandStory || ''} onChange={(e) => setFormData({...formData, brandStory: e.target.value})} placeholder={t("Décrivez votre démarche artistique, vos matériaux...") || "Décrivez votre démarche artistique, vos matériaux..."} />
                 </div>
              </div>
            </div>

            {/* Étape 2 : Conformité Légale */}
            <div className="grid md:grid-cols-2 gap-8 pt-4">
               <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500 flex items-center gap-2">
                     <FileText className="w-4 h-4" />
                     {t("Étape 2 : Informations Légales")}</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Numéro Registre de Commerce (RC)")}</label>
                        <input required type="text" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold" value={formData.rcNumber || ''} onChange={(e) => setFormData({...formData, rcNumber: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("NIF (Identifiant Fiscal)")}</label>
                        <input required type="text" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold" value={formData.nifNumber || ''} onChange={(e) => setFormData({...formData, nifNumber: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Compte Bancaire / CCP (RIB/RIP)")}</label>
                        <input required type="text" className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-black" value={formData.rib || ''} onChange={(e) => setFormData({...formData, rib: e.target.value})} />
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] flex items-center gap-2">
                     <Upload className="w-4 h-4" />
                     {t("Justificatifs (Fichiers)")}</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Photo / Scan du Registre de Commerce")}</label>
                        <div className="relative overflow-hidden w-full px-5 py-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer">
                           <input required={!formData.fileRC} type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'RC')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="flex flex-col items-center flex-1 text-center gap-1 pointer-events-none">
                               <FileImage className={`w-5 h-5 ${formData.fileRC ? 'text-emerald-500' : 'text-zinc-400'}`} />
                               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal truncate max-w-[200px]">
                                   {formData.fileRC ? "Fichier chargé" : "Déposer Registre de Commerce"}
                               </span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Pièce d'identité (CNI / Passeport)")}</label>
                        <div className="relative overflow-hidden w-full px-5 py-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer">
                           <input required={!formData.fileId} type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'Id')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="flex flex-col items-center flex-1 text-center gap-1 pointer-events-none">
                               <FileImage className={`w-5 h-5 ${formData.fileId ? 'text-emerald-500' : 'text-zinc-400'}`} />
                               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal truncate max-w-[200px]">
                                   {formData.fileId ? "Fichier chargé" : "Déposer Pièce d'identité"}
                               </span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1.5 ml-1">{t("Attestation de compte / Chèque annulé (RIB)")}</label>
                        <div className="relative overflow-hidden w-full px-5 py-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-2xl flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer">
                           <input required={!formData.fileRib} type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'Rib')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="flex flex-col items-center flex-1 text-center gap-1 pointer-events-none">
                               <FileImage className={`w-5 h-5 ${formData.fileRib ? 'text-emerald-500' : 'text-zinc-400'}`} />
                               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal truncate max-w-[200px]">
                                   {formData.fileRib ? "Fichier chargé" : "Déposer Attestation RIB"}
                               </span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-6 flex gap-4">
               <Info className="w-6 h-6 text-zinc-400 shrink-0" />
               <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                 {t("En soumettant ces documents, vous certifiez l'exactitude des informations fournies. Toute fausse déclaration entraînera la suspension définitive du compte vendeur et des poursuites judiciaires.")}</p>
            </div>

            {status === 'active' && (
               formData.rcNumber !== (userProfile?.rcNumber || '') || 
               formData.nifNumber !== (userProfile?.nifNumber || '') || 
               formData.rib !== (userProfile?.rib || '') || 
               selectedFileRC !== null || 
               selectedFileId !== null || 
               selectedFileRib !== null
            ) && (
               <div id="kyc-warning" className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-6 text-xs font-medium flex gap-3 mb-4 animate-pulse">
                  <Info className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                     <p className="font-bold uppercase tracking-wider rtl:tracking-normal mb-1">{t("Attention : Révocation de Certification")}</p>
                     <p>{t("La modification de vos informations légales (RC, NIF, RIB) ou des justificatifs révoquera immédiatement votre statut")}<strong>{t("Certifié")}</strong> {t("et remettra votre compte en attente de vérification.")}</p>
                  </div>
               </div>
            )}

            <button type="submit" disabled={loading} className="w-full relative bg-zinc-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-sm hover:bg-zinc-900 transition-all shadow-2xl disabled:opacity-50 overflow-hidden">
               {loading ? (
                  <span className="relative z-10 flex items-center justify-center gap-2">
                     <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     {uploadProgress || 'Traitement...'}
                  </span>
               ) : (status === 'active' && !(
                  formData.rcNumber !== (userProfile?.rcNumber || '') || 
                  formData.nifNumber !== (userProfile?.nifNumber || '') || 
                  formData.rib !== (userProfile?.rib || '') || 
                  selectedFileRC !== null || 
                  selectedFileId !== null || 
                  selectedFileRib !== null
               )) ? (
                  'Profil Certifié (Aucun changement)'
               ) : (
                  'Sauvegarder & Soumettre'
               )}
            </button>
         </form>
      </div>
    </div>
  );
};

