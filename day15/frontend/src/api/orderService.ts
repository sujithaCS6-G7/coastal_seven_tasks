import apiClient from './axiosClient';
import type { AdminOrderOut, OrderOut, OrderStatus, OrderStatusUpdatePayload } from '../types/api';

/**
 * Day 15: Typed Order API Service connecting to FastAPI /orders endpoints.
 */
export const orderService = {
  async getAllOrders(): Promise<AdminOrderOut[]> {
    const response = await apiClient.get<AdminOrderOut[]>('/orders/admin/all');
    return response.data;
  },

  async updateOrderStatus(orderId: number, status: OrderStatus | string): Promise<OrderOut> {
    const payload: OrderStatusUpdatePayload = { status };
    const response = await apiClient.put<OrderOut>(`/orders/${orderId}/status`, payload);
    return response.data;
  },
};

export default orderService;
