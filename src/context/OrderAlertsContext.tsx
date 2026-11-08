import { createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrderAlerts } from '@/hooks/useOrderAlerts';

const OrderAlertsContext = createContext(0);

/**
 * New-order alerts for a business owner (or an admin acting as one) on every page, not only in the
 * panel: toast, sound, count in the tab title and, in the background, a browser notification.
 */
export function OrderAlertsProvider({ children }: { children: ReactNode }) {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const businessId = user && user.role !== 'admin' && business ? business.id : null;
  const pending = useOrderAlerts(businessId, () => navigate('/dashboard/orders'));
  return <OrderAlertsContext.Provider value={pending}>{children}</OrderAlertsContext.Provider>;
}

/** How many orders of the session's business are waiting ("Nuevo"). */
// eslint-disable-next-line react-refresh/only-export-components
export const usePendingOrders = () => useContext(OrderAlertsContext);
