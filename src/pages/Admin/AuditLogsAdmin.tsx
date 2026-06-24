import React, { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ShieldCheck, Clock, User, Activity } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export const AuditLogsAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(100));
        const snap = await getDocs(q);
        setLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("No audit_logs collection or missing config", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-zinc-400">{t("Chargement des journaux de sécurité...")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-kinder tracking-tight rtl:tracking-normal text-zinc-900">
            {t("Journaux d'Audit & Sécurité")}
          </h2>
          <p className="text-sm text-zinc-500 font-medium">{t("Historique des modifications du système.")}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-zinc-300 opacity-50" />
            <p className="font-medium">{t("Aucun journal d'audit enregistré.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-zinc-50 text-zinc-500 font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]">
                <tr>
                  <th className="px-6 py-4">{t("Action")}</th>
                  <th className="px-6 py-4">{t("Détails")}</th>
                  <th className="px-6 py-4 border-l border-zinc-100">{t("Auteur (Admin)")}</th>
                  <th className="px-6 py-4 border-l border-zinc-100 text-end">{t("Horodatage")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map((log) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={log.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <div className="max-w-md truncate" title={JSON.stringify(log.details)}>
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-bold text-zinc-700">{log.adminEmail || log.adminId || "Inconnu"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-l border-zinc-100 text-end whitespace-nowrap text-zinc-500 text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "N/A"}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
