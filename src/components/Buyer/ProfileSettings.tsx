import React, { useState } from 'react';
import { Settings, User, Phone, Check, RefreshCw, Sparkles } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { RETRO_AVATARS, getRetroAvatar } from '../../utils/avatar';
import { useTranslation } from "react-i18next";

interface ProfileSettingsProps {
  currentUser: any;
  userProfile: any;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, userProfile }) => {
    const { t } = useTranslation();
  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const defaultAvatar = getRetroAvatar(currentUser?.email || currentUser?.uid);
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || defaultAvatar);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Le nom d'utilisateur est obligatoire.");

    setSaving(true);
    try {
      // 1. Update main Firebase auth Profile
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoURL
      });

      // 2. Synchronize in Firestore Users database
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        name: name,
        phone: phone,
        photoURL: photoURL
      });

      toast.success("Profil mis à jour avec succès !");
    } catch (err: any) {
      console.error("Profile updates failed:", err);
      toast.error(err.message || "Impossible de mettre à jour votre profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" id="profile-settings-module">
      <div>
        <h3 className="font-bold text-xl text-zinc-900 tracking-tight rtl:tracking-normal">{t("Paramètres du Compte")}</h3>
        <p className="text-zinc-500 text-xs rtl:text-sm">{t("Ajustez vos informations d'identité et de communication.")}</p>
      </div>

      <form onSubmit={handleSaveProfile} className="bg-white border border-zinc-100 rounded-3xl p-8 space-y-8 shadow-sm">
        {/* Avatar Selectors */}
        <div className="space-y-4">
          <label className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal block leading-none">{t("Photo de profil / Avatar")}</label>
          <div className="flex flex-wrap items-center gap-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-zinc-50 shadow-inner relative group shrink-0">
              <img loading="lazy" src={photoURL || defaultAvatar} alt={t("current avatar") || "current avatar"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            <div className="flex-1 space-y-3 min-w-[200px]">
              <p className="text-xs rtl:text-sm text-zinc-500 font-medium">{t("Sélectionnez l'un de nos avatars vintage Premium des années 60/70 faits main :")}</p>
              <div className="flex gap-3 flex-wrap">
                {RETRO_AVATARS.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoURL(src)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all relative ${
                      photoURL === src ? 'border-zinc-900 ring-4 ring-zinc-100 scale-95' : 'border-transparent hover:scale-105'
                    }`}
                  >
                    <img loading="lazy" src={src} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    {photoURL === src && (
                      <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white font-heavy" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Form Inputs Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal block leading-none">{t("Nom complet")}</label>
            <div className="relative">
              <User className="absolute start-5 top-1/2 -translate-y-1/2 w-4 py-1.5 h-auto text-zinc-300 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full ps-12 pe-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold text-xs rtl:text-sm focus:ring-4 focus:ring-zinc-100 focus:bg-white transition-all text-zinc-800"
                placeholder={t("Ex: Selma Laifa") || "Ex: Selma Laifa"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal block leading-none font-sans">{t("Numéro de téléphone")}</label>
            <div className="relative">
              <Phone className="absolute start-5 top-1/2 -translate-y-1/2 w-4 py-1.5 h-auto text-zinc-300 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full ps-12 pe-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl outline-none font-bold text-xs rtl:text-sm focus:ring-4 focus:ring-zinc-100 focus:bg-white transition-all text-zinc-800"
                placeholder={t("Ex: 0550 12 34 56") || "Ex: 0550 12 34 56"}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-zinc-50">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 bg-[#121315] text-white hover:bg-[#0a0b0c] font-bold text-xs rtl:text-sm uppercase tracking-wider rtl:tracking-normal rounded-xl transition-all shadow-md shadow-zinc-100 active:scale-95 disabled:opacity-50 min-h-[44px]"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
            {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
};
