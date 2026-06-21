import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from "react-i18next";
import { maskSensitiveData } from '../utils/masking';

interface Message {
  id: string;
  senderId: string;
  senderRole?: 'buyer' | 'seller';
  text: string;
  createdAt: any;
}

export const OrderChatBox: React.FC<{ orderId: string, buyerId: string }> = ({ orderId, buyerId }) => {
    const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    const q = query(
      collection(db, "orders", orderId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return () => unsub();
  }, [orderId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentUser || !newMessage.trim()) return;

    try {
      const text = newMessage.trim();
      setNewMessage('');

      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/messages/send", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
         },
         body: JSON.stringify({
            orderId: orderId,
            text: text
         })
      });
      
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || "Failed to send message");
      }
    } catch (err) {
      console.error(err);
      setError(t("Erreur de l'envoi") || "Erreur lors de l'envoi du message.");
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
      <div className="bg-zinc-950 p-4 shrink-0 flex items-center justify-between">
         <h4 className="text-white font-bold text-sm">{t("Messagerie Sécurisée")}</h4>
         <div className="flex items-center gap-2 text-zinc-400 text-[10px] rtl:text-[12px] uppercase font-black tracking-widest rtl:tracking-normal">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            {t("Vendeur ↔ Acheteur")}</div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
           <p className="text-center text-zinc-400 text-xs rtl:text-sm font-medium mt-10">{t("Aucun message pour cette commande.")}</p>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === currentUser?.uid;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-zinc-900 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'}`}>
                  <p>{m.text}</p>
                  <span className={`text-[9px] rtl:text-[11px] mt-1 block font-black uppercase ${isMe ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-3 bg-white border-t border-zinc-200 shrink-0">
         {error && <p className="text-[10px] rtl:text-[12px] text-red-500 font-bold mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>{error}</p>}
         <form onSubmit={handleSend} className="flex items-center gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => { setNewMessage(e.target.value); setError(''); }}
              placeholder={t("Écrivez à l'acheteur...") || "Écrivez à l'acheteur..."}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 outline-none text-sm focus:border-zinc-400"
            />
            <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-orange-500 text-white rounded-xl disabled:opacity-50">
               <Send className="w-4 h-4" />
            </button>
         </form>
      </div>
    </div>
  );
};
