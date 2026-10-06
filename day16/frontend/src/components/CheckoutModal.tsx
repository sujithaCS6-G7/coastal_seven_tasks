import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCheckoutMutation } from '../hooks/useOrders';
import { getErrorMessage } from '../api/axiosClient';
import { Button } from './ui/button';
import { useToast } from './ui/toast';
import {
  X,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  Package,
} from 'lucide-react';

const modalCheckoutSchema = z.object({
  shippingAddress: z
    .string()
    .trim()
    .min(10, 'Please provide a complete shipping address (min 10 characters).'),
  paymentMethod: z.enum(['cod', 'card', 'upi']),
});

type ModalCheckoutFormValues = z.infer<typeof modalCheckoutSchema>;

export const CheckoutModal: React.FC = () => {
  const {
    cart,
    checkoutModalOpen,
    setCheckoutModalOpen,
    setOrderSuccessModalOpen,
  } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const checkoutMutation = useCheckoutMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ModalCheckoutFormValues>({
    resolver: zodResolver(modalCheckoutSchema),
    defaultValues: {
      shippingAddress: 'Plot 42, Silicon Valley Colony, Madhapur, Hyderabad, TS, 500081',
      paymentMethod: 'cod',
    },
  });

  if (!checkoutModalOpen) return null;

  const paymentMethod = watch('paymentMethod');
  const items = cart.items || [];
  const subtotal = Number(cart.total_price || 0);
  const isFreeShipping = subtotal >= 50.0 || subtotal === 0;
  const shippingFee = isFreeShipping ? 0 : 5.0;
  const grandTotal = subtotal + shippingFee;

  const onSubmit = async (data: ModalCheckoutFormValues) => {
    setError(null);
    try {
      await checkoutMutation.mutateAsync(data.shippingAddress);
      setCheckoutModalOpen(false);
      setOrderSuccessModalOpen(true);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({
        title: 'Checkout Failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Your Order"
      >
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                {error}
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/15 p-3.5 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Order Summary ({items.length}{' '}
                  items)
                </span>
                <span className="text-foreground font-bold font-mono">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto divide-y divide-border/50 pr-1">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="py-1.5 flex items-center justify-between text-xs"
                  >
                    <span className="text-foreground truncate max-w-[230px]">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      ${Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="shipping-address"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery Address
              </label>
              <textarea
                id="shipping-address"
                rows={3}
                placeholder="Enter your full street address, city, state, and postal code..."
                {...register('shippingAddress')}
                disabled={isSubmitting || checkoutMutation.isPending}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {errors.shippingAddress && (
                <p role="alert" className="text-xs text-destructive font-medium">
                  {errors.shippingAddress.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cod', label: 'Cash on Delivery' },
                  { id: 'upi', label: 'Instant UPI' },
                  { id: 'card', label: 'Card' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setValue('paymentMethod', opt.id as 'cod' | 'card' | 'upi', {
                        shouldValidate: true,
                      })
                    }
                    className={`rounded-lg border p-2.5 text-xs font-medium text-center transition-all ${
                      paymentMethod === opt.id
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCheckoutModalOpen(false)}
              disabled={isSubmitting || checkoutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || checkoutMutation.isPending}
              loading={isSubmitting || checkoutMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Place Order (${grandTotal.toFixed(2)})</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
