import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Save, Info, ShieldCheck } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from "react-i18next";

export const SettingsAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [aboutText, setAboutText] = useState("");
  const [registrationRules, setRegistrationRules] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.aboutText) setAboutText(data.aboutText);
          if (data.registrationRules) setRegistrationRules(data.registrationRules);
          if (data.privacyPolicy) setPrivacyPolicy(data.privacyPolicy);
          if (data.refundPolicy) setRefundPolicy(data.refundPolicy);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!aboutText.trim()) {
      toast.error("Le texte À propos ne peut pas être vide.");
      return;
    }
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', 'global');
      await setDoc(docRef, { 
        aboutText, 
        registrationRules,
        privacyPolicy,
        refundPolicy,
        supportEmail
      }, { merge: true });
      toast.success("Paramètres enregistrés avec succès.");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Toaster position="bottom-right" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-zinc-950 mb-2">{t("Paramètres Généraux")}</h1>
          <p className="text-sm font-bold text-zinc-500">{t("Gérez les textes et paramètres globaux de la plateforme.")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-zinc-100 rounded-2xl w-full"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("À propos d'Olma")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Ce texte s'affichera dans le menu mobile pour les utilisateurs.")}</p>
              </div>
            </div>
            
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              placeholder={t("Texte 'À propos d'Olma'...") || "Texte 'À propos d'Olma'..."}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-orange-500 font-medium text-sm min-h-[200px]"
            />
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("Email de Support & Contact")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Moyen de contact par défaut affiché dans le footer.")}</p>
              </div>
            </div>
            
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="Ex: contact@olma.dz"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-orange-500 font-medium text-sm"
            />
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("Politique de Confidentialité")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Texte de la politique de confidentialité de la plateforme.")}</p>
              </div>
            </div>
            
            <textarea
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              placeholder={t("Texte de la politique de confidentialité...") || "Texte de la politique de confidentialité..."}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-green-500 font-medium text-sm min-h-[200px]"
            />
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("Politique de Remboursement et Retour")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Texte de la politique de remboursement et retour de la plateforme.")}</p>
              </div>
            </div>
            
            <textarea
              value={refundPolicy}
              onChange={(e) => setRefundPolicy(e.target.value)}
              placeholder={t("Texte de la politique de remboursement...") || "Texte de la politique de remboursement..."}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-red-500 font-medium text-sm min-h-[200px]"
            />
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("Règles d'inscription & CGV")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Oblige les utilisateurs à lire et accepter ces règles avant l'inscription.")}</p>
              </div>
            </div>
            
            <textarea
              value={registrationRules}
              onChange={(e) => setRegistrationRules(e.target.value)}
              placeholder={t("Texte des conditions d'utilisation et règles d'inscription...") || "Texte des conditions d'utilisation et règles d'inscription..."}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-blue-500 font-medium text-sm min-h-[200px]"
            />
          </div>

          <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-lg text-zinc-950">{t("Logistique & Webhooks API")}</h2>
                <p className="text-xs font-bold text-zinc-500">{t("Connexion avec Yalidine, Mayestro et Kazitour.")}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
                <p className="text-sm font-bold text-zinc-700 mb-2">{t("Clé API Yalidine Express") || "Clé API Yalidine Express"}</p>
                <input
                  type="password"
                  placeholder="YAL_SEC_**********************"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:border-purple-500 font-medium text-sm"
                  disabled
                />
              </div>

               <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
                <p className="text-sm font-bold text-zinc-700 mb-2">{t("URL du Webhook Listener (À configurer côté transporteur)") || "URL du Webhook Listener"}</p>
                <input
                  type="text"
                  value="https://olmart-api.vercel.app/api/webhooks/yalidine"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-200 bg-white font-mono text-xs text-zinc-500"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
