import React, { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  AlertTriangle, 
  CheckCheck, 
  ShieldCheck, 
  Clock, 
  Store, 
  User, 
  Info, 
  Copy, 
  Check, 
  MessageSquare,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { maskSensitiveData, hasExternalChannel } from "../utils/masking";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  senderId: string;
  senderRole?: "buyer" | "seller" | "admin";
  text: string;
  createdAt: any;
  isLog?: boolean;
}

interface OrderLog {
  id: string;
  status: string;
  type: string;
  date: any;
  isLog: boolean;
}

export const OrderChatBox: React.FC<{ orderId: string; buyerId: string }> = ({ orderId, buyerId }) => {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRtl = i18n.language === "ar";

  // Fetch Buyer details & Name from the order doc itself (fully connected)
  useEffect(() => {
    if (!orderId) return;
    const docRef = doc(db, "orders", orderId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBuyerName(data.shippingAddress?.fullName || data.shippingAddress?.name || t("Acheteur Olmart"));
      }
    });
    return () => unsub();
  }, [orderId, t]);

  // Listen to messages in real time
  useEffect(() => {
    if (!orderId) return;
    const q = query(collection(db, "orders", orderId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message));
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsub();
  }, [orderId]);

  // Listen to order logs in real time
  useEffect(() => {
    if (!orderId) return;
    const q = query(collection(db, "orders", orderId, "order_logs"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              isLog: true,
            }) as any
        )
      );
    });
    return () => unsub();
  }, [orderId]);

  // Merge messages and logs in chronological order for a unified timeline
  const timelineItems = React.useMemo(() => {
    const combined = [
      ...messages.map((m) => ({
        ...m,
        timestamp: m.createdAt?.toDate
          ? m.createdAt.toDate().getTime()
          : m.createdAt?.seconds
            ? m.createdAt.seconds * 1000
            : Date.now(),
        isLog: false,
      })),
      ...logs.map((l) => ({
        ...l,
        timestamp: l.date?.toDate
          ? l.date.toDate().getTime()
          : l.date?.seconds
            ? l.date.seconds * 1000
            : Date.now(),
        isLog: true,
      })),
    ];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, logs]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    toast.success(t("ID Commande copié !", "ID Commande copié !"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setError("");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentUser || !newMessage.trim()) return;

    // 1. Sanitize text
    const rawText = newMessage.trim();
    const sanitizedText = rawText.replace(/<\/?[^>]+(>|$)/g, "").trim();

    if (!sanitizedText) {
      setError(t("Le message ne doit pas être vide ou contenir que du code HTML."));
      return;
    }

    if (sanitizedText.length > 1000) {
      setError(t("Le message est trop long. Maximum 1000 caractères."));
      return;
    }

    // 2. Strict DLP: Prevent external communication channels
    if (hasExternalChannel(sanitizedText)) {
      setError(
        t(
          "Sécurité OLMART : Le partage de coordonnées (téléphone, e-mail, réseaux sociaux) est interdit pour votre protection."
        )
      );
      return;
    }

    const compliantText = maskSensitiveData(sanitizedText);

    try {
      setNewMessage("");

      const idToken = await currentUser.getIdToken();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          orderId: orderId,
          text: compliantText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("Erreur lors de l'envoi du message."));
    }
  };

  // Predefined seller templates translated
  const sellerQuickReplies = [
    {
      fr: "Votre commande est en cours de préparation et sera expédiée très bientôt.",
      ar: "طلبكم قيد التحضير وسيتم شحنه في أقرب وقت ممكن.",
      en: "Your order is being prepared and will be shipped very soon.",
    },
    {
      fr: "Pouvez-vous confirmer votre adresse et commune de livraison s'il vous plaît ?",
      ar: "هل يمكنك تأكيد عنوانك وبلدية التوصيل من فضلك؟",
      en: "Can you confirm your address and delivery commune please?",
    },
    {
      fr: "Le colis a été remis au transporteur aujourd'hui. Suivi disponible.",
      ar: "تم تسليم الطرد لشركة الشحن اليوم. التتبع متوفر.",
      en: "The package was handed over to the carrier today. Tracking available.",
    },
    {
      fr: "Merci pour votre confiance ! N'hésitez pas à évaluer notre boutique.",
      ar: "شكراً لثقتكم بنا! لا تترددوا في تقييم متجرنا.",
      en: "Thank you for your trust! Feel free to rate our shop.",
    },
  ];

  return (
    <div className="flex flex-col h-[520px] bg-stone-50/60 rounded-[2.5rem] border-2 border-zinc-950 overflow-hidden shadow-xl" id="order-chat-box">
      {/* Premium Connection & Status Bar */}
      <div className="bg-zinc-950 p-5 shrink-0 flex items-center justify-between border-b-2 border-zinc-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white border-2 border-zinc-950">
            <Store className="w-4.5 h-4.5" />
          </div>
          <div className="text-start">
            <h4 className="text-white font-kinder text-xs uppercase tracking-wider leading-none">{buyerName}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-mono">
                {t("Mise à jour en temps réel", "Mise à jour en temps réel")}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={handleCopyOrderId}
            className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-[9px] font-mono hover:text-white hover:border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            #{orderId.substring(0, 8)}
          </button>
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-xl text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal">
            <ShieldCheck className="w-3 h-3" />
            {t("Sécurisé", "Sécurisé")}
          </div>
        </div>
      </div>

      {/* Unified Timeline Area with framer motion animations */}
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col scroll-smooth">
        <AnimatePresence initial={false}>
          {timelineItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center border-2 border-zinc-200">
                <MessageSquare className="w-5 h-5 text-stone-300" />
              </div>
              <p className="text-xs text-center font-semibold">
                {t("Aucun message ni journal d'activité pour le moment.", "Aucun message ni journal d'activité pour le moment.")}
              </p>
            </div>
          ) : (
            timelineItems.map((item, i) => {
              if (item.isLog) {
                // Activity log layout
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={item.id || i} 
                    className="flex justify-center my-2"
                  >
                    <div className="bg-amber-100/60 border border-amber-200/50 text-amber-900 text-[11px] font-medium px-4 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
                      <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>
                        {t(`order_log_status_${item.status}`, item.status)} • {item.type ? t(`order_log_type_${item.type}`, item.type) : ""}
                      </span>
                      <span className="text-[9px] text-amber-700/70 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </motion.div>
                );
              }

              const isMe = item.senderId === currentUser?.uid;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id || i} 
                  className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2.5 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm border ${
                      isMe ? "bg-zinc-950 text-white border-zinc-900" : "bg-orange-100 text-[#FF5C00] border-orange-200"
                    }`}>
                      {isMe ? <Store className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div className="space-y-1">
                      <div
                        className={`p-3.5 rounded-3xl text-sm leading-relaxed ${
                          isMe 
                            ? "bg-zinc-950 text-white rounded-tr-none shadow-md shadow-zinc-950/10" 
                            : "bg-white border-2 border-zinc-950 text-zinc-900 rounded-tl-none shadow-md"
                        }`}
                      >
                        <p className="font-medium whitespace-pre-wrap">{item.text}</p>
                      </div>
                      
                      <span className={`text-[9px] font-mono block px-1 ${isMe ? "text-end text-zinc-400" : "text-start text-stone-400"}`}>
                        {new Date(item.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {isMe && <CheckCheck className="w-3 h-3 text-emerald-500 inline ms-1 font-bold" />}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Predefined Quick Replies (Carousel with scrolling) */}
      <div className="px-4 py-2.5 bg-stone-100 border-t border-b border-stone-250 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-orange-600 text-[10px] font-kinder uppercase tracking-widest shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("Modèles", "Modèles")} :</span>
        </div>
        <div className="flex gap-2 shrink-0">
          {sellerQuickReplies.map((reply, index) => {
            const labelText = reply[i18n.language as "fr" | "ar" | "en"] || reply.fr;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickReply(labelText)}
                className="bg-white hover:bg-zinc-900 hover:text-white border border-stone-300 text-stone-700 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {labelText}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form Area */}
      <div className="p-4 bg-white shrink-0 border-t border-stone-150">
        {error && (
          <div className="mb-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-start gap-2 text-xs font-medium leading-normal">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              setError("");
            }}
            maxLength={1000}
            placeholder={isRtl ? "اكتب رسالة آمنة إلى المشتري..." : "Écrire un message sécurisé à l'acheteur..."}
            className="w-full bg-stone-50 border-2 border-zinc-950 rounded-[2rem] ps-6 pe-14 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-zinc-900 placeholder:text-stone-400"
          />
          <span className="absolute end-16 text-[9px] font-mono text-stone-400">
            {newMessage.length}/1000
          </span>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute end-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-orange-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-orange-500 transition-all active:scale-95 shadow-md hover:shadow-orange-600/20 cursor-pointer border-none"
          >
            <Send className={`w-4.5 h-4.5 ${isRtl ? "rotate-180" : ""}`} />
          </button>
        </form>
      </div>
    </div>
  );
};
