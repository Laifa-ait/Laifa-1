import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { collection, query, where, getDocs, doc, updateDoc, or, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { AlertTriangle, Package, Check, X, User, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { formatPrice } from "../../utils/format";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { DisputeChatModal } from "../../components/Admin/DisputeChatModal";
import { MessageSquare } from "lucide-react";

interface DisputeCase {
  id: string;
  orderId?: string;
  buyerId?: string;
  sellerId?: string;
  type?: 'return' | 'dispute';
  status?: string;
  amount?: number;
  reason?: string;
  createdAt?: any;
  resolution?: 'approved' | 'rejected';
  resolvedAt?: any;
  returnRequest?: any;
  disputeRequest?: any;
  total?: number;
}

export const DisputeManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [decisions, setDecisions] = useState<{ [key: string]: string }>({});
  const [chatOpenFor, setChatOpenFor] = useState<any>(null);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);

      const fetchReturns = async () => {
        const q = query(collection(db, "orders"), where("returnRequest", "!=", null), limit(100));
        return getDocs(q);
      };

      const fetchDisputes = async () => {
        const q = query(collection(db, "orders"), where("disputeRequest", "!=", null), limit(100));
        return getDocs(q);
      };

      try {
        const [returnsSnap, disputesSnap] = await Promise.all([fetchReturns(), fetchDisputes()]);
        const returns = returnsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const disputes = disputesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Merge and dedup O(n)
        const mergedMap = new Map([...returns, ...disputes].map((d) => [d.id, d]));
        setCases(Array.from(mergedMap.values()));
      } catch (e) {
        console.error("Error fetching disputes:", e);
        toast.error(t("Erreur lors du chargement des litiges"));
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const handleResolve = async (c: any) => {
    if (!currentUser || userProfile?.role !== "admin") {
      toast.error(t("Action non autorisée"));
      return;
    }
    
    const decision = decisions[c.id];
    if (!decision) {
      toast.error(t("Veuillez sélectionner une décision avant de résoudre."));
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/admin/orders/${c.id}/resolve-dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resolution: decision === "approved" ? "refund_to_wallet" : "close",
          refundAmount: decision === "approved" ? c.total : 0,
          adminId: currentUser.uid,
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur");

      // Notifications
      const { addDoc, serverTimestamp } = await import("firebase/firestore");
      const buyerUid = c.userId || c.buyerId;
      const targetSellerUid = c.sellerIds?.[0] || c.sellerId;
      
      if (buyerUid) {
         await addDoc(collection(db, "user_notifications"), {
            userId: buyerUid,
            title: decision === "approved" ? t("Litige résolu en votre faveur") : t("Litige clôturé"),
            message: decision === "approved" ? t(`La commande #${c.id.substring(0,8)} a été remboursée sur votre Olma Wallet.`) : t(`Votre demande pour la commande #${c.id.substring(0,8)} a été clôturée.`),
            type: "INFO",
            read: false,
            createdAt: serverTimestamp(),
         });
      }
      
      if (targetSellerUid) {
         await addDoc(collection(db, "user_notifications"), {
            userId: targetSellerUid,
            title: t("Résolution du litige"),
            message: decision === "approved" ? t(`Le litige (cmd #${c.id.substring(0,8)}) a été résolu en faveur du client.`) : t(`Le litige (cmd #${c.id.substring(0,8)}) a été clôturé en votre faveur.`),
            type: "INFO",
            read: false,
            createdAt: serverTimestamp(),
         });
      }

      toast.success(
        decision === "approved" ? t("Client remboursé sur son Wallet !") : t("Litige clos sans remboursement")
      );
      setCases((prev) => prev.filter((item) => item.id !== c.id));
    } catch (e) {
      console.error(e);
      toast.error(t("Erreur lors de la résolution"));
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-0">
      <h2 className="text-2xl font-kinder text-zinc-900">{t("Litiges et Retours Admin")}</h2>
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
        {cases.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 font-medium">
            {t("Aucun litige ou demande de retour active.")}
          </div>
        ) : (
          <div className="space-y-6">
            {cases.map((c) => {
              return (
                <div
                  key={c.id}
                  className="p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-5 w-full">
                    <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-kinder text-zinc-900">
                          {t("Commande #")}
                          {c.id.substring(0, 8)}
                        </p>
                        <span className="text-[10px] bg-zinc-200 text-zinc-700 font-kinder px-2 py-0.5 rounded-md uppercase tracking-wider rtl:tracking-normal">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zinc-800">
                        {t("Raison:")}
                        {c.returnRequest?.reason || c.disputeRequest?.reason}
                      </p>
                      <p className="text-xs text-zinc-650 font-medium italic">
                        "{c.returnRequest?.details || c.disputeRequest?.details}"
                      </p>

                      {c.returnRequest?.photos && c.returnRequest.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {c.returnRequest.photos.map((photo: string, idx: number) => (
                            <a
                              key={idx}
                              href={photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 hover:opacity-80 transition-opacity"
                            >
                              <img
                                loading="lazy"
                                src={photo}
                                alt={`Preuve ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-xs font-kinder text-emerald-600">
                          {formatPrice(c.total)} {t("DZD")}
                        </span>
                        <button 
                           onClick={() => setChatOpenFor(c)}
                           className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                           <MessageSquare className="w-3.5 h-3.5" />
                           {t("Chat & Preuves")}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="w-full md:w-auto">
                      <select
                        value={decisions[c.id] || ""}
                        onChange={(e) => setDecisions({ ...decisions, [c.id]: e.target.value })}
                        className="w-full bg-white border border-zinc-200 px-4 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest rtl:tracking-normal outline-none focus:ring-2 ring-emerald-500/20"
                      >
                        <option value="">{t("Décision...")}</option>
                        <option value="approved">{t("Rembourser l'acheteur")} ({formatPrice(c.total)} DZD)</option>
                        <option value="rejected">{t("Clôturer en faveur du vendeur")}</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleResolve(c)}
                      className="w-full md:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-all shadow-lg shadow-zinc-900/20"
                    >
                      {t("Résoudre le litige")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {chatOpenFor && (
        <DisputeChatModal dispute={chatOpenFor} onClose={() => setChatOpenFor(null)} />
      )}
    </div>
  );
};
