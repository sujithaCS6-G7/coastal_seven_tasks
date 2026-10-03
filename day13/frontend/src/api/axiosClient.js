import axios from 'axios';

/**
 * Axios instance preconfigured for FastAPI backend with JWT interceptors.
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Request Interceptor: Automatically attaches the JWT Bearer token to headers.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handles 401 Unauthorized responses globally.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[Axios Interceptor] 401 Unauthorized encountered. Purging expired session.');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Helper to parse backend error details into user-friendly strings.
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
    }
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }
  return error.message || 'Network connection error. Please verify the backend is running.';
};

export default apiClient;
