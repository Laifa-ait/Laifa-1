import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useShop } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import { getCategoryTranslation } from "../utils/translations";
import { OlmaLogo } from "./Navbar";
import { PRODUCT_HIERARCHY } from "../constants";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { subscribeToNewsletter } from "../services/newsletterService";

export const Footer: React.FC<{ isHomepage?: boolean }> = ({ isHomepage = false }) => {
  const { t } = useTranslation();
  const { setActiveCategory, setSearchQuery } = useShop();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if (!cancelled && docSnap.exists() && docSnap.data().supportEmail) {
          setSupportEmail(docSnap.data().supportEmail);
        }
      } catch (error) {
        if (!cancelled) console.error("Error fetching policy:", error);
      }
    };
    fetchSettings();
    return () => { cancelled = true; };
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !validateEmail(email)) {
      toast.error(t("invalid_email") || "Veuillez entrer un email valide");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribeToNewsletter(email);
      toast.success(t("newsletter_success") || "Inscription réussie");
      setEmail("");
    } catch (error: any) {
      console.error("Erreur lors de l'inscription à la newsletter:", error);
      if (error.message === "ALREADY_SUBSCRIBED") {
        toast.error(t("already_subscribed") || "Vous êtes déjà inscrit !");
      } else {
        toast.error(t("error_try_later") || "Erreur, veuillez réessayer ultérieurement");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer
      className={`custom-dark-footer bg-slate-900 text-slate-400 pt-10 sm:pt-16 sm:pb-8 border-t border-slate-800 ${isHomepage ? "pb-20" : "pb-8"}`}
    >
      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8 pb-4">
        {/* Column 1: Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <OlmaLogo className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            <span className="text-xl sm:text-2xl font-sans font-bold uppercase tracking-tight text-white rtl:tracking-normal">
              {t("OLMA")}
              <span className="text-white">{t("RT")}</span>
            </span>
          </div>
          <p className="text-xs rtl:text-sm text-slate-400 leading-relaxed max-w-xs uppercase">
            {t("footer_desc") || "La destination e-commerce N°1 en Algérie. Les meilleures offres des 58 Wilayas."}
          </p>
        </div>

        {/* Column 2: Newsletter */}
        <div className="space-y-4">
          <h5 className="text-[10px] rtl:text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-white">
            {t("newsletter") || "Newsletter"}
          </h5>
          <div className="space-y-3">
            <p className="text-[9px] rtl:text-[11px] text-slate-500 font-sans font-medium uppercase tracking-widest rtl:tracking-normal">
              {t("newsletter_tagline") || "Inscrivez-vous pour les exclusivités"}
            </p>
            <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("your_email") || "VOTRE EMAIL"}
                className="flex-1 bg-slate-800/50 px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs rtl:text-[12px] font-sans font-medium rounded-none focus:outline-none focus:ring-1 focus:ring-white transition-all placeholder:text-slate-500 text-slate-300 border-none"
              />
              <button
                type="submit"
                className="bg-white text-zinc-900 px-4 py-2 sm:px-5 sm:py-2.5 rounded-none text-[10px] sm:text-xs rtl:text-[12px] font-sans font-bold uppercase hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer border-none"
              >
                {isSubmitting ? "..." : t("subscribe") || "S'inscrire"}
              </button>
            </form>
          </div>
        </div>

        {/* Column 3: Apps */}
        <div className="space-y-4">
          <h5 className="text-[10px] rtl:text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-white">
            {t("mobile_app") || "Application Mobile"}
          </h5>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 rounded-none p-2 shrink-0 shadow-inner">
              <img
                loading="lazy"
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://olma.dz&color=94a3b8&bgcolor=0f172a"
                alt={t("QR") || "QR"}
                className="w-full h-full object-contain opacity-80 mix-blend-screen"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800/50 border border-slate-700/50 rounded-none text-[8px] sm:text-[9px] rtl:text-[11px] font-sans font-medium text-slate-400 hover:text-slate-300 uppercase tracking-widest rtl:tracking-normal hover:bg-slate-800 transition-all text-start cursor-pointer">
                {t("App Store")}
              </button>
              <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800/50 border border-slate-700/50 rounded-none text-[8px] sm:text-[9px] rtl:text-[11px] font-sans font-medium text-slate-400 hover:text-slate-300 uppercase tracking-widest rtl:tracking-normal hover:bg-slate-800 transition-all text-start cursor-pointer">
                {t("Google Play")}
              </button>
            </div>
          </div>
        </div>

        {/* Column 4: Links */}
        <div className="space-y-4 lg:justify-self-end">
          <h5 className="text-[10px] rtl:text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-white">
            {t("informations_header") || "Informations"}
          </h5>
          <ul className="grid grid-cols-1 gap-2 text-[10px] rtl:text-[12px] font-sans font-medium uppercase tracking-widest rtl:tracking-normal text-slate-500">
            <li>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-olma-updates"))}
                className="hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer text-start"
              >
                {t("changelog") || "Journal des mises à jour"}
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("/refund-policy")}
                className="hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer text-start"
              >
                {t("Remboursements & Retours")}
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("/privacy-policy")}
                className="hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer text-start"
              >
                {t("privacy") || "Confidentialité"}
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate("/support")}
                className="hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer text-start"
              >
                {t("contact") || "Contact Support"}
              </button>
            </li>
            {supportEmail && (
              <li className="text-slate-600 lowercase tracking-normal mt-2 select-all">{supportEmail}</li>
            )}
          </ul>
        </div>
      </div>

      <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 text-xs rtl:text-sm text-slate-500 font-medium">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
          <span>
            © {new Date().getFullYear()} Olma. {t("all_rights_reserved")}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-600 uppercase tracking-widest rtl:tracking-normal text-[9px] rtl:text-[11px] font-sans font-bold">
            {t("payment_delivery") || "Paiement & Livraison"}
          </span>
          <div className="flex gap-2">
            <div className="px-2 py-1 bg-slate-800/50 border border-slate-800 rounded text-slate-500 font-medium text-[9px] rtl:text-[11px]">
              {t("CIB")}
            </div>
            <div className="px-2 py-1 bg-slate-800/50 border border-slate-800 rounded text-slate-500 font-medium text-[9px] rtl:text-[11px]">
              {t("BaridiMob")}
            </div>
            <div className="px-2 py-1 bg-slate-800/50 border border-slate-800 rounded text-slate-500 font-medium text-[9px] rtl:text-[11px]">
              {t("Yalidine")}
            </div>
            <div className="px-2 py-1 bg-slate-800/50 border border-slate-800 rounded text-slate-500 font-medium text-[9px] rtl:text-[11px]">
              {t("ZR Express")}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-slate-600">
          <button
            onClick={() => navigate("/refund-policy")}
            className="hover:text-slate-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]"
          >
            {t("Retours")}
          </button>
          <button
            onClick={() => navigate("/privacy-policy")}
            className="hover:text-slate-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]"
          >
            {t("privacy")}
          </button>
          <button
            onClick={() => navigate("/support")}
            className="hover:text-slate-400 transition-colors bg-transparent border-none p-0 cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]"
          >
            {t("Support")}
          </button>
        </div>
      </div>
    </footer>
  );
};
