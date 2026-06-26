import React from "react";
import { Filter, Search, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ALGERIA_WILAYAS } from "../../../constants";

interface OrderFiltersProps {
  searchId: string;
  setSearchId: (val: string) => void;
  clientSearch: string;
  setClientSearch: (val: string) => void;
  selectedWilaya: string;
  setSelectedWilaya: (val: string) => void;
  dynamicWilayas: string[];
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  sellerSearch: string;
  setSellerSearch: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  statusLabels: Record<string, string>;
  onResetFilters: () => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  searchId,
  setSearchId,
  clientSearch,
  setClientSearch,
  selectedWilaya,
  setSelectedWilaya,
  dynamicWilayas,
  selectedStatus,
  setSelectedStatus,
  sellerSearch,
  setSellerSearch,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusLabels,
  onResetFilters,
}) => {
  const { t } = useTranslation();

  const isFiltering =
    searchId ||
    clientSearch ||
    selectedWilaya !== "all" ||
    selectedStatus !== "all" ||
    sellerSearch ||
    startDate ||
    endDate;

  return (
    <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl space-y-4">
      <h3 className="text-xs font-kinder uppercase tracking-widest text-[#3C2B22] flex items-center gap-2">
        <Filter className="w-4 h-4 text-orange-500" />
        {t("Filtres Analytiques & Recherche")}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
        {/* Reference Search */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("ID Commande / Code")}
          </label>
          <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={t("Filtrer ID...")}
              className="w-full text-xs font-bold bg-transparent outline-none text-zinc-800"
            />
          </div>
        </div>

        {/* Client Search */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Client (Nom/Tel)")}
          </label>
          <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder={t("Nom ou Téléphone...")}
              className="w-full text-xs font-bold bg-transparent outline-none text-zinc-800"
            />
          </div>
        </div>

        {/* Wilaya Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Wilaya (Algérie)")}
          </label>
          <select
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold outer-none text-zinc-700 outline-none cursor-pointer"
          >
            <option value="all">{t("Toutes les wilayas actives")}</option>
            {dynamicWilayas.sort().map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Statut Actuel")}
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold outer-none text-zinc-700 outline-none cursor-pointer"
          >
            <option value="all">{t("Tous les statuts")}</option>
            {Object.keys(statusLabels).map((key) => (
              <option key={key} value={key}>
                {statusLabels[key]}
              </option>
            ))}
          </select>
        </div>

        {/* Seller Search */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Vendeur (ID / Magasin)")}
          </label>
          <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={sellerSearch}
              onChange={(e) => setSellerSearch(e.target.value)}
              placeholder={t("Chercher vendeur...")}
              className="w-full text-xs font-bold bg-transparent outline-none text-zinc-800"
            />
          </div>
        </div>

        {/* Date de Début */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Date Début")}
          </label>
          <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2 justify-between">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold bg-transparent outline-none text-zinc-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Date de Fin */}
        <div className="space-y-1">
          <label className="block text-[10px] font-kinder text-zinc-450 uppercase tracking-wider">
            {t("Date Fin")}
          </label>
          <div className="bg-white border border-zinc-200 rounded-xl px-3 py-2 flex items-center gap-2 justify-between">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-semibold bg-transparent outline-none text-zinc-700 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {isFiltering && (
        <div className="flex justify-end">
          <button
            onClick={onResetFilters}
            className="px-3.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-855 rounded-lg text-[10px] font-kinder uppercase tracking-wider cursor-pointer transition-all border-none"
          >
            {t("Réinitialiser tous les filtres")}
          </button>
        </div>
      )}
    </div>
  );
};
