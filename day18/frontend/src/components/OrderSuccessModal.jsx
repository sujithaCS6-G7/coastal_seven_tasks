import React from 'react';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Clock,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OrderSuccessModal = () => {
  const { orderSuccessModalOpen, setOrderSuccessModalOpen, latestOrder } = useCart();
  const navigate = useNavigate();

  if (!orderSuccessModalOpen || !latestOrder) return null;

  const handleContinueShopping = () => {
    setOrderSuccessModalOpen(false);
    navigate('/');
  };

  const handleViewProfile = () => {
    setOrderSuccessModalOpen(false);
    navigate('/profile');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Celebration Header Animation */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
          <CheckCircle2 className="h-10 w-10 animate-bounce" />
          <span className="absolute -top-1 -right-1 text-xl">🎉</span>
        </div>

        <Badge variant="outline" className="mb-2 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
          <Sparkles className="h-3 w-3" /> Purchase Confirmed
        </Badge>

        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          Order Placed Successfully!
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Thank you for shopping with Nexora! Your order has been registered in the database.
        </p>

        {/* Order Details Receipt Box */}
        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4 text-left space-y-2.5">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
            <span className="text-muted-foreground">Order Reference:</span>
            <span className="font-mono font-bold text-foreground">
              {latestOrder.order_number}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
            <span className="text-muted-foreground">Total Paid:</span>
            <span className="font-mono font-extrabold text-base text-primary">
              ${Number(latestOrder.total_amount).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pb-2 border-b border-border/60">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Order Status:
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px]">
              {latestOrder.status || 'CONFIRMED'}
            </Badge>
          </div>

          <div className="text-xs">
            <span className="text-muted-foreground flex items-center gap-1 mb-1">
              <Truck className="h-3.5 w-3.5 text-primary" /> Delivery Time:
            </span>
            <p className="font-semibold text-foreground">Estimated in 2-3 Business Days</p>
          </div>

          {latestOrder.shipping_address && (
            <div className="text-xs pt-1">
              <span className="text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Shipping Destination:
              </span>
              <p className="text-[11px] text-foreground/80 line-clamp-2">
                {latestOrder.shipping_address}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button
            variant="outline"
            className="flex-1 text-xs"
            onClick={handleViewProfile}
          >
            My Profile & Security
          </Button>
          <Button
            className="flex-1 text-xs gap-1.5 shadow-md"
            onClick={handleContinueShopping}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
