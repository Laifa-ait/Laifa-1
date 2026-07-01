import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Send, 
  User, 
  Loader2, 
  MessageCircle, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCheck, 
  Info, 
  Sparkles,
  Store,
  Copy,
  Check
} from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { maskSensitiveData, hasExternalChannel } from "../../utils/masking";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  text: string;
  senderId: string;
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

interface LiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  otherPartyName: string;
}

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({ isOpen, onClose, orderId, otherPartyName }) => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState(otherPartyName || "Boutique Olmart");
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRtl = i18n.language === "ar";

  // 1. Fetch connected seller shop name dynamically from order's publicProfile profile
  useEffect(() => {
    if (!isOpen || !orderId || !currentUser) return;
    const orderDocRef = doc(db, "orders", orderId);
    const unsubOrder = onSnapshot(orderDocRef, async (orderSnap) => {
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const sid = orderData.sellerId || (orderData.sellerIds && orderData.sellerIds[0]);
        if (sid) {
          const shopSnap = await getDoc(doc(db, "publicProfiles", sid));
          if (shopSnap.exists()) {
            setShopName(shopSnap.data().shopName || "Boutique Olmart");
          }
        }
      }
    });
    return () => unsubOrder();
  }, [isOpen, orderId, currentUser]);

  // 2. Listen to messages
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

  // 3. Listen to order logs
  useEffect(() => {
    if (!isOpen || !orderId || !currentUser) return;

    const logsRef = collection(db, "orders", orderId, "order_logs");
    const q = query(logsRef, orderBy("date", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isLog: true,
        })) as any[];
        setLogs(lgs);
      },
      (err) => {
        console.error("Logs error:", err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, orderId, currentUser]);

  // Merge messages and logs chronologically
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
    toast.success(t("ID Commande copié !"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setError("");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newMessage.trim() || !currentUser || !orderId) return;

    // 1. Sanitize text
    const text = newMessage.trim();
    const sanitizedText = text.replace(/<\/?[^>]+(>|$)/g, "").trim();

    if (!sanitizedText) {
      setError(t("Le message ne doit pas être vide."));
      return;
    }

    if (sanitizedText.length > 1000) {
      setError(t("Le message est trop long. Maximum 1000 caractères."));
      return;
    }

    // 2. DLP Security check (OLMART Compliance rule)
    if (hasExternalChannel(sanitizedText)) {
      setError(
        t(
          "Sécurité OLMART : Le partage de numéros de téléphone, comptes de réseaux sociaux ou e-mails est strictement interdit. Tout échange doit rester sur OLMART."
        )
      );
      return;
    }

    const compliantText = maskSensitiveData(sanitizedText);

    try {
      setNewMessage(""); // optimistic clear

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
      console.error("Error sending message:", err);
      setError(err.message || t("Erreur lors de l'envoi du message."));
    }
  };

  // Predefined buyer templates
  const buyerQuickReplies = [
    {
      fr: "Bonjour, est-ce que ma commande est en cours de préparation ?",
      ar: "مرحباً، هل طلبي قيد التحضير حالياً؟",
      en: "Hello, is my order being prepared?",
    },
    {
      fr: "Quand l'expédition est-elle prévue ?",
      ar: "متى من المتوقع شحن الطرد؟",
      en: "When is the shipment scheduled?",
    },
    {
      fr: "Je suis disponible pour recevoir le colis. Merci !",
      ar: "أنا متوفر لاستلام الطرد. شكراً لكم!",
      en: "I am available to receive the package. Thank you!",
    },
    {
      fr: "Merci beaucoup pour votre réactivité et professionnalisme.",
      ar: "شكراً جزيلاً على سرعة استجابتكم واحترافيتكم.",
      en: "Thank you very much for your responsiveness and professionalism.",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with CLEAR GLASS style - strict "No blur" rule */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/40 z-[200]"
          />

          {/* Chat Drawer Side panel */}
          <motion.div
            initial={{ x: isRtl ? "-100%" : "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRtl ? "-100%" : "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className={`fixed top-0 bottom-0 ${isRtl ? "left-0" : "right-0"} w-full sm:w-[440px] bg-stone-50 z-[210] shadow-2xl flex flex-col border-s border-stone-250`}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {/* Header */}
            <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between shadow-md shrink-0 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                  <Store className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <h3 className="font-kinder text-sm uppercase tracking-wider leading-none text-white">{shopName}</h3>
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
                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-lg text-[9px] font-mono hover:text-white transition-all flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  #{orderId.substring(0, 8)}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Timeline (Messages + Logs) */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col scroll-smooth">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-3">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner border-2 border-stone-100">
                    <MessageCircle className="w-6 h-6 text-stone-300" />
                  </div>
                  <p className="text-xs font-semibold">{t("no_messages") || "Aucun message ou journal pour l'instant."}</p>
                </div>
              ) : (
                timelineItems.map((item, i) => {
                  if (item.isLog) {
                    return (
                      <div key={item.id || i} className="flex justify-center my-2">
                        <div className="bg-amber-100/60 border border-amber-200/50 text-amber-900 text-[11px] font-medium px-4 py-1.5 rounded-2xl flex items-center gap-2 shadow-sm">
                          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            {t(`order_log_status_${item.status}`, item.status)} • {item.type ? t(`order_log_type_${item.type}`, item.type) : ""}
                          </span>
                          <span className="text-[9px] text-amber-700/70 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const isMe = item.senderId === currentUser?.uid;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={item.id || i}
                      className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2.5 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar bubble */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
                          isMe ? "bg-zinc-900 text-white" : "bg-orange-100 text-[#FF5C00]"
                        }`}>
                          {isMe ? <User className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                        </div>

                        <div className="space-y-1">
                          <div
                            className={`p-3.5 rounded-3xl text-sm leading-relaxed ${
                              isMe 
                                ? "bg-zinc-950 text-white rounded-tr-none shadow-md" 
                                : "bg-white border-2 border-zinc-950 text-zinc-900 rounded-tl-none shadow-md"
                            }`}
                          >
                            <p className="font-medium whitespace-pre-wrap text-[13px]">{item.text}</p>
                          </div>
                          <span className={`text-[9px] font-mono block px-1 ${isMe ? "text-end text-zinc-400" : "text-start text-stone-400"}`}>
                            {new Date(item.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {isMe && <CheckCheck className="w-3 h-3 text-emerald-500 inline ms-1" />}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Quick reply templates carousel */}
            <div className="px-4 py-2 bg-stone-100 border-t border-b border-stone-200 shrink-0 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 text-orange-600 text-[10px] font-kinder uppercase tracking-widest shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("Modèles", "Modèles")} :</span>
              </div>
              <div className="flex gap-2 shrink-0">
                {buyerQuickReplies.map((reply, index) => {
                  const labelText = reply[i18n.language as "fr" | "ar" | "en"] || reply.fr;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickReply(labelText)}
                      className="bg-white hover:bg-zinc-900 hover:text-white border border-stone-300 text-stone-700 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {labelText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form input area */}
            <div className="p-4 bg-white border-t border-stone-100 shrink-0">
              {error && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-start gap-2 text-xs font-semibold leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
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
                  maxLength={1000}
                  placeholder={t("type_message") || "Votre message sécurisé..."}
                  className="w-full bg-stone-50 border-2 border-zinc-950 rounded-[2rem] ps-6 pe-14 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-zinc-900 placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute end-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-orange-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-orange-500 transition-all active:scale-95 shadow-md shadow-orange-600/10"
                >
                  <Send className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
