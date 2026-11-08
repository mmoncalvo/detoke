import { useEffect, useState } from 'react';
import { onRecentOrdersChange, readRecentOrders, type RecentOrder } from '@/lib/recentOrders';

export function useRecentOrders(): RecentOrder[] {
  const [orders, setOrders] = useState(readRecentOrders);
  useEffect(() => onRecentOrdersChange(() => setOrders(readRecentOrders())), []);
  return orders;
}
