import React, { useState, useMemo, useEffect } from "react";
import { Truck, MapPin, BadgePercent, ShieldCheck, Search, HelpCircle } from "lucide-react";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../../constants";
import { formatPrice } from "../../utils/format";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ShippingCalculator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("16 Alger");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [shippingConfig, setShippingConfig] = useState<{globalBaseFee?: number; wilayaFees?: Record<string,number>}>({});

  useEffect(() => {
    const fetchGlobalSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'shipping');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShippingConfig(docSnap.data());
        }
      } catch(e) {
        console.error("Erreur charagement shipping configuration", e);
      }
    };
    fetchGlobalSettings();
  }, []);

  // Filter list of Wilayas based on input search
  const filteredWilayas = useMemo(() => {
    return ALGERIA_WILAYAS.filter((w) =>
      w.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Dynamic Shipping Fees Calculation
  const tariffData = useMemo(() => {
    // Extract name without the code number (e.g. "16 Alger" -> "Alger")
    const cleanName = selectedWilaya.replace(/^\d+\s+/, "").trim();
    
    // Default values
    let priceDomicile = 700;
    let priceStopDesk = 400;
    let delay = "3 à 5 jours";

    // 1. Try to read from direct DB config if matching
    const dbFee = shippingConfig.wilayaFees?.[selectedWilaya] ?? shippingConfig.wilayaFees?.[cleanName];
    const knownData = ALGERIA_SHIPPING_DATA[cleanName];

    if (dbFee !== undefined) {
      priceDomicile = dbFee;
      priceStopDesk = Math.max(250, dbFee - 300);
      delay = knownData ? knownData.delay : "2 à 4 jours";
    } else if (knownData) {
      // 2. Try falling back to CONSTANTS
      priceDomicile = knownData.price;
      priceStopDesk = Math.max(250, knownData.price - 300);
      delay = knownData.delay;
    } else {
      // 3. Intelligent smart fallback according to Wilaya Code (Algeria geography)
      const codeStr = selectedWilaya.match(/^(\d+)/)?.[0];
      const code = codeStr ? parseInt(codeStr, 10) : 16;
      
      if (code === 16) { // Alger
        priceDomicile = 400;
        priceStopDesk = 250;
        delay = "24 à 48 heures";
      } else if ([9, 35, 42, 15, 10].includes(code)) { // Blida, Boumerdes, Tipaza, Tizi, Bouira
        priceDomicile = 550;
        priceStopDesk = 350;
        delay = "48 heures";
      } else if ([31, 23, 25, 19, 13, 34, 18, 21].includes(code)) { // Oran, Annaba, Constantine, Setif, Tlemcen, BBA, Jijel, Skikda
        priceDomicile = 700;
        priceStopDesk = 400;
        delay = "2 à 3 jours";
      } else if ([1, 11, 33, 37, 47, 52, 53, 54, 55, 56, 57, 58].includes(code)) { // South Wilayas (Sahara)
        priceDomicile = 950;
        priceStopDesk = 600;
        delay = "4 à 6 jours";
      } else { // Standard West/East
        priceDomicile = 650;
        priceStopDesk = 400;
        delay = "3 à 4 jours";
      }
    }

    // Calculate dynamic estimated date
    const today = new Date();
    const minDays = delay.includes("24") ? 1 : (delay.includes("48") ? 2 : parseInt(delay, 10) || 3);
    const estDate = new Date(today.getTime() + minDays * 24 * 60 * 60 * 1000);
    const formattedDate = estDate.toLocaleDateString(i18n.language || "fr", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return {
      priceDomicile,
      priceStopDesk,
      delay,
      estimatedDate: formattedDate,
      cleanName,
    };
  }, [selectedWilaya]);

  return (
    <section className="py-12 w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Simulator Info Column */}
        <div className="p-8 lg:p-12 lg:col-span-5 bg-gradient-to-b from-[#121315] to-[#0a0b0c] text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-600/15 via-transparent to-transparent pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-orange-400 text-[10px] rtl:text-[12px] font-bold uppercase tracking-wider rtl:tracking-normal rounded-full">
              <Truck className="w-3.5 h-3.5" />
              {t("delivery_58_wilayas") || "Logistique Algérie 58 Wilayas"}
            </div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight rtl:tracking-normal leading-tight">
              {t("calc_shipping_fees") || "Calculez vos frais de port instantanément"}
            </h2>
            <p className="text-xs rtl:text-sm text-zinc-300 font-medium leading-relaxed max-w-md">
              {t("shipping_calculator_desc") || "Plus besoin d'appeler ou de deviner ! Sélectionnez votre Wilaya pour afficher les tarifs de livraison à domicile et Stop Desk de notre réseau partenaire de transporteurs certifiés."}
            </p>
          </div>
 
          <div className="mt-8 space-y-4 border-t border-white/10 pt-6 relative z-10">
            {[
              { icon: ShieldCheck, title: t("cash_on_delivery") || "Paiement à la livraison", desc: t("cash_on_delivery_desc") || "Payez en espèces à réception du colis" },
              { icon: BadgePercent, title: t("transparent_fees") || "Frais transparents", desc: t("transparent_fees_desc") || "Tarifs calculés au plus juste sans frais cachés" }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-xs rtl:text-sm font-bold uppercase tracking-wider rtl:tracking-normal text-white">{item.title}</h4>
                  <p className="text-[10px] rtl:text-[12px] text-zinc-400 font-bold">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
 
        {/* Calculation Form Column */}
        <div className="p-8 lg:p-12 lg:col-span-7 space-y-8 flex flex-col justify-center">
          <div className="space-y-4">
            <label className="block text-[10px] rtl:text-[12px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal ml-1">
              {t("step_choose_wilaya") || "Étape 1 : Choisissez votre Wilaya de livraison"}
            </label>
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl font-bold text-sm text-[#121315] flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-all select-none"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#F37021]" />
                  <span>{selectedWilaya}</span>
                </div>
                <span className="text-xs rtl:text-sm font-black text-zinc-400 uppercase tracking-wider rtl:tracking-normal">{t("modify") || "Modifier ▾"}</span>
              </div>
 
              {/* Collapsible Combobox */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-3xl shadow-2xl p-4 max-h-[320px] flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-2xl mb-3 shrink-0">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder={t("search_wilaya_placeholder") || "Saisissez votre Wilaya (Ex: Oran, Alger...)"}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs rtl:text-sm font-bold outline-none text-[#121315] p-1.5"
                    />
                  </div>
 
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {filteredWilayas.length === 0 ? (
                      <p className="text-xs rtl:text-sm font-bold text-zinc-400 text-center py-4">{t("no_matching_wilaya") || "Aucune Wilaya correspondante."}</p>
                    ) : (
                      filteredWilayas.map((wilaya) => (
                        <button
                          key={wilaya}
                          type="button"
                          onClick={() => {
                            setSelectedWilaya(wilaya);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs rtl:text-sm font-bold uppercase tracking-wider rtl:tracking-normal hover:bg-zinc-100 transition-colors flex items-center justify-between cursor-pointer border-none ${selectedWilaya === wilaya ? "bg-[#F37021]/5 text-[#F37021]" : "bg-transparent text-[#121315]"}`}
                        >
                          <span>{wilaya}</span>
                          {selectedWilaya === wilaya && <span className="text-[10px] rtl:text-[12px] font-black">{t("active_badge") || "Actif ✓"}</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
 
          {/* Results Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Home delivery option */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] rtl:text-[11px] font-bold text-stone-400 uppercase tracking-wider rtl:tracking-normal">{t("main_option") || "Option principale"}</span>
              </div>
              <h3 className="text-xs rtl:text-sm font-black text-[#121315] uppercase tracking-wide mb-1">{t("home_delivery") || "Livraison à domicile"}</h3>
              <p className="text-[10px] rtl:text-[12px] text-zinc-400 font-bold mb-4">{t("home_delivery_desc") || "Colis déposé en main propre chez vous."}</p>
              <div className="text-2xl font-black text-[#121315]">{formatPrice(tariffData.priceDomicile)}</div>
            </div>
 
            {/* Stop desk relay option */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 hover:border-zinc-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-[9px] rtl:text-[11px] font-bold text-stone-500 uppercase tracking-wider rtl:tracking-normal">{t("economic_option") || "Option économique"}</span>
              </div>
              <h3 className="text-xs rtl:text-sm font-black text-[#121315] uppercase tracking-wide mb-1">{t("stop_desk") || "Point Relais / Stop Desk"}</h3>
              <p className="text-[10px] rtl:text-[12px] text-zinc-400 font-bold mb-4">{t("stop_desk_desc") || "À récupérer au bureau de transport local."}</p>
              <div className="text-2xl font-black text-[#F37021]">{formatPrice(tariffData.priceStopDesk)}</div>
            </div>
          </div>
 
          {/* Dynamic logistics info bar */}
          <div className="bg-orange-50/50 border border-orange-100/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="block text-[8px] font-bold text-orange-600 uppercase tracking-wider rtl:tracking-normal mb-0.5">{t("estimated_delay") || "Délai estimé"}</span>
              <p className="text-xs rtl:text-sm font-black text-[#121315] uppercase tracking-wide">
                {t("shipping_under") || "Expédition sous"} {tariffData.delay} ({tariffData.cleanName})
              </p>
            </div>
            <div className="text-right sm:text-right text-[10px] rtl:text-[12px] font-bold text-zinc-500 uppercase">
              {t("estimated_by") || "🚀 Estimé d'ici le"} <strong className="text-orange-600 font-black">{tariffData.estimatedDate}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
