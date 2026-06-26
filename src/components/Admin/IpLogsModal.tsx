import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Monitor, Clock, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface IpLogsModalProps {
  user: any;
  onClose: () => void;
}

export const IpLogsModal: React.FC<IpLogsModalProps> = ({ user, onClose }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchLogs = async () => {
       try {
          const q = query(collection(db, "login_history"), where("userId", "==", user.id), orderBy("timestamp", "desc"), limit(50));
          const snap = await getDocs(q);
          setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
       } catch (err) {
          console.error("Error fetching IP logs", err);
       } finally {
          setLoading(false);
       }
    };
    fetchLogs();
  }, [user?.id]);

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
            <h3 className="font-kinder text-lg text-zinc-900">{t("Historique de connexions")}</h3>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50/50">
          {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
          ) : logs.length === 0 ? (
             <div className="text-center text-zinc-400 font-medium py-8">{t("Aucun log de connexion trouvé pour cet utilisateur.")}</div>
          ) : (
             <div className="space-y-3">
               {logs.map(log => (
                 <div key={log.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500">
                          <Monitor className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="font-bold text-sm text-zinc-900">{log.ipAddress || "IP Inconnue"}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <MapPin className="w-3 h-3 text-zinc-400" />
                             <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{log.location || log.userAgent || "Appareil Inconnu"}</span>
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1.5 justify-end mb-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                             {log.timestamp?.toDate?.()?.toLocaleString('fr-FR') || "Date Inconnue"}
                          </span>
                       </div>
                       {log.success === false && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                            Échec ({log.reason || "Mot de passe incorrect"})
                          </span>
                       )}
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
