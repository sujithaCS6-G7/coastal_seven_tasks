import { create } from 'zustand';
import { cartService } from '../api/cartService';

/**
 * Day 14: Zustand Global Shopping Cart Store
 * Implements optimistic cart updates, modal states, and clean global actions.
 */
export const useCartStore = create((set, get) => ({
  cart: { items: [], total_price: 0, total_items: 0 },
  loading: false,
  isCartOpen: false,
  checkoutModalOpen: false,
  orderSuccessModalOpen: false,
  latestOrder: null,

  get cartCount() {
    const items = get().cart?.items || [];
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  },

  setIsCartOpen: (open) => set({ isCartOpen: open }),
  setCheckoutModalOpen: (open) => set({ checkoutModalOpen: open }),
  setOrderSuccessModalOpen: (open) => set({ orderSuccessModalOpen: open }),
  setLatestOrder: (order) => set({ latestOrder: order, orderSuccessModalOpen: true }),

  fetchCart: async () => {
    try {
      const data = await cartService.getCart();
      set({ cart: data || { items: [], total_price: 0, total_items: 0 } });
    } catch (err) {
      console.warn('[Zustand useCartStore] fetchCart warning:', err);
    }
  },

  addToCart: async (product, quantity = 1) => {
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

  updateQuantity: async (productId, quantity) => {
    if (quantity <= 0) {
      return get().removeFromCart(productId);
    }

    // Optimistic local update for instant UI feedback
    const previousCart = get().cart;
    const optimisticItems = (previousCart.items || []).map((item) => {
      if (item.product_id === productId) {
        return { ...item, quantity, subtotal: item.price * quantity };
      }
      return item;
    });
    const optimisticTotal = optimisticItems.reduce((acc, item) => acc + (item.subtotal || item.price * item.quantity), 0);
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
      // Rollback to previous state on server error
      set({ cart: previousCart });
      throw err;
    }
  },

  removeFromCart: async (productId) => {
    // Optimistic local removal
    const previousCart = get().cart;
    const optimisticItems = (previousCart.items || []).filter((item) => item.product_id !== productId);
    const optimisticTotal = optimisticItems.reduce((acc, item) => acc + (item.subtotal || item.price * item.quantity), 0);
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
    set({ cart: { items: [], total_price: 0, total_items: 0 } });
    try {
      await cartService.clearCart();
    } catch (err) {
      set({ cart: previousCart });
      throw err;
    }
  },

  buyNow: async (product, quantity = 1) => {
    await get().addToCart(product, quantity);
    set({ isCartOpen: false, checkoutModalOpen: true });
  },
}));

export default useCartStore;
