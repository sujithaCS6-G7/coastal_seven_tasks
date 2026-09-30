/**
 * Shopping Cart API Service connecting to FastAPI /cart endpoints (Redis-backed).
 */
import axiosClient from './axiosClient';

export const cartService = {
  /**
   * Fetch current user's shopping cart
   * GET /cart/
   */
  async getCart() {
    const response = await axiosClient.get('/cart/');
    return response.data; // { user_id, items: [...], total_items, total_price }
  },

  /**
   * Add a product to the cart with quantity
   * POST /cart/items
   */
  async addToCart(productId, quantity = 1) {
    const response = await axiosClient.post('/cart/items', {
      product_id: Number(productId),
      quantity: Number(quantity),
    });
    return response.data;
  },

  /**
   * Update quantity of an item in the cart
   * PUT /cart/items/{product_id}
   */
  async updateQuantity(productId, quantity) {
    const response = await axiosClient.put(`/cart/items/${productId}`, {
      quantity: Number(quantity),
    });
    return response.data;
  },

  /**
   * Remove a single item from the cart
   * DELETE /cart/items/{product_id}
   */
  async removeItem(productId) {
    const response = await axiosClient.delete(`/cart/items/${productId}`);
    return response.data;
  },

  /**
   * Empty the entire shopping cart
   * DELETE /cart/
   */
  async clearCart() {
    await axiosClient.delete('/cart/');
  },
};
