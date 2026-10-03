import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import {
  X,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Loader2,
  Package,
} from 'lucide-react';

export const CheckoutModal = () => {
  const queryClient = useQueryClient();
  const {
    cart,
    checkoutModalOpen,
    setCheckoutModalOpen,
    setOrderSuccessModalOpen,
    setLatestOrder,
    fetchCart,
  } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [shippingAddress, setShippingAddress] = useState(
    'Plot 42, Silicon Valley Colony, Madhapur, Hyderabad, TS, 500081'
  );
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!checkoutModalOpen) return null;

  const items = cart.items || [];
  const subtotal = Number(cart.total_price || 0);
  const isFreeShipping = subtotal >= 50.0 || subtotal === 0;
  const shippingFee = isFreeShipping ? 0 : 5.0;
  const grandTotal = subtotal + shippingFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!shippingAddress.trim() || shippingAddress.trim().length < 5) {
      setError('Please provide a complete shipping address (min 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Send checkout request to backend /orders/checkout
      const order = await cartService.checkout(shippingAddress.trim());

      // 2. Set latest order in Zustand store
      setLatestOrder(order);

      // 3. Close checkout modal & refresh cart
      setCheckoutModalOpen(false);
      await fetchCart();

      // 4. Invalidate TanStack Query caches so stock & admin orders update immediately
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });

      // 5. Open the celebration POPUP!
      setOrderSuccessModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err));
      toast({
        title: 'Checkout Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Confirm Your Order</h2>
              <p className="text-xs text-muted-foreground">
                Shipping to: <strong>{user?.username}</strong> ({user?.email})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCheckoutModalOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handlePlaceOrder}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {/* Shipping Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Shipping Address *
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={2}
                placeholder="Enter complete house number, street, city, state, and pin code..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
                    paymentMethod === 'cod'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>Cash on Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
                    paymentMethod === 'upi'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>UPI / Card (Prepaid)</span>
                </button>
              </div>
            </div>

            {/* Items Summary Accordion */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Order Items ({items.length})
                </span>
                <span>Subtotal: ${subtotal.toFixed(2)}</span>
              </span>

              <div className="max-h-32 overflow-y-auto divide-y divide-border/60 text-xs">
                {items.map((item) => (
                  <div key={item.product_id} className="py-1.5 flex justify-between items-center">
                    <span className="truncate max-w-[240px] text-foreground">
                      {item.quantity} &times; {item.name}
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      ${Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Totals Box */}
            <div className="p-3 rounded-lg bg-card border border-border space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-mono text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Express Shipping:</span>
                <span className="font-mono text-foreground">
                  {isFreeShipping ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-foreground pt-1.5 border-t border-border">
                <span>Amount Due:</span>
                <span className="font-mono text-primary text-base">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCheckoutModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || items.length === 0}
              className="gap-2 font-semibold shadow-md px-5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirm &amp; Place Order</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
