/**
 * Day 21: Centralized Frontend Environment Configuration
 * Reads Vite environment variables (VITE_API_URL, VITE_WS_URL) with safe local development defaults (port 8005).
 */

const isTest = import.meta.env?.MODE === 'test';

const rawApiUrl: string =
  (import.meta.env?.VITE_API_URL as string | undefined) ||
  (!isTest &&
  typeof window !== 'undefined' &&
  window.location &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')
    ? window.location.port === '3000'
      ? window.location.origin
      : 'http://localhost:8000'
    : 'https://nexora-backend-b0fh.onrender.com');

export const API_BASE_URL: string = rawApiUrl.replace(/\/+$/, '');

const rawWsUrl: string =
  (import.meta.env?.VITE_WS_URL as string | undefined) ||
  API_BASE_URL.replace(/^http/i, 'ws');

export const WS_BASE_URL: string = rawWsUrl.replace(/\/+$/, '');

export const APP_NAME: string =
  (import.meta.env?.VITE_APP_NAME as string | undefined) ||
  'NexoraAI E-Commerce Store';

export function getApiBaseUrl(): string {
  if (import.meta.env?.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace(/\/+$/, '');
  }
  if (!isTest && typeof window !== 'undefined' && window.location) {
    if (window.location.port === '3000') {
      return window.location.origin;
    }
  }
  return API_BASE_URL;
}

/**
 * Resolves a relative WebSocket path (e.g. '/ws/orders/2') against WS_BASE_URL,
 * or returns the URL directly if it is already an absolute ws:// or wss:// URL.
 */
export function buildWsUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (!isTest && typeof window !== 'undefined' && window.location && (window.location.port === '3000' || (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'))) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${normalizedPath}`;
  }
  return `${WS_BASE_URL}${normalizedPath}`;
}

/**
 * Resolves a backend static asset or image URL against API_BASE_URL.
 */
export function resolveAssetUrl(imageUrl?: string | null, fallbackUrl: string = ''): string {
  if (!imageUrl) return fallbackUrl;
  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  if (!isTest && typeof window !== 'undefined' && window.location && (window.location.port === '3000' || (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'))) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}
