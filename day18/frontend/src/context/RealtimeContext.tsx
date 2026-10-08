import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotificationStore } from '../store/useNotificationStore';
import { useToast } from '../components/ui/toast';
import type {
  OrderOut,
  OrderWebSocketEvent,
  RealtimeNotification,
  WebSocketConnectionStatus,
} from '../types/api';

export interface RealtimeContextValue {
  wsStatus: WebSocketConnectionStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  notifications: RealtimeNotification[];
  unreadCount: number;
  sendOrderPing: () => boolean;
  reconnectOrderSocket: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function formatStatusLabel(status?: string): string {
  if (!status) return 'Updated';
  const lower = status.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Day 17: Real-Time Order & Notification Provider
 * Connects authenticated users to /ws/orders/{user_id} via useWebSocket,
 * updates TanStack Query order caches live without page refresh, and pushes notifications.
 */
export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const notifications = useNotificationStore((state) => state.notifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const setWsStatus = useNotificationStore((state) => state.setWsStatus);

  const wsPath = isAuthenticated && user?.id ? `/ws/orders/${user.id}` : null;

  const handleOrderSocketMessage = useCallback(
    (payload: OrderWebSocketEvent) => {
      if (!payload || typeof payload !== 'object') return;

      // Ignore events intended for a different user
      if (payload.user_id && user?.id && Number(payload.user_id) !== Number(user.id)) {
        return;
      }

      if (payload.event === 'ORDER_STATUS_UPDATED') {
        const orderNumber = payload.order_number || `ORD-${payload.order_id || ''}`;
        const newStatus = String(payload.status || 'UPDATED').toUpperCase();
        const statusTitle = formatStatusLabel(newStatus);
        const messageText =
          payload.message ||
          `Your order ${orderNumber} status changed to ${statusTitle}.`;

        // 1. Live update customer order list cache in-place without requiring a page reload
        queryClient.setQueryData<OrderOut[]>(['my-orders'], (oldOrders) => {
          if (!Array.isArray(oldOrders)) return oldOrders;
          return oldOrders.map((order) => {
            if (
              (payload.order_id && order.id === payload.order_id) ||
              (payload.order_number && order.order_number === payload.order_number)
            ) {
              return { ...order, status: newStatus };
            }
            return order;
          });
        });

        // 2. Live update single order detail cache if open
        if (payload.order_id) {
          queryClient.setQueryData<OrderOut>(
            ['order-detail', payload.order_id],
            (oldDetail) => (oldDetail ? { ...oldDetail, status: newStatus } : oldDetail)
          );
        }

        // 3. Live update admin orders cache in-place if loaded
        queryClient.setQueryData<OrderOut[]>(['admin-orders'], (oldAdminOrders) => {
          if (!Array.isArray(oldAdminOrders)) return oldAdminOrders;
          return oldAdminOrders.map((order) => {
            if (
              (payload.order_id && order.id === payload.order_id) ||
              (payload.order_number && order.order_number === payload.order_number)
            ) {
              return { ...order, status: newStatus };
            }
            return order;
          });
        });

        // 4. Add notification to Real-Time Notifications Panel
        addNotification({
          type: 'order_status',
          title: `Order ${orderNumber} — ${statusTitle}`,
          message: messageText,
          orderId: payload.order_id,
          orderNumber,
          status: newStatus,
          timestamp: payload.updated_at || payload.timestamp || new Date().toISOString(),
        });

        // 5. Show non-blocking toast alert
        toast({
          title: 'Live Order Update',
          description: messageText,
          variant: 'info',
        });
      } else if (payload.event === 'ORDER_CREATED') {
        const orderNumber = payload.order_number || `ORD-${payload.order_id || ''}`;
        const isAdmin = user?.role === 'admin';
        const messageText =
          payload.message ||
          (isAdmin
            ? `New customer order ${orderNumber} placed.`
            : `Your order ${orderNumber} was placed and confirmed.`);

        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });

        addNotification({
          type: 'order_created',
          title: isAdmin
            ? `New Customer Order (${orderNumber})`
            : `Order Confirmed (${orderNumber})`,
          message: messageText,
          orderId: payload.order_id,
          orderNumber,
          status: String(payload.status || 'CONFIRMED'),
          timestamp: payload.timestamp || new Date().toISOString(),
        });

        if (isAdmin) {
          toast({
            title: 'New Customer Order!',
            description: messageText,
            variant: 'success',
          });
        }
      } else if (payload.event === 'SUPPORT_CHAT_NOTIFICATION') {
        const isAdmin = user?.role === 'admin';
        const messageText =
          payload.message || `New message from ${payload.sender_name || 'Support'}`;

        addNotification({
          type: 'chat',
          title: isAdmin
            ? `Customer Support Message (${payload.sender_name || 'Customer'})`
            : 'Live Support Reply',
          message: messageText,
          timestamp: payload.timestamp || new Date().toISOString(),
        });

        toast({
          title: isAdmin ? 'New Customer Message' : 'New Support Message',
          description: messageText,
          variant: 'info',
        });
      }
    },
    [user?.id, user?.role, queryClient, addNotification, toast]
  );

  const {
    status,
    isConnected,
    reconnectAttempts,
    sendMessage,
    reconnect,
  } = useWebSocket<OrderWebSocketEvent>(wsPath, {
    enabled: Boolean(isAuthenticated && user?.id),
    shouldReconnect: true,
    maxReconnectAttempts: 5,
    initialReconnectDelayMs: 1000,
    maxReconnectDelayMs: 16000,
    onMessage: handleOrderSocketMessage,
  });

  useEffect(() => {
    setWsStatus(status, reconnectAttempts);
  }, [status, reconnectAttempts, setWsStatus]);

  const sendOrderPing = useCallback(() => {
    return sendMessage({ action: 'ping' });
  }, [sendMessage]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RealtimeContext.Provider
      value={{
        wsStatus: status,
        isConnected,
        reconnectAttempts,
        notifications,
        unreadCount,
        sendOrderPing,
        reconnectOrderSocket: reconnect,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) {
    return {
      wsStatus: 'idle',
      isConnected: false,
      reconnectAttempts: 0,
      notifications: [],
      unreadCount: 0,
      sendOrderPing: () => false,
      reconnectOrderSocket: () => {},
    };
  }
  return context;
};

export default RealtimeProvider;
