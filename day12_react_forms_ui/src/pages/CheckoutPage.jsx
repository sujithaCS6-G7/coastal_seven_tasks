import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { orderService } from '../api/orderService';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useToast } from '../components/ui/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { ArrowLeft, ShieldCheck, Truck, CreditCard, AlertCircle } from 'lucide-react';

const checkoutSchema = z.object({
  address: z
    .string()
    .min(10, { message: 'Shipping address must be at least 10 characters for delivery.' })
    .max(500, { message: 'Address is too long.' }),
});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      address: '104 Beach Road, MVP Colony, Visakhapatnam, AP, 530017',
    },
  });

  useEffect(() => {
    const loadCart = async () => {
      try {
        const data = await cartService.getCart();
        setCart(data);
        if (!data.items || data.items.length === 0) {
          navigate('/cart');
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [navigate]);

  const onConfirmOrder = async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      // Calls FastAPI POST /orders/checkout
      const order = await orderService.checkout(values.address.trim());
      toast({
        title: 'Order Placed!',
        description: `Order #${order.order_number} confirmed. Celery queued notification.`,
        variant: 'success',
      });
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast({
        title: 'Checkout Failed',
        description: msg,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Validating cart items for checkout..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 transition-colors">
      <Link
        to="/cart"
        className="nav-link inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Shopping Cart
      </Link>

      <div className="pb-6 border-b border-border mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Truck className="h-7 w-7 text-primary" />
          <span>Checkout & Secure Payment</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atomic PostgreSQL inventory deduction with Celery background notification
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="form-error mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Shipping Form Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="checkout-form" onSubmit={handleSubmit(onConfirmOrder)} className="space-y-4">
              <div>
                <Label htmlFor="address" className="text-sm font-semibold">
                  Full Street & Delivery Address <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="address"
                  rows={4}
                  placeholder="Enter house/flat number, street, city, state, postal code..."
                  {...register('address')}
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                  className="form-textarea mt-1.5 flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive"
                />
                {errors.address && (
                  <p id="address-error" role="alert" className="text-xs font-medium text-destructive mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Payment Gateway: Mock Instant Gateway (Dev Mode)</span>
                </div>
                <p className="text-muted-foreground">
                  Upon submission, your cart items will be atomically verified against stock and converted to an immutable order.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                loading={submitting}
                className="w-full text-base font-semibold py-6 shadow-md bg-emerald-600 hover:bg-emerald-700 mt-4"
              >
                <ShieldCheck className="h-5 w-5 mr-2" />
                {submitting ? 'Processing Transaction...' : 'Confirm Order & Pay'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Summary Sidebar */}
        <Card className="lg:col-span-2 h-fit">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base">Order Review</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart?.items?.map((item) => (
                <div key={item.product_id} className="flex justify-between items-start text-xs border-b border-border/50 pb-2">
                  <div>
                    <p className="font-semibold text-foreground line-clamp-1">{item.name}</p>
                    <p className="text-muted-foreground">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-foreground">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs pt-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Items:</span>
                <span className="font-semibold text-foreground">{cart?.total_items} units</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-baseline">
                <span className="text-sm font-bold text-foreground">Total:</span>
                <span className="text-xl font-extrabold text-primary">
                  ${Number(cart?.total_price || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutPage;
