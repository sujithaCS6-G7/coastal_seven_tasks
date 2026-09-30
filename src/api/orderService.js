/**
 * Orders & Checkout API Service connecting to FastAPI /orders endpoints.
 */
import axiosClient from './axiosClient';

export const orderService = {
  /**
   * Checkout current shopping cart to place an order
   * POST /orders/checkout
   */
  async checkout(shippingAddress) {
    const response = await axiosClient.post('/orders/checkout', {
      shipping_address: shippingAddress,
    });
    return response.data; // OrderOut
  },

  /**
   * List orders for the authenticated user
   * GET /orders/
   */
  async getMyOrders() {
    const response = await axiosClient.get('/orders/');
    return response.data; // list[OrderOut]
  },

  /**
   * Get single order details by ID
   * GET /orders/{order_id}
   */
  async getOrderById(orderId) {
    const response = await axiosClient.get(`/orders/${orderId}`);
    return response.data; // OrderOut
  },

  /**
   * Update order status (Admin only)
   * PUT /orders/{order_id}/status
   */
  async updateOrderStatus(orderId, status) {
    const response = await axiosClient.put(`/orders/${orderId}/status`, { status });
    return response.data; // OrderOut
  },
};
