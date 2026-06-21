import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ShieldCheck, Search, Filter, CheckCircle2, XCircle, Eye, ShieldAlert, FileText, Landmark, ShieldOff, Download, ChevronLeft, ChevronRight, Store, Video } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, limit, startAfter, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { formatPrice } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { scheduleVerificationMeet } from '../../services/googleWorkspace';
import toast from 'react-hot-toast';


export const forceDownload = async (url: string | undefined, filename: string) => {
  if (!url) return;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading file", error);
    window.open(url, '_blank');
  }
};

export const SellerModeration: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get('page') || '1');
  const statusParam = searchParams.get('status') || '';
  const searchParam = searchParams.get('search') || '';
  const sortByParam = searchParams.get('sortBy') || 'createdAt';
  const sortOrderParam = searchParams.get('sortOrder') || 'desc';

  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectComment, setRejectComment] = useState('');

  const SELLERS_PER_PAGE = 50;

  const fetchSellersApi = async (pageUrl: number, statusUrl: string, searchUrl: string, sortByUrl: string, sortOrderUrl: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let allSellers: any[] = [];
      if (statusUrl) {
         if (statusUrl === 'pending') {
            const q = query(collection(db, 'users'), where('status', 'in', ['pending', 'pending_verification']), limit(300));
            const snap = await getDocs(q);
            allSellers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
         } else {
            const q = query(collection(db, 'users'), where('role', '==', 'seller'), where('status', '==', statusUrl), limit(300));
            const snap = await getDocs(q);
            allSellers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
         }
      } else {
         // High-scale union query
         const [sellersSnap, pendingSnap, pendingVerifSnap] = await Promise.all([
           getDocs(query(collection(db, 'users'), where('role', '==', 'seller'), limit(300))),
           getDocs(query(collection(db, 'users'), where('status', '==', 'pending'), limit(100))),
           getDocs(query(collection(db, 'users'), where('status', '==', 'pending_verification'), limit(100)))
         ]);
         const mergedMap = new Map<string, any>();
         sellersSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
         pendingSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
         pendingVerifSnap.docs.forEach((doc: any) => mergedMap.set(doc.id, { id: doc.id, ...doc.data() }));
         allSellers = Array.from(mergedMap.values());
      }

      if (searchUrl) {
         const lowerSearch = searchUrl.toLowerCase();
         allSellers = allSellers.filter(s => 
            (s.shopName && s.shopName.toLowerCase().includes(lowerSearch)) || 
            (s.displayName && s.displayName.toLowerCase().includes(lowerSearch)) ||
            (s.email && s.email.toLowerCase().includes(lowerSearch))
         );
      }

      // Sort
      allSellers.sort((a, b) => {
         let valA = a[sortByUrl];
         let valB = b[sortByUrl];
         if (sortByUrl === 'createdAt' || sortByUrl === 'updatedAt') {
           valA = valA?.toMillis ? valA.toMillis() : (new Date(valA).getTime() || 0);
           valB = valB?.toMillis ? valB.toMillis() : (new Date(valB).getTime() || 0);
         }
         
         if (valA < valB) return sortOrderUrl === 'asc' ? -1 : 1;
         if (valA > valB) return sortOrderUrl === 'asc' ? 1 : -1;
         return 0;
      });

      // Pagination
      const total = allSellers.length;
      const totalPages = Math.ceil(total / SELLERS_PER_PAGE) || 1;
      const startIdx = (pageUrl - 1) * SELLERS_PER_PAGE;
      const paginatedSellers = allSellers.slice(startIdx, startIdx + SELLERS_PER_PAGE);

      setSellers(paginatedSellers);
      setTotalPages(totalPages);
      setTotalCount(total);
    } catch (err: any) {
      console.error("Fetch sellers API error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when params change
  useEffect(() => {
    fetchSellersApi(pageParam, statusParam, searchParam, sortByParam, sortOrderParam);
  }, [pageParam, statusParam, searchParam, sortByParam, sortOrderParam, currentUser]);

  // Handle Search Input Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== searchParam) {
        setSearchParams(prev => {
          if (searchTerm) prev.set('search', searchTerm);
          else prev.delete('search');
          prev.set('page', '1');
          return prev;
        });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, searchParam, setSearchParams]);

  const handleUpdateStatus = async (sellerId: string, status: 'active' | 'rejected' | 'suspended') => {
    try {
      if (!currentUser) return;
      const userRef = doc(db, 'users', sellerId);
      
      if (status === 'rejected') {
        const existingS = sellers.find(s => s.id === sellerId);
        await updateDoc(userRef, {
          status: 'rejected',
          rejectionReasons: rejectReasons,
          rejectionComment: rejectComment,
          rejectedAt: serverTimestamp()
        });
        
        if (existingS) {
           await addDoc(collection(db, "user_notifications"), {
             recipientId: sellerId,
             type: "KYC_REJECTED",
             title: t("Mise à jour concernant vos documents (KYC) ⚠️"),
             message: `Vos documents nécessitent des corrections. Raisons : ${rejectReasons.join(', ')}. Remarque admin : ${rejectComment}`,
             createdAt: serverTimestamp(),
             read: false
           });
           
           await addDoc(collection(db, "mail"), {
             to: existingS.email,
             message: {
               subject: "Mise à jour de votre compte Vendeur Olmart - Action Requise",
               html: `<p>Bonjour,</p><p>Lors de la révision de votre dossier de création de boutique, nous avons constaté que certains documents nécessitent votre attention.</p>
                      <p><strong>Raisons :</strong> ${rejectReasons.join(', ')}</p>
                      <p><strong>Remarque :</strong> ${rejectComment}</p>
                      <p>Veuillez vous connecter à votre compte pour mettre à jour vos informations afin que nous puissions finaliser l'activation de votre boutique.</p>`
             }
           });
        }
        
        setRejectModalOpen(false);
        setRejectReasons([]);
        setRejectComment('');
      } else if (status === 'active') {
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', sellerId))); // simpler to fetch from context or just update
        await updateDoc(userRef, {
          role: 'seller',
          status: 'active',
          isVerified: true,
          approvedAt: serverTimestamp()
        });
        
        // Find existing to merge to profiles
        const existingS = sellers.find(s => s.id === sellerId);
        if (existingS) {
          await setDoc(doc(db, 'publicProfiles', sellerId), {
            shopName: existingS.shopName || existingS.displayName || '',
            shopDescription: existingS.shopDescription || '',
            logoUrl: existingS.logoUrl || '',
            bannerUrl: existingS.bannerUrl || '',
            wilaya: existingS.wilaya || ''
          }, { merge: true });
          
          await addDoc(collection(db, "user_notifications"), {
            recipientId: sellerId,
            type: "KYC_APPROVED",
            title: t("Votre compte vendeur est approuvé ! 🎉"),
            message: "Félicitations, vos documents ont été validés avec succès par l'équipe Olmart. Vous pouvez maintenant ajouter des produits et commencer à vendre.",
            createdAt: serverTimestamp(),
            read: false
          });

          await addDoc(collection(db, "mail"), {
            to: existingS.email,
            message: {
              subject: "Félicitations ! Votre compte Vendeur Olmart est actif 🎉",
              html: `<p>Bonjour ${existingS.displayName || existingS.shopName || 'Partenaire'},</p><p>Excellente nouvelle ! Vos documents de vérification (KYC) ont été <strong>validés avec succès</strong>.</p><p>Votre boutique est maintenant en ligne et prête à recevoir ses premiers produits. Connectez-vous dès maintenant pour configurer votre catalogue et préparer vos premières ventes.</p><p>Bienvenue dans l'aventure Olmart!</p>`
            }
          });
        }
      } else if (status === 'suspended') {
        await updateDoc(userRef, {
          status: 'suspended',
          suspendedAt: serverTimestamp()
        });
      }

      setSellers(sellers.map(s => s.id === sellerId ? { ...s, status } : s));
      if (selectedSeller?.id === sellerId) setSelectedSeller({ ...selectedSeller, status });
      
      const statusText = status === 'active' 
        ? (t("activé"))
        : status === 'rejected'
          ? (t("rejeté"))
          : (t("suspendu"));
          
      toast.success(
        isArabic 
          ? `تم ${statusText} بنجاح.` 
          : `Vendeur ${statusText} avec succès.`
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(
        t("Erreur lors de la mise à jour du statut.")
      );
    }
  };

  const handleScheduleMeet = async (sellerId: string, email: string) => {
    try {
        const start = new Date();
        start.setDate(start.getDate() + 1); // Demain
        const end = new Date(start);
        end.setHours(start.getHours() + 1);

        const res = await scheduleVerificationMeet(
            email,
            start.toISOString(),
            end.toISOString(),
            "Entretien de Vérification OLMART",
            "Entretien formel de vérification KYC (identité et registre de commerce) pour valider votre boutique."
        );
        
        toast.success(
          isArabic
            ? `تم جدولة اجتماع Google Meet بنجاح! رابط الاجتماع: ${res.meetLink}\nتم إرسال بريد إلكتروني للبائع.`
            : `Réunion Google Meet planifiée avec succès ! Lien Meet: ${res.meetLink}\nUn email a été envoyé au Vendeur.`,
          { duration: 8000 }
        );
    } catch(err: any) {
        toast.error(
          isArabic
            ? `خطأ في جدولة الاجتماع: ${err.message}`
            : `Erreur de planification: ${err.message}`
        );
    }
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
  };

  const handleStatusFilter = (st: string) => {
    setSearchParams(prev => {
      if (st) prev.set('status', st);
      else prev.delete('status');
      prev.set('page', '1');
      return prev;
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight rtl:tracking-normal text-zinc-950">{t("Validation & Annuaire")}</h2>
          <p className="text-zinc-500 font-medium">{t("Approuvez les nouveaux vendeurs et modérez la plateforme.")}</p>
        </div>
        <button 
          onClick={() => fetchSellersApi(pageParam, statusParam, searchParam, sortByParam, sortOrderParam)}
          className="px-6 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-200 transition-all cursor-pointer border-none"
        >
          {t("Actualiser la liste")}</button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute start-6 rtl:start-auto rtl:end-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
          <input 
            type="text" 
            placeholder={t("Rechercher par nom de boutique ou vendeur...") || "Rechercher par nom de boutique ou vendeur..."} 
            className="w-full ps-16 pe-8 rtl:pe-16 rtl:ps-8 py-5 bg-white border border-zinc-100 rounded-[2rem] outline-none font-black text-sm tracking-tight rtl:tracking-normal focus:ring-4 ring-orange-500/5 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
          {[{ id: '', label: 'Tous' }, { id: 'pending', label: 'En attente' }, { id: 'active', label: 'Approuvés' }, { id: 'rejected', label: 'Rejetés' }, { id: 'suspended', label: 'Suspendus' }].map(st => (
             <button 
               key={st.id}
               onClick={() => handleStatusFilter(st.id)}
               className={`px-6 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest rtl:tracking-normal whitespace-nowrap transition-all ${statusParam === st.id ? 'bg-zinc-950 text-white shadow-xl' : 'bg-white border border-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
             >
               {st.label}
             </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-start">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-zinc-100">
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Boutique / Vendeur")}</th>
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Wilaya")}</th>
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Statut Profil")}</th>
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal cursor-pointer hover:text-zinc-950 transition-colors" onClick={() => {
                        const nextOrder = sortByParam === 'createdAt' && sortOrderParam === 'desc' ? 'asc' : 'desc';
                        setSearchParams(prev => {
                             prev.set('sortBy', 'createdAt'); prev.set('sortOrder', nextOrder); return prev; });
                     }}>
                        {t("Date d'inscription")}{sortByParam === 'createdAt' && (sortOrderParam === 'desc' ? '↓' : '↑')}
                     </th>
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Commission")}</th>
                     <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Actions")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50">
                  {sellers.map((s) => (
                    <tr key={s.id} className="group hover:bg-zinc-50/30 transition-colors">
                       <td className="px-10 py-10">
                          <div className="flex items-center gap-5">
                             <div className="w-16 h-16 rounded-[1.25rem] bg-zinc-100 overflow-hidden shrink-0 shadow-inner">
                                <img loading="lazy" src={s.logoUrl || `https://ui-avatars.com/api/?name=${s.shopName || s.displayName}&background=random`} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div>
                                <h4 className="font-black text-lg text-zinc-950 leading-none mb-1.5">{s.shopName || s.displayName}</h4>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{s.email}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-10">
                          <span className="text-[11px] font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal">{s.wilaya}</span>
                       </td>
                       <td className="px-10 py-10">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest rtl:tracking-normal ${
                             s.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                             s.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                             'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                             {s.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                             {s.status}
                          </div>
                       </td>
                       <td className="px-10 py-10">
                          <span className="text-sm font-black text-zinc-900">{s.createdAt ? new Date(s.createdAt._seconds ? s.createdAt._seconds * 1000 : s.createdAt).toLocaleDateString() : 'N/A'}</span>
                       </td>
                       <td className="px-10 py-10">
                          <span className="text-sm font-black text-zinc-950">{s.commissionRate || 10}%</span>
                       </td>
                       <td className="px-10 py-10">
                          <button onClick={() => setSelectedSeller(s)} className="p-4 bg-zinc-100 rounded-2xl text-zinc-600 hover:bg-zinc-950 hover:text-white transition-all shadow-sm">
                             <Eye className="w-5 h-5" />
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {totalPages > 1 && (
            <div className="p-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/30">
               <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">
                  {t("Page")}{pageParam} {t("sur")}{totalPages} {t("(Total:")}{totalCount})
               </p>
               <div className="flex gap-2">
                 <button 
                   onClick={() => handlePageChange(Math.max(1, pageParam - 1))} 
                   disabled={pageParam === 1 || loading}
                   className="p-3 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl transition-colors disabled:opacity-50"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => handlePageChange(Math.min(totalPages, pageParam + 1))} 
                   disabled={pageParam === totalPages || loading}
                   className="p-3 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl transition-colors disabled:opacity-50"
                 >
                   <ChevronRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
         )}
      </div>

      <AnimatePresence>
         {selectedSeller && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSeller(null)} className="absolute inset-0 bg-zinc-950/90" />
               <motion.div layoutId="seller-modal" className="relative bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                  {/* Left: Docs & Identity */}
                  <div className="flex-1 p-12 overflow-y-auto scrollbar-hide border-r border-zinc-100">
                     <div className="flex items-center gap-8 mb-12">
                        <div className="w-24 h-24 rounded-[2rem] bg-zinc-100 overflow-hidden shadow-2xl border-4 border-white">
                           <img loading="lazy" src={selectedSeller.logoUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                           <h3 className="text-3xl font-black tracking-tight rtl:tracking-normal mb-2">{selectedSeller.shopName}</h3>
                           <p className="text-zinc-500 font-medium">{t("Inscrit le")}{selectedSeller.createdAt ? new Date(selectedSeller.createdAt._seconds ? selectedSeller.createdAt._seconds * 1000 : selectedSeller.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-10">
                        {/* Profil Artistique - Nouvelle Section */}
                        <div className="md:col-span-2 space-y-8">
                           <div className="bg-orange-50/50 rounded-[2.5rem] p-10 border border-orange-100">
                              <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest rtl:tracking-normal mb-6 flex items-center gap-2">
                                 <Store className="w-4 h-4" /> {t("Profil Artistique & Identité")}</h4>
                              <div className="grid md:grid-cols-2 gap-6">
                                 <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Nom de la Marque")}</span>
                                       <span className="text-sm font-black text-zinc-950">{selectedSeller.brandName || selectedSeller.shopName || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Style de Design")}</span>
                                       <span className="inline-flex items-center self-start px-3 py-1 bg-white border border-orange-200 rounded-full text-[10px] font-bold text-orange-800 uppercase tracking-wider rtl:tracking-normal">{selectedSeller.designStyle || "Non spécifié"}</span>
                                    </div>
                                 </div>
                                 {selectedSeller.brandStory && (
                                    <div className="flex flex-col gap-2">
                                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Histoire de la Marque")}</span>
                                       <p className="text-sm text-zinc-600 italic leading-relaxed whitespace-pre-wrap">{selectedSeller.brandStory}</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="bg-zinc-50 rounded-[2.5rem] p-10 border border-zinc-100">
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-6 flex items-center gap-2">
                                 <FileText className="w-4 h-4" /> {t("Documents Légaux")}</h4>
                              <div className="space-y-6">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("RC N°")}</span>
                                    <span className="text-sm font-black text-zinc-950">{selectedSeller.rcNumber || "N/A"}</span>
                                 </div>
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("NIF N°")}</span>
                                    <span className="text-sm font-black text-zinc-950">{selectedSeller.nifNumber || "N/A"}</span>
                                 </div>
                                 <div className="space-y-4 pt-4 border-t border-zinc-200">
                                    {selectedSeller.documents?.fileRC && (
                                       <button onClick={() => forceDownload(selectedSeller.documents.fileRC, `RC_${selectedSeller.shopName || selectedSeller.displayName}.jpg`)} className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:translate-x-2 transition-transform">
                                          <Download className="w-4 h-4" /> {t("Registre de Commerce (RC)")}</button>
                                    )}
                                    {selectedSeller.documents?.fileId && (
                                       <button onClick={() => forceDownload(selectedSeller.documents.fileId, `ID_${selectedSeller.shopName || selectedSeller.displayName}.jpg`)} className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:translate-x-2 transition-transform">
                                          <Download className="w-4 h-4" /> {t("Pièce d'Identité")}</button>
                                    )}
                                    {selectedSeller.documents?.fileRib && (
                                       <button onClick={() => forceDownload(selectedSeller.documents.fileRib, `RIB_${selectedSeller.shopName || selectedSeller.displayName}.jpg`)} className="bg-transparent border-none p-0 cursor-pointer flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest rtl:tracking-normal hover:translate-x-2 transition-transform">
                                          <Download className="w-4 h-4" /> {t("Attestation RIB")}</button>
                                    )}
                                    {(!selectedSeller.documents || Object.keys(selectedSeller.documents).length === 0) && (
                                       <div className="space-y-4">
                                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest rtl:tracking-normal">{t("Aucun document chargé")}</p>
                                          <details className="mt-2 text-[8px] font-mono bg-zinc-100 p-2 rounded">
                                             <summary className="cursor-pointer text-zinc-400">{t("Voir data brute (Debug)")}</summary>
                                             <pre className="mt-1 overflow-auto max-h-40">{JSON.stringify(selectedSeller, null, 2)}</pre>
                                          </details>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="bg-zinc-950 rounded-[2.5rem] p-10 text-white border border-white/10 shadow-2xl">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest rtl:tracking-normal mb-6 flex items-center gap-2">
                                 <Landmark className="w-4 h-4" /> {t("Coordonnées Bancaires")}</h4>
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black text-white uppercase tracking-widest rtl:tracking-normal">{t("RIB / RIP ALGÉRIE")}</p>
                                 <p className="text-2xl font-black text-white tracking-tighter rtl:tracking-normal break-all">{selectedSeller.rib || "NON FOURNI"}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Right: Decision Panel */}
                  <div className="w-full md:w-96 bg-zinc-50 p-12 flex flex-col justify-between border-l border-zinc-100">
                     <div className="space-y-10">
                        <div>
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-4">{t("Statut Actuel")}</p>
                           <h5 className={`text-2xl font-black uppercase tracking-tighter rtl:tracking-normal ${
                              selectedSeller.status === 'active' ? 'text-emerald-500' : 'text-amber-500'
                           }`}>
                              {selectedSeller.status}
                           </h5>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2">{t("Actions de Modération")}</p>
                           
                           {/* Plannifier Entretien Meet */}
                           <button 
                             onClick={() => handleScheduleMeet(selectedSeller.id, selectedSeller.email)} 
                             className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-[11px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                           >
                              <Video className="w-5 h-5" /> {t("Planifier Meet (Vérif.)")}
                           </button>

                           <button 
                             onClick={() => handleUpdateStatus(selectedSeller.id, 'active')} 
                             className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-[11px] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                           >
                              <ShieldCheck className="w-5 h-5" /> {t("Valider le partenaire")}</button>
                           <button 
                             onClick={() => setRejectModalOpen(true)} 
                             className="w-full bg-white text-red-600 border border-red-100 py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-[11px] shadow-xl shadow-red-500/5 active:scale-95 transition-all flex items-center justify-center gap-3"
                           >
                              <XCircle className="w-5 h-5" /> {t("Rejeter Dossier")}</button>
                           <button 
                             onClick={() => handleUpdateStatus(selectedSeller.id, 'suspended')} 
                             className="w-full bg-zinc-950 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest rtl:tracking-normal text-[11px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                           >
                              <ShieldOff className="w-5 h-5" /> {t("Suspendre Compte")}</button>
                        </div>
                     </div>

                     <button onClick={() => { setSelectedSeller(null); setRejectModalOpen(false); }} className="mt-12 text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal hover:text-zinc-950 transition-colors cursor-pointer border-none bg-transparent">
                        {t("Fermer le Panel")}</button>
                  </div>
               </motion.div>

               {rejectModalOpen && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute z-50 bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
                   <h4 className="text-xl font-black text-zinc-950 flex items-center gap-2 mb-6">
                      <XCircle className="w-6 h-6 text-red-500" /> {t("Raison du Rejet")}</h4>
                   <div className="space-y-4 mb-6">
                     {[t("Document illisible"), t("Extrait RC expiré"), t("NIF incorrect"), t("Autre")].map(reason => (
                       <label key={reason} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={rejectReasons.includes(reason)} onChange={(e) => {
                             if (e.target.checked) setRejectReasons([...rejectReasons, reason]);
                             else setRejectReasons(rejectReasons.filter(r => r !== reason));
                          }} className="w-5 h-5 accent-red-500 rounded" />
                          <span className="font-bold text-sm">{reason}</span>
                       </label>
                     ))}
                   </div>
                   <textarea placeholder={t("Commentaire optionnel pour le vendeur...") || "Commentaire optionnel pour le vendeur..."} value={rejectComment} onChange={e => setRejectComment(e.target.value)} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 font-bold text-sm outline-none resize-none mb-6" rows={3}></textarea>
                   <div className="flex items-center gap-4">
                     <button onClick={() => handleUpdateStatus(selectedSeller.id, 'rejected')} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal shadow-xl shadow-red-500/20">{t("Confirmer Rejet")}</button>
                     <button onClick={() => setRejectModalOpen(false)} className="px-6 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-black text-[11px] uppercase tracking-widest rtl:tracking-normal">{t("Annuler")}</button>
                   </div>
                 </motion.div>
               )}
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};
