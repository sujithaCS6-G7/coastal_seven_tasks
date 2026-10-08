import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCheckoutMutation } from '../hooks/useOrders';
import { getErrorMessage } from '../api/axiosClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import {
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Package,
  Sparkles,
} from 'lucide-react';
import type { OrderOut } from '../types/api';

/**
 * Day 16 Requirement 2: Zod Validation Schema for Checkout Form
 */
export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters'),
  streetAddress: z
    .string()
    .trim()
    .min(10, 'Shipping address must be at least 10 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City name must be at least 2 characters'),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9]{5,6}$/, 'Postal code must be a valid 5 or 6 digit code'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, 'Phone number must be 10 to 15 digits'),
  paymentMethod: z.enum(['cod', 'card', 'upi']),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const checkoutMutation = useCheckoutMutation();

  const [serverError, setServerError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderOut | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.username || '',
      streetAddress: '',
      city: '',
      postalCode: '',
      phone: '',
      paymentMethod: 'cod',
    },
  });

  const selectedPayment = watch('paymentMethod');
  const items = cart.items || [];
  const subtotal = Number(cart.total_price || 0);
  const isFreeShipping = subtotal >= 50.0 || subtotal === 0;
  const shippingFee = isFreeShipping ? 0 : 5.0;
  const grandTotal = subtotal + shippingFee;

  const handleFillDemoAddress = () => {
    setValue('fullName', user?.username || 'Alice Customer', { shouldValidate: true });
    setValue('streetAddress', 'Plot 42, Hi-Tech City Main Road, Madhapur', { shouldValidate: true });
    setValue('city', 'Hyderabad', { shouldValidate: true });
    setValue('postalCode', '500081', { shouldValidate: true });
    setValue('phone', '9876543210', { shouldValidate: true });
    setValue('paymentMethod', 'cod', { shouldValidate: true });
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    if (items.length === 0) {
      setServerError('Your shopping cart is empty. Please add items before checking out.');
      return;
    }

    setServerError(null);
    const formattedShippingAddress = `${data.fullName}, ${data.streetAddress}, ${data.city} - ${data.postalCode} (Phone: ${data.phone}, Payment: ${data.paymentMethod.toUpperCase()})`;

    try {
      const order = await checkoutMutation.mutateAsync(formattedShippingAddress);
      setCompletedOrder(order);
      toast({
        title: 'Order Placed Successfully!',
        description: `Order #${order.order_number || order.id} has been confirmed.`,
        variant: 'success',
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      setServerError(msg);
      toast({
        title: 'Checkout Failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 transition-colors">
        <Card className="border border-emerald-500/30 shadow-lg">
          <CardHeader className="text-center pb-6 border-b border-border bg-emerald-500/5">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-foreground">
              Order Confirmed!
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Order Reference:{' '}
              <strong className="text-foreground font-mono">
                {completedOrder.order_number || `#${completedOrder.id}`}
              </strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Status:</span>
                <Badge variant="success">{completedOrder.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-bold text-foreground font-mono">
                  ${Number(completedOrder.total_amount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Shipping To:</span>
                <p className="font-medium text-foreground">{completedOrder.shipping_address}</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-3 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Continue Shopping
            </Button>
            <Button size="sm" onClick={() => navigate('/orders')}>
              View Order History
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Secure Checkout
            </h1>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              React Hook Form + Zod
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete your shipping details to place your order with FastAPI atomic stock validation
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Catalog
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border border-border text-center py-12">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Your cart is empty</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Add products from the catalog before proceeding to checkout.
            </p>
            <Button size="sm" onClick={() => navigate('/')}>
              Browse Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: react-hook-form + Zod Validated Form */}
          <div className="lg:col-span-7">
            <Card className="border border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Shipping &amp; Payment Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    All fields are validated using Zod schema rules
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemoAddress}
                  className="text-xs h-8 gap-1"
                >
                  <Sparkles className="h-3 w-3 text-primary" /> Auto-Fill Demo Address
                </Button>
              </CardHeader>

              <CardContent className="pt-6">
                {serverError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                <form
                  id="checkout-form"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-fullName" className="text-xs font-semibold text-foreground">
                      Recipient Full Name
                    </label>
                    <Input
                      id="checkout-fullName"
                      placeholder="Enter recipient full name"
                      {...register('fullName')}
                      className="text-xs"
                    />
                    {errors.fullName && (
                      <p role="alert" className="text-xs text-destructive font-medium">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="checkout-streetAddress"
                      className="text-xs font-semibold text-foreground"
                    >
                      Street Address
                    </label>
                    <Input
                      id="checkout-streetAddress"
                      placeholder="House/Flat No., Building, Street, Area"
                      {...register('streetAddress')}
                      className="text-xs"
                    />
                    {errors.streetAddress && (
                      <p role="alert" className="text-xs text-destructive font-medium">
                        {errors.streetAddress.message}
                      </p>
                    )}
                  </div>

                  {/* City & Postal Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="checkout-city" className="text-xs font-semibold text-foreground">
                        City
                      </label>
                      <Input
                        id="checkout-city"
                        placeholder="e.g. Hyderabad"
                        {...register('city')}
                        className="text-xs"
                      />
                      {errors.city && (
                        <p role="alert" className="text-xs text-destructive font-medium">
                          {errors.city.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="checkout-postalCode"
                        className="text-xs font-semibold text-foreground"
                      >
                        Postal / ZIP Code
                      </label>
                      <Input
                        id="checkout-postalCode"
                        placeholder="e.g. 500081"
                        {...register('postalCode')}
                        className="text-xs"
                      />
                      {errors.postalCode && (
                        <p role="alert" className="text-xs text-destructive font-medium">
                          {errors.postalCode.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label htmlFor="checkout-phone" className="text-xs font-semibold text-foreground">
                      Contact Phone Number
                    </label>
                    <Input
                      id="checkout-phone"
                      placeholder="e.g. 9876543210"
                      {...register('phone')}
                      className="text-xs"
                    />
                    {errors.phone && (
                      <p role="alert" className="text-xs text-destructive font-medium">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { id: 'cod', label: 'Cash on Delivery' },
                        { id: 'card', label: 'Credit / Debit Card' },
                        { id: 'upi', label: 'Instant UPI' },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() =>
                            setValue('paymentMethod', method.id as 'cod' | 'card' | 'upi', {
                              shouldValidate: true,
                            })
                          }
                          className={`rounded-lg border p-2.5 text-xs font-semibold transition-all ${
                            selectedPayment === method.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || checkoutMutation.isPending}
                    loading={isSubmitting || checkoutMutation.isPending}
                    className="w-full py-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
                  >
                    Place Order (${grandTotal.toFixed(2)})
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <Card className="border border-border shadow-sm sticky top-20">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Order Summary</span>
                  <Badge variant="secondary">{cart.total_items || items.length} items</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="divide-y divide-border max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {item.quantity} &times; ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-foreground">
                        ${Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isFreeShipping ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border">
                    <span>Grand Total</span>
                    <span className="font-mono">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Protected by FastAPI atomic stock validation &amp; JWT security.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
