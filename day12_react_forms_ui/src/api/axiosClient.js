/**
 * Central Axios Client configured with base URL, JWT interceptors, and error handling.
 */
import axios from 'axios';

// Base API URL pointing to the FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Request Interceptor:
 * Automatically injects the JWT Bearer access token from localStorage.
 */
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Handles global HTTP status errors, unauthorized (401) session expiration,
 * and extracts user-friendly error messages from FastAPI.
 */
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Session expired or invalid token
      if (error.response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        // If not already on login or register, notify or redirect
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Helper to parse clean error messages from FastAPI response detail
 */
export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    }
    return JSON.stringify(detail);
  }
  return error.message || 'An unexpected network error occurred.';
};

export default axiosClient;
