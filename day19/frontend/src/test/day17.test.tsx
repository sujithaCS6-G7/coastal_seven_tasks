import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { useWebSocket } from '../hooks/useWebSocket';
import { RealtimeProvider } from '../context/RealtimeContext';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';
import OrderHistoryPage from '../pages/OrderHistoryPage';
import NotificationPanel from '../components/NotificationPanel';
import LiveChatWidget from '../components/LiveChatWidget';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { API_BASE_URL, WS_BASE_URL, buildWsUrl, resolveAssetUrl } from '../config/env';
import axiosClient from '../api/axiosClient';
import { MockWebSocket } from './setup';
import { server } from './mocks/server';
import { mockUser, mockAdminUser } from './mocks/handlers';

const renderWithRealtimeProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return {
    queryClient: testQueryClient,
    ...render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <RealtimeProvider>
                  <CartProvider>{ui}</CartProvider>
                </RealtimeProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
};

describe('Day 17 — Full-Stack Integration & Real-Time Features Suite', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    useNotificationStore.setState({
      notifications: [],
      isPanelOpen: false,
      wsStatus: 'idle',
      reconnectAttempts: 0,
    });
    useAuthStore.setState({
      token: 'mock-jwt-access-token',
      user: mockUser,
      loading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Environment Configuration & JWT Header Injection', () => {
    it('provides centralized API_BASE_URL, WS_BASE_URL, buildWsUrl, and resolveAssetUrl helpers', () => {
      expect(API_BASE_URL).toBe('http://localhost:8003');
      expect(WS_BASE_URL).toBe('ws://localhost:8003');
      expect(buildWsUrl('/ws/orders/2')).toBe('ws://localhost:8003/ws/orders/2');
      expect(resolveAssetUrl('/uploads/products/laptop.jpg')).toBe(
        'http://localhost:8003/uploads/products/laptop.jpg'
      );
    });

    it('automatically attaches Authorization: Bearer <token> header to outgoing API requests', async () => {
      localStorage.setItem('access_token', 'day17-verified-jwt-token');
      useAuthStore.setState({ token: 'day17-verified-jwt-token', user: mockUser, loading: false });

      let capturedAuthHeader: string | null = null;
      server.use(
        http.get('*/auth/me', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization');
          return HttpResponse.json(mockUser, { status: 200 });
        })
      );

      await axiosClient.get('/auth/me');
      expect(capturedAuthHeader).toBe('Bearer day17-verified-jwt-token');
    });
  });

  describe('2. Reusable useWebSocket Hook & Lifecycle Cleanup', () => {
    it('connects to WebSocket, parses JSON messages, sends payloads, and cleans up on unmount', () => {
      const onMessage = vi.fn();
      const { result, unmount } = renderHook(() =>
        useWebSocket('/ws/orders/2', {
          onMessage,
        })
      );

      expect(MockWebSocket.instances.length).toBe(1);
      const wsInstance = MockWebSocket.instances[0];
      expect(wsInstance.url).toBe('ws://localhost:8003/ws/orders/2');
      expect(result.current.status).toBe('connecting');


      act(() => {
        wsInstance.triggerOpen();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.status).toBe('connected');

      // Send a JSON message
      act(() => {
        const sent = result.current.sendMessage({ type: 'PING' });
        expect(sent).toBe(true);
      });
      expect(wsInstance.sentMessages).toContain(JSON.stringify({ type: 'PING' }));

      // Receive a JSON message
      act(() => {
        wsInstance.triggerMessage({
          event: 'ORDER_STATUS_UPDATED',
          order_id: 5002,
          order_number: 'ORD-5002',
          status: 'SHIPPED',
        });
      });

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ORDER_STATUS_UPDATED',
          order_id: 5002,
          status: 'SHIPPED',
        }),
        expect.any(MessageEvent)
      );

      // Unmount should cleanly close WebSocket
      unmount();
      expect(wsInstance.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. WebSocket Automatic Reconnection with Exponential Backoff', () => {
    it('reconnects using exponential backoff on unexpected close and resets retry count on open', () => {
      vi.useFakeTimers();

      const { result, unmount } = renderHook(() =>
        useWebSocket('/ws/orders/2', {
          shouldReconnect: true,
          maxReconnectAttempts: 3,
          initialReconnectDelayMs: 1000,
          maxReconnectDelayMs: 8000,
        })
      );

      expect(MockWebSocket.instances.length).toBe(1);
      const firstSocket = MockWebSocket.instances[0];

      act(() => {
        firstSocket.triggerOpen();
      });
      expect(result.current.status).toBe('connected');

      // Simulate unexpected network drop (code 1006)
      act(() => {
        firstSocket.triggerClose(1006, 'Abnormal closure');
      });

      expect(result.current.status).toBe('reconnecting');
      expect(result.current.reconnectAttempts).toBe(1);

      // Attempt 1 waits 1000ms (1000 * 2^0)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(MockWebSocket.instances.length).toBe(2);

      // Simulate second drop -> Attempt 2 waits 2000ms (1000 * 2^1)
      const secondSocket = MockWebSocket.instances[1];
      act(() => {
        secondSocket.triggerClose(1006, 'Still offline');
      });
      expect(result.current.reconnectAttempts).toBe(2);

      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(MockWebSocket.instances.length).toBe(2);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(MockWebSocket.instances.length).toBe(3);

      // When third socket connects, reconnectAttempts resets to 0
      const thirdSocket = MockWebSocket.instances[2];
      act(() => {
        thirdSocket.triggerOpen();
      });
      expect(result.current.status).toBe('connected');
      expect(result.current.reconnectAttempts).toBe(0);

      unmount();
    });
  });

  describe('4. Live Order Status Updates & Real-Time Notification Panel', () => {
    it('updates OrderHistoryPage status in real time without page refresh when ORDER_STATUS_UPDATED arrives', async () => {
      renderWithRealtimeProviders(
        <div>
          <NotificationPanel />
          <OrderHistoryPage />
        </div>,
        { route: '/orders' }
      );

      // Wait for initial orders to render (ORD-5002 is initially PENDING: filter button + order badge = 2)
      await waitFor(() => {
        expect(screen.getByText('ORD-5002')).toBeInTheDocument();
      });
      expect(screen.getAllByText('PENDING').length).toBe(2);
      expect(screen.getAllByText('SHIPPED').length).toBe(1); // Only filter button initially

      // Locate the RealtimeProvider WebSocket instance for /ws/orders/2
      const orderWs = MockWebSocket.instances.find((ws) => ws.url.includes('/ws/orders/2'));
      expect(orderWs).toBeDefined();

      act(() => {
        orderWs!.triggerOpen();
      });

      // Push live ORDER_STATUS_UPDATED event from backend
      act(() => {
        orderWs!.triggerMessage({
          event: 'ORDER_STATUS_UPDATED',
          order_id: 5002,
          user_id: 2,
          order_number: 'ORD-5002',
          status: 'SHIPPED',
          message: 'Your order ORD-5002 status changed to Shipped.',
        });
      });

      // Verify OrderHistoryPage dynamically updates from PENDING to SHIPPED without reload
      await waitFor(() => {
        expect(screen.getAllByText('SHIPPED').length).toBe(2);
      });
      expect(screen.getAllByText('PENDING').length).toBe(1);


      // Verify NotificationStore received the real-time notification
      const storeState = useNotificationStore.getState();
      expect(storeState.notifications.filter((n) => !n.read).length).toBe(1);
      expect(storeState.notifications[0].message).toBe(
        'Your order ORD-5002 status changed to Shipped.'
      );
    });

    it('displays multiple notifications in NotificationPanel and supports dismiss and clear all', async () => {
      const user = userEvent.setup();

      // Pre-populate two real-time order notifications
      useNotificationStore.getState().addNotification({
        title: 'Order ORD-5001 Confirmed',
        message: 'Your order ORD-5001 status changed to Confirmed.',
        type: 'order_created',
        orderId: 5001,
        orderNumber: 'ORD-5001',
        status: 'CONFIRMED',
      });
      useNotificationStore.getState().addNotification({
        title: 'Order ORD-5002 Shipped',
        message: 'Your order ORD-5002 status changed to Shipped.',
        type: 'order_status',
        orderId: 5002,
        orderNumber: 'ORD-5002',
        status: 'SHIPPED',
      });

      renderWithRealtimeProviders(<NotificationPanel />);

      const bellButton = screen.getByRole('button', { name: /open notifications/i });
      expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('2');

      // Open the Notification dropdown panel
      await user.click(bellButton);
      expect(
        screen.getByRole('region', { name: /real-time notifications panel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Your order ORD-5001 status changed to Confirmed.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Your order ORD-5002 status changed to Shipped.')
      ).toBeInTheDocument();

      // Dismiss one notification
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss notification/i });
      await user.click(dismissButtons[0]);
      expect(useNotificationStore.getState().notifications.length).toBe(1);

      // Clear all remaining notifications
      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearAllButton);
      expect(useNotificationStore.getState().notifications.length).toBe(0);
    });
  });

  describe('5. Admin ↔ Customer Live Support Chat Foundation', () => {
    it('connects to /ws/chat/{room_id}, sends chat messages, and renders real-time broadcasts', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        token: 'mock-jwt-access-token',
        user: mockAdminUser,
        loading: false,
      });

      renderWithRealtimeProviders(<LiveChatWidget mode="embedded" />);

      // Wait for chat widget region to mount
      await waitFor(() => {
        expect(screen.getByRole('region', { name: /live support chat/i })).toBeInTheDocument();
      });

      const chatWs = MockWebSocket.instances.find((ws) => ws.url.includes('/ws/chat/'));
      expect(chatWs).toBeDefined();

      act(() => {
        chatWs!.triggerOpen();
      });

      // Type and send a chat message as Admin
      const chatInput = screen.getByLabelText(/chat message input/i);
      await user.type(chatInput, 'Hello! Your order ORD-5002 has just been shipped.');
      const sendButton = screen.getByRole('button', { name: /send chat message/i });
      await user.click(sendButton);

      expect(chatWs!.sentMessages.length).toBeGreaterThan(0);
      const sentPayload = JSON.parse(chatWs!.sentMessages[chatWs!.sentMessages.length - 1]);
      expect(sentPayload).toMatchObject({
        action: 'chat_message',
        sender_name: 'admin',
        sender_role: 'admin',
        message: 'Hello! Your order ORD-5002 has just been shipped.',
      });

      // Simulate receiving the broadcast CHAT_MESSAGE back over WebSocket
      act(() => {
        chatWs!.triggerMessage({
          event: 'CHAT_MESSAGE',
          id: 'msg-live-99',
          room_id: '2',
          sender_id: 1,
          sender_name: 'admin',
          sender_role: 'admin',
          message: 'Hello! Your order ORD-5002 has just been shipped.',
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText('Hello! Your order ORD-5002 has just been shipped.')
        ).toBeInTheDocument();
      });
    });
  });
});
