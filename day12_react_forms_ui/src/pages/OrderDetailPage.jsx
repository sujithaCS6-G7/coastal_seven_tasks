import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { orderService } from '../api/orderService';
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
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, CheckCircle2, Shield, Settings, AlertCircle } from 'lucide-react';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isJustPlaced = Boolean(location.state?.justPlaced);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getOrderById(orderId);
      setOrder(data);
      setSelectedStatus(data.status);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === order.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await orderService.updateOrderStatus(orderId, selectedStatus);
      setOrder(updated);
      const msg = `✓ Order #${orderId} status updated to ${selectedStatus}!`;
      setStatusSuccess(msg);
      toast({
        title: 'Status Updated',
        description: `Order #${orderId} fulfillment status is now ${selectedStatus}.`,
        variant: 'success',
      });
      setTimeout(() => setStatusSuccess(null), 3000);
    } catch (err) {
      toast({
        title: 'Status Update Failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'CONFIRMED':
        return <Badge variant="success" className="status-badge">Status: {status}</Badge>;
      case 'SHIPPED':
        return <Badge variant="default" className="status-badge bg-indigo-600">Status: {status}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="status-badge">Status: {status}</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning" className="status-badge">Status: {status}</Badge>;
      default:
        return <Badge variant="secondary" className="status-badge">Status: {status || 'PENDING'}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving order details..." />;
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-destructive">Order Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error || 'Unable to find this order.'}</p>
        <Link to="/orders">
          <Button variant="outline" size="sm">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 transition-colors">
      <Link
        to="/orders"
        className="nav-link inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to All Orders
      </Link>

      {/* Success banner if redirected immediately from checkout */}
      {isJustPlaced && (
        <div className="form-success mb-6 rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/60 p-4 text-center text-sm font-medium text-emerald-900 dark:text-emerald-100 shadow-sm animate-in fade-in-0 duration-200">
          🎉 <strong>Order Placed Successfully!</strong> Celery has queued your confirmation email and inventory has been deducted atomically.
        </div>
      )}

      {/* Order Header Card */}
      <Card className="mb-8">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold font-mono">
              Order #{order.order_number}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div>{getStatusBadge(order.status)}</div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Shipping Address
              </h3>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {order.shipping_address}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Summary
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">Total Billed:</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ${Number(order.total_amount).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Paid & Confirmed
              </p>
            </div>
          </div>

          {/* Admin Order Lifecycle Management Panel */}
          {isAdmin && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold text-sm">
                <Settings className="h-4 w-4" />
                <span>Admin Order Lifecycle Management</span>
              </div>

              {statusSuccess && (
                <div className="form-success rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 p-2 text-xs font-medium text-emerald-900 dark:text-emerald-100">
                  {statusSuccess}
                </div>
              )}

              <form onSubmit={handleStatusUpdate} className="flex flex-wrap items-center gap-3">
                <label htmlFor="order-status-select" className="text-xs font-medium text-foreground">
                  Change Lifecycle Status:
                </label>
                <select
                  id="order-status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="form-input flex h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingStatus || selectedStatus === order.status}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-medium"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ordered Items Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Items Purchased</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Product Name</TableHead>
              <TableHead className="font-semibold">Unit Price</TableHead>
              <TableHead className="text-center font-semibold">Quantity</TableHead>
              <TableHead className="text-right font-semibold">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-foreground">{item.product_name}</TableCell>
                <TableCell className="text-muted-foreground">${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right font-bold text-foreground">
                  ${Number(item.total_price).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrderDetailPage;
