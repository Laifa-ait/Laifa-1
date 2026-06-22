import React, { useRef, useState } from "react";
import {
  Printer,
  ArrowLeft,
  Building2,
  User,
  MapPin,
  Phone,
  CheckCircle,
  Info,
  Sparkles,
  QrCode,
  Barcode,
  Check,
  Settings,
  Copy,
  RefreshCw,
  Send,
  HelpCircle,
} from "lucide-react";
import { formatPrice } from "../../utils/format";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

interface ShippingLabelPrinterProps {
  order: any;
  onClose: () => void;
}

export const ShippingLabelPrinter: React.FC<ShippingLabelPrinterProps> = ({ order, onClose }) => {
  const { t } = useTranslation();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [carrierTemplate, setCarrierTemplate] = useState<"yalidine" | "mayestro" | "kazitour" | "olma">("yalidine");
  const [labelSize, setLabelSize] = useState<"a6" | "receipt">("a6");
  const [includeBarcodes, setIncludeBarcodes] = useState(true);
  const [remarks, setRemarks] = useState("Veuillez appeler le client avant livraison. Ouverture de colis autorisée.");

  // Simulate API activation logs
  const [isSyncingWithCarrier, setIsSyncingWithCarrier] = useState(false);
  const [apiSynced, setApiSynced] = useState(!!order.trackingId);
  const [generatedTracking, setGeneratedTracking] = useState(
    order.trackingId || `DZ-${Math.random().toString(36).substring(2, 11).toUpperCase()}`
  );

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    // Create a hidden iframe for print isolation that doesn't trigger popup blockers
    let iframe = document.getElementById("print-iframe-stealth") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "print-iframe-stealth";
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      iframe.style.left = "-1000px";
      iframe.style.top = "-1000px";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      toast.error("Erreur d'accès à l'iframe d'impression");
      return;
    }

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Bordereau d'Expédition - ${generatedTracking}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Libre+Barcode+128&display=swap');
            
            @page {
              size: ${labelSize === "a6" ? "105mm 148mm" : "80mm 200mm"};
              margin: 0;
            }
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 10px;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .label-card {
              width: 100%;
              max-width: ${labelSize === "a6" ? "101mm" : "76mm"};
              margin: 0 auto;
              border: 2px solid #000;
              padding: 10px;
              box-sizing: border-box;
            }
            .header-bar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .header-bar h2 {
              margin: 0;
              font-size: 16px;
              font-weight: 950;
              text-transform: uppercase;
            }
            .row-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .full-width {
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .label-text {
              font-size: 8px;
              text-transform: uppercase;
              font-weight: 700;
              color: #555;
            }
            .val-text {
              font-size: 11px;
              font-weight: 700;
            }
            .big-val {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .cash-badge {
              border: 3px solid #000;
              padding: 8px;
              text-align: center;
              background-color: #000;
              color: #fff;
              margin: 8px 0;
            }
            .cash-badge .amount {
              font-size: 20px;
              font-weight: 900;
            }
            .barcode-visual {
              text-align: center;
              padding: 10px 0;
              font-family: 'Libre Barcode 128', sans-serif;
              font-size: 40px;
              line-height: 1;
              letter-spacing: 2px;
            }
            .tracking-code {
              text-align: center;
              font-size: 11px;
              font-weight: 900;
              margin-top: 4px;
            }
            .qr-placeholder {
              width: 50px;
              height: 50px;
              border: 1px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    doc.close();

    // Give iframe some time to render properly then trigger print
    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 300);
  };

  const handleSyncCarrier = async () => {
    if (!auth.currentUser) {
      toast.error(t("Veuillez vous authentifier d'abord."));
      return;
    }
    const loadingToast = toast.loading(t("Connexion à l'API transporteur et création du bordereau..."));
    setIsSyncingWithCarrier(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/prepare-shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: order.id, provider: carrierTemplate.toUpperCase() }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || t("Échec de la synchronisation de l'expédition"));
      }

      const data = await response.json();
      if (data.tracking_id) {
        setGeneratedTracking(data.tracking_id);
        setApiSynced(true);
        toast.success(`${t("Bordereau enregistré avec succès !")} (Tracking: ${data.tracking_id})`, {
          id: loadingToast,
        });
      } else {
        throw new Error(t("Aucun numéro de suivi généré par le serveur."));
      }
    } catch (err: any) {
      console.error("Shipping sync error:", err);
      toast.error(`${t("Erreur de synchronisation :")} ${err.message}`, { id: loadingToast });
    } finally {
      setIsSyncingWithCarrier(false);
    }
  };

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-[2.5rem] p-6 sm:p-8 space-y-8">
      {/* Mini header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-zinc-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-[#121315] uppercase tracking-tight rtl:tracking-normal">
              {t("Bordereaux de Transport National")}
            </h2>
            <p className="text-xs rtl:text-sm text-zinc-400 font-bold">
              {t("Configurez et imprimez des tickets de vente compatibles Yalidine ou Mayestro.")}
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-md hover:shadow-lg"
        >
          <Printer className="w-4 h-4" />
          {t("Lancer l'impression")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left customization form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm space-y-5">
            <h3 className="text-xs rtl:text-sm font-black text-[#121315] uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
              <Settings className="w-4 h-4 text-[#F37021]" />
              {t("Format & Paramètres")}
            </h3>

            {/* Carrier style selection list */}
            <div className="space-y-2">
              <label className="block text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                {t("Modèle de transporteur partenaire")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "yalidine", label: "Yalidine Format" },
                  { id: "mayestro", label: "Mayestro Format" },
                  { id: "kazitour", label: "Kazitour Format" },
                  { id: "olma", label: "Olma Standard" },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCarrierTemplate(c.id as any);
                      setApiSynced(false);
                    }}
                    className={`py-2 px-3 rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${carrierTemplate === c.id ? "bg-[#121315] text-white border-transparent shadow-sm" : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Label paper size */}
            <div className="space-y-2">
              <label className="block text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                {t("Gabarit Papier")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "a6", label: "Autocollant Thermique A6" },
                  { id: "receipt", label: "Ticket Caisse (80mm)" },
                ].map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => setLabelSize(sz.id as any)}
                    className={`py-2 px-2 rounded-xl text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal transition-all border cursor-pointer ${labelSize === sz.id ? "bg-[#121315] text-white border-transparent" : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100"}`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Remarks for courier */}
            <div className="space-y-2">
              <label className="block text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                {t("Instructions de livraison (Bordereau)")}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder={t("Ex: Appeler avant d'arriver...") || "Ex: Appeler avant d'arriver..."}
                className="w-full text-xs rtl:text-sm font-semibold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:border-[#F37021] outline-none"
              />
            </div>

            {/* Include elements */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs rtl:text-sm font-bold text-zinc-600">{t("Imprimer les Codes Barres & QR")}</span>
              <button
                onClick={() => setIncludeBarcodes(!includeBarcodes)}
                className={`w-11 h-6 rounded-full transition-all relative ${includeBarcodes ? "bg-[#ea580c]" : "bg-zinc-200"}`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all ${includeBarcodes ? "right-1" : "left-1"}`}
                />
              </button>
            </div>
          </div>

          {/* Connected shipping API controller panel */}
          <div className="bg-[#121315] text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-orange-400 ${isSyncingWithCarrier ? "animate-spin" : ""}`} />
              <h4 className="text-xs rtl:text-sm font-black uppercase tracking-widest rtl:tracking-normal text-[#FAF8F5]">
                {t("Passerelle API Transport")}
              </h4>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-semibold">
              {t(
                "Connectez cette vente à votre compte transporteur pour transmettre automatiquement le colis à l'agence la plus proche et avertir le client par SMS."
              )}
            </p>

            <div className="bg-white/10 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="block text-[8px] font-black uppercase text-zinc-300">{t("Statut de couplage")}</span>
                <span className="text-xs rtl:text-sm font-bold">
                  {apiSynced ? `Pris en charge (${carrierTemplate.toUpperCase()})` : "En attente d'enregistrement"}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 text-[9px] rtl:text-[11px] font-black uppercase tracking-widest rtl:tracking-normal rounded-lg ${apiSynced ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}
              >
                {apiSynced ? "CONNECTÉ" : "HORS-LIGNE"}
              </span>
            </div>

            <button
              onClick={handleSyncCarrier}
              disabled={isSyncingWithCarrier || apiSynced}
              className="w-full text-center py-3.5 bg-[#F37021] hover:bg-[#b04f30] disabled:bg-zinc-600 disabled:opacity-50 text-white font-black text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isSyncingWithCarrier
                ? "Synchronisation API..."
                : apiSynced
                  ? "Déjà Appairé avec succès !"
                  : "Synchroniser & Obtenir de la cabine"}
            </button>
          </div>
        </div>

        {/* Right Label Print Live Preview container */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <span className="text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-3 select-none">
            {t("Aperçu conforme du ticket d'expédition (Standard Algérie)")}
          </span>

          {/* The print isolated paper border */}
          <div
            className="bg-white shadow-2xl p-6 border-2 border-dashed border-zinc-300 rounded-[1.5rem] w-full max-w-[380px]"
            id="print-label-container"
          >
            {/* Embedded inner print sheet to capture as html */}
            <div className="bg-white text-zinc-950 text-left select-text" ref={printAreaRef}>
              <div className="border-[3px] border-zinc-950 p-4 font-mono space-y-4 rounded-xl">
                {/* Header info */}
                <div className="flex items-center justify-between border-b-2 border-zinc-950 pb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black uppercase tracking-tighter rtl:tracking-normal leading-none">
                      {carrierTemplate === "yalidine" ? "⚡ Yalidine Express" : "📦 MAYESTRO DELIVERY"}
                    </h3>
                    <p className="text-[9px] rtl:text-[11px] font-bold text-zinc-500">
                      {t("Bordereau Algérie 58 Wilayas")}
                    </p>
                  </div>
                  {includeBarcodes && (
                    <div className="w-10 h-10 border border-zinc-950 flex items-center justify-center rounded">
                      <QrCode className="w-8 h-8 text-black" />
                    </div>
                  )}
                </div>

                {/* Sender vs Recipient */}
                <div className="grid grid-cols-2 gap-4 text-[10px] rtl:text-[12px] border-b border-zinc-950 pb-3">
                  <div className="space-y-1">
                    <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wide">
                      {t("EXPÉDITEUR :")}
                    </span>
                    <strong className="block text-zinc-900 leading-tight">{t("OLMART DIRECT")}</strong>
                    <span className="block text-zinc-500 font-bold">+213 23 00 00</span>
                  </div>
                  <div className="space-y-1 border-l border-zinc-200 pl-3">
                    <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wide">
                      {t("DESTINATAIRE :")}
                    </span>
                    <strong className="block text-zinc-900 leading-tight">
                      {order.shippingAddress?.name || "Client Olmart"}
                    </strong>
                    <span className="block text-zinc-500 font-bold">{order.shippingAddress?.phone}</span>
                  </div>
                </div>

                {/* Shipping Location Address */}
                <div className="space-y-1 border-b border-zinc-950 pb-3">
                  <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wide">
                    {t("ADRESSE DE LIVRAISON")}
                  </span>
                  <p className="text-[11px] font-black text-zinc-950 leading-tight">
                    {order.shippingAddress?.street || "Non spécifiée"}
                  </p>
                  <p className="text-[12px] font-black text-zinc-900 uppercase">
                    📍 {order.shippingAddress?.commune || "Commune"} • {order.shippingAddress?.wilaya || "Wilaya"}
                  </p>
                </div>

                {/* Package content details */}
                <div className="space-y-2 text-[10px] rtl:text-[12px] border-b border-zinc-950 pb-3">
                  <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wide">
                    {t("CONTENU COLIS / ARTICLES")}
                  </span>
                  <div className="space-y-1 font-sans">
                    {order.items?.map((it: any, k: number) => (
                      <p key={k} className="text-xs rtl:text-sm text-zinc-900 font-bold leading-tight">
                        • {it.name}{" "}
                        <span className="text-zinc-500 font-normal">
                          {t("store_profile.qty_x", "x ")} {it.quantity || 1}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* COD amount to collect - Very highlighted for the delivery guy */}
                <div className="border-[3px] border-zinc-950 p-2 text-center rounded-lg bg-zinc-950 text-white">
                  <span className="block text-[8px] font-black tracking-widest rtl:tracking-normal text-[#FAF8F5]/70 uppercase">
                    {t("MONTANT A ENCAISSER DU CLIENT (COD)")}
                  </span>
                  <h4 className="text-xl font-black">{formatPrice(order.total)}</h4>
                  <p className="text-[8px] tracking-wide text-zinc-300 uppercase leading-none mt-1">
                    {t("Cash on Delivery - Espèces d'Algérie uniquement")}
                  </p>
                </div>

                {/* Bottom barcode tracking visual simulated */}
                {includeBarcodes && (
                  <div className="pt-2 text-center space-y-1 select-none">
                    <div className="h-14 bg-white border-2 border-black w-full flex items-center justify-center rounded overflow-hidden py-1">
                      <div className="flex gap-0 items-stretch h-full w-full px-6">
                        {[
                          4, 1, 3, 2, 4, 1, 2, 3, 4, 1, 2, 4, 3, 2, 4, 1, 3, 2, 4, 1, 4, 3, 2, 1, 4, 2, 3, 1, 4, 2, 3,
                          4, 1, 2, 3, 4,
                        ].map((w, idx) => (
                          <div
                            key={idx}
                            style={{ flexGrow: w }}
                            className={`h-full ${idx % 2 === 0 ? "bg-black" : "bg-white"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <strong className="block text-[12px] font-black tracking-[0.2em] text-black">
                      {generatedTracking}
                    </strong>
                  </div>
                )}

                {/* Remarks/Voucher footer details */}
                <div className="text-[9px] rtl:text-[11px] text-zinc-500 leading-tight pt-1 font-sans border-t border-zinc-200">
                  <strong>{t("Notes Vendeur :")}</strong> {remarks}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
