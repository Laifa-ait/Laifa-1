import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, User, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { maskSensitiveData } from "../../utils/masking";

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface LiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  otherPartyName: string;
}

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({ isOpen, onClose, orderId, otherPartyName }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !orderId || !currentUser) return;

    const messagesRef = collection(db, "orders", orderId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);
        setLoading(false);

        // Auto-scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      },
      (error) => {
        console.error("Chat error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, orderId, currentUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newMessage.trim() || !currentUser || !orderId) return;

    try {
      const text = newMessage.trim();
      setNewMessage(""); // clear instantly for optimistic feel

      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: orderId,
          text: text,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(t("Erreur de l'envoi") || "Erreur lors de l'envoi du message.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-[#faf8f5] z-[210] shadow-2xl flex flex-col border-l border-zinc-200"
          >
            {/* Header */}
            <div className="bg-white px-6 py-5 border-b border-zinc-100 flex items-center justify-between shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-[#F37021] rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#121315] text-base">{otherPartyName}</h3>
                  <p className="text-xs rtl:text-sm font-bold text-stone-400 uppercase tracking-wider rtl:tracking-normal">
                    {t("Discussion relative à la commande #")}
                    {orderId.substring(0, 8)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col scroll-smooth">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <MessageCircle className="w-8 h-8 text-zinc-300" />
                  </div>
                  <p className="text-sm font-medium">{t("no_messages") || "Aucun message pour le moment."}</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser?.uid;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id || i}
                      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                          isMe
                            ? "bg-zinc-950 text-white rounded-tr-sm"
                            : "bg-white text-zinc-900 border border-zinc-100 rounded-tl-sm"
                        }`}
                      >
                        <p className="text-[14px] leading-relaxed font-medium">{msg.text}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-zinc-100 shrink-0">
              {error && (
                <div className="mb-3 px-4 py-3 bg-red-100/40 border border-red-200/50 rounded-2xl flex items-center gap-2 text-red-600 text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setError("");
                  }}
                  placeholder={t("type_message") || "Votre message..."}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-[2rem] pl-6 pr-14 py-4 text-sm font-medium focus:outline-none focus:ring-4 ring-orange-500/10 focus:border-orange-500 transition-all text-zinc-900 placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-orange-500 transition-all active:scale-95 disabled:hover:bg-orange-600 shadow-md shadow-orange-600/30"
                >
                  <Send className="w-4 h-4 ml-0.5 rtl:mr-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
