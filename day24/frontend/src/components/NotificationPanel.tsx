import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/useNotificationStore';
import { useRealtime } from '../context/RealtimeContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Package,
  Truck,
  MessageSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type { RealtimeNotification } from '../types/api';

/**
 * Day 17: Reusable Real-Time Notification Panel integrated into the Navbar.
 * Displays live WebSocket events, connection status, unread badge, and dismiss/clear controls.
 */
export const NotificationPanel: React.FC = () => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const notifications = useNotificationStore((state) => state.notifications);
  const isPanelOpen = useNotificationStore((state) => state.isPanelOpen);
  const setPanelOpen = useNotificationStore((state) => state.setPanelOpen);
  const togglePanel = useNotificationStore((state) => state.togglePanel);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  const { wsStatus, isConnected, reconnectAttempts, reconnectOrderSocket } = useRealtime();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen, setPanelOpen]);

  const handleNotificationClick = (notif: RealtimeNotification) => {
    markAsRead(notif.id);
    if (notif.type === 'order_status' || notif.type === 'order_created') {
      setPanelOpen(false);
      navigate('/orders');
    }
  };

  const getIconForType = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'order_status':
        return <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'order_created':
        return <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={togglePanel}
        aria-label="Open notifications"
        aria-expanded={isPanelOpen}
        className="relative text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {/* Live WebSocket Connection Status Dot */}
        <span
          title={`WebSocket: ${wsStatus}`}
          className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ring-1 ring-background ${
            isConnected
              ? 'bg-emerald-500'
              : wsStatus === 'reconnecting' || wsStatus === 'connecting'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-slate-400'
          }`}
        />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white animate-in zoom-in"
          >
            {unreadCount}
          </span>
        )}
      </Button>

      {isPanelOpen && (
        <div
          role="region"
          aria-label="Real-Time Notifications Panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Real-Time Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              { isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Wifi className="h-3 w-3" /> Live
                </span>
              ) : (
                <button
                  type="button"
                  onClick={reconnectOrderSocket}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full hover:bg-amber-500/20"
                  title="Reconnect WebSocket"
                >
                  {wsStatus === 'reconnecting' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" /> Retry #{reconnectAttempts}
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" /> Offline
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close notifications panel"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-background flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
              <button
                type="button"
                onClick={clearNotifications}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground">
                  Live order status changes and support messages will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/40 ${
                    !notif.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {getIconForType(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                      {notif.status && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                          {notif.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label={`Dismiss notification ${notif.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
