import apiClient from './axiosClient';

/**
 * Shopping Cart and Checkout API Service connecting to FastAPI Redis Cart and PostgreSQL Orders.
 */
export const cartService = {
  /**
   * Get user's current shopping cart from Redis.
   */
  async getCart() {
    const response = await apiClient.get('/cart/');
    return response.data; // { user_id, items, total_price, total_items }
  },

  /**
   * Add a product to the user's Redis cart.
   */
  async addToCart(productId, quantity = 1) {
    const response = await apiClient.post('/cart/items', {
      product_id: productId,
      quantity,
    });
    return response.data;
  },

  /**
   * Update quantity of an item in the cart.
   */
  async updateQuantity(productId, quantity) {
    const response = await apiClient.put(`/cart/items/${productId}`, {
      quantity,
    });
    return response.data;
  },

  /**
   * Remove a single item from the cart.
   */
  async removeFromCart(productId) {
    const response = await apiClient.delete(`/cart/items/${productId}`);
    return response.data;
  },

  /**
   * Completely clear the shopping cart.
   */
  async clearCart() {
    const response = await apiClient.delete('/cart/');
    return response.data;
  },

  /**
   * Place an order from the current cart with stock validation and Celery email.
   */
  async checkout(shippingAddress) {
    const response = await apiClient.post('/orders/checkout', {
      shipping_address: shippingAddress,
    });
    return response.data; // Created Order object
  },
};

export default cartService;
