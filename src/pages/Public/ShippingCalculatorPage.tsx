import React, { useState, useMemo, useEffect } from "react";
import { 
  Truck, MapPin, BadgePercent, ShieldCheck, Search, HelpCircle, 
  Sparkles, Check, ArrowLeft, Info, ShoppingBag, Scale, HelpCircle as HelpIcon,
  PhoneCall, Mail, DollarSign
} from "lucide-react";
import { ALGERIA_WILAYAS, ALGERIA_SHIPPING_DATA } from "../../constants";
import { formatPrice } from "../../utils/format";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ShippingCalculatorPage: React.FC = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
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

  // Advanced features: Weight range selection
  const [packageWeight, setPackageWeight] = useState<"light" | "medium" | "heavy">("medium");

  // Advanced features: Virtual order value simulation
  const [orderValueInput, setOrderValueInput] = useState<string>("5000");

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

    // Weight Pricing Multipliers
    let weightMultiplier = 1.0;
    let weightLabel = "Standard";
    if (packageWeight === "light") {
      weightMultiplier = 0.85; // 15% discount for small lightweight packets
      weightLabel = "Léger (Accessoires, Cosmétiques, T-Shirts)";
    } else if (packageWeight === "heavy") {
      weightMultiplier = 1.4; // 40% surplus for household items, heavy goods
      weightLabel = "Volumineux et Lourd (Électroménager, Mobilier, High-Tech)";
    }

    const finalDomicile = Math.round(priceDomicile * weightMultiplier / 10) * 10;
    const finalStopDesk = Math.round(priceStopDesk * weightMultiplier / 10) * 10;

    // Calculate dynamic estimated date
    const today = new Date();
    const minDays = delay.includes("24") ? 1 : (delay.includes("48") ? 2 : parseInt(delay, 10) || 3);
    const estDate = new Date(today.getTime() + minDays * 24 * 60 * 60 * 1000);
    const formattedDate = estDate.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return {
      priceDomicile: finalDomicile,
      priceStopDesk: finalStopDesk,
      delay,
      weightLabel,
      estimatedDate: formattedDate,
      cleanName,
    };
  }, [selectedWilaya, packageWeight]);

  // Total Basket value simulated
  const simulatedTotalWithShipping = useMemo(() => {
    const valueNum = parseFloat(orderValueInput) || 0;
    return {
      domicile: valueNum + tariffData.priceDomicile,
      stopDesk: valueNum + tariffData.priceStopDesk,
      valueNum
    };
  }, [orderValueInput, tariffData]);

  return (
    <div className="min-h-screen bg-[#FDF9EC]/20 pb-20">
      {/* Upper Navigation Header */}
      <div className="bg-[#3C2B22] text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-650/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-[1850px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <button 
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/85 hover:text-white transition-colors text-xs font-kinder uppercase tracking-widest rtl:tracking-normal bg-white/10 px-4 py-2 rounded-xl mb-2 cursor-pointer border-none"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("Retour")}</button>
            <h1 className="text-3xl md:text-5xl font-kinder tracking-tighter rtl:tracking-normal uppercase leading-none">
              {t("Calculateur National 58 Wilayas")}</h1>
            <p className="text-sm text-zinc-300 font-bold max-w-2xl uppercase tracking-wider rtl:tracking-normal">
              {t("Simulez vos frais de port par wilaya, estimez le poids de votre colis et le montant de vos livraisons avant de commander.")}</p>
          </div>

          <button
            onClick={() => navigate("/shop")}
            className="px-6 py-4 bg-[#FF5C00] hover:bg-[#b04f30] text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer border-none self-start md:self-auto"
          >
            <ShoppingBag className="w-4 h-4" />
            {t("Retourner au Magasin")}</button>
        </div>
      </div>

      <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Core Calculation Simulator Drawer */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl p-6 sm:p-10 space-y-8">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-[#FF5C00]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">
                  {t("Simulateur Intelligent de Livraison")}</h2>
                <p className="text-xs text-zinc-400 font-bold">
                  {t("Calculateur logistique ajusté en temps réel.")}</p>
              </div>
            </div>

            {/* Wilaya Selection */}
            <div className="space-y-3 relative">
              <label className="block text-xs font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal">
                {t("1. Sélectionnez votre Wilaya de destination")}</label>
              
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-200 rounded-3xl font-kinder text-base text-[#3C2B22] flex items-center justify-between cursor-pointer hover:border-[#3C2B22] transition-all select-none shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#FF5C00]" />
                  <span>{selectedWilaya}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Changer")}</span>
                  <span className="text-zinc-500 text-sm">▾</span>
                </div>
              </div>

              {/* Combobox Panel */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 mt-2 bg-white border border-zinc-200 shadow-2xl rounded-3xl p-4 max-h-[350px] z-50 flex flex-col"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-2xl mb-3 shrink-0">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          placeholder={t("Filtrez par code ou par nom (Ex: Alger, 31...)") || "Filtrez par code ou par nom (Ex: Alger, 31...)"}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold outline-none text-[#3C2B22] py-1"
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                        {filteredWilayas.length === 0 ? (
                          <p className="text-xs font-bold text-zinc-400 text-center py-6">{t("Aucune Wilaya correspondante.")}</p>
                        ) : (
                          filteredWilayas.map((wilaya) => {
                            
                            return (
                                                      <button
                                                        key={wilaya}
                                                        type="button"
                                                        onClick={() => {
                                                          setSelectedWilaya(wilaya);
                                                          setIsDropdownOpen(false);
                                                          setSearchQuery("");
                                                        }}
                                                        className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider rtl:tracking-normal hover:bg-zinc-50 transition-colors flex items-center justify-between cursor-pointer border-none ${selectedWilaya === wilaya ? "bg-[#FF5C00]/5 text-[#FF5C00]" : "bg-transparent text-[#3C2B22]"}`}
                                                      >
                                                        <span>{wilaya}</span>
                                                        {selectedWilaya === wilaya && <span className="text-[10px] font-kinder">{t("Sélectionné ✓")}</span>}
                                                      </button>
                                                    );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Package scale sizing */}
            <div className="space-y-3">
              <label className="block text-xs font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal">
                {t("2. Spécifiez le gabarit de votre colis")}</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "light", label: "Colis Léger", range: "Moins de 1kg", desc: "Accessoires, vêtements légers, bijoux, soins", bg: "hover:border-[#FF5C00]/40" },
                  { id: "medium", label: "Colis Standard", range: "De 1kg à 5kg", desc: "Chaussures, coffrets, maroquinerie, petits robots", bg: "hover:border-[#FF5C00]/40" },
                  { id: "heavy", label: "Volumineux / Lourd", range: "Plus de 5kg", desc: "Gros électroménager, ameublement, colis multiples", bg: "hover:border-[#FF5C00]/40" },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPackageWeight(item.id as any)}
                    className={`p-5 rounded-3xl border cursor-pointer transition-all flex flex-col justify-between ${packageWeight === item.id ? "border-[#FF5C00] bg-[#FF5C00]/5 ring-1 ring-[#FF5C00]" : "border-zinc-200 bg-white"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-kinder text-[#3C2B22] uppercase tracking-wide">{item.label}</span>
                      <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center shrink-0">
                        {packageWeight === item.id && <div className="w-2.5 h-2.5 rounded-full bg-[#FF5C00]" />}
                      </div>
                    </div>
                    <span className="block text-[10px] font-kinder text-orange-650 uppercase tracking-wider rtl:tracking-normal mb-2">{item.range}</span>
                    <p className="text-[10px] text-zinc-455 font-bold leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Virtual COD basket value calculator */}
            <div className="space-y-3">
              <label className="block text-xs font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal">
                {t("3. Entrez la valeur estimée de vos achats (DZD) - Optionnel")}</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={t("Ex : 4500") || "Ex : 4500"}
                  value={orderValueInput}
                  onChange={(e) => setOrderValueInput(e.target.value)}
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-base font-kinder text-[#3C2B22] focus:border-[#FF5C00] outline-none"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-kinder text-zinc-400">{t("DA (DZD)")}</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-bold">
                {t("Pour calculer de manière transparente le montant exact en espèces que vous remettrez au livreur à l'arrivée (Marchandise + Transport).")}</p>
            </div>
          </div>

          {/* Detailed results block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home delivery */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-kinder text-emerald-650 bg-emerald-50 px-2.5 py-1 rounded-xl uppercase tracking-widest rtl:tracking-normal">{t("À domicile")}</span>
                <Truck className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">{t("Livraison direct chez vous")}</h3>
              <p className="text-xs text-zinc-450 font-semibold leading-relaxed">
                {t("Le transporteur partenaire se déplace jusqu'à votre pas de porte à")}<strong className="text-[#3C2B22]">{tariffData.cleanName}</strong>.
              </p>
              
              <div className="pt-4 border-t border-zinc-100 flex items-baseline justify-between">
                <span className="text-xs font-kinder text-zinc-450">{t("Frais de transport :")}</span>
                <span className="text-2xl font-kinder text-[#3C2B22]">{formatPrice(tariffData.priceDomicile)}</span>
              </div>

              {simulatedTotalWithShipping.valueNum > 0 && (
                <div className="bg-zinc-50 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Total en espèces COD")}</span>
                    <span className="text-xs font-kinder text-zinc-700">{t("À payer à la livraison")}</span>
                  </div>
                  <span className="text-lg font-kinder text-[#FF5C00]">{formatPrice(simulatedTotalWithShipping.domicile)}</span>
                </div>
              )}
            </div>

            {/* Stop Desk Relay */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-kinder text-orange-650 bg-orange-50 px-2.5 py-1 rounded-xl uppercase tracking-widest rtl:tracking-normal">{t("Stop Desk / Bureau")}</span>
                <MapPin className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-sm font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">{t("Récupération en Bureau Relais")}</h3>
              <p className="text-xs text-zinc-450 font-semibold leading-relaxed">
                {t("Économisez en récupérant directement le colis au bureau central de")}<strong className="text-[#3C2B22]">{tariffData.cleanName}</strong>.
              </p>
              
              <div className="pt-4 border-t border-zinc-100 flex items-baseline justify-between">
                <span className="text-xs font-kinder text-zinc-450">{t("Frais de transport :")}</span>
                <span className="text-2xl font-kinder text-[#FF5C00]">{formatPrice(tariffData.priceStopDesk)}</span>
              </div>

              {simulatedTotalWithShipping.valueNum > 0 && (
                <div className="bg-[#FF5C00]/5 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-kinder text-[#FF5C00] uppercase tracking-widest rtl:tracking-normal">{t("Total en espèces COD")}</span>
                    <span className="text-xs font-kinder text-zinc-700">{t("À payer au guichet")}</span>
                  </div>
                  <span className="text-lg font-kinder text-[#3C2B22]">{formatPrice(simulatedTotalWithShipping.stopDesk)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time details trust strip */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-600/10 text-orange-700 text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal rounded-lg">
                <Sparkles className="w-3.5 h-3.5" />
                {t("Délai Estimé de Livraison")}</span>
              <p className="text-sm font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">
                {t("Transit moyen :")}{tariffData.delay} ({tariffData.cleanName})
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className="block text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Date de dépose estimable")}</span>
              <strong className="text-sm font-kinder text-[#FF5C00] uppercase tracking-tight rtl:tracking-normal">{tariffData.estimatedDate}</strong>
            </div>
          </div>
        </div>

        {/* Informative Side-Column & FAQs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Partnership reassurance badge */}
          <div className="bg-zinc-950 text-white rounded-3xl p-6 space-y-4 relative overflow-hidden shadow-xl border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5C00]/20 rounded-full blur-3xl -mr-8 -mt-8" />
            <div className="relative z-10 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-orange-400" />
              <h3 className="font-kinder text-base uppercase tracking-tight rtl:tracking-normal">{t("Réseau Logistique Certifié")}</h3>
            </div>
            <p className="text-[11px] text-zinc-350 leading-relaxed relative z-10">
              {t("Chaque envoi est assigné à nos transporteurs officiels (Yalidine Express, Kazitour, Mayestro) pour vous garantir assurance contre perte, suivi SMS et ouverture assistée du colis.")}</p>
            <div className="border-t border-white/10 pt-4 space-y-2 relative z-10">
              {[
                "Ouverture de colis autorisée pour vérification",
                "Suivi d'état par messagerie en Algérie",
                "Assurance à 100% sur la valeur déclarée"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-orange-400" />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact help block */}
          <div className="bg-white rounded-3xl p-6 space-y-4 shadow-md border border-zinc-100">
            <h4 className="font-kinder text-sm text-[#3C2B22] uppercase tracking-wide">{t("Une question sur vos envois ?")}</h4>
            <p className="text-xs text-zinc-450 font-bold">
              {t("Notre équipe d'assistance logistique d'Olmart est disponible 7j/7 pour localiser ou reprogrammer un envoi.")}</p>
            <div className="space-y-3">
              <span className="flex items-center gap-3 p-3 bg-zinc-50 rounded-2xl text-xs font-kinder text-[#3C2B22] transition-all">
                <PhoneCall className="w-4 h-4 text-[#FF5C00]" />
                <span>{t("Support disponible via messagerie Olma")}</span>
              </span>
              <a href="mailto:support@olmart.dz" className="flex items-center gap-3 p-3 bg-zinc-50 hover:bg-zinc-100 rounded-2xl text-xs font-kinder text-[#3C2B22] no-underline transition-all">
                <Mail className="w-4 h-4 text-[#FF5C00]" />
                <span>{t("support@olmart.dz")}</span>
              </a>
            </div>
          </div>

          {/* Quick FAQ accordion items */}
          <div className="bg-[#3C2B22]/5 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-kinder text-[#3C2B22] uppercase tracking-widest rtl:tracking-normal">{t("Questions fréquentes")}</h4>
            <div className="space-y-3">
              {[
                { q: "Qu'est-ce que le Stop Desk ?", a: "C'est l'option économique de livraison. Le transporteur dépose votre colis dans leur bureau local. Vous êtes prévenu par SMS et vous avez 7 jours pour le récupérer." },
                { q: "Quelles sont les méthodes de paiement ?", a: "Nous proposons uniquement le paiement en espèces à la livraison (Cash on Delivery) pour vous garantir une sécurité totale." },
                { q: "Puis-je retourner le produit ?", a: "Oui, vous disposez de 14 jours réglementaires conformément à nos CGV pour retourner ou échanger le produit via un dépôt bureau." }
              ].map((faq, i) => (
                <div key={i} className="p-3 bg-white rounded-2xl space-y-1 shadow-sm border border-zinc-550/20">
                  <h5 className="text-[11px] font-kinder text-[#3C2B22] uppercase tracking-wide flex items-center gap-1">
                    <HelpIcon className="w-3.5 h-3.5 text-[#FF5C00] shrink-0" />
                    {faq.q}
                  </h5>
                  <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
