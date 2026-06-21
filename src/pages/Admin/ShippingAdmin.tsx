import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Save, ShieldAlert, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../../constants";

export const ShippingAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [globalBaseFee, setGlobalBaseFee] = useState(ALGERIA_SHIPPING_DATA.Default?.price || 600);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // wilayaFees is now a matrix: wilayaFees[originWilaya][destinationWilaya]
  // For backwards compatibility and Default, we use "DEFAULT_ORIGIN" as the key for general/legacy fees
  const [wilayaFees, setWilayaFees] = useState<Record<string, Record<string, number>>>({});
  const [selectedOrigin, setSelectedOrigin] = useState<string>("DEFAULT_ORIGIN");

  useEffect(() => {
    const fetchShippingFees = async () => {
      try {
        const docRef = doc(db, 'settings', 'shipping');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.globalBaseFee) setGlobalBaseFee(data.globalBaseFee);
          
          if (data.matrixFees) {
            setWilayaFees(data.matrixFees);
          } else if (data.wilayaFees) {
            // Legacy format migration
            setWilayaFees({
              "DEFAULT_ORIGIN": data.wilayaFees
            });
          }
        } else {
          // Fallback to ALGERIA_SHIPPING_DATA if no DB doc
          const initialFees = ALGERIA_WILAYAS.reduce((acc, wilaya) => {
            const cleanName = wilaya.replace(/^\d{2}\s+/, "").trim();
            if (ALGERIA_SHIPPING_DATA[cleanName]) {
              acc[wilaya] = ALGERIA_SHIPPING_DATA[cleanName].price;
            }
            return acc;
          }, {} as Record<string, number>);
          setWilayaFees({ "DEFAULT_ORIGIN": initialFees });
        }
      } catch (error) {
        console.error("Error fetching shipping fees:", error);
        toast.error("Erreur lors du chargement des tarifs.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchShippingFees();
  }, []);

  const handleUpdateWilaya = (wilaya: string, fee: string) => {
    const parsed = parseInt(fee);
    setWilayaFees(prev => {
      const originData = prev[selectedOrigin] || {};
      const newOriginData = { ...originData };
      if (isNaN(parsed)) {
        delete newOriginData[wilaya]; // Remove rule if empty
      } else {
        newOriginData[wilaya] = parsed;
      }
      return {
        ...prev,
        [selectedOrigin]: newOriginData
      };
    });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', 'shipping');
      await setDoc(docRef, {
        globalBaseFee,
        wilayaFees: wilayaFees["DEFAULT_ORIGIN"] || {}, // Legacy field
        matrixFees: wilayaFees,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(t("Tarifs de livraison mis à jour (Matrice)"));
    } catch (error) {
      console.error("Error saving shipping fees:", error);
      toast.error(t("Erreur lors de l'enregistrement."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950 uppercase">{t("Tarifs & Livraison")}</h2>
          <p className="text-zinc-500 font-medium">{t("Configuration globale des partenaires logistiques (Yalidine, ZR Express) et grilles tarifaires par Wilaya.")}</p>
        </div>
        <button onClick={saveSettings} disabled={isSaving} className="px-8 py-4 bg-zinc-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 hover:bg-zinc-800 transition-colors shadow-xl disabled:opacity-50">
           {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
           {t("Enregistrer Grille")}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
         <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-6">
                    <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-zinc-900 mb-2">{t("Tarif de Base (Défaut)")}</h3>
                <p className="text-xs text-zinc-500 font-medium mb-6">{t("S'applique à toutes les wilayas non configurées spécifiquement.")}</p>
                <div className="flex items-center gap-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <span className="text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]">{t("DZD")}</span>
                    <input 
                      type="number" 
                      value={globalBaseFee} 
                      onChange={(e) => setGlobalBaseFee(parseInt(e.target.value) || 0)}
                      className="bg-transparent border-none text-xl font-black text-zinc-900 w-full outline-none text-end"
                    />
                </div>
            </div>

            <div className="bg-orange-50 p-8 rounded-[2rem] border border-orange-100">
               <ShieldAlert className="w-8 h-8 text-orange-500 mb-4" />
               <h3 className="text-sm font-black text-orange-950 uppercase tracking-widest rtl:tracking-normal mb-2">{t("Sécurité Logistique")}</h3>
               <p className="text-xs text-orange-800">{t("Assurez-vous que les prix configurés incluent les frais d'assurance pour les objets de valeur. Le supplément poids (volumétrique) est calculé dynamiquement au Checkout.")}</p>
            </div>
         </div>

         <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden p-8 flex items-center justify-between">
              <div>
                 <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest rtl:tracking-normal">{t("Wilaya de Départ")}</h3>
                 <p className="text-xs text-zinc-500 font-medium">{t("Sélectionnez l'origine pour définir sa propre grille vers les 58 wilayas")}.</p>
              </div>
              <select 
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
                className="px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-black text-zinc-900 outline-none focus:border-orange-500"
              >
                <option value="DEFAULT_ORIGIN">{t("Config par Défaut (Général)")}</option>
                <optgroup label="Spécifique par région">
                   {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-zinc-100 flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                  <h3 className="text-lg font-black text-zinc-900">
                     {selectedOrigin === "DEFAULT_ORIGIN" ? t("Grille Tarifaire (Défaut)") : t("Tarifs depuis ") + selectedOrigin}
                  </h3>
               </div>
               <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
                   {ALGERIA_WILAYAS.map(wilaya => {
                     const activeMatrix = wilayaFees[selectedOrigin] || {};
                     const isConfigured = activeMatrix[wilaya] !== undefined;
                     
                     // If it's a specific origin but not configured, it falls back to DEFAULT_ORIGIN -> Wilaya, then global base
                     const defaultMatrixValue = wilayaFees["DEFAULT_ORIGIN"]?.[wilaya];
                     const inheritedFee = defaultMatrixValue !== undefined ? defaultMatrixValue : globalBaseFee;
                     
                     const currentFee = isConfigured ? activeMatrix[wilaya] : inheritedFee;
                     
                     return (
                       <div key={wilaya} className="p-4 px-8 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                              <span className="font-bold text-sm text-zinc-700">{wilaya}</span>
                              {!isConfigured && <span className="ms-2 text-[9px] uppercase tracking-widest rtl:tracking-normal font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">{selectedOrigin === "DEFAULT_ORIGIN" ? t("Tarif Base") : t("Hérité du Défaut")}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                             <input 
                               type="number"
                               value={isConfigured ? activeMatrix[wilaya] : ''}
                               placeholder={inheritedFee.toString()}
                               onChange={(e) => handleUpdateWilaya(wilaya, e.target.value)}
                               className="w-24 text-end px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold focus:border-orange-500 outline-none"
                             />
                             <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest rtl:tracking-normal">{t("DZD")}</span>
                          </div>
                       </div>
                     );
                   })}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
