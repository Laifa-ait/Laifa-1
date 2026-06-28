export interface OrderItem {
  sellerId: string;
  price: number;
  quantity: number;
}

export interface Order {
  total: number;
  subtotal?: number;
  sellerId?: string;
  sellerIds?: string[];
  items?: OrderItem[];
}

export function calculateOrderCommission(
  order: Order,
  sellerRates: Record<string, number>,
  globalRate: number
): { orderCommission: number; netPayout: number } {
  let orderCommission = 0;

  if (order.items && order.items.length > 0) {
    order.items.forEach(item => {
      const sRate = sellerRates[item.sellerId] ?? globalRate;
      const lineTotal = (item.price || 0) * (item.quantity || 1);
      orderCommission += lineTotal * (sRate / 100);
    });
  } else {
    // fallback
    const sRate = sellerRates[order.sellerId!] ?? sellerRates[order.sellerIds?.[0] as string] ?? globalRate;
    orderCommission = (order.subtotal || order.total || 0) * (sRate / 100);
  }

  const netPayout = (order.total || 0) - orderCommission;

  return { orderCommission, netPayout };
}
