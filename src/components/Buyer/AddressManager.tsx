import React, { useState } from "react";
import { MapPin, Plus, Trash2, Check, CheckCircle2, Bookmark, ShieldAlert, Compass } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ALGERIA_WILAYAS } from "../../constants";
import { ALGERIA_REGIONS } from "../../data/algeriaRegions";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";

export interface ShippingAddress {
  id: string;
  wilaya: string;
  daira: string;
  commune: string;
  codePostal: string;
  rue: string;
  phone: string;
  isDefault: boolean;
  name?: string; // Optional Contact Person Name
  isShipping: boolean;
  isBilling: boolean;
}

interface AddressManagerProps {
  currentUser: any;
  userProfile: any;
}

export const AddressManager: React.FC<AddressManagerProps> = ({ currentUser, userProfile }) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Advanced UX switch modes for typing manual daira/commune
  const [manualDaira, setManualDaira] = useState(false);
  const [manualCommune, setManualCommune] = useState(false);

  const [formData, setFormData] = useState({
    wilaya: "16 Alger",
    daira: "Sidi M'Hamed",
    commune: "Alger Centre",
    codePostal: "16000",
    rue: "",
    phone: "",
    name: currentUser?.displayName || "",
    isShipping: true,
    isBilling: true,
  });

  const addresses: ShippingAddress[] = userProfile?.shippingAddresses || [];

  const handleWilayaChange = (wilayaValue: string) => {
    const region = ALGERIA_REGIONS[wilayaValue];
    const dairas = region ? Object.keys(region.dairas) : [];
    const firstDaira = dairas[0] || "";
    const communes = region ? region.dairas[firstDaira] || [] : [];
    const firstCommune = communes[0] || "";

    // Extract state code (first 2 digits) to guess ZIP code, e.g. "16" -> "16000"
    const prefix = wilayaValue.substring(0, 2);
    const estZip = /^\d{2}$/.test(prefix) ? `${prefix}000` : "16000";

    setFormData({
      ...formData,
      wilaya: wilayaValue,
      daira: firstDaira,
      commune: firstCommune,
      codePostal: estZip,
    });
    setManualDaira(false);
    setManualCommune(false);
  };

  const handleDairaChange = (dairaValue: string) => {
    const region = ALGERIA_REGIONS[formData.wilaya];
    const communes = region ? region.dairas[dairaValue] || [] : [];
    const firstCommune = communes[0] || "";

    setFormData({
      ...formData,
      daira: dairaValue,
      commune: firstCommune,
    });
    setManualCommune(false);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.daira.trim()) {
      return toast.error("Veuillez sélectionner ou saisir votre Daïra / arrondissement.");
    }

    if (!formData.commune.trim()) {
      return toast.error("Veuillez sélectionner ou saisir votre commune / baladia.");
    }

    if (!/^[0-9]{5}$/.test(formData.codePostal)) {
      return toast.error("Le Code Postal algérien doit comporter exactement 5 chiffres (ex: 16000).");
    }

    if (!formData.rue.trim()) {
      return toast.error("Veuillez saisir les détails de la rue et du bâtiment.");
    }

    if (!formData.phone.trim() || formData.phone.replace(/\s+/g, "").length < 9) {
      return toast.error("Veuillez entrer un numéro de téléphone valide à 9 ou 10 chiffres.");
    }

    if (!formData.isShipping && !formData.isBilling) {
      return toast.error(
        "La destination de l'adresse doit être au moins configurée pour la livraison ou la facturation."
      );
    }

    setSaving(true);
    try {
      const newAddress: ShippingAddress = {
        id: Math.random().toString(36).substring(2, 9),
        wilaya: formData.wilaya,
        daira: formData.daira.trim(),
        commune: formData.commune.trim(),
        codePostal: formData.codePostal,
        rue: formData.rue,
        phone: formData.phone.trim(),
        name: formData.name.trim(),
        isShipping: formData.isShipping,
        isBilling: formData.isBilling,
        isDefault: addresses.length === 0, // isFirst => isDefault
      };

      const updatedAddresses = [...addresses, newAddress];
      await updateDoc(doc(db, "users", currentUser.uid), {
        shippingAddresses: updatedAddresses,
      });

      toast.success("Votre nouvelle adresse structurée a été sauvegardée !");
      setShowAddForm(false);

      // reset forms
      setFormData({
        wilaya: "16 Alger",
        daira: "Sidi M'Hamed",
        commune: "Alger Centre",
        codePostal: "16000",
        rue: "",
        phone: "",
        name: currentUser?.displayName || "",
        isShipping: true,
        isBilling: true,
      });
      setManualDaira(false);
      setManualCommune(false);
    } catch (err: any) {
      console.error("Add address error:", err);
      toast.error("Impossible d'enregistrer votre adresse.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const addressToDelete = addresses.find((addr) => addr.id === id);
      const filtered = addresses.filter((addr) => addr.id !== id);

      if (addressToDelete?.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }

      await updateDoc(doc(db, "users", currentUser.uid), {
        shippingAddresses: filtered,
      });
      toast.success("Adresse supprimée avec succès.");
    } catch (err) {
      console.error("Delete address error:", err);
      toast.error("Échec de la suppression.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const updated = addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }));

      await updateDoc(doc(db, "users", currentUser.uid), {
        shippingAddresses: updated,
      });
      toast.success("Adresse principale mise à jour.");
    } catch (err) {
      console.error("Set default address error:", err);
      toast.error("Erreur d'application par défaut.");
    }
  };

  const currentDairas = Object.keys(ALGERIA_REGIONS[formData.wilaya]?.dairas || {});
  const currentCommunes = ALGERIA_REGIONS[formData.wilaya]?.dairas[formData.daira] || [];

  return (
    <div className="space-y-8" id="address-manager-module">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-xl text-zinc-900 tracking-tight rtl:tracking-normal text-start">
            {t("Mon Carnet d'Adresses")}
          </h3>
          <p className="text-zinc-500 text-xs rtl:text-sm text-start">
            {t("Configurez vos adresses de livraison principales et de facturation légale.")}
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              handleWilayaChange("16 Alger");
            }}
            className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 text-white font-extrabold text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-2xl hover:bg-zinc-800 transition-all active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4" /> {t("Nouvelle adresse")}
          </button>
        )}
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddAddress}
          className="bg-zinc-50 border border-zinc-150 rounded-3xl p-8 space-y-6 animate-pulse-once text-start"
        >
          <h4 className="font-extrabold text-sm text-zinc-900 uppercase tracking-widest rtl:tracking-normal flex items-center gap-2">
            <Compass className="w-5 h-5 text-zinc-500 animate-spin-slow" /> {t("Ajouter une adresse structurée")}
          </h4>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                {t("Nom du destinataire / Raison sociale")}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all"
                placeholder={t("Ex: Amine Benali (ou EURL Alger)") || "Ex: Amine Benali (ou EURL Alger)"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                {t("Téléphone de livraison")}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all"
                placeholder={t("Ex: 0550 12 34 56") || "Ex: 0550 12 34 56"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                {t("Wilaya")}
              </label>
              <select
                value={formData.wilaya}
                onChange={(e) => handleWilayaChange(e.target.value)}
                className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-bold text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal outline-none focus:ring-4 focus:ring-zinc-100 cursor-pointer"
              >
                {ALGERIA_WILAYAS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Daïra / Arrondissement selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                  {t("Daïra / Arrondissement")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !manualDaira;
                    setManualDaira(nextVal);
                    setFormData({ ...formData, daira: "", commune: "" });
                  }}
                  className="text-[9px] rtl:text-[11px] font-bold text-[#ea580c] hover:underline cursor-pointer"
                >
                  {manualDaira ? "Utiliser la liste" : "Saisie libre"}
                </button>
              </div>

              {manualDaira ? (
                <input
                  type="text"
                  required
                  placeholder={t("Saisissez la Daïra") || "Saisissez la Daïra"}
                  value={formData.daira}
                  onChange={(e) => setFormData({ ...formData, daira: e.target.value })}
                  className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all"
                />
              ) : (
                <select
                  value={formData.daira}
                  onChange={(e) => handleDairaChange(e.target.value)}
                  className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:ring-4 focus:ring-zinc-100 cursor-pointer"
                >
                  {currentDairas.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Commune / Baladia selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                  {t("Commune / Baladia")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !manualCommune;
                    setManualCommune(nextVal);
                    setFormData({ ...formData, commune: "" });
                  }}
                  className="text-[9px] rtl:text-[11px] font-bold text-[#ea580c] hover:underline cursor-pointer"
                >
                  {manualCommune ? "Utiliser la liste" : "Saisie libre"}
                </button>
              </div>

              {manualCommune || manualDaira ? (
                <input
                  type="text"
                  required
                  placeholder={t("Saisissez la commune") || "Saisissez la commune"}
                  value={formData.commune}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                  className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all"
                />
              ) : (
                <select
                  value={formData.commune}
                  onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                  className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:ring-4 focus:ring-zinc-100 cursor-pointer"
                >
                  {currentCommunes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Code Postal with regex validation */}
            <div className="space-y-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                {t("Code Postal (Algérien - 5 Chiffres)")}
              </label>
              <input
                type="text"
                required
                maxLength={5}
                value={formData.codePostal}
                onChange={(e) => setFormData({ ...formData, codePostal: e.target.value.replace(/\D/g, "") })}
                className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-bold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all"
                placeholder={t("Ex: 16000") || "Ex: 16000"}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] rtl:text-[12px] font-bold text-zinc-650 uppercase tracking-wider rtl:tracking-normal block">
                {t("Rue / Bâtiment / N° de porte (Détails de livraison)")}
              </label>
              <textarea
                rows={2}
                required
                value={formData.rue}
                onChange={(e) => setFormData({ ...formData, rue: e.target.value })}
                className="w-full px-5 py-3.5 bg-white border border-zinc-200 rounded-xl font-semibold text-xs rtl:text-sm outline-none focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 transition-all resize-none"
                placeholder={
                  t("Ex: Cité 500 Logements, Bâtiment C, Appartement 12") ||
                  "Ex: Cité 500 Logements, Bâtiment C, Appartement 12"
                }
              />
            </div>

            {/* Address Roles Logic (Gifting and B2B enabled) */}
            <div className="sm:col-span-2 space-y-3 pt-3">
              <label className="text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal block leading-none text-start">
                {t("Usage de l'adresse")}
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isShipping}
                    onChange={(e) => setFormData({ ...formData, isShipping: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-500 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs rtl:text-sm font-bold text-zinc-700 select-none">
                    {t("Adresse de Livraison (Shipping)")}
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBilling}
                    onChange={(e) => setFormData({ ...formData, isBilling: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-500 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-xs rtl:text-sm font-bold text-zinc-700 select-none">
                    {t("Adresse de Facturation (Billing)")}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-150">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-6 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-extrabold text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal hover:bg-white transition-all cursor-pointer"
            >
              {t("Annuler")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-extrabold text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Sauvegarde..." : "Enregistrer cette adresse"}
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="bg-zinc-50 rounded-3xl p-12 text-center border border-zinc-100 animate-pulse-once">
          <MapPin className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-bold text-sm">{t("Aucune adresse enregistrée")}</p>
          <p className="text-zinc-400 text-xs rtl:text-sm mt-1">
            {t("Ajoutez une adresse pour débloquer le service de livraison structuré d'Olma.")}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            return (
              <div
                key={addr.id}
                className={`p-6 rounded-3xl border transition-all duration-350 relative flex flex-col justify-between text-start group ${
                  addr.isDefault
                    ? "bg-white border-zinc-900 ring-2 ring-zinc-900/5 shadow-md shadow-zinc-900/5"
                    : "bg-white border-zinc-100 hover:border-zinc-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {addr.isDefault && (
                        <span className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rtl:tracking-normal rounded-full bg-zinc-900 text-white shadow-xs">
                          {t("Principale")}
                        </span>
                      )}
                      {addr.isShipping && (
                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rtl:tracking-normal rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                          {t("LIVR")}
                        </span>
                      )}
                      {addr.isBilling && (
                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rtl:tracking-normal rounded-md bg-purple-50 text-purple-600 border border-purple-100">
                          {t("FACT")}
                        </span>
                      )}
                    </div>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-[10px] rtl:text-[12px] font-bold text-zinc-400 hover:text-zinc-900 underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {t("Définir par défaut")}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 text-zinc-700">
                    <p className="font-black text-sm text-zinc-900 tracking-tight rtl:tracking-normal">
                      {addr.name || userProfile?.displayName}
                    </p>
                    <p className="font-extrabold text-[11px] text-zinc-800 uppercase tracking-widest rtl:tracking-normal">
                      {addr.wilaya} • {addr.daira ? `${addr.daira} • ` : ""}
                      {addr.commune}
                    </p>
                    <p className="text-xs rtl:text-sm font-semibold text-zinc-500">
                      {t("CP:")}
                      {addr.codePostal || "16000"}
                    </p>
                    <p className="text-xs rtl:text-sm font-medium text-zinc-400">{addr.rue}</p>

                    <p className="text-[11px] font-bold text-zinc-500 mt-2.5 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {addr.phone}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-zinc-50">
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    title={t("Supprimer cette adresse") || "Supprimer cette adresse"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
