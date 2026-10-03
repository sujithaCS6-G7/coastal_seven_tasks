import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [cart, setCart] = useState({ items: [], total_price: 0, total_items: 0 });
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [orderSuccessModalOpen, setOrderSuccessModalOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState(null);

  // Fetch cart whenever user authenticates or role changes
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      fetchCart();
    } else {
      setCart({ items: [], total_price: 0, total_items: 0 });
    }
  }, [isAuthenticated, user]);

  const fetchCart = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await cartService.getCart();
      setCart(data || { items: [], total_price: 0, total_items: 0 });
    } catch (err) {
      console.warn('Could not fetch cart:', err);
    }
  };

  const addToCart = async (product, quantity = 1) => {
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
        description: 'Administrators manage the catalog and orders. Sign in as a customer to purchase items.',
        variant: 'info',
      });
      return false;
    }

    setLoading(true);
    try {
      const updatedCart = await cartService.addToCart(product.id, quantity);
      setCart(updatedCart);
      toast({
        title: 'Added to Cart',
        description: `"${product.name}" (Qty: ${quantity}) has been added to your shopping cart.`,
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
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    setLoading(true);
    try {
      const updatedCart = await cartService.updateQuantity(productId, quantity);
      setCart(updatedCart);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    setLoading(true);
    try {
      const updatedCart = await cartService.removeFromCart(productId);
      setCart(updatedCart);
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
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setCart({ items: [], total_price: 0, total_items: 0 });
    } catch (err) {
      console.warn('Clear cart failed:', err);
    }
  };

  const buyNow = async (product, quantity = 1) => {
    const success = await addToCart(product, quantity);
    if (success) {
      setIsCartOpen(false);
      setCheckoutModalOpen(true);
    }
  };

  const cartCount = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
