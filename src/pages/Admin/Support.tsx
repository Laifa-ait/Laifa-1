import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Clock, User, Store, Search, ChevronRight, CheckCircle2, Paperclip, FileText, Loader2, AlertCircle, Zap, Shield, BarChart3 } from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, onSnapshot, doc, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CANNED_RESPONSES = [
  "Bonjour, nous avons bien reçu votre demande et nous l'analysons.",
  "Pourrions-vous nous fournir plus de détails s'il vous plaît ?",
  "Le problème est maintenant résolu. N'hésitez pas à nous recontacter si besoin.",
  "Votre demande a été escaladée à notre équipe technique."
];

export const SupportAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]); 
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isInternal, setIsInternal] = useState(false);
  
  // Dashboard & SLA
  const [showDashboard, setShowDashboard] = useState(false);

  // 1. Fetch tickets (Limited to 50 for admin performance)
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { getDocs, limit } = await import('firebase/firestore');
        const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);
        setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoadingTickets(false);
      } catch (err) {
        console.error("Quota error in tickets", err);
        setLoadingTickets(false);
      }
    };
    fetchTickets();
  }, []);

  // 2. Fetch specific ticket messages
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const q = query(
      collection(db, "supportMessages"),
      where("ticketId", "==", selectedTicket),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingMessages(false);
    }, (error) => { console.error("Snapshot quota error in ", error); setLoadingTickets(false); });
    return () => unsubscribe();
  }, [selectedTicket]);

  const currentTicket = tickets.find(t => t.id === selectedTicket);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !currentTicket || newMessage === '<p><br></p>') return;

    setSending(true);
    try {
      await addDoc(collection(db, "supportMessages"), {
        ticketId: selectedTicket,
        sellerId: currentTicket.sellerId || null,
        buyerId: currentTicket.buyerId || null,
        orderId: currentTicket.orderId || null,
        text: newMessage.trim(),
        sender: 'admin',
        isInternal,
        createdAt: serverTimestamp(),
      });
      
      if (!isInternal) {
        // We strip html tags for the preview text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newMessage;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        await updateDoc(doc(db, "supportTickets", selectedTicket), {
           lastMessage: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''),
           lastMessageAt: serverTimestamp()
        });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTicket || !currentTicket) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Seules les images et les PDF sont acceptés.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La taille du fichier ne doit pas dépasser 5Mo.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `support/${selectedTicket}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "supportMessages"), {
        ticketId: selectedTicket,
        sellerId: currentTicket.sellerId || null,
        buyerId: currentTicket.buyerId || null,
        text: `Fichier envoyé : ${file.name}`,
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        sender: 'admin',
        createdAt: serverTimestamp(),
      });
      
      await updateDoc(doc(db, "supportTickets", selectedTicket), {
        lastMessage: 'Pièce jointe envoyée',
        lastMessageAt: serverTimestamp()
      });
      
      toast.success("Fichier envoyé.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'envoi du fichier.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
     if (!selectedTicket || currentTicket?.status === newStatus) return;
     try {
       await updateDoc(doc(db, "supportTickets", selectedTicket), {
          status: newStatus
       });
       
       await addDoc(collection(db, "supportMessages"), {
         ticketId: selectedTicket,
         text: `Le statut du ticket a été changé à "${newStatus}" par l'administrateur.`,
         sender: 'system',
         isInternal: true,
         createdAt: serverTimestamp(),
       });

       toast.success(`Statut changé à ${newStatus}`);
       // Update local state for immediate feedback
       setTickets(tickets.map(t => t.id === selectedTicket ? { ...t, status: newStatus } : t));
     } catch (err) {
       toast.error("Erreur lors du changement de statut.");
     }
  };

  const handleUpdatePriority = async (newPriority: string) => {
     if (!selectedTicket || currentTicket?.priority === newPriority) return;
     try {
       await updateDoc(doc(db, "supportTickets", selectedTicket), {
          priority: newPriority
       });
       await addDoc(collection(db, "supportMessages"), {
         ticketId: selectedTicket,
         text: `La priorité du ticket a été changée à "${newPriority}" par l'administrateur.`,
         sender: 'system',
         isInternal: true,
         createdAt: serverTimestamp(),
       });
       toast.success(`Priorité mise à jour : ${newPriority}`);
       setTickets(tickets.map(t => t.id === selectedTicket ? { ...t, priority: newPriority } : t));
     } catch (err) {
       toast.error("Erreur.");
     }
  };

  const filteredTickets = tickets.filter(t => 
    (t.shopName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950">{t("Tickets Support")}</h2>
          <p className="text-zinc-500 text-sm font-medium">{t("Gérez et résolvez les demandes clients et vendeurs.")}</p>
        </div>
        <button 
          onClick={() => setShowDashboard(!showDashboard)}
          className="px-6 py-3 bg-zinc-950 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
        >
           <BarChart3 className="w-4 h-4" /> {showDashboard ? t("Fermer Analytics") : t("Analytics & SLA")}
        </button>
      </div>

      {showDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
           <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Taux de résolution (48h)</p>
                 <p className="text-2xl font-kinder text-zinc-900">94.2%</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Clock className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Temps de réponse moyen (SLA)</p>
                 <p className="text-2xl font-kinder text-zinc-900">1h 14m</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Shield className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Satisfaction (CSAT)</p>
                 <p className="text-2xl font-kinder text-zinc-900">4.8/5</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar: Tickets */}
        <div className="w-full lg:w-96 bg-white rounded-[2rem] border border-zinc-100 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-50 shrink-0">
            <div className="relative">
              <Search className="absolute start-4 rtl:start-auto rtl:end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder={t("Chercher une boutique ou sujet...") || "Chercher une boutique ou sujet..."}
                className="w-full ps-11 pe-4 rtl:pe-11 rtl:ps-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none font-medium text-sm focus:border-zinc-300 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
            {loadingTickets ? (
              <div className="p-8 text-center text-zinc-400">{t("Chargement...")}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 font-medium">{t("Aucun ticket")}</div>
            ) : (
              filteredTickets.map(ticket => (
                <button 
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={`w-full text-start p-5 transition-colors flex items-center justify-between group ${selectedTicket === ticket.id ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}`}
                >
                  <div className="flex-1 min-w-0 pe-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm truncate font-bold ${selectedTicket === ticket.id ? 'text-zinc-950' : 'text-zinc-700'}`}>
                        {ticket.shopName || ticket.buyerName || "Client inconnu"}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest rtl:tracking-normal ${
                         ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                         {ticket.status === 'resolved' ? 'Résolu' : ticket.status === 'in_progress' ? 'En cours' : 'Ouvert'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-800 truncate mb-1">{ticket.subject}</p>
                    <p className="text-xs text-zinc-500 truncate">{ticket.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`w-2 h-2 rounded-full ${
                          ticket.priority === 'high' || ticket.priority === 'P0' || ticket.priority === 'P1' ? 'bg-red-500' : ticket.priority === 'medium' || ticket.priority === 'P2' ? 'bg-amber-500' : 'bg-emerald-500'
                       }`} title={`Priorité ${ticket.priority}`}></span>
                       <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest rtl:tracking-normal">
                          {ticket.createdAt?.toDate?.().toLocaleDateString('fr-FR')}
                       </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${selectedTicket === ticket.id ? 'text-zinc-600' : 'text-zinc-300 group-hover:text-zinc-400'}`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-[2rem] border border-zinc-100 flex flex-col overflow-hidden shadow-sm min-h-[400px]">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-sm z-10 gap-4" >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                     <Store className="w-6 h-6 text-zinc-500" />
                   </div>
                   <div>
                     <h3 className="font-kinder text-lg text-zinc-950">{currentTicket?.shopName || currentTicket?.buyerName || "Utilisateur"}</h3>
                     <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                        {currentTicket?.subject} 
                     </p>
                   </div>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto">
                   <select 
                      value={currentTicket?.priority || "P3"}
                      onChange={(e) => handleUpdatePriority(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none text-zinc-600"
                   >
                     <option value="P0">P0 (Urgent)</option>
                     <option value="P1">P1 (Haute)</option>
                     <option value="P2">P2 (Moyenne)</option>
                     <option value="P3">P3 (Basse)</option>
                   </select>

                   <select 
                      value={currentTicket?.status || "open"}
                      onChange={(e) => handleChangeStatus(e.target.value)}
                      className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none text-zinc-600"
                   >
                     <option value="open">Ouvert</option>
                     <option value="in_progress">En Cours</option>
                     <option value="resolved">Résolu (Clôturer)</option>
                   </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="animate-spin rounded-full h-8 w-8 text-zinc-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 font-medium">
                     {t("La conversation est vide.")}</div>
                ) : (
                  messages.map((m) => {
                    if (m.sender === 'system') {
                      return (
                        <div key={m.id} className="flex justify-center my-4">
                           <div className="bg-zinc-100 border border-zinc-200 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                             {m.text} - {m.createdAt?.toDate?.().toLocaleString('fr-FR')}
                           </div>
                        </div>
                      )
                    }

                    const isAdmin = m.sender === 'admin';
                    return (
                      <div key={m.id} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isAdmin ? 'bg-zinc-950 text-white' : 'bg-orange-100 text-orange-600'}`}>
                          {isAdmin ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                        </div>
                        <div className={`max-w-[75%] rounded-2xl p-5 ${isAdmin ? (m.isInternal ? 'bg-yellow-50 rounded-tr-sm border border-yellow-200' : 'bg-zinc-50 rounded-tr-sm border border-zinc-100') : 'bg-white rounded-tl-sm border border-zinc-200 shadow-sm'}`}>
                          
                          {/* Render File Attachment if present */}
                          {m.fileUrl && m.fileType && (
                             <div className="mb-3">
                                {m.fileType.startsWith('image/') ? (
                                   <div className="rounded-xl overflow-hidden border border-zinc-200">
                                      <img loading="lazy" src={m.fileUrl} alt={m.fileName} className="max-w-full max-h-64 object-contain" />
                                   </div>
                                ) : (
                                   <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors">
                                      <FileText className="w-5 h-5 text-zinc-500" />
                                      <span className="text-xs font-bold text-zinc-700 truncate">{m.fileName}</span>
                                   </a>
                                )}
                             </div>
                          )}

                          <div 
                             className={`text-sm font-medium leading-relaxed ${m.isInternal ? 'text-yellow-900' : ''}`} 
                             dangerouslySetInnerHTML={{ __html: m.text }} 
                          />
                          
                          {m.createdAt && (
                            <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] font-kinder uppercase text-zinc-400">
                              <Clock className="w-3 h-3" />
                              {m.createdAt.toDate?.().toLocaleString('fr-FR')}
                              {m.isInternal && <span className="ms-2 text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{t("NOTE INTERNE")}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              {currentTicket?.status !== 'resolved' ? (
                <div className="p-4 md:p-6 bg-white border-t border-zinc-100 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                     <div className="flex items-center gap-2">
                        <select 
                          onChange={(e) => {
                             if(e.target.value) setNewMessage(e.target.value);
                          }}
                          className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest outline-none text-zinc-600"
                        >
                           <option value="">{t("Réponses rapides...")}</option>
                           {CANNED_RESPONSES.map((resp, i) => (
                              <option key={i} value={resp}>{resp.substring(0, 30)}...</option>
                           ))}
                        </select>
                     </div>
                     <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                        {t("Note interne (Invisible pour le client)")}
                     </label>
                  </div>
                  <div className={`border rounded-2xl overflow-hidden focus-within:ring-2 ring-zinc-900/10 transition-shadow ${isInternal ? 'border-yellow-300 bg-yellow-50' : 'border-zinc-200'}`}>
                    <ReactQuill 
                      theme="snow" 
                      value={newMessage} 
                      onChange={setNewMessage} 
                      placeholder={isInternal ? "Écrire une note interne (fond jaune)..." : "Écrire votre réponse..."}
                      className="border-none"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-10 h-10 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 border border-zinc-200 shadow-sm"
                      title={t("Joindre un fichier (Image, PDF)")}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={sending || (!newMessage.trim() && !uploading) || newMessage === '<p><br></p>'}
                      className={`px-8 h-10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest rtl:tracking-normal transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 shrink-0 ${isInternal ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20' : 'bg-zinc-950 hover:bg-zinc-800 shadow-zinc-900/20'}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {t("Envoyer")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-col items-center justify-center text-center gap-3">
                   <p className="text-sm font-medium text-zinc-500">{t("Ticket résolu et clôturé.")}</p>
                   <button 
                      onClick={() => handleChangeStatus('open')}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                   >
                     {t("Réouvrir le ticket")}
                   </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4">
               <MessageSquare className="w-16 h-16 text-zinc-200" />
               <p className="font-bold">{t("Sélectionnez un ticket pour afficher la conversation")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

