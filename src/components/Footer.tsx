import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import { getCategoryTranslation } from "../utils/translations";
import { OlmaLogo } from "./Navbar";
import { PRODUCT_HIERARCHY } from "../constants";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export const Footer: React.FC<{ isHomepage: boolean }> = ({ isHomepage }) => {
  const { t } = useTranslation();
  const { setActiveCategory, setSearchQuery } = useShop();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const docRef = doc(db, 'settings', 'global');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().supportEmail) {
                setSupportEmail(docSnap.data().supportEmail);
            }
        } catch (error) {
            console.error("Error fetching policy:", error);
        }
    };
    fetchSettings();
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "newsletterEmails"), {
        email: email.trim(),
        subscribedAt: serverTimestamp(),
      });
      toast.success(t("newsletter_success") || "Inscription réussie");
      setEmail("");
    } catch (error) {
      console.error("Erreur lors de l'inscription à la newsletter:", error);
      toast.error(t("error_try_later") || "Erreur, veuillez réessayer ultérieurement");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <footer className={`custom-dark-footer bg-[#121315] text-white pt-16 sm:pt-20 sm:pb-8 border-t border-[#121315]/20 ${isHomepage ? 'pb-24' : 'pb-8'}`}>
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 pb-4">
        {/* Column 1: Identity */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <OlmaLogo className="w-8 h-8 text-[#ea580c]" />
            <span className="text-2xl font-black uppercase tracking-tighter rtl:tracking-normal">{t("OLMA")}<span className="text-orange-500">{t("RT")}</span></span>
          </div>
          <p className="text-xs rtl:text-sm text-white/60 font-bold leading-relaxed max-w-xs uppercase">
            {t("footer_desc") || "La destination e-commerce N°1 en Algérie. Les meilleures offres des 58 Wilayas."}
          </p>
        </div>

        {/* Column 2: Newsletter */}
        <div className="space-y-6">
          <h5 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-[0.2em] text-orange-500">{t("newsletter") || "Newsletter"}</h5>
          <div className="space-y-4">
            <p className="text-[10px] rtl:text-[12px] text-white/40 font-black uppercase tracking-widest rtl:tracking-normal">{t("newsletter_tagline") || "Inscrivez-vous pour les exclusivités"}</p>
            <form className="flex flex-col gap-2" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("your_email") || "VOTRE EMAIL"}
                className="bg-white/5 border border-white/10 px-4 py-3 text-[10px] rtl:text-[12px] font-black rounded-2xl focus:outline-none focus:border-orange-500 transition-all placeholder:text-white/20 uppercase"
              />
              <button 
                type="submit" 
                className="bg-orange-500 text-white px-4 py-3 rounded-2xl text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/10"
              >
                {isSubmitting ? "..." : (t("subscribe") || "S'inscrire")}
              </button>
            </form>
          </div>
        </div>

        {/* Column 3: Apps */}
        <div className="space-y-6">
          <h5 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-[0.2em] text-orange-500">{t("mobile_app") || "Application Mobile"}</h5>
          <div className="flex items-center gap-5">
             <div className="w-20 h-20 bg-white rounded-2xl p-2 shrink-0 shadow-xl shadow-black/20">
                <img loading="lazy" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://olma.dz" alt={t("QR") || "QR"} className="w-full h-full object-contain" />
             </div>
             <div className="flex flex-col gap-2">
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] rtl:text-[11px] font-black uppercase tracking-widest rtl:tracking-normal hover:bg-white/10 transition-all text-start">{t("App Store")}</button>
                <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] rtl:text-[11px] font-black uppercase tracking-widest rtl:tracking-normal hover:bg-white/10 transition-all text-start">{t("Google Play")}</button>
             </div>
          </div>
        </div>

        {/* Column 4: Links */}
        <div className="space-y-6 lg:justify-self-end">
           <h5 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-[0.2em] text-orange-500">{t("informations_header") || "Informations"}</h5>
           <ul className="grid grid-cols-1 gap-2 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-white/40">
              <li><button onClick={() => window.dispatchEvent(new CustomEvent('open-olma-updates'))} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-start">{t("changelog") || "Journal des mises à jour"}</button></li>
              <li><button onClick={() => navigate('/refund-policy')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-start">{t("Remboursements & Retours")}</button></li>
              <li><button onClick={() => navigate('/privacy-policy')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-start">{t("privacy") || "Confidentialité"}</button></li>
              <li><button onClick={() => navigate('/support')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer text-start">{t("contact") || "Contact Support"}</button></li>
              {supportEmail && <li className="text-white/60 lowercase tracking-normal mt-2 select-all">{supportEmail}</li>}
           </ul>
        </div>
      </div>

      
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs rtl:text-sm text-white/60 font-medium">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
          <span>{t("© 2026 Olma.")}{t("all_rights_reserved")}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-white/40 uppercase tracking-widest rtl:tracking-normal text-[9px] rtl:text-[11px] font-black">{t("payment_delivery") || "Paiement & Livraison"}</span>
          <div className="flex gap-2">
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded font-bold text-[9px] rtl:text-[11px]">{t("CIB")}</div>
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded font-bold text-[9px] rtl:text-[11px]">{t("BaridiMob")}</div>
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded font-bold text-[9px] rtl:text-[11px]">{t("Yalidine")}</div>
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded font-bold text-[9px] rtl:text-[11px]">{t("ZR Express")}</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-zinc-500">
          <button onClick={() => navigate('/refund-policy')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal">
            {t("Retours")}
          </button>
          <button onClick={() => navigate('/privacy-policy')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal">
            {t("privacy")}
          </button>
          <button onClick={() => navigate('/support')} className="hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal">
            {t("Support")}
          </button>
        </div>
      </div>

    </footer>
  );
};
