import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Clock, User, Store, Search, ChevronRight, CheckCircle2, Paperclip, FileText, Loader2 } from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, serverTimestamp, orderBy, onSnapshot, doc, getDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !currentTicket) return;

    setSending(true);
    try {
      await addDoc(collection(db, "supportMessages"), {
        ticketId: selectedTicket,
        sellerId: currentTicket.sellerId,
        buyerId: currentTicket.buyerId || null,
        orderId: currentTicket.orderId || null,
        text: newMessage.trim(),
        sender: 'admin',
        isInternal,
        createdAt: serverTimestamp(),
      });
      
      if (!isInternal) {
        await updateDoc(doc(db, "supportTickets", selectedTicket), {
           lastMessage: newMessage.trim(),
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
        sellerId: currentTicket.sellerId,
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

  const handleResolveTicket = async () => {
     if (!selectedTicket) return;
     try {
       await updateDoc(doc(db, "supportTickets", selectedTicket), {
          status: 'resolved'
       });
       toast.success("Ticket marqué comme résolu.");
     } catch (err) {
       toast.error("Erreur lors de la clôture du ticket.");
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
          <p className="text-zinc-500 text-sm font-medium">{t("Gérez et résolvez les litiges vendeurs.")}</p>
        </div>
      </div>

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
                        {ticket.shopName}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest rtl:tracking-normal ${
                         ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                         {ticket.status === 'resolved' ? 'Résolu' : 'Ouvert'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-zinc-800 truncate mb-1">{ticket.subject}</p>
                    <p className="text-xs text-zinc-500 truncate">{ticket.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`w-2 h-2 rounded-full ${
                          ticket.priority === 'high' ? 'bg-red-500' : ticket.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
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
              <div className="p-6 border-b border-zinc-50 flex items-center justify-between shrink-0 shadow-sm z-10" >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
                     <Store className="w-6 h-6 text-zinc-500" />
                   </div>
                   <div>
                     <h3 className="font-kinder text-lg text-zinc-950">{currentTicket?.shopName}</h3>
                     <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal">
                        {currentTicket?.subject} 
                     </p>
                   </div>
                </div>
                {currentTicket?.status !== 'resolved' && (
                   <button 
                      onClick={handleResolveTicket}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center gap-2"
                   >
                      <CheckCircle2 className="w-4 h-4" /> {t("Clôturer")}</button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="animate-spin rounded-full h-8 w-8 text-zinc-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-400 font-medium">
                     {t("La conversation est vide.")}</div>
                ) : (
                  messages.map((m) => {
                      
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

                          <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${m.isInternal ? 'text-yellow-900' : ''}`}>{m.text}</p>
                          
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
                <div className="p-4 md:p-6 bg-zinc-50 border-t border-zinc-100 shrink-0">
                  <div className="flex justify-end mb-2">
                     <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                        {t("Note interne (Invisible pour le vendeur/acheteur)")}</label>
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-3">
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
                      className="w-12 h-14 bg-white hover:bg-zinc-100 text-zinc-500 rounded-2xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 border border-zinc-200 shadow-sm"
                      title={t("Joindre un fichier (Image, PDF)") || "Joindre un fichier (Image, PDF)"}
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isInternal ? "Écrire une note interne (fond jaune)..." : "Écrire votre réponse..."}
                      className={`flex-1 px-5 h-14 bg-white border border-zinc-200 rounded-2xl outline-none text-sm font-medium focus:border-zinc-400 transition-colors shadow-sm ${isInternal ? 'bg-yellow-50' : ''}`}
                    />
                    <button 
                      type="submit"
                      disabled={sending || (!newMessage.trim() && !uploading)}
                      className={`px-6 h-14 text-white rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 shrink-0 ${isInternal ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-zinc-950 hover:bg-zinc-800'}`}
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">{t("Envoyer")}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center text-sm font-medium text-zinc-500">
                   {t("Ticket résolu et clôturé.")}</div>
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

