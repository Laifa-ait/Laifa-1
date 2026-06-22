import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Bot, User, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      parts: [
        { text: "Bonjour ! Je suis Olma, votre assistant IA personnel. Comment puis-je vous aider aujourd'hui ?" },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newUserMsg: Message = { role: "user", parts: [{ text: inputValue }] };
    const conversationHistory = [...messages, newUserMsg];
    setMessages(conversationHistory);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newUserMsg.parts[0].text,
          history: messages.slice(1).map((m) => ({
            // Don't send initial offline greeting
            role: m.role,
            parts: [{ text: m.parts[0].text }],
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erreur API");

      setMessages([...conversationHistory, { role: "model", parts: [{ text: data.reply }] }]);
    } catch (error) {
      console.error(error);
      setMessages([
        ...conversationHistory,
        {
          role: "model",
          parts: [
            { text: "Désolé, je rencontre des difficultés techniques actuellement. Veuillez réessayer plus tard." },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-all"
          />
          <motion.div
            initial={{ x: "100%", borderTopLeftRadius: "2rem", borderBottomLeftRadius: "2rem" }}
            animate={{ x: 0, borderTopLeftRadius: "1.5rem", borderBottomLeftRadius: "1.5rem" }}
            exit={{ x: "100%", borderTopLeftRadius: "2rem", borderBottomLeftRadius: "2rem" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-zinc-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-zinc-900 font-bold text-sm tracking-wide">{t("Assistant Olma Gemini")}</h3>
                  <span className="text-green-600 font-semibold text-[10px] rtl:text-[12px] tracking-widest rtl:tracking-normal uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {t("En ligne")}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-zinc-900 text-white" : "bg-orange-600 text-white"}`}
                  >
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === "user" ? "bg-zinc-900 text-white rounded-tr-sm" : "bg-white border border-zinc-100 shadow-sm text-zinc-700 rounded-tl-sm"}`}
                  >
                    {msg.parts[0].text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 flex-row">
                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-zinc-100 shadow-sm text-zinc-700 p-4 rounded-2xl rounded-tl-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-zinc-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t("Posez votre question...") || "Posez votre question..."}
                  className="flex-1 bg-zinc-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-12 h-12 flex items-center justify-center bg-orange-600 text-white rounded-xl hover:bg-orange-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
