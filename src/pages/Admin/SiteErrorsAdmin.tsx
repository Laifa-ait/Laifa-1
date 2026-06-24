import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { Bug, AlertCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTranslation } from "react-i18next";

export const SiteErrorsAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'site_errors'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setErrors(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching site errors:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolveError = async (errorId: string, resolved: boolean) => {
    try {
      await updateDoc(doc(db, 'site_errors', errorId), {
        resolved: !resolved,
        resolvedAt: !resolved ? new Date() : null
      });
      toast.success(resolved ? "Erreur marquée comme non résolue" : "Erreur marquée comme résolue");
    } catch (error) {
      console.error("Error updating site error:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-kinder text-zinc-950 uppercase tracking-tight rtl:tracking-normal">
            {t("Agent")}<span className="text-red-600">{t("Erreurs")}</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2">
            {t("Vue de débogage et remontée automatique des exceptions du Frontend de la plateforme.")}</p>
        </div>
        <div className="flex bg-red-50 rounded-2xl p-4 items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-kinder text-red-900">{errors.length}</div>
            <div className="text-[10px] font-kinder text-red-700 uppercase tracking-widest rtl:tracking-normal">{t("Signalements")}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-sm">
        {loading ? (
          <div className="text-center py-10 text-zinc-500 font-medium tracking-wide animate-pulse">{t("Chargement des erreurs détectées...")}</div>
        ) : errors.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-zinc-900 font-bold uppercase tracking-widest rtl:tracking-normal text-sm mb-2">{t("Aucune erreur détectée")}</p>
            <p className="text-zinc-500 text-xs">{t("Le système est stable et aucune exception n'a été remontée.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {errors.map((error) => {
                  
                  return (
                              <div key={error.id} className={`p-6 rounded-2xl border ${error.resolved ? 'bg-zinc-50 border-zinc-200 opacity-60' : 'bg-red-50/50 border-red-100'} transition-all`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      {error.resolved ? (
                                        <span className="bg-zinc-200 text-zinc-700 text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded">{t("Résolu")}</span>
                                      ) : (
                                        <span className="bg-red-500 text-white text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded">{t("Nouveau")}</span>
                                      )}
                                      <span className="text-zinc-500 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {error.timestamp ? (() => {
                                          try {
                                            const date = typeof error.timestamp.toDate === 'function' 
                                              ? error.timestamp.toDate() 
                                              : (error.timestamp instanceof Date ? error.timestamp : new Date(error.timestamp));
                                            return format(date, 'dd MMM yyyy, HH:mm:ss');
                                          } catch (e) {
                                            return 'Date invalide';
                                          }
                                        })() : 'En cours'}
                                      </span>
                                      <span className="bg-orange-100 text-orange-700 text-[9px] font-kinder uppercase tracking-widest rtl:tracking-normal px-2 py-1 rounded">
                                        {error.type === 'react_boundary' ? 'React Boundary' : error.type === 'window_error' ? 'Window Error' : 'Promise Rejection'}
                                      </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-zinc-900 mb-1">{error.message}</h3>
                                    {error.url && (
                                        <p className="text-[11px] text-zinc-500 truncate mb-3">{t("URL:")}<a href={error.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600">{error.url}</a></p>
                                    )}
                                    
                                    <div className="mt-4">
                                      {error.stack && (
                                        <details className="mt-2 text-xs">
                                          <summary className="cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal text-[9px] text-zinc-400 mb-2 hover:text-zinc-600">{t("Voir la trace (Stack)")}</summary>
                                          <pre className="bg-zinc-900 text-green-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                            {error.stack}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                    <div className="mt-2">
                                      {error.componentStack && (
                                        <details className="mt-2 text-xs">
                                          <summary className="cursor-pointer font-bold uppercase tracking-widest rtl:tracking-normal text-[9px] text-zinc-400 mb-2 hover:text-zinc-600">{t("Voir les composants (Component Stack)")}</summary>
                                          <pre className="bg-zinc-900 text-orange-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                            {error.componentStack}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => handleResolveError(error.id, error.resolved)}
                                      className={`px-4 py-2 text-[10px] uppercase tracking-widest rtl:tracking-normal font-bold rounded-lg transition-colors border ${
                                        error.resolved 
                                          ? 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50' 
                                          : 'bg-green-500 text-white border-green-600 hover:bg-green-600 shadow-sm'
                                      }`}
                                    >
                                      {error.resolved ? 'Marquer Non Résolu' : 'Marquer comme Résolu'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                })}
          </div>
        )}
      </div>
    </div>
  );
};
