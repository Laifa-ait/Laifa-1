import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Paperclip, Loader2, FileText, User, Store } from 'lucide-react';
import { db, storage } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface DisputeChatModalProps {
  dispute: any;
  onClose: () => void;
}

export const DisputeChatModal: React.FC<DisputeChatModalProps> = ({ dispute, onClose }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dispute?.id) return;
    
    const q = query(
      collection(db, "disputeMessages"), 
      where("disputeId", "==", dispute.id),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setMessages(msgs);
       setLoading(false);
       setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
       }, 100);
    }, (err) => {
       console.error("Error fetching dispute messages:", err);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [dispute?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      await addDoc(collection(db, "disputeMessages"), {
         disputeId: dispute.id,
         text: newMessage.trim(),
         senderId: currentUser.uid,
         senderRole: 'admin',
         senderName: 'Support OLMART',
         createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
       toast.error("Erreur d'envoi");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `disputes/${dispute.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, "disputeMessages"), {
         disputeId: dispute.id,
         text: `Preuve documentaire : ${file.name}`,
         fileUrl: url,
         fileName: file.name,
         fileType: file.type,
         senderId: currentUser.uid,
         senderRole: 'admin',
         senderName: 'Support OLMART',
         createdAt: serverTimestamp()
      });
    } catch (err) {
       toast.error("Erreur lors de l'upload");
    } finally {
       setUploading(false);
       if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="font-kinder text-lg text-zinc-900">{t("Chat du litige")}</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t("Commande #")}{dispute.id.substring(0,8)}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50" ref={scrollRef}>
          {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
          ) : messages.length === 0 ? (
             <div className="text-center text-zinc-400 font-medium py-8">{t("Aucun message.")}</div>
          ) : (
             messages.map((m) => {
               const isAdmin = m.senderRole === 'admin';
               const isSeller = m.senderRole === 'seller';
               
               return (
                 <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] rounded-2xl p-4 ${isAdmin ? 'bg-zinc-900 text-white rounded-tr-sm' : isSeller ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tl-sm' : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'}`}>
                     <div className="flex items-center gap-2 mb-2">
                        {isAdmin ? <User className="w-3 h-3 text-zinc-400" /> : isSeller ? <Store className="w-3 h-3 text-blue-500" /> : <User className="w-3 h-3 text-zinc-400" />}
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-zinc-400' : isSeller ? 'text-blue-600' : 'text-zinc-500'}`}>
                           {m.senderName || (isAdmin ? "Admin" : isSeller ? "Vendeur" : "Client")}
                        </span>
                     </div>
                     
                     {m.fileUrl && (
                        m.fileType?.startsWith('image/') ? (
                           <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-2 rounded-xl overflow-hidden border border-zinc-200/20">
                             <img src={m.fileUrl} alt="attachment" className="max-w-full max-h-48 object-cover hover:opacity-90 transition-opacity" />
                           </a>
                        ) : (
                           <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-white/10 rounded-xl mb-2 hover:bg-white/20 transition-colors">
                              <FileText className="w-5 h-5" />
                              <span className="text-xs font-medium truncate max-w-[200px]">{m.fileName}</span>
                           </a>
                        )
                     )}
                     
                     <p className="text-sm font-medium whitespace-pre-wrap">{m.text}</p>
                     
                     {m.createdAt && (
                        <div className={`mt-2 text-[9px] font-bold text-end ${isAdmin ? 'text-zinc-500' : 'text-zinc-400'}`}>
                           {m.createdAt?.toDate?.()?.toLocaleTimeString()}
                        </div>
                     )}
                   </div>
                 </div>
               )
             })
          )}
        </div>

        <div className="p-4 bg-white border-t border-zinc-100">
           <form onSubmit={handleSend} className="flex gap-3 items-end">
              <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-end overflow-hidden focus-within:ring-2 ring-indigo-500/20 transition-all">
                 <textarea
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder={t("Envoyer un message...")}
                   className="flex-1 max-h-32 min-h-[56px] bg-transparent p-4 outline-none text-sm font-medium resize-none"
                   rows={1}
                   onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSend(e);
                      }
                   }}
                 />
                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                 <button 
                   type="button" 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={uploading}
                   className="p-4 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
                 >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                 </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() && !uploading}
                className="w-14 h-14 bg-zinc-950 text-white rounded-2xl flex items-center justify-center hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-lg shadow-zinc-950/20 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
           </form>
        </div>
      </motion.div>
    </div>
  );
};
