import React, { useState, useEffect, useRef } from "react";
import { 
  Mail, Users, Settings, Plus, Trash2, Send, CheckCircle2, 
  Loader2, RefreshCw, AlertCircle, BarChart3, Image as ImageIcon, 
  Type, MousePointer2, MoveUp, MoveDown, Eye, Code, Smartphone, Monitor, Upload
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTranslation } from "react-i18next";

type BlockType = "text" | "image" | "button" | "spacer";

interface ContentBlock {
  id: string;
  type: BlockType;
  data: any;
}

export default function AdminNewsletter({ auth }: any) {
    const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"stats" | "subscribers" | "campaigns" | "settings">("stats");
  const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("desktop");
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // States
  const [stats, setStats] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    senderName: "L'équipe Olma",
    senderEmail: "newsletter@olma-dz.com",
    footerTemplate: "Vous recevez ce courriel car vous êtes inscrit sur olma.dz."
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Campaign Form
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [campData, setCampData] = useState({ 
    title: "", 
    subject: "", 
    targeting: "all",
    blocks: [] as ContentBlock[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeBlockIdForUpload = useRef<string | null>(null);

  const showAlert = (message: string, type: "success" | "error" = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchApi = async (endpoint: string, options: any = {}) => {
    const currentAuthUser = auth.currentUser;
    let token = "";
    if (currentAuthUser) {
      token = await currentAuthUser.getIdToken();
    }
    const res = await fetch(`/api/admin/newsletter/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur de chargement");
    return data;
  };

  const loadData = async () => {
    if (!auth.currentUser) return; // Wait for session
    setIsLoading(true);
    try {
      if (activeTab === "stats") setStats(await fetchApi("stats"));
      if (activeTab === "subscribers") setSubscribers((await fetchApi("subscribers")).subscribers);
      if (activeTab === "campaigns") setCampaigns((await fetchApi("campaigns")).campaigns);
      if (activeTab === "settings") {
        const s = await fetchApi("settings");
        if (s) setSettings(s);
      }
    } catch (err: any) {
      showAlert(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Add a listener to re-load once auth state is resolved if it was null
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      if (user) loadData();
    });
    
    loadData();
    return () => unsubscribe();
  }, [activeTab]);

  // Image Upload Logic
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const blockId = activeBlockIdForUpload.current;
    if (!file || !blockId) return;

    setIsUploading(blockId);
    try {
      const storage = getStorage();
      const fileName = `newsletter/asset_${Date.now()}_${file.name}`;
      const assetRef = storageRef(storage, fileName);
      
      const snapshot = await uploadBytes(assetRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      updateBlock(blockId, { 
        ...campData.blocks.find(b => b.id === blockId)?.data, 
        url: downloadURL 
      });
      showAlert("Image téléchargée avec succès");
    } catch (error: any) {
      showAlert("Erreur lors du téléchargement: " + error.message, "error");
    } finally {
      setIsUploading(null);
      activeBlockIdForUpload.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = (blockId: string) => {
    activeBlockIdForUpload.current = blockId;
    fileInputRef.current?.click();
  };

  // Block Helpers
  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: type === "text" ? { text: "" } :
            type === "image" ? { url: "", align: "center", width: 100 } :
            type === "button" ? { text: "Cliquez ici", link: "#", align: "center" } :
            { height: 20 }
    };
    setCampData({ ...campData, blocks: [...campData.blocks, newBlock] });
  };

  const updateBlock = (id: string, data: any) => {
    setCampData({
      ...campData,
      blocks: campData.blocks.map(b => b.id === id ? { ...b, data } : b)
    });
  };

  const removeBlock = (id: string) => {
    setCampData({ ...campData, blocks: campData.blocks.filter(b => b.id !== id) });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...campData.blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setCampData({ ...campData, blocks: newBlocks });
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi("campaigns", { 
        method: "POST", 
        body: JSON.stringify({ ...campData, id: currentCampaignId }) 
      });
      showAlert("Campagne enregistrée");
      if (!currentCampaignId) {
        setCampData({ title: "", subject: "", targeting: "all", blocks: [] });
      }
      loadData();
    } catch (e: any) { showAlert(e.message, "error"); }
  };

  const handleEditCampaign = (camp: any) => {
    setCurrentCampaignId(camp.id);
    setCampData({
      title: camp.title,
      subject: camp.subject,
      targeting: camp.targeting,
      blocks: camp.blocks || []
    });
    setViewMode("edit");
  };

  const resetForm = () => {
    setCurrentCampaignId(null);
    setCampData({ title: "", subject: "", targeting: "all", blocks: [] });
  };

  // Render Preview
  const RenderPreview = () => (
    <div className={`mx-auto bg-white shadow-2xl overflow-hidden transition-all duration-300 ${previewDevice === "mobile" ? "max-w-[375px] rounded-[3rem] border-[8px] border-zinc-900" : "max-w-4xl"}`}>
      <div className="bg-zinc-50 p-4 border-b border-zinc-100 mb-6">
        <p className="text-[10px] rtl:text-[12px] text-zinc-400 uppercase font-bold tracking-widest rtl:tracking-normal mb-1">{t("De:")}{settings.senderName} {t("&lt;")}{settings.senderEmail}{t("&gt;")}</p>
        <p className="text-xs rtl:text-sm font-bold text-zinc-800">{t("Objet:")}{campData.subject || "(Pas d'objet)"}</p>
      </div>
      <div className="p-4 sm:p-8 space-y-6">
        {campData.blocks.map(block => (
          <div key={block.id} className="w-full">
            {block.type === "text" && (
              <div className="text-zinc-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {block.data.text || "Tapez votre texte ici..."}
              </div>
            )}
            {block.type === "image" && block.data.url && (
              <div className={`flex ${block.data.align === "left" ? "justify-start" : block.data.align === "right" ? "justify-end" : "justify-center"}`}>
                <img loading="lazy" 
                  src={block.data.url} 
                  alt={t("Email content") || "Email content"} 
                  className="max-w-full h-auto rounded-xl"
                  style={{ width: block.data.align === "full" ? "100%" : `${block.data.width}%` }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {block.type === "button" && (
              <div className={`flex ${block.data.align === "left" ? "justify-start" : block.data.align === "right" ? "justify-end" : "justify-center"}`}>
                <a href={block.data.link} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all text-sm inline-block">{block.data.text}</a>
              </div>
            )}
            {block.type === "spacer" && (
              <div style={{ height: `${block.data.height}px` }} />
            )}
          </div>
        ))}
      </div>
      <div className="p-8 border-t border-zinc-100 bg-zinc-50 text-[10px] rtl:text-[12px] text-zinc-400 text-center uppercase tracking-widest rtl:tracking-normal leading-relaxed">
        {settings.footerTemplate}
        <p className="mt-4">
          <a href="#" className="underline">{t("Désinscription en 1 clic")}</a>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {alert && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 ${alert.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {alert.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{alert.message}</p>
        </div>
      )}

      {/* Header with Navigation */}
      <div className="bg-white rounded-3xl p-4 lg:p-6 border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2">
          {[
            { id: "stats", icon: BarChart3, label: "Stats" },
            { id: "subscribers", icon: Users, label: "Abonnés" },
            { id: "campaigns", icon: Mail, label: "Campagnes" },
            { id: "settings", icon: Settings, label: "Params." },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-[10px] rtl:text-[12px] font-bold uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 transition-all ${activeTab === tab.id ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"}`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "campaigns" && currentCampaignId && (
          <button onClick={resetForm} className="text-xs rtl:text-sm font-bold text-zinc-400 hover:text-emerald-600 flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> {t("Nouvelle Campagne")}</button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-zinc-100">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-[10px] rtl:text-[12px] text-zinc-400 font-bold uppercase tracking-widest rtl:tracking-normal">{t("Initialisation du studio...")}</p>
        </div>
      )}

      {/* Stats Tab */}
      {!isLoading && activeTab === "stats" && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Abonnés", value: stats.totalSubscribed, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Désinscrits", value: stats.totalUnsubscribed, color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Ouverture", value: stats.averageOpenRate + "%", color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Clics", value: stats.averageClickRate + "%", color: "text-violet-600", bg: "bg-violet-50" },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-[2rem] p-6 border border-zinc-100 flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center ${s.bg} ${s.color}`}>
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight rtl:tracking-normal">{s.value}</span>
                    <span className="text-[9px] rtl:text-[11px] uppercase tracking-[0.2em] rtl:tracking-normal text-zinc-400 font-black mt-1">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-zinc-100">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-8 border-l-4 border-emerald-500 pl-4">{t("Évolution de la base de données")}</h3>
                 <div className="h-72 min-w-0" style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                       <ResponsiveContainer width="99%" height="99%">
                         <AreaChart data={stats.growthChart}>
                          <defs>
                            <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: "1.5rem", border: "none", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                          />
                          <Area type="monotone" dataKey="subscribers" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorSub)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
           </div>
           <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-100">
                 <h3 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-400 mb-6">{t("Logs Récents")}</h3>
                 <div className="space-y-4">
                    {stats.logs?.map((log: any, i: number) => (
                      <div key={i} className="flex gap-3">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                         <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
                           <span className="font-bold text-zinc-900">{log.type.replace(/_/g, " ")}:</span> {log.details}
                         </p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Campaign Tab - The Core Editor */}
      {!isLoading && activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="flex bg-white rounded-[2rem] p-2 border border-zinc-100 w-fit">
            <button onClick={() => setViewMode("edit")} className={`px-6 py-2.5 rounded-xl text-[10px] rtl:text-[12px] font-bold uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 transition-all ${viewMode === "edit" ? "bg-zinc-900 text-white shadow-xl" : "text-zinc-400"}`}>
              <Type className="w-3.5 h-3.5" /> {t("Éditeur Studio")}</button>
            <button onClick={() => setViewMode("preview")} className={`px-6 py-2.5 rounded-xl text-[10px] rtl:text-[12px] font-bold uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 transition-all ${viewMode === "preview" ? "bg-zinc-900 text-white shadow-xl" : "text-zinc-400"}`}>
              <Eye className="w-3.5 h-3.5" /> {t("Aperçu Réel")}</button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "edit" ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left: Inputs */}
                <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-zinc-100 space-y-8">
                   <div>
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] rtl:tracking-normal text-zinc-400 mb-1">{t("Configuration")}</h3>
                     <h2 className="text-xl font-bold text-zinc-900 mb-6">{t("Détails de l'envoi")}</h2>
                     <div className="space-y-4">
                        <input type="text" placeholder={t("Nom interne (ex: Promo été 2024)") || "Nom interne (ex: Promo été 2024)"} value={campData.title || ''} onChange={e => setCampData({...campData, title: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all outline-none" />
                        <input type="text" placeholder={t("Sujet de l'email") || "Sujet de l'email"} value={campData.subject || ''} onChange={e => setCampData({...campData, subject: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all outline-none" />
                        <div className="flex gap-4">
                          <select value={campData.targeting || ''} onChange={e => setCampData({...campData, targeting: e.target.value})} className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-xs rtl:text-sm font-bold uppercase tracking-widest rtl:tracking-normal outline-none appearance-none cursor-pointer">
                            <option value="all">{t("🚀 Tous mes abonnés")}</option>
                            <option value="buyer">{t("💼 Acheteurs exclusifs")}</option>
                            <option value="seller">{t("🏪 Vendeurs partenaires")}</option>
                          </select>
                        </div>
                     </div>
                   </div>

                   <div>
                     <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] rtl:tracking-normal text-zinc-400 mb-6">{t("Studio de Composition")}</h3>
                     <div className="flex flex-wrap gap-3 mb-8">
                       {[
                         { type: "text", icon: Type, label: "Paragraphe" },
                         { type: "image", icon: ImageIcon, label: "Média/Bannière" },
                         { type: "button", icon: MousePointer2, label: "Bouton CTA" },
                         { type: "spacer", icon: Plus, label: "Espace" },
                       ].map(t => (
                         <button key={t.type} onClick={() => addBlock(t.type as BlockType)} className="px-4 py-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 rounded-2xl flex items-center gap-2 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-600 transition-all">
                           <t.icon className="w-3.5 h-3.5" /> {t.label}
                         </button>
                       ))}
                     </div>

                     <div className="space-y-4">
                        {campData.blocks.map((block, index) => (
                          <div key={block.id} className="group bg-zinc-100/50 p-6 rounded-[2rem] border border-zinc-200/50 hover:border-emerald-200 transition-all space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] rtl:text-[11px] font-black uppercase tracking-[0.2em] rtl:tracking-normal text-zinc-400 flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-zinc-100">
                                <Code className="w-3 h-3 text-emerald-500" /> {t("Bloc")}{block.type}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => moveBlock(index, "up")} disabled={index === 0} className="p-2 hover:bg-white rounded-xl disabled:opacity-20"><MoveUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => moveBlock(index, "down")} disabled={index === campData.blocks.length - 1} className="p-2 hover:bg-white rounded-xl disabled:opacity-20"><MoveDown className="w-3.5 h-3.5" /></button>
                                <button onClick={() => removeBlock(block.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>

                            {block.type === "text" && (
                              <textarea value={block.data.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} placeholder={t("Dites quelque chose de génial...") || "Dites quelque chose de génial..."} className="w-full bg-white border border-zinc-100 rounded-xl p-4 text-xs rtl:text-sm font-medium focus:ring-4 focus:ring-emerald-50 outline-none min-h-[100px] resize-none" />
                            )}
                            
                            {block.type === "image" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 flex gap-2">
                                  <input placeholder={t("URL Image") || "URL Image"} value={block.data.url || ''} onChange={e => updateBlock(block.id, { ...block.data, url: e.target.value })} className="flex-1 bg-white border border-zinc-100 rounded-xl px-4 py-3 text-[11px] font-bold outline-none" />
                                  <button 
                                    onClick={() => triggerUpload(block.id)}
                                    disabled={isUploading === block.id}
                                    className="px-4 bg-zinc-900 text-white rounded-xl flex items-center gap-2 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal disabled:opacity-50 transition-all hover:bg-zinc-800"
                                  >
                                    {isUploading === block.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">{t("Charger")}</span>
                                  </button>
                                </div>
                                <select value={block.data.align || ''} onChange={e => updateBlock(block.id, { ...block.data, align: e.target.value })} className="bg-white border border-zinc-100 rounded-xl px-4 py-2 text-[10px] rtl:text-[12px] font-bold outline-none">
                                  <option value="center">{t("Centre")}</option>
                                  <option value="left">{t("Gauche")}</option>
                                  <option value="right">{t("Droite")}</option>
                                  <option value="full">{t("Pleine Largeur")}</option>
                                </select>
                                <input type="number" placeholder={t("Largeur %") || "Largeur %"} value={block.data.width || ''} onChange={e => updateBlock(block.id, { ...block.data, width: parseInt(e.target.value) })} className="bg-white border border-zinc-100 rounded-xl px-4 py-2 text-[10px] rtl:text-[12px] font-bold outline-none" />
                              </div>
                            )}

                            {block.type === "button" && (
                              <div className="grid grid-cols-2 gap-3">
                                <input placeholder={t("Texte") || "Texte"} value={block.data.text || ''} onChange={e => updateBlock(block.id, { ...block.data, text: e.target.value })} className="w-full bg-white border border-zinc-100 rounded-xl px-4 py-2 text-[10px] rtl:text-[12px] font-bold outline-none" />
                                <input placeholder={t("Lien URL") || "Lien URL"} value={block.data.link || ''} onChange={e => updateBlock(block.id, { ...block.data, link: e.target.value })} className="w-full bg-white border border-zinc-100 rounded-xl px-4 py-2 text-[10px] rtl:text-[12px] font-bold outline-none" />
                              </div>
                            )}
                          </div>
                        ))}
                        {campData.blocks.length === 0 && (
                          <div className="py-12 border-2 border-dashed border-zinc-100 rounded-[2rem] flex flex-col items-center justify-center text-center px-6">
                            <Plus className="w-8 h-8 text-zinc-200 mb-2" />
                            <p className="text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal font-black text-zinc-300">{t("Votre toile est vide. Ajoutez un bloc.")}</p>
                          </div>
                        )}
                     </div>

                     <button onClick={handleSaveCampaign} className="w-full bg-zinc-900 text-white font-black uppercase tracking-[0.2em] rtl:tracking-normal py-5 rounded-3xl mt-12 hover:scale-[1.01] transition-all active:scale-95 shadow-xl hover:shadow-2xl">
                       {currentCampaignId ? "Mettre à jour la campagne" : "Sauvegarder en brouillon"}
                     </button>
                   </div>
                </div>

                {/* Right: History */}
                <div className="space-y-6">
                   <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden">
                      <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                        <h3 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">{t("Archives")}</h3>
                      </div>
                      <div className="divide-y divide-zinc-50 max-h-[700px] overflow-y-auto">
                        {campaigns.map(c => (
                          <div key={c.id} className="p-8 hover:bg-zinc-50/50 transition-colors group">
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{c.title}</h4>
                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest rtl:tracking-normal ${c.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {c.status}
                                </span>
                             </div>
                             <p className="text-[11px] text-zinc-400 mb-6 truncate">{c.subject}</p>
                             <div className="flex gap-2">
                                <button onClick={() => handleEditCampaign(c)} className="flex-1 bg-white border border-zinc-200 text-zinc-900 text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal py-2.5 rounded-xl hover:bg-zinc-50 active:scale-95 transition-all">{t("Éditer")}</button>
                                <button onClick={() => {}} className="flex-1 bg-emerald-600 text-white text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal py-2.5 rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all">{t("Envoyer")}</button>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                 <div className="flex justify-center gap-4">
                    <button onClick={() => setPreviewDevice("desktop")} className={`p-4 rounded-2xl border transition-all ${previewDevice === "desktop" ? "bg-zinc-900 text-white border-zinc-900 shadow-xl" : "bg-white text-zinc-400 border-zinc-100"}`}>
                      <Monitor className="w-5 h-5" />
                    </button>
                    <button onClick={() => setPreviewDevice("mobile")} className={`p-4 rounded-2xl border transition-all ${previewDevice === "mobile" ? "bg-zinc-900 text-white border-zinc-900 shadow-xl" : "bg-white text-zinc-400 border-zinc-100"}`}>
                      <Smartphone className="w-5 h-5" />
                    </button>
                 </div>
                 <RenderPreview />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Subscribers Tab */}
      {!isLoading && activeTab === "subscribers" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-zinc-100">
             <h3 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-[0.2em] rtl:tracking-normal text-zinc-400 mb-6">{t("Recrutement Manuel")}</h3>
             <div className="flex gap-4">
                <input type="email" placeholder={t("email@exemple.com") || "email@exemple.com"} className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none" />
                <button className="bg-zinc-900 text-white px-8 rounded-2xl font-black uppercase tracking-widest rtl:tracking-normal text-[10px] rtl:text-[12px]">{t("Inscrire")}</button>
             </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                <tr>
                  <th className="px-8 py-6 text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Abonné")}</th>
                  <th className="px-8 py-6 text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Groupe")}</th>
                  <th className="px-8 py-6 text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal">{t("Statut")}</th>
                  <th className="px-8 py-6 text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 text-sm">{s.name}</span>
                        <span className="text-[11px] font-mono text-zinc-400">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] rtl:text-[12px] font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-500 py-1 px-3 bg-zinc-100 rounded-full">{s.group}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === "subscribed" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
                        <span className={`text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal ${s.status === "subscribed" ? "text-emerald-700" : "text-rose-700"}`}>{s.status}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button className="p-2.5 text-zinc-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {!isLoading && activeTab === "settings" && settings && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 shadow-sm">
             <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1 border-l-4 border-emerald-500 pl-4">{t("Signature & Authentification")}</h3>
             <h2 className="text-2xl font-bold text-zinc-900 mb-8 italic">{t("Paramètres SMTP")}</h2>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-400 mb-2">{t("Identité de l'expéditeur")}</label>
                   <input 
                     value={settings.senderName || ''} 
                     onChange={e => setSettings({...settings, senderName: e.target.value})}
                     className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all"
                   />
                </div>
                <div>
                   <label className="block text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-400 mb-2">{t("Adresse Email Professionnelle")}</label>
                   <input 
                     value={settings.senderEmail || ''} 
                     onChange={e => setSettings({...settings, senderEmail: e.target.value})}
                     className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-sm font-mono outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all"
                   />
                </div>
                <div>
                   <label className="block text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-400 mb-2">{t("Pied de page légal (RGPD)")}</label>
                   <textarea 
                     rows={5}
                     value={settings.footerTemplate || ''} 
                     onChange={e => setSettings({...settings, footerTemplate: e.target.value})}
                     className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 text-xs rtl:text-sm font-medium leading-relaxed outline-none focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all resize-none"
                   />
                </div>
                <button 
                  onClick={async () => {
                    try {
                      await fetchApi("settings", { method: "POST", body: JSON.stringify(settings) });
                      showAlert("Paramètres Olma synchronisés.");
                    } catch (e: any) { showAlert(e.message, "error"); }
                  }}
                  className="w-full bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rtl:tracking-normal py-5 rounded-[2rem] shadow-xl shadow-emerald-100 hover:shadow-2xl hover:scale-[1.01] transition-all"
                >
                  {t("Appliquer les modifications")}</button>
             </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
