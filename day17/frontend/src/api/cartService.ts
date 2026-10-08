import apiClient from './axiosClient';
import type {
  CartOut,
  CartItemAddPayload,
  CartItemUpdatePayload,
  OrderOut,
  OrderCreatePayload,
} from '../types/api';

/**
 * Day 15: Typed Shopping Cart & Checkout API Service
 */
export const cartService = {
  async getCart(): Promise<CartOut> {
    const response = await apiClient.get<CartOut>('/cart/');
    return response.data;
  },

  async addToCart(productId: number, quantity: number = 1): Promise<CartOut> {
    const payload: CartItemAddPayload = {
      product_id: productId,
      quantity,
    };
    const response = await apiClient.post<CartOut>('/cart/items', payload);
    return response.data;
  },

  async updateQuantity(productId: number, quantity: number): Promise<CartOut> {
    const payload: CartItemUpdatePayload = { quantity };
    const response = await apiClient.put<CartOut>(`/cart/items/${productId}`, payload);
    return response.data;
  },

  async removeFromCart(productId: number): Promise<CartOut> {
    const response = await apiClient.delete<CartOut>(`/cart/items/${productId}`);
    return response.data;
  },

  async clearCart(): Promise<void> {
    await apiClient.delete('/cart/');
  },

  async checkout(shippingAddress: string): Promise<OrderOut> {
    const payload: OrderCreatePayload = {
      shipping_address: shippingAddress,
    };
    const response = await apiClient.post<OrderOut>('/orders/checkout', payload);
    return response.data;
  },
};

export default cartService;
