import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';

/**
 * Day 17: Typed Axios Client with Environment-Configured Base URL & JWT Interceptors
 */
const BASE_URL: string = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 429) {
      console.error(
        '[SlowAPI 429 Too Many Requests]',
        error.response.status,
        error.response.data
      );
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

interface FastAPIValidationErrorItem {
  msg?: string;
}

interface FastAPIErrorDetail {
  detail?: string | FastAPIValidationErrorItem[];
}

export const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred.';
  if (axios.isAxiosError<FastAPIErrorDetail>(error)) {
    const detail = error.response?.data?.detail;
    if (detail) {
      if (Array.isArray(detail)) {
        return detail.map((err) => err.msg || JSON.stringify(err)).join(', ');
      }
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    }
    return error.message || 'Network connection error.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export default apiClient;
