import React, { useState, useMemo } from "react";
import { 
  Search, Truck, Check, MapPin, Phone, ShieldCheck, Clock, Navigation, 
  HelpCircle, Sparkles, Building2, UserCheck, ArrowLeft, Barcode, HelpCircle as HelpIcon,
  Map, Calendar, Layers, Printer, Wifi, Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatPrice } from "../../utils/format";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CarrierTrackingEvent } from "../../types";

interface StatusStep {
  title: string;
  desc: string;
  time: string;
  status: "completed" | "active" | "next";
  hub: string;
  severity?: string;
}

export const DeliveryTracking: React.FC = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTrackingId = searchParams.get("id") || "";
  const [trackingInput, setTrackingInput] = useState(initialTrackingId);
  const [searchedId, setSearchedId] = useState(initialTrackingId);
  
  // Custom states to demonstrate dynamic flow mockups
  const [selectedCarrier, setSelectedCarrier] = useState<"yalidine" | "mayestro" | "kazitour" | "olma">("olma");

  const [activeTab, setActiveTab] = useState<'visual' | 'technical'>('visual');
  const [realOrder, setRealOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    
    setSearchedId(trackingInput.trim().toUpperCase());
    setLoading(true);
    setErrorMsg('');
    setRealOrder(null);
    setSelectedCarrier('yalidine');

    try {
      const response = await fetch(`/api/public/tracking/${trackingInput.trim()}`);
      if (response.ok) {
        const data = await response.json();
        setRealOrder(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error || t('Aucun colis trouvé pour ce code de suivi.');
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = t('Erreur de connexion au serveur.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const trackingData = useMemo(() => {
    if (!searchedId || !realOrder) return null;

    const events = realOrder.carrier_tracking_events || [];
    const sortedEvents = [...events].sort((a: CarrierTrackingEvent, b: CarrierTrackingEvent) => {
       const dateA = new Date((a.timestamp as any)?.seconds ? (a.timestamp as any).seconds * 1000 : (a.timestamp as any)?.toDate ? (a.timestamp as any).toDate() : a.timestamp);
       const dateB = new Date((b.timestamp as any)?.seconds ? (b.timestamp as any).seconds * 1000 : (b.timestamp as any)?.toDate ? (b.timestamp as any).toDate() : b.timestamp);
       return dateB.getTime() - dateA.getTime();
    });

    const isDelivered = realOrder.status === "delivered";
    const isShipped = realOrder.status === "shipped";
    const isPreparing = realOrder.status === "processing";

    const steps: StatusStep[] = sortedEvents.map((evt: CarrierTrackingEvent, i: number) => {
      const dateObj = new Date((evt.timestamp as any)?.seconds ? (evt.timestamp as any).seconds * 1000 : (evt.timestamp as any)?.toDate ? (evt.timestamp as any).toDate() : evt.timestamp);
      const isLatest = i === 0;
      
      let status: "completed" | "active" | "next" = "completed";
      if (isLatest && !isDelivered) {
        status = "active";
      }

      return {
        title: t(evt.status_key) || evt.raw_status || "Statut inconnu",
        desc: evt.reason || t("Mise à jour logistique enregistrée."),
        time: dateObj.toLocaleString(),
        status,
        hub: evt.location || "Plateforme Logistique",
        severity: evt.severity || "Normal"
      };
    });

    if (steps.length === 0) {
      steps.push({
        title: t("Commande Validée"),
        desc: t("La commande est en attente d'expédition par le vendeur."),
        time: t("En cours"),
        status: "active",
        hub: t("Entrepôt Vendeur"),
        severity: "Normal"
      });
    }

    const currentStatusLabel = isDelivered 
      ? t("Livré avec succès")
      : (isShipped ? t("En cours d'acheminement") : (isPreparing ? t("En cours de préparation") : t("En cours de distribution")));

    const clientName = realOrder.shippingAddress?.fullName || realOrder.userName || "Client Anonyme";
    const wilaya = realOrder.shippingAddress?.city || realOrder.shippingAddress?.state || "Algérie";
    const codAmount = realOrder.total || 0;

    return {
      id: realOrder.trackingId || searchedId,
      carrier: selectedCarrier.toUpperCase(),
      clientName,
      address: realOrder.shippingAddress?.address || `Destination: ${wilaya}`,
      phone: "+213 (0) XXX XX XX XX",
      wilaya,
      codAmount,
      courierName: t("Livreur Partenaire"),
      courierPhone: "",
      currentStatusLabel,
      steps,
      isDelivered,
    };
  }, [searchedId, selectedCarrier, realOrder, t]);

  return (
    <div className="min-h-screen bg-[#FDF9EC]/20 pb-20">
      {/* Header section with warm tone */}
      <div className="bg-[#3C2B22] text-white py-14 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-650/15 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <button 
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-xs font-kinder uppercase tracking-widest rtl:tracking-normal bg-white/10 px-4 py-2 rounded-xl mb-4 cursor-pointer border-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Retour à l'Accueil")}</button>
          <div className="flex items-center justify-center gap-2">
            <span className="bg-[#FF5C00] text-white text-[10px] font-kinder tracking-widest rtl:tracking-normal uppercase px-3 py-1 rounded-full shadow-md">
              {t("LIVE TRACKING GATEWAY")}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-kinder tracking-tighter rtl:tracking-normal uppercase leading-none">
            {t("Suivi National de Livraison")}</h1>
          <p className="text-xs sm:text-sm text-zinc-300 font-bold max-w-xl mx-auto uppercase tracking-wider rtl:tracking-normal">
            {t("Saisissez votre numéro d'expédition pour localiser votre colis auprès de nos partenaires (Yalidine, Mayestro, Kazitour, etc.).")}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-10 space-y-8">
        {/* Search Field block */}
        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-xl p-6 sm:p-10 text-center space-y-6">
          <h2 className="text-lg font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">
            {t("Consulter l'état de votre envoi")}</h2>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-5 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t("Ex: DZ-94E1B3 ou ID Commande...") || "Ex: DZ-94E1B3 ou ID Commande..."}
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="w-full ps-14 pe-6 py-4.5 bg-zinc-50 border border-zinc-200 focus:border-[#FF5C00] font-kinder text-[#3C2B22] rounded-2xl outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4.5 bg-[#FF5C00] hover:bg-[#b04f30] text-white font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer border-none"
            >
              {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {loading ? t('Recherche...') : t('Rechercher')}
            </button>
          </form>
          {errorMsg && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">{errorMsg}</div>}

          {/* Core Carrier Selection tab simulated */}
          <div className="pt-4 border-t border-zinc-50">
            <span className="block text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-3">
              {t("Filtrez le réseau logistique partenaire")}</span>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                { id: "yalidine", label: "Yalidine Express" },
                { id: "mayestro", label: "Mayestro Delivery" },
                { id: "kazitour", label: "Kazitour Logistics" },
                { id: "olma", label: "Olma Delivery API (Standard)" }
              ].map((carrier) => (
                <button
                  key={carrier.id}
                  onClick={() => setSelectedCarrier(carrier.id as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${selectedCarrier === carrier.id ? "bg-[#3C2B22] text-white border-transparent shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"}`}
                >
                  {carrier.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Results Display */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header Skeleton */}
              <div className="bg-white/60 backdrop-blur-md animate-pulse border border-zinc-100 rounded-[2.5rem] p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div className="space-y-4">
                  <div className="h-4 w-32 bg-zinc-200/80 rounded-md"></div>
                  <div className="h-8 w-64 bg-zinc-200/80 rounded-lg"></div>
                  <div className="h-4 w-48 bg-zinc-200/80 rounded-md"></div>
                </div>
                <div className="h-16 w-16 bg-zinc-200/80 rounded-2xl"></div>
              </div>

              {/* Timeline Skeleton */}
              <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl p-6 sm:p-10 space-y-8">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-zinc-200 animate-pulse rounded-full"></div>
                  <div className="h-5 w-56 bg-zinc-200 animate-pulse rounded-md"></div>
                </div>
                <div className="relative ps-6 sm:ps-8 space-y-10 before:absolute before:start-[11px] sm:before:start-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-100">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="absolute -start-[23px] sm:-start-[31px] top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-200 border-4 border-white shadow-sm"></div>
                      <div className="space-y-3 flex-1">
                        <div className="h-4 w-40 bg-zinc-200 animate-pulse rounded-md"></div>
                        <div className="h-3 w-3/4 bg-zinc-200 animate-pulse rounded-md"></div>
                        <div className="h-5 w-24 bg-zinc-100 animate-pulse rounded-md mt-2"></div>
                      </div>
                      <div className="h-3 w-20 bg-zinc-200 animate-pulse rounded-md mt-1 sm:mt-0"></div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : trackingData ? (
            <motion.div
              key={trackingData.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Tab selector for API visual vs Developer integration view */}
              <div className="flex bg-zinc-100 rounded-2xl p-1 gap-1 max-w-sm mx-auto">
                <button
                  onClick={() => setActiveTab("visual")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all cursor-pointer border-none ${activeTab === "visual" ? "bg-white text-[#3C2B22] shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  {t("👁️ Suivi Client")}</button>
                <button
                  onClick={() => setActiveTab("technical")}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all cursor-pointer border-none ${activeTab === "technical" ? "bg-white text-[#3C2B22] shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  {t("⚙️ Spécifications API")}</button>
              </div>

              {activeTab === "visual" ? (
                <>
                  {/* Visual tracking summary banner */}
                  <div className="bg-[#3C2B22] text-white rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 end-0 w-48 h-48 bg-[#FF5C00]/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-[#FAF8F5]/80">{t("Code d'expédition")}</span>
                      </div>
                      <h3 className="text-2xl font-kinder uppercase tracking-tight rtl:tracking-normal">{trackingData.id}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-kinder text-emerald-400 uppercase tracking-widest rtl:tracking-normal">{trackingData.currentStatusLabel}</span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 min-w-[200px] text-zinc-100 relative z-10 space-y-2">
                      <span className="block text-[8px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-300">{t("Détails Expédition")}</span>
                      <p className="text-xs font-bold leading-none">{t("Partenaire :")}<strong className="text-white uppercase">{selectedCarrier}</strong></p>
                      <p className="text-xs font-bold leading-none">{t("Région :")}<strong className="text-white uppercase">{trackingData.wilaya}</strong></p>
                      <p className="text-xs font-bold leading-none">{t("COD à Encaisser :")}<strong className="text-orange-350">{formatPrice(trackingData.codAmount)}</strong></p>
                    </div>
                  </div>

                  {/* Steps Progress Timeline */}
                  <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl p-6 sm:p-10 space-y-8">
                    <h3 className="text-base font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#FF5C00]" />
                      {t("Historique des étapes de distribution")}</h3>

                    <div className="relative ps-6 sm:ps-8 space-y-8 before:absolute before:start-[11px] sm:before:start-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-100">
                      {trackingData.steps.map((step, i) => (
                        <div key={i} className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          {/* Dot item */}
                          <div className={`absolute -start-[23px] sm:-start-[31px] top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all 
                            ${step.severity === 'error' ? 'bg-red-500 text-white' : 
                              step.severity === 'success' ? 'bg-emerald-500 text-white' :
                              step.severity === 'warning' ? 'bg-amber-500 text-white' :
                              (step.status === "completed" ? "bg-[#3C2B22] text-white" : (step.status === "active" ? "bg-[#FF5C00] text-white animate-pulse" : "bg-zinc-100 text-zinc-350"))}`}>
                            {(step.status === "completed" || step.severity === 'success' || step.severity === 'error' || step.severity === 'warning') ? (
                              step.severity === 'error' ? <div className="w-2 h-2 rounded-full bg-white" /> :
                              step.severity === 'warning' ? <div className="w-2 h-2 rounded-full bg-white" /> :
                              <Check className="w-3 h-3 text-white" />
                            ) : (
                              <div className={`w-1.5 h-1.5 rounded-full ${step.status === "active" ? "bg-white" : "bg-transparent"}`} />
                            )}
                          </div>

                          <div className="space-y-1">
                            <h4 className={`text-sm font-black uppercase tracking-tight rtl:tracking-normal 
                              ${step.severity === 'error' ? 'text-red-500' :
                                step.severity === 'success' ? 'text-emerald-500' :
                                step.severity === 'warning' ? 'text-amber-500' :
                                (step.status === "active" ? "text-[#FF5C00]" : (step.status === "completed" ? "text-[#3C2B22]" : "text-zinc-400"))}`}>
                              {step.title}
                            </h4>
                            <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
                              {step.desc}
                            </p>
                            <span className="inline-block text-[9px] font-kinder text-[#3C2B22]/40 uppercase tracking-widest rtl:tracking-normal bg-zinc-50 px-2 py-0.5 rounded-md mt-1">
                              📍 {step.hub}
                            </span>
                          </div>

                          <div className="text-start sm:text-end shrink-0">
                            <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                              {step.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Courier detail info */}
                  <div className="bg-orange-650/[0.03] border border-[#FF5C00]/10 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF5C00]/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-[#FF5C00]" />
                      </div>
                      <div>
                        <span className="block text-[8px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Livreur Assigné")}</span>
                        <h4 className="text-sm font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">{trackingData.courierName}</h4>
                        <p className="text-xs text-zinc-500 font-medium leading-none mt-1">{t("Livreur régional agréé •")}{trackingData.wilaya}</p>
                      </div>
                    </div>

                      <div className="px-5 py-3.5 bg-white border border-zinc-200 text-zinc-400 font-kinder text-xs uppercase tracking-widest rtl:tracking-normal rounded-xl flex items-center justify-center gap-2 shadow-sm">
                        <Phone className="w-4 h-4" />
                        {t("Livreur (Passer par la messagerie Olma)")}</div>
                  </div>
                </>
              ) : (
                /* Technical future routing API integration details */
                <div className="bg-zinc-950 text-zinc-100 rounded-[2.5rem] p-6 sm:p-10 space-y-6 shadow-xl font-mono">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-orange-400" />
                      <span className="text-xs uppercase font-kinder text-orange-400">{t("Yalidine & Mayestro Direct Hook")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-kinder px-2 py-1 rounded bg-white/15 text-zinc-300">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" /> {t("API CONNECTREADY")}</div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-bold">
                    {t("Cette passerelle est développée en conformité avec les APIs REST des principaux transporteurs d'Algérie (Yalidine, Mayestro, Kazitour). Lors de la mise en production, l'activation se fera en fournissant vos jetons d'accès API Keys dans les paramètres administrateurs.")}</p>

                  <div className="space-y-4 pt-2">
                    <span className="block text-[10px] font-kinder text-amber-500 uppercase">{t("1. Exemple de Hook Payload attendu (JSON) :")}</span>
                    <pre className="text-[10px] p-4 bg-zinc-900 rounded-2xl border border-white/5 text-teal-400 overflow-x-auto">
{`{
  "tracking_number": "${trackingData.id}",
  "carrier": "${selectedCarrier}",
  "status": "shipped",
  "last_checkpoint": {
    "wilaya": "${trackingData.wilaya}",
    "hub_name": "Hub Local Distribution",
    "updated_at": "${new Date().toISOString()}"
  },
  "recipient": {
    "name": "${trackingData.clientName}",
    "cod_to_collect": ${trackingData.codAmount}
  }
}`}
                    </pre>

                    <span className="block text-[10px] font-kinder text-amber-500 uppercase">{t("2. Endpoints requis pour le raccordement physique :")}</span>
                    <div className="space-y-2 text-xs font-bold font-sans">
                      <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg">
                        <span className="bg-blue-600 font-kinder text-[9px] px-2 py-0.5 rounded text-white font-mono">{t("POST")}</span>
                        <span className="text-zinc-300 font-mono text-[10px]">{t("/api/v1/shipment/create-ticket")}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg">
                        <span className="bg-emerald-600 font-kinder text-[9px] px-2 py-0.5 rounded text-white font-mono">{t("GET")}</span>
                        <span className="text-zinc-300 font-mono text-[10px]">{t("/api/v1/shipment/track/")}{trackingData.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            searchedId && (
              <div className="bg-white rounded-[2rem] p-10 text-center space-y-4 border border-zinc-100 shadow-md">
                <HelpIcon className="w-14 h-14 text-zinc-300 mx-auto" />
                <h3 className="text-lg font-kinder text-[#3C2B22] uppercase tracking-tight rtl:tracking-normal">{t("Aucun envoi trouvé")}</h3>
                <p className="text-xs text-zinc-400 font-bold max-w-sm mx-auto uppercase tracking-wide">
                  {t("Vérifiez le numéro d'expédition saisi (ex : DZ-A4E29F01B). Si vous venez de commander, la mise à disposition du suivi peut nécessiter jusqu'à 12 heures.")}</p>
              </div>
            )
          )}
        </AnimatePresence>

        {/* Carrier partners reassurance strip */}
        <div className="bg-zinc-100 rounded-[2rem] p-6 text-center space-y-4">
          <span className="block text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
            {t("TRANSPORT ET EXPÉDITIONS PARTENAIRES SÉCURISÉES")}</span>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-bold">
            <span className="grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">{t("⚡ YALIDINE EXPRESS")}</span>
            <span className="grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">{t("⚡ MAYESTRO DELIVERY")}</span>
            <span className="grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">{t("⚡ KAZITOUR LOGISTICS")}</span>
            <span className="grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">{t("⚡ OLMA PARTNER TRUCKING")}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
