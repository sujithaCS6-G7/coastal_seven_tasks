import apiClient from './axiosClient';
import type {
  AdminOrderOut,
  OrderCreatePayload,
  OrderOut,
  OrderStatus,
  OrderStatusUpdatePayload,
} from '../types/api';

/**
 * Day 16: Typed Order & Checkout API Service connecting to FastAPI /orders endpoints:
 * - POST /orders/checkout
 * - GET /orders/
 * - GET /orders/{order_id}
 * - GET /orders/admin/all
 * - PUT /orders/{order_id}/status
 */
export const orderService = {
  async checkout(shippingAddress: string): Promise<OrderOut> {
    const payload: OrderCreatePayload = {
      shipping_address: shippingAddress,
    };
    const response = await apiClient.post<OrderOut>('/orders/checkout', payload);
    return response.data;
  },

  async getMyOrders(): Promise<OrderOut[]> {
    const response = await apiClient.get<OrderOut[]>('/orders/');
    return response.data;
  },

  async getOrderById(orderId: number): Promise<OrderOut> {
    const response = await apiClient.get<OrderOut>(`/orders/${orderId}`);
    return response.data;
  },

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
