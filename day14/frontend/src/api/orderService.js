import apiClient from './axiosClient';

/**
 * Order API service for retrieving customer orders and updating fulfillment status.
 */
export const orderService = {
  /**
   * Fetch all customer orders across the platform (Admin only).
   */
  async getAllOrders() {
    const response = await apiClient.get('/orders/admin/all');
    return response.data;
  },

  /**
   * Update lifecycle status of an order (Admin only).
   * Status options: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
   */
  async updateOrderStatus(orderId, status) {
    const response = await apiClient.put(`/orders/${orderId}/status`, { status });
    return response.data;
  },
};

export default orderService;
