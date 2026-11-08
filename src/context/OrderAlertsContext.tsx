import { createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSocketEvent } from '@/hooks/useRealtime';
import { useOrderAlerts } from '@/hooks/useOrderAlerts';

const OrderAlertsContext = createContext(0);

/**
 * New-order alerts for a business owner (or an admin acting as one) on every page, not only in the
 * panel: toast, sound, count in the tab title and, in the background, a browser notification.
 * It also hears when an admin disables or enables the business, so the panel updates at once;
 * while disabled there are no alerts.
 */
export function OrderAlertsProvider({ children }: { children: ReactNode }) {
  const { user, business, setBusiness } = useAuth();
  const navigate = useNavigate();
  const businessId = user && user.role !== 'admin' && business ? business.id : null;
  const pending = useOrderAlerts(businessId, () => navigate('/dashboard/orders'), business?.isActive === false);

  useSocketEvent('business:status', (status) => {
    if (business && status.businessId === business.id) setBusiness({ ...business, isActive: status.isActive, disabledAt: status.disabledAt, disabledReason: status.disabledReason });
  });

  return <OrderAlertsContext.Provider value={pending}>{children}</OrderAlertsContext.Provider>;
}

/** How many orders of the session's business are waiting ("Nuevo"). */
// eslint-disable-next-line react-refresh/only-export-components
export const usePendingOrders = () => useContext(OrderAlertsContext);
