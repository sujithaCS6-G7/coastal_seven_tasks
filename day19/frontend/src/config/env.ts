/**
 * Day 18: Centralized Frontend Environment Configuration
 * Reads Vite environment variables (VITE_API_URL, VITE_WS_URL) with safe local development defaults.
 */

const rawApiUrl: string =
  (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:8003';

export const API_BASE_URL: string = rawApiUrl.replace(/\/+$/, '');

const rawWsUrl: string =
  (import.meta.env?.VITE_WS_URL as string | undefined) ||
  API_BASE_URL.replace(/^http/i, 'ws');

export const WS_BASE_URL: string = rawWsUrl.replace(/\/+$/, '');

export const APP_NAME: string =
  (import.meta.env?.VITE_APP_NAME as string | undefined) ||
  'Nexora Day 19 Hardened Full-Stack E-Commerce';


/**
 * Resolves a relative WebSocket path (e.g. '/ws/orders/2') against WS_BASE_URL,
 * or returns the URL directly if it is already an absolute ws:// or wss:// URL.
 */
export function buildWsUrl(pathOrUrl: string): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
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
  return `${API_BASE_URL}${normalizedPath}`;
}
