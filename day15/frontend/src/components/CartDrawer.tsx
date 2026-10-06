import React from 'react';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Package,
} from 'lucide-react';
import type { CartItem } from '../types/api';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartCount,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCheckoutModalOpen,
  } = useCart();

  if (!isCartOpen) return null;

  const items: CartItem[] = cart.items || [];
  const subtotal: number = Number(cart.total_price || 0);
  const freeShippingThreshold = 50.0;
  const isFreeShipping = subtotal >= freeShippingThreshold || subtotal === 0;
  const shippingFee = isFreeShipping ? 0 : 5.0;
  const grandTotal = subtotal + shippingFee;

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    setCheckoutModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag Drawer"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Shopping Bag</h2>
            <Badge variant="secondary" className="text-xs">
              {cartCount} items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors mr-2"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-3 bg-primary/5 border-b border-border/60 text-xs">
          {subtotal >= freeShippingThreshold ? (
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <Truck className="h-4 w-4" /> You unlocked FREE Express Delivery!
            </p>
          ) : (
            <p className="text-muted-foreground flex items-center gap-1">
              Add{' '}
              <strong className="text-foreground font-mono">
                ${(freeShippingThreshold - subtotal).toFixed(2)}
              </strong>{' '}
              more to get FREE shipping!
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="h-8 w-8 stroke-[1.2]" />
              </div>
              <h3 className="text-base font-bold text-foreground">Your Bag is Empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Looks like you haven&apos;t added anything yet. Explore our live catalog to discover items!
              </p>
              <Button size="sm" className="text-xs mt-2" onClick={() => setIsCartOpen(false)}>
                Start Shopping
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors"
              >
                <div className="h-14 w-14 shrink-0 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center p-1 overflow-hidden">
                  <Package className="h-6 w-6 text-muted-foreground/50" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ${Number(item.price).toFixed(2)} each
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center rounded-md border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span
                        data-testid={`cart-qty-${item.product_id}`}
                        className="px-2 text-xs font-bold text-foreground font-mono"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                      title="Remove product"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-foreground">
                    ${Number(item.subtotal).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/20 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping:</span>
                <span className="font-mono font-medium text-foreground">
                  {isFreeShipping ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/50">
                <span>Grand Total:</span>
                <span className="font-mono text-base text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full text-xs font-semibold py-5 gap-2 shadow-md"
              onClick={handleCheckoutClick}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>SSL Encrypted Checkout &bull; 30-Day Money Back Guarantee</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
