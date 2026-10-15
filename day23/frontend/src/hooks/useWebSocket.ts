import { useState, useEffect, useRef, useCallback } from 'react';
import { buildWsUrl } from '../config/env';
import type { WebSocketConnectionStatus } from '../types/api';

export interface UseWebSocketOptions<TMessage = unknown> {
  /** Whether the WebSocket should actively connect. Defaults to true. */
  enabled?: boolean;
  /** Whether to automatically reconnect when the connection closes unexpectedly. Defaults to true. */
  shouldReconnect?: boolean;
  /** Maximum number of automatic reconnection attempts. Defaults to 5. */
  maxReconnectAttempts?: number;
  /** Initial backoff delay in milliseconds before the first retry. Defaults to 1000ms. */
  initialReconnectDelayMs?: number;
  /** Maximum backoff delay in milliseconds between retries. Defaults to 16000ms. */
  maxReconnectDelayMs?: number;
  /** Callback invoked when the WebSocket connection opens. */
  onOpen?: (event: Event) => void;
  /** Callback invoked when a message is received (parsed JSON if valid, otherwise raw string). */
  onMessage?: (data: TMessage, rawEvent: MessageEvent) => void;
  /** Callback invoked when a WebSocket error occurs. */
  onError?: (event: Event) => void;
  /** Callback invoked when the WebSocket connection closes. */
  onClose?: (event: CloseEvent) => void;
}

export interface UseWebSocketReturn<TMessage = unknown> {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  lastMessage: TMessage | null;
  error: string | null;
  reconnectAttempts: number;
  sendMessage: (payload: Record<string, unknown> | string) => boolean;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Day 17: Reusable React Custom Hook for WebSocket Communication
 * Supports JSON serialization/parsing, automatic reconnection with exponential backoff,
 * retry cap, delay reset on successful connection, and clean unmount teardown.
 */
export function useWebSocket<TMessage = unknown>(
  urlOrPath: string | null,
  options: UseWebSocketOptions<TMessage> = {}
): UseWebSocketReturn<TMessage> {
  const {
    enabled = true,
    shouldReconnect = true,
    maxReconnectAttempts = 5,
    initialReconnectDelayMs = 1000,
    maxReconnectDelayMs = 16000,
    onOpen,
    onMessage,
    onError,
    onClose,
  } = options;

  const [status, setStatus] = useState<WebSocketConnectionStatus>('idle');
  const [lastMessage, setLastMessage] = useState<TMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef<number>(0);
  const manualCloseRef = useRef<boolean>(false);
  const unmountedRef = useRef<boolean>(false);

  // Store latest callbacks in refs to avoid unnecessary socket re-creations on re-render
  const onOpenRef = useRef(onOpen);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onOpenRef.current = onOpen;
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onCloseRef.current = onClose;
  }, [onOpen, onMessage, onError, onClose]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    clearReconnectTimer();

    if (!urlOrPath || !enabled || unmountedRef.current) {
      return;
    }

    // Close any existing socket before opening a new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      try {
        wsRef.current.close();
      } catch {
        // Ignore close errors on stale socket
      }
      wsRef.current = null;
    }

    const resolvedUrl = buildWsUrl(urlOrPath);
    manualCloseRef.current = false;
    setStatus(attemptsRef.current > 0 ? 'reconnecting' : 'connecting');

    try {
      const socket = new WebSocket(resolvedUrl);
      wsRef.current = socket;

      socket.onopen = (event: Event) => {
        if (unmountedRef.current) return;
        // Reset retry counter and delay after a successful connection
        attemptsRef.current = 0;
        setReconnectAttempts(0);
        setError(null);
        setStatus('connected');
        onOpenRef.current?.(event);
      };

      socket.onmessage = (event: MessageEvent) => {
        if (unmountedRef.current) return;
        let parsedData: TMessage;
        try {
          parsedData = JSON.parse(event.data) as TMessage;
        } catch {
          parsedData = event.data as unknown as TMessage;
        }
        setLastMessage(parsedData);
        onMessageRef.current?.(parsedData, event);
      };

      socket.onerror = (event: Event) => {
        if (unmountedRef.current) return;
        setError('WebSocket connection error.');
        setStatus('error');
        onErrorRef.current?.(event);
      };

      socket.onclose = (event: CloseEvent) => {
        if (unmountedRef.current) return;
        wsRef.current = null;
        onCloseRef.current?.(event);

        if (
          !manualCloseRef.current &&
          shouldReconnect &&
          attemptsRef.current < maxReconnectAttempts
        ) {
          const currentAttempt = attemptsRef.current;
          // Exponential backoff: initialDelay * 2^attempt (capped at maxReconnectDelayMs)
          const backoffDelay = Math.min(
            initialReconnectDelayMs * Math.pow(2, currentAttempt),
            maxReconnectDelayMs
          );
          attemptsRef.current = currentAttempt + 1;
          setReconnectAttempts(attemptsRef.current);
          setStatus('reconnecting');

          reconnectTimerRef.current = setTimeout(() => {
            if (!unmountedRef.current && !manualCloseRef.current) {
              connectSocket();
            }
          }, backoffDelay);
        } else {
          setStatus('disconnected');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize WebSocket');
      setStatus('error');
    }
  }, [
    urlOrPath,
    enabled,
    shouldReconnect,
    maxReconnectAttempts,
    initialReconnectDelayMs,
    maxReconnectDelayMs,
    clearReconnectTimer,
  ]);

  const sendMessage = useCallback((payload: Record<string, unknown> | string): boolean => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
      socket.send(serialized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearReconnectTimer();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore close error
      }
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  const reconnect = useCallback(() => {
    manualCloseRef.current = false;
    attemptsRef.current = 0;
    setReconnectAttempts(0);
    connectSocket();
  }, [connectSocket]);

  useEffect(() => {
    unmountedRef.current = false;
    if (urlOrPath && enabled) {
      connectSocket();
    } else {
      disconnect();
      setStatus('idle');
    }

    return () => {
      unmountedRef.current = true;
      manualCloseRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        try {
          wsRef.current.close();
        } catch {
          // Ignore close error on unmount
        }
        wsRef.current = null;
      }
    };
  }, [urlOrPath, enabled, connectSocket, disconnect, clearReconnectTimer]);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    error,
    reconnectAttempts,
    sendMessage,
    reconnect,
    disconnect,
  };
}

export default useWebSocket;
