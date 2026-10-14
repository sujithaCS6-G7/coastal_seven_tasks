import React, { useEffect, useCallback, ReactNode } from 'react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../api/axiosClient';
import { useToast } from '../components/ui/toast';
import type { CartOut, OrderOut, Product } from '../types/api';

export interface CartProviderProps {
  children: ReactNode;
}

export interface UseCartReturn {
  cart: CartOut;
  cartCount: number;
  loading: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  checkoutModalOpen: boolean;
  setCheckoutModalOpen: (open: boolean) => void;
  orderSuccessModalOpen: boolean;
  setOrderSuccessModalOpen: (open: boolean) => void;
  latestOrder: OrderOut | null;
  setLatestOrder: (order: OrderOut | null) => void;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  buyNow: (product: Product, quantity?: number) => Promise<void>;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    if (token && user && user.role !== 'admin') {
      fetchCart();
    } else {
      useCartStore.setState({ cart: { items: [], total_price: 0, total_items: 0 } });
    }
  }, [token, user, fetchCart]);

  return <>{children}</>;
};

export const useCart = (): UseCartReturn => {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token && user);

  const cart = useCartStore((state) => state.cart);
  const loading = useCartStore((state) => state.loading);
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);
  const checkoutModalOpen = useCartStore((state) => state.checkoutModalOpen);
  const setCheckoutModalOpen = useCartStore((state) => state.setCheckoutModalOpen);
  const orderSuccessModalOpen = useCartStore((state) => state.orderSuccessModalOpen);
  const setOrderSuccessModalOpen = useCartStore((state) => state.setOrderSuccessModalOpen);
  const latestOrder = useCartStore((state) => state.latestOrder);
  const setLatestOrder = useCartStore((state) => state.setLatestOrder);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const storeAddToCart = useCartStore((state) => state.addToCart);
  const storeUpdateQuantity = useCartStore((state) => state.updateQuantity);
  const storeRemoveFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);

  const addToCart = useCallback(
    async (product: Product, quantity: number = 1): Promise<boolean> => {
      if (!isAuthenticated) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to add products to your cart and place orders.',
          variant: 'warning',
        });
        return false;
      }

      if (user?.role === 'admin') {
        toast({
          title: 'Admin Notice',
          description:
            'Administrators manage the catalog and orders. Sign in as a customer to purchase items.',
          variant: 'info',
        });
        return false;
      }

      try {
        await storeAddToCart(product, quantity);
        toast({
          title: 'Added to Cart',
          description: `"${product.name}" (Qty: ${quantity}) added to your shopping bag.`,
          variant: 'success',
        });
        return true;
      } catch (err) {
        toast({
          title: 'Could Not Add to Cart',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
        return false;
      }
    },
    [isAuthenticated, user, storeAddToCart, toast]
  );

  const updateQuantity = useCallback(
    async (productId: number, quantity: number): Promise<void> => {
      try {
        await storeUpdateQuantity(productId, quantity);
      } catch (err) {
        toast({
          title: 'Optimistic Rollback: Update Failed',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
      }
    },
    [storeUpdateQuantity, toast]
  );

  const removeFromCart = useCallback(
    async (productId: number): Promise<void> => {
      try {
        await storeRemoveFromCart(productId);
        toast({
          title: 'Item Removed',
          description: 'Product removed from your shopping bag.',
          variant: 'info',
        });
      } catch (err) {
        toast({
          title: 'Remove Failed',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
      }
    },
    [storeRemoveFromCart, toast]
  );

  const buyNow = useCallback(
    async (product: Product, quantity: number = 1): Promise<void> => {
      const success = await addToCart(product, quantity);
      if (success) {
        setIsCartOpen(false);
        setCheckoutModalOpen(true);
      }
    },
    [addToCart, setIsCartOpen, setCheckoutModalOpen]
  );

  const cartCount = cart?.items
    ? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : 0;

  return {
    cart,
    cartCount,
    loading,
    isCartOpen,
    setIsCartOpen,
    checkoutModalOpen,
    setCheckoutModalOpen,
    orderSuccessModalOpen,
    setOrderSuccessModalOpen,
    latestOrder,
    setLatestOrder,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    buyNow,
  };
};

export default useCartStore;
