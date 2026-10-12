import { create } from 'zustand';
import { cartService } from '../api/cartService';
import type { CartOut, OrderOut, Product } from '../types/api';

/**
 * Day 15: Typed Zustand Global Shopping Cart Store with Optimistic Updates
 */
export interface CartState {
  cart: CartOut;
  loading: boolean;
  isCartOpen: boolean;
  checkoutModalOpen: boolean;
  orderSuccessModalOpen: boolean;
  latestOrder: OrderOut | null;
  setIsCartOpen: (open: boolean) => void;
  setCheckoutModalOpen: (open: boolean) => void;
  setOrderSuccessModalOpen: (open: boolean) => void;
  setLatestOrder: (order: OrderOut | null) => void;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  buyNow: (product: Product, quantity?: number) => Promise<void>;
}

const EMPTY_CART: CartOut = { items: [], total_price: 0, total_items: 0 };

export const useCartStore = create<CartState>((set, get) => ({
  cart: EMPTY_CART,
  loading: false,
  isCartOpen: false,
  checkoutModalOpen: false,
  orderSuccessModalOpen: false,
  latestOrder: null,

  setIsCartOpen: (open: boolean) => set({ isCartOpen: open }),
  setCheckoutModalOpen: (open: boolean) => set({ checkoutModalOpen: open }),
  setOrderSuccessModalOpen: (open: boolean) => set({ orderSuccessModalOpen: open }),
  setLatestOrder: (order: OrderOut | null) =>
    set({ latestOrder: order, orderSuccessModalOpen: Boolean(order) }),

  fetchCart: async () => {
    try {
      const data = await cartService.getCart();
      set({ cart: data || EMPTY_CART });
    } catch {
      // Ignore unauthenticated cart fetch
    }
  },

  addToCart: async (product: Product, quantity: number = 1) => {
    set({ loading: true });
    try {
      const updated = await cartService.addToCart(product.id, quantity);
      set({ cart: updated, loading: false });
      return true;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  updateQuantity: async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      return get().removeFromCart(productId);
    }

    const previousCart = get().cart;
    const optimisticItems = (previousCart.items || []).map((item) => {
      if (item.product_id === productId) {
        return { ...item, quantity, subtotal: item.price * quantity };
      }
      return item;
    });
    const optimisticTotal = optimisticItems.reduce(
      (acc, item) => acc + (item.subtotal || item.price * item.quantity),
      0
    );
    const optimisticCount = optimisticItems.reduce((acc, item) => acc + item.quantity, 0);

    set({
      cart: {
        items: optimisticItems,
        total_price: optimisticTotal,
        total_items: optimisticCount,
      },
    });

    try {
      const updated = await cartService.updateQuantity(productId, quantity);
      set({ cart: updated });
    } catch (err) {
      set({ cart: previousCart });
      throw err;
    }
  },

  removeFromCart: async (productId: number) => {
    const previousCart = get().cart;
    const optimisticItems = (previousCart.items || []).filter(
      (item) => item.product_id !== productId
    );
    const optimisticTotal = optimisticItems.reduce(
      (acc, item) => acc + (item.subtotal || item.price * item.quantity),
      0
    );
    const optimisticCount = optimisticItems.reduce((acc, item) => acc + item.quantity, 0);

    set({
      cart: {
        items: optimisticItems,
        total_price: optimisticTotal,
        total_items: optimisticCount,
      },
    });

    try {
      const updated = await cartService.removeFromCart(productId);
      set({ cart: updated });
    } catch (err) {
      set({ cart: previousCart });
      throw err;
    }
  },

  clearCart: async () => {
    const previousCart = get().cart;
    set({ cart: EMPTY_CART });
    try {
      await cartService.clearCart();
    } catch (err) {
      set({ cart: previousCart });
      throw err;
    }
  },

  buyNow: async (product: Product, quantity: number = 1) => {
    await get().addToCart(product, quantity);
    set({ isCartOpen: false, checkoutModalOpen: true });
  },
}));

export default useCartStore;
