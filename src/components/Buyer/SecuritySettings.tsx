import React, { useState } from "react";
import { ShieldCheck, Mail, Key, Eye, EyeOff, X, Lock } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface SecuritySettingsProps {
  currentUser: any;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(currentUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassToggle, setShowPassToggle] = useState(false);
  const [loading, setLoading] = useState(false);

  // Re-auth Modal control state
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [reauthAction, setReauthAction] = useState<"email" | "password" | null>(null);

  const triggerEmailUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || email === currentUser.email) {
      return toast.error("Veuillez entrer une nouvelle adresse e-mail différente.");
    }
    setReauthAction("email");
    setCurrentPassword("");
    setShowReauthModal(true);
  };

  const triggerPasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error("Le mot de passe doit mesurer au moins 6 caractères.");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }
    setReauthAction("password");
    setCurrentPassword("");
    setShowReauthModal(true);
  };

  const executeReauthenticatedAction = async () => {
    if (!currentPassword.trim()) {
      return toast.error("Veuillez saisir votre mot de passe actuel.");
    }

    setLoading(true);
    try {
      // 1. Establish Credentials
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);

      // 2. Perform Re-authentication
      await reauthenticateWithCredential(currentUser, credential);

      // 3. Execute main mutation based on selected flow
      if (reauthAction === "email") {
        // Safe update with state-of-the-art verification flow
        await verifyBeforeUpdateEmail(currentUser, email);

        // Update user Firestore document too
        await updateDoc(doc(db, "users", currentUser.uid), {
          email: email,
        });

        toast.success("E-mail de vérification envoyé à la nouvelle adresse ! Veuillez vérifier votre boîte mail.");
        setShowReauthModal(false);
      } else if (reauthAction === "password") {
        await firebaseUpdatePassword(currentUser, newPassword);
        toast.success("Mot de passe mis à jour avec succès !");
        setNewPassword("");
        setConfirmPassword("");
        setShowReauthModal(false);
      }
    } catch (err: any) {
      console.error("Re-authentication fail:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast.error("Mot de passe actuel incorrect.");
      } else {
        toast.error(err.message || "Erreur lors de la sécurisation.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" id="security-settings-module">
      <div>
        <h3 className="font-kinder text-xl text-zinc-900 tracking-tight rtl:tracking-normal">
          {t("Configuration de Sécurité")}
        </h3>
        <p className="text-zinc-500 text-xs rtl:text-sm font-medium">
          {t("Gérez vos accès et sécurisez votre connexion d'e-commerce.")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Email Form */}
        <form
          onSubmit={triggerEmailUpdate}
          className="bg-white border border-zinc-100 p-8 rounded-3xl space-y-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Mail className="w-4 h-4" />
            </div>
            <h4 className="font-kinder text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal text-zinc-900">
              {t("Adresse de Connexion")}
            </h4>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-400 uppercase tracking-wider rtl:tracking-normal">
              {t("Adresse E-mail actuelle et valide")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-xs rtl:text-sm outline-none focus:bg-white focus:border-zinc-500 transition-all text-zinc-700"
              placeholder={t("Ex: abc@gmail.com") || "Ex: abc@gmail.com"}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-kinder text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal transition-all focus:scale-95 text-center min-h-[44px]"
            >
              {t("Mettre à jour l'e-mail")}
            </button>
          </div>
        </form>

        {/* Password Form */}
        <form
          onSubmit={triggerPasswordUpdate}
          className="bg-white border border-zinc-100 p-8 rounded-3xl space-y-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Key className="w-4 h-4" />
            </div>
            <h4 className="font-kinder text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal text-zinc-900">
              {t("Changer de Mot de passe")}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-2 relative">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-400 uppercase tracking-wider rtl:tracking-normal">
                {t("Nouveau Mot de passe")}
              </label>
              <input
                type={showPassToggle ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-xs rtl:text-sm outline-none focus:bg-white focus:border-zinc-500 transition-all text-zinc-700"
                placeholder={t("Minimum 6 caractères") || "Minimum 6 caractères"}
              />
              <button
                type="button"
                onClick={() => setShowPassToggle(!showPassToggle)}
                className="absolute end-4 top-[38px] text-zinc-400 hover:text-zinc-600 p-1"
              >
                {showPassToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-400 uppercase tracking-wider rtl:tracking-normal font-sans">
                {t("Confirmer le Mot de passe")}
              </label>
              <input
                type={showPassToggle ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-xs rtl:text-sm outline-none focus:bg-white focus:border-zinc-500 transition-all text-zinc-700"
                placeholder={t("Répétez le nouveau mot de passe") || "Répétez le nouveau mot de passe"}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-kinder text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal transition-all focus:scale-95 text-center min-h-[44px]"
            >
              {t("Changer mon mot de passe")}
            </button>
          </div>
        </form>
      </div>

      {/* Re-Authentication Verification Modal (CRITICAL ARCHITECTURE REQUIREMENT) */}
      {showReauthModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2rem] border border-zinc-150 p-8 max-w-md w-full relative shadow-2xl space-y-6">
            <button
              onClick={() => {
                setShowReauthModal(false);
                setReauthAction(null);
              }}
              className="absolute end-6 top-6 p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight rtl:tracking-normal">
                {t("Vérification de Sécurité")}
              </h3>
              <p className="text-zinc-500 text-xs rtl:text-sm">
                {t(
                  "Par mesure de sécurité hautement requise par Olma, veuillez confirmer votre mot de passe de connexion actuel avant de modifier vos informations d'identité sensibles."
                )}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] rtl:text-[12px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal block leading-none">
                  {t("Votre mot de passe actuel")}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-xs rtl:text-sm outline-none focus:bg-white focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                  placeholder={t("Saisissez votre mot de passe actuel") || "Saisissez votre mot de passe actuel"}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowReauthModal(false);
                    setReauthAction(null);
                  }}
                  className="flex-1 py-3.5 border border-zinc-200 text-zinc-700 font-extrabold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal rounded-xl hover:bg-zinc-50 active:scale-95 transition-all text-center"
                >
                  {t("Annuler")}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={executeReauthenticatedAction}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal rounded-xl disabled:opacity-50 active:scale-95 transition-all text-center"
                >
                  {loading ? t("security.verifying", "Vérification...") : t("security.confirm", "Confirmer")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
