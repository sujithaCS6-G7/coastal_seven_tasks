import { create } from 'zustand';
import type {
  RealtimeNotification,
  RealtimeNotificationType,
  WebSocketConnectionStatus,
} from '../types/api';

export interface NotificationInput {
  id?: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  orderId?: number;
  orderNumber?: string;
  status?: string;
  timestamp?: string;
}

export interface NotificationState {
  notifications: RealtimeNotification[];
  isPanelOpen: boolean;
  wsStatus: WebSocketConnectionStatus;
  reconnectAttempts: number;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setWsStatus: (status: WebSocketConnectionStatus, attempts?: number) => void;
  addNotification: (input: NotificationInput) => RealtimeNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
}

/**
 * Day 17: Global Real-Time Notification Store (Zustand)
 * Stores live WebSocket order & chat notifications with read/unread state and dismissal controls.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isPanelOpen: false,
  wsStatus: 'idle',
  reconnectAttempts: 0,

  setPanelOpen: (open: boolean) => set({ isPanelOpen: open }),

  togglePanel: () =>
    set((state) => ({
      isPanelOpen: !state.isPanelOpen,
    })),

  setWsStatus: (status: WebSocketConnectionStatus, attempts: number = 0) =>
    set({ wsStatus: status, reconnectAttempts: attempts }),

  addNotification: (input: NotificationInput) => {
    const newNotification: RealtimeNotification = {
      id: input.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: input.type,
      title: input.title,
      message: input.message,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      status: input.status,
      timestamp: input.timestamp || new Date().toISOString(),
      read: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));

    return newNotification;
  },

  markAsRead: (id: string) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  dismissNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));

export default useNotificationStore;
