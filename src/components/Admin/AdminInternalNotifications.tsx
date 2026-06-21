import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, ShieldAlert, Check, X, FileText, UserCheck, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

interface InternalNotification {
  id: string;
  type: string;
  sellerId?: string;
  sellerName?: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export const AdminInternalNotifications: React.FC = () => {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useAuth();

  useEffect(() => {
    // SECURITY: Only run this snapshot if we are sure the user is an admin
    if (!userProfile || userProfile.role !== 'admin') {
      return;
    }

    const q = query(
      collection(db, "internal_notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InternalNotification));
      setNotifications(docs);
    }, (err) => console.warn("AdminNotifs Listener Error:", err));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotifClick = async (notif: InternalNotification) => {
    if (!notif.read) {
      await updateDoc(doc(db, "internal_notifications", notif.id), { read: true });
    }
    setIsOpen(false);
    
    if (notif.type === "DOCUMENT_SUBMISSION" || notif.sellerId) {
      navigate(`/dashboard/admin/sellers`);
    }
  };

  const clearAll = async () => {
    // Usually we just mark read, but for internal log we can delete or mark
    notifications.forEach(async (n) => {
      if (!n.read) await updateDoc(doc(db, "internal_notifications", n.id), { read: true });
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_SUBMISSION":
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case "NEW_SELLER_REGISTRATION":
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl transition-all relative border bg-zinc-900 border-white/10 hover:bg-zinc-800 cursor-pointer ${
          unreadCount > 0 ? 'text-[#ea580c]' : 'text-zinc-400'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ea580c] text-[9px] rtl:text-[11px] font-black items-center justify-center text-white">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between">
              <div>
                <h4 className="font-black text-white text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal">{t("Alertes Internes")}</h4>
                <p className="text-[9px] rtl:text-[11px] font-bold text-zinc-500 uppercase tracking-widest rtl:tracking-normal mt-0.5">{t("Validation SÉCURISÉE")}</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[9px] rtl:text-[11px] font-black uppercase text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                >
                  {t("Tout lire")}</button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <ShieldAlert className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-600">{t("Aucune tâche en attente")}</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNotifClick(item)}
                    className={`w-full flex gap-3.5 p-5 text-left transition-colors border-none cursor-pointer ${
                      item.read ? "bg-transparent opacity-60" : "bg-white/5"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start mb-1">
                          <p className="text-xs rtl:text-sm font-black text-white leading-tight truncate pr-4">
                            {item.sellerName || "Système Admin"}
                          </p>
                          <span className="text-[8px] font-bold text-zinc-600 uppercase shrink-0">
                            {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Récemment"}
                          </span>
                       </div>
                       <p className="text-[11px] text-zinc-400 font-medium leading-relaxed line-clamp-2">
                         {item.message}
                       </p>
                    </div>
                    {!item.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-2 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-white/10 bg-zinc-900/50 text-center">
               <button 
                 onClick={() => navigate('/dashboard/admin/sellers')}
                 className="text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-[#ea580c] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
               >
                 {t("Voir tous les vendeurs")}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
