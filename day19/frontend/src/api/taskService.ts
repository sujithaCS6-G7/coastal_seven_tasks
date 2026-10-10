import apiClient from './axiosClient';
import { API_BASE_URL } from '../config/env';
import type {
  BackgroundTaskResponse,
  CsvImportTaskResult,
  N1OptimizationBenchmark,
  PdfInvoiceTaskResult,
} from '../types/api';

/**
 * Day 18: Typed API Service for Celery Background Tasks (PDF Invoice Generation, Bulk CSV Import,
 * Task Status Polling) and SQLAlchemy N+1 Query Optimization Benchmarking.
 */
export const taskService = {
  async startInvoiceGeneration(
    orderId: number
  ): Promise<BackgroundTaskResponse<PdfInvoiceTaskResult>> {
    const response = await apiClient.post<BackgroundTaskResponse<PdfInvoiceTaskResult>>(
      `/tasks/invoices/${orderId}`
    );
    return response.data;
  },

  getInvoiceDownloadUrl(orderId: number): string {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/tasks/invoices/${orderId}/download${query}`;
  },


  async startCsvImport(file: File): Promise<BackgroundTaskResponse<CsvImportTaskResult>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<BackgroundTaskResponse<CsvImportTaskResult>>(
      '/tasks/csv-import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getTaskStatus<TResult = unknown>(
    taskId: string
  ): Promise<BackgroundTaskResponse<TResult>> {
    const response = await apiClient.get<BackgroundTaskResponse<TResult>>(`/tasks/${taskId}`);
    return response.data;
  },

  async getCsvTemplate(): Promise<string> {
    const response = await apiClient.get<string>('/tasks/csv-template', {
      responseType: 'text',
    });
    return response.data;
  },

  async getN1Benchmark(): Promise<N1OptimizationBenchmark> {
    const response = await apiClient.get<N1OptimizationBenchmark>('/orders/admin/n1-benchmark');
    return response.data;
  },

  async getDemoOrders(): Promise<
    Array<{
      id: number;
      order_number: string;
      status: string;
      total_amount: number;
      shipping_address: string;
      created_at: string | null;
      customer: string;
      items_count: number;
    }>
  > {
    const response = await apiClient.get('/tasks/demo-orders');
    return response.data;
  },
};

export default taskService;
