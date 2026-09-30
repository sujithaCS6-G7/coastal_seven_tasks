import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../api/cartService';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState({ items: [], total_items: 0, total_price: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      toast({
        title: 'Customer Cart Only',
        description: 'Admins manage the catalog and cannot make purchases.',
        variant: 'destructive',
      });
      navigate('/', { replace: true });
      return;
    }
    fetchCart();
  }, [user, navigate]);

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId);
      return;
    }

    setUpdatingId(productId);
    try {
      const updated = await cartService.updateQuantity(productId, newQuantity);
      setCart(updated);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (productId) => {
    setUpdatingId(productId);
    try {
      const updated = await cartService.removeItem(productId);
      setCart(updated);
      toast({
        title: 'Item Removed',
        description: 'Item removed from your cart.',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Removal Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to empty your cart?')) return;
    try {
      await cartService.clearCart();
      setCart({ items: [], total_items: 0, total_price: 0 });
      toast({
        title: 'Cart Emptied',
        description: 'All items have been cleared from your cart.',
        variant: 'default',
      });
    } catch (err) {
      toast({
        title: 'Clear Cart Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving your Redis shopping cart..." />;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-destructive">Cart Error</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
        <Button onClick={fetchCart} variant="outline" size="sm">
          Retry Fetching
        </Button>
      </div>
    );
  }

  const isEmpty = !cart.items || cart.items.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShoppingCart className="h-7 w-7 text-primary" />
            <span>Shopping Cart</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Redis-backed cart session with fast in-memory persistence
          </p>
        </div>

        {!isEmpty && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCart}
            className="btn btn-danger self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Clear Cart
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent className="space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto text-2xl">
              🛒
            </div>
            <CardTitle className="text-xl">Your cart is empty</CardTitle>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Looks like you haven't added any products to your shopping cart yet.
            </p>
            <Link to="/">
              <Button className="mt-2">
                <ShoppingBag className="h-4 w-4 mr-2" /> Explore Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items Table */}
          <div className="lg:col-span-2 space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Price</TableHead>
                  <TableHead className="text-center font-semibold">Quantity</TableHead>
                  <TableHead className="font-semibold">Subtotal</TableHead>
                  <TableHead className="text-right font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-semibold">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      ${Number(item.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center rounded-md border border-input p-0.5 shadow-sm">
                        <button
                          type="button"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                          disabled={updatingId === item.product_id}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                          disabled={updatingId === item.product_id}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.product_id)}
                        disabled={updatingId === item.product_id}
                        className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cart Summary Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-sm">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Units:</span>
                  <span className="font-semibold text-foreground">{cart.total_items} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Shipping:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="text-base font-bold text-foreground">Subtotal:</span>
                  <span className="text-2xl font-extrabold text-primary">
                    ${Number(cart.total_price).toFixed(2)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  className="w-full font-semibold py-6 text-sm"
                  onClick={() => navigate('/checkout')}
                >
                  Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
