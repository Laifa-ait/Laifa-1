import React from "react";
import { CheckSquare, Square, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Order } from "../../../types";
import { formatPrice } from "../../../utils/format";

interface CalculatedOrder {
  id: string;
  commissionAmount: number;
  netRevenue: number;
  platformFee: number;
  sellerPayout: number;
}

interface OrderTableProps {
  loading: boolean;
  ordersCount: number;
  filteredOrders: Order[];
  selectedOrderIds: string[];
  calculatedOrdersMap: Record<string, any>;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  handleSelectAll: (checked: boolean) => void;
  handleSelectOrder: (orderId: string, checked: boolean) => void;
  setSelectedOrder: (order: Order | null) => void;
  getOrderDate: (createdAt: any) => Date | null;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  loading,
  ordersCount,
  filteredOrders,
  selectedOrderIds,
  calculatedOrdersMap,
  statusLabels,
  statusColors,
  handleSelectAll,
  handleSelectOrder,
  setSelectedOrder,
  getOrderDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden pb-10">
      {loading ? (
        <div className="p-20 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs animate-pulse">
          {t("Calcul de l'inventaire & Téléchargement des ventes...")}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-20 text-center block text-zinc-450">
          <HelpCircle className="w-12 h-12 mx-auto text-zinc-350 mb-3 animate-bounce" />
          <strong className="block text-sm font-bold">{t("Aucune commande correspondante")}</strong>
          <p className="text-xs text-zinc-450 mt-1">
            {t("Ajustez vos critères de filtrage ou réinitialisez la recherche.")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 border-b border-zinc-200">
                <th className="p-5 w-12 text-center">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(selectedOrderIds.length !== filteredOrders.length)}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer bg-transparent border-none"
                  >
                    {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length ? (
                      <CheckSquare className="w-5 h-5 text-orange-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450">
                  {t("Manifeste & ID")}
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450">
                  {t("Client & Livrable")}
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450 w-48">
                  {t("Produits")}
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450">
                  {t("Encaissable COD / 5% Math")}
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450">
                  {t("ID Suivi / Transport")}
                </th>
                <th className="p-5 text-[10px] font-kinder uppercase tracking-widest text-zinc-450">
                  {t("Statut Étape")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150">
              {filteredOrders.map((order) => {
                const dateVal = getOrderDate(order.createdAt);
                const isSelected = selectedOrderIds.includes(order.id);

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-zinc-50/40 transition-all cursor-pointer ${
                      isSelected ? "bg-orange-50/20" : ""
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleSelectOrder(order.id, !isSelected)}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors inline-block cursor-pointer bg-transparent border-none p-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#ea580c]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>

                    <td className="p-5">
                      <span className="text-xs font-bold font-mono text-zinc-900 bg-zinc-100 px-2 py-1 rounded inline-block">
                        {order.id.slice(-8).toUpperCase()}
                      </span>
                      <div className="text-[10px] tracking-wide text-zinc-400 font-bold mt-1">
                        {dateVal ? dateVal.toLocaleString() : "N/A"}
                      </div>
                    </td>

                    <td className="p-5">
                      <strong className="block text-sm text-zinc-900 font-kinder">
                        {order.shippingAddress?.fullName || order.shippingAddress?.name || "Client Olmart"}
                      </strong>
                      <div className="text-[10px] font-bold text-zinc-450 uppercase flex items-center gap-1 mt-1">
                        <span>📍</span>
                        <span>
                          {order.shippingAddress?.wilaya} • {order.shippingAddress?.commune}
                        </span>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex flex-col gap-1 max-h-16 overflow-y-auto pr-1">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-[10px]">
                            <span
                              className="font-semibold text-zinc-700 truncate max-w-[120px]"
                              title={item.productName || item.name || "Produit"}
                            >
                              {item.productName || item.name || "Produit"}
                            </span>
                            <span className="font-mono font-bold text-zinc-500 ml-2">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="p-5 font-sans">
                      <strong className="block text-base font-kinder text-zinc-950 tracking-tight">
                        {formatPrice(order.total)}
                      </strong>
                      <span className="text-[9px] font-kinder text-purple-600 bg-purple-50 px-2 py-0.5 rounded inline-block uppercase tracking-wide mt-1">
                        {t("Portion (5%):")} {formatPrice(calculatedOrdersMap[order.id]?.commissionCalc || 0)}
                      </span>
                    </td>

                    <td className="p-5">
                      {order.trackingId || order.trackingNumber ? (
                        <div className="space-y-1">
                          <span className="text-[11px] font-kinder font-mono bg-zinc-950 text-white rounded px-2 py-0.5 inline-block uppercase select-all">
                            {order.trackingId || order.trackingNumber}
                          </span>
                          <span className="block text-[8px] font-kinder uppercase text-zinc-400">
                            {order.deliveryProvider || "YALIDINE"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-xs italic font-semibold">{t("Non synchronisé")}</span>
                      )}
                    </td>

                    <td className="p-5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          statusColors[order.status?.toLowerCase()] || "bg-slate-50 text-slate-700 border-slate-150"
                        }`}
                      >
                        {statusLabels[order.status?.toLowerCase()] || order.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
