import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, doc, updateDoc, limit, where, orderBy, startAfter, getCountFromServer } from "firebase/firestore";
import {
  Users,
  Search,
  Shield,
  Building2,
  Star,
  CheckCircle2,
  PowerOff,
  ChevronDown,
  Download,
  Filter,
  Monitor
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../../hooks/useConfirm";
import { ALGERIA_WILAYAS } from "../../constants";
import { IpLogsModal } from "../../components/Admin/IpLogsModal";

export const UsersAdmin: React.FC = () => {
    const { t } = useTranslation();
    const { confirm: showConfirmModal, ConfirmationDialog } = useConfirm();
    
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [wilayaFilter, setWilayaFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortByFilter, setSortByFilter] = useState("createdAt_desc");
  const [ipLogsUser, setIpLogsUser] = useState<any>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchUsers = async (isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const baseConstraints: any[] = [];
      if (roleFilter !== "all") {
        baseConstraints.push(where("role", "==", roleFilter));
      }

      let q;
      try {
        if (isLoadMore && lastVisible) {
           q = query(collection(db, "users"), ...baseConstraints, orderBy("createdAt", "desc"), startAfter(lastVisible), limit(50));
        } else {
           q = query(collection(db, "users"), ...baseConstraints, orderBy("createdAt", "desc"), limit(50));
        }
        const querySnapshot = await getDocs(q);
        // If it succeeds, continue logic below
        await processQuerySnapshot(querySnapshot, isLoadMore);
      } catch (err: any) {
         console.warn("Index manquant pour orderBy createdAt avec role. Fallback sans orderBy.", err);
         if (isLoadMore && lastVisible) {
           q = query(collection(db, "users"), ...baseConstraints, startAfter(lastVisible), limit(50));
         } else {
           q = query(collection(db, "users"), ...baseConstraints, limit(50));
         }
         const querySnapshot = await getDocs(q);
         await processQuerySnapshot(querySnapshot, isLoadMore);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const processQuerySnapshot = async (querySnapshot: any, isLoadMore: boolean) => {
      const data = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const dataWithCounts = await Promise.all(data.map(async (u: any) => {
         try {
           const countQ = query(collection(db, "orders"), where("userId", "==", u.id));
           const snap = await getCountFromServer(countQ);
           return { ...u, orderCount: snap.data().count };
         } catch {
           return { ...u, orderCount: 0 };
         }
      }));

      if (isLoadMore) {
        setUsers(prev => [...prev, ...dataWithCounts]);
      } else {
        setUsers(dataWithCounts);
      }
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === 50);
      } else {
        setHasMore(false);
      }
  };

  useEffect(() => {
    fetchUsers(false);
  }, [roleFilter]);

  const handleUpdateClientType = async (userId: string, newType: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        clientType: newType,
      });
      toast.success("Type de client mis à jour");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, clientType: newType } : u)),
      );
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeactivate = async (user: any) => {
      const isCurrentlyInactive = user.status === "inactive";
      const actionTxt = isCurrentlyInactive ? "réactiver" : "désactiver";
      const confirmed = await showConfirmModal(`Voulez-vous vraiment ${actionTxt} le compte de ${user.displayName || user.email} ?`);
      if (!confirmed) return;
      try {
          const newStatus = isCurrentlyInactive ? "active" : "inactive";
          await updateDoc(doc(db, "users", user.id), { status: newStatus });
          toast.success(`Compte ${actionTxt} avec succès`);
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      } catch (err) {
          toast.error("Erreur lors de l'opération");
      }
  };

  const exportCSV = () => {
    const csvContent = [
      ["ID", "Nom", "Email", "Role", "Type Client", "Commandes", "Statut", "Date Creation"],
      ...users.map(u => [
        u.id,
        u.displayName || "",
        u.email || "",
        u.role || "buyer",
        u.clientType || "standard",
        u.orderCount || 0,
        u.status || "active",
        u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString() : u.createdAt) : ""
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `olmart_users_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV réussi");
  };

  let filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (wilayaFilter !== "all") {
     filteredUsers = filteredUsers.filter(u => u.wilaya === wilayaFilter);
  }

  if (dateFilter !== "all") {
     const now = new Date();
     let days = 0;
     if (dateFilter === "7days") days = 7;
     if (dateFilter === "30days") days = 30;
     if (dateFilter === "90days") days = 90;
     const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
     filteredUsers = filteredUsers.filter(u => {
        const createdAt = u.createdAt?.toDate?.() || new Date(u.createdAt);
        return createdAt >= cutoff;
     });
  }

  filteredUsers.sort((a, b) => {
     if (sortByFilter === "createdAt_desc") {
        const dA = a.createdAt?.toMillis?.() || 0;
        const dB = b.createdAt?.toMillis?.() || 0;
        return dB - dA;
     }
     if (sortByFilter === "createdAt_asc") {
        const dA = a.createdAt?.toMillis?.() || 0;
        const dB = b.createdAt?.toMillis?.() || 0;
        return dA - dB;
     }
     if (sortByFilter === "orders_desc") {
        return (b.orderCount || 0) - (a.orderCount || 0);
     }
     if (sortByFilter === "orders_asc") {
        return (a.orderCount || 0) - (b.orderCount || 0);
     }
     return 0;
  });

  return (
    <div className="space-y-8">
      <ConfirmationDialog />
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-kinder text-zinc-950 uppercase tracking-tight rtl:tracking-normal">
            {t("Gestion des")}<span className="text-indigo-600"> {t("Utilisateurs")}</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2">
            {t("Gérez les comptes, privilèges VIP, et accès à la plateforme.")}
          </p>
        </div>
        <div className="flex bg-indigo-50 rounded-2xl p-4 items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-kinder text-indigo-900">
              {users.length} {hasMore && "+"}
            </div>
            <div className="text-[10px] font-kinder text-indigo-700 uppercase tracking-widest rtl:tracking-normal">
              {t("Utilisateurs chargés")}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="relative w-full xl:w-96 shrink-0">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder={t("Rechercher (email, nom)...") || "Rechercher (email, nom)..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-12 pe-4 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[140px]">
             <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none px-4 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-700 outline-none cursor-pointer focus:ring-2 ring-indigo-500/20"
             >
                <option value="all">{t("Tous rôles")}</option>
                <option value="buyer">{t("Clients")}</option>
                <option value="seller">{t("Vendeurs")}</option>
                <option value="admin">{t("Admins")}</option>
             </select>
             <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative flex-1 min-w-[140px]">
             <select 
                value={wilayaFilter} 
                onChange={(e) => setWilayaFilter(e.target.value)}
                className="w-full appearance-none px-4 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-700 outline-none cursor-pointer focus:ring-2 ring-indigo-500/20"
             >
                <option value="all">{t("Toutes wilayas")}</option>
                {ALGERIA_WILAYAS.map(w => (
                   <option key={w as string} value={w as string}>{w as string}</option>
                ))}
             </select>
             <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative flex-1 min-w-[140px]">
             <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full appearance-none px-4 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-700 outline-none cursor-pointer focus:ring-2 ring-indigo-500/20"
             >
                <option value="all">{t("Toutes dates")}</option>
                <option value="7days">{t("7 derniers jours")}</option>
                <option value="30days">{t("30 derniers jours")}</option>
                <option value="90days">{t("90 derniers jours")}</option>
             </select>
             <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative flex-1 min-w-[140px]">
             <select 
                value={sortByFilter} 
                onChange={(e) => setSortByFilter(e.target.value)}
                className="w-full appearance-none px-4 py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal text-zinc-700 outline-none cursor-pointer focus:ring-2 ring-indigo-500/20"
             >
                <option value="createdAt_desc">{t("Plus récents")}</option>
                <option value="createdAt_asc">{t("Plus anciens")}</option>
                <option value="orders_desc">{t("Commandes (Décroissant)")}</option>
                <option value="orders_asc">{t("Commandes (Croissant)")}</option>
             </select>
             <ChevronDown className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>
          <button 
            onClick={exportCSV}
            className="flex-1 min-w-[140px] px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-bold uppercase tracking-widest rtl:tracking-normal text-[10px] hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-100"
          >
            <Download className="w-4 h-4" /> {t("Exporter")}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Utilisateur")}</th>
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Email")}</th>
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Rôle")}</th>
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500 text-center">
                  {t("Commandes")}</th>
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Privilège (Type)")}</th>
                <th className="p-6 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500 text-end">
                  {t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-zinc-500 font-medium"
                  >
                    {t("Chargement...")}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-zinc-500 font-medium"
                  >
                    {t("Aucun utilisateur trouvé.")}</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  return (
                                  <tr
                                    key={user.id}
                                    className={`border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors ${user.status === "inactive" ? "opacity-50" : ""}`}
                                  >
                                    <td className="p-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-kinder uppercase shadow-inner">
                                          {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <span className="font-bold text-zinc-900 block">
                                              {user.displayName || "Sans nom"}
                                            </span>
                                            {user.status === "inactive" && <span className="text-[9px] font-bold text-red-500 uppercase">Désactivé</span>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-6 text-sm text-zinc-500 font-medium">
                                      {user.email}
                                    </td>
                                    <td className="p-6">
                                      <span className="px-3 py-1 bg-zinc-100 text-zinc-700 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-lg border border-zinc-200">
                                        {user.role || "buyer"}
                                      </span>
                                    </td>
                                    <td className="p-6 text-center">
                                      <span className="inline-flex items-center justify-center min-w-[2rem] h-8 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold px-2">
                                         {user.orderCount || 0}
                                      </span>
                                    </td>
                                    <td className="p-6">
                                      <div className="relative inline-block w-40">
                                        <select
                                          value={user.clientType || "standard"}
                                          onChange={(e) =>
                                            handleUpdateClientType(user.id, e.target.value)
                                          }
                                          className={`w-full appearance-none px-4 py-2 text-[10px] font-bold uppercase tracking-widest rtl:tracking-normal rounded-xl border-2 transition-colors cursor-pointer outline-none ${
                                            user.clientType === "vip"
                                              ? "bg-amber-50 border-amber-200 text-amber-800"
                                              : user.clientType === "architect"
                                                ? "bg-purple-50 border-purple-200 text-purple-800"
                                                : "bg-zinc-50 border-zinc-200 text-zinc-600"
                                          }`}
                                        >
                                          <option value="standard">{t("Standard")}</option>
                                          <option value="vip">{t("Client VIP")}</option>
                                          <option value="architect">{t("Architecte")}</option>
                                        </select>
                                        <div className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                          {user.clientType === "vip" && (
                                            <Star className="w-3 h-3 text-amber-500" />
                                          )}
                                          {user.clientType === "architect" && (
                                            <Building2 className="w-3 h-3 text-purple-500" />
                                          )}
                                          {(!user.clientType ||
                                            user.clientType === "standard") && (
                                            <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-6 text-end">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setIpLogsUser(user)}
                                                title={t("Voir l'historique IP")}
                                                className="p-2 rounded-xl bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-colors"
                                            >
                                                <Monitor className="w-4 h-4" />
                                            </button>
                                            <button 
                                              onClick={() => handleDeactivate(user)}
                                              title={user.status === "inactive" ? "Réactiver le compte" : "Désactiver le compte"}
                                              className={`p-2 rounded-xl transition-colors ${user.status === "inactive" ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-red-50 text-red-500 hover:bg-red-100"}`}>
                                               <PowerOff className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                  </tr>
                                );
                })
              )}
            </tbody>
          </table>
          
          {!loading && hasMore && filteredUsers.length > 0 && (
             <div className="p-6 border-t border-zinc-100 flex justify-center bg-zinc-50/50">
                 <button 
                   onClick={() => fetchUsers(true)}
                   disabled={loadingMore}
                   className="px-8 py-3 bg-white border border-zinc-200 text-zinc-700 font-kinder text-xs uppercase tracking-widest rounded-2xl hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
                 >
                     {loadingMore ? t("Chargement...") : t("Charger plus d'utilisateurs")}
                 </button>
             </div>
          )}
        </div>
      </div>
      <AnimatePresence>
         {ipLogsUser && (
            <IpLogsModal user={ipLogsUser} onClose={() => setIpLogsUser(null)} />
         )}
      </AnimatePresence>
    </div>
  );
};
