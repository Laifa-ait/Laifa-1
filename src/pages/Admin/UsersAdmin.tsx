import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, doc, updateDoc, limit } from "firebase/firestore";
import {
  Users,
  Search,
  Shield,
  Building2,
  Star,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export const UsersAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), limit(200));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-zinc-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight rtl:tracking-normal">
            {t("Gestion des")}<span className="text-indigo-600">{t("Clients")}</span>
          </h1>
          <p className="text-zinc-500 font-medium mt-2">
            {t("Gérez les types de comptes (Standard, VIP, Architecte) pour appliquer des privilèges spécifiques.")}</p>
        </div>
        <div className="flex bg-indigo-50 rounded-2xl p-4 items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-900">
              {users.length}
            </div>
            <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest rtl:tracking-normal">
              {t("Utilisateurs")}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder={t("Rechercher un utilisateur (email, nom)...") || "Rechercher un utilisateur (email, nom)..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-12 pe-4 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-zinc-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Utilisateur")}</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Email")}</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Rôle Base")}</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">
                  {t("Privilège VIP (Client Type)")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-zinc-500 font-medium"
                  >
                    {t("Chargement...")}</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-zinc-500 font-medium"
                  >
                    {t("Aucun utilisateur trouvé.")}</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  
                  return (
                                  <tr
                                    key={user.id}
                                    className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors"
                                  >
                                    <td className="p-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black uppercase shadow-inner">
                                          {user.displayName?.charAt(0) || user.email?.charAt(0)}
                                        </div>
                                        <span className="font-bold text-zinc-900">
                                          {user.displayName || "Sans nom"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-6 text-sm text-zinc-500 font-medium">
                                      {user.email}
                                    </td>
                                    <td className="p-6">
                                      <span className="px-3 py-1 bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal rounded-lg border border-zinc-200">
                                        {user.role || "buyer"}
                                      </span>
                                    </td>
                                    <td className="p-6">
                                      <div className="relative inline-block w-48">
                                        <select
                                          value={user.clientType || "standard"}
                                          onChange={(e) =>
                                            handleUpdateClientType(user.id, e.target.value)
                                          }
                                          className={`w-full appearance-none px-4 py-2 text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-xl border-2 transition-colors cursor-pointer outline-none ${
                                            user.clientType === "vip"
                                              ? "bg-amber-50 border-amber-200 text-amber-800"
                                              : user.clientType === "architect"
                                                ? "bg-purple-50 border-purple-200 text-purple-800"
                                                : "bg-zinc-50 border-zinc-200 text-zinc-600"
                                          }`}
                                        >
                                          <option value="standard">{t("Standard")}</option>
                                          <option value="vip">{t("Client VIP")}</option>
                                          <option value="architect">{t("Architecte / Pro")}</option>
                                        </select>
                                        <div className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                          {user.clientType === "vip" && (
                                            <Star className="w-4 h-4 text-amber-500" />
                                          )}
                                          {user.clientType === "architect" && (
                                            <Building2 className="w-4 h-4 text-purple-500" />
                                          )}
                                          {(!user.clientType ||
                                            user.clientType === "standard") && (
                                            <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
