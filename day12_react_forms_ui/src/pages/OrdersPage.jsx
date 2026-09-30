import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Package, RefreshCw, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      toast({
        title: 'Customer Orders Only',
        description: 'Admins manage the catalog and do not place personal purchase orders.',
        variant: 'destructive',
      });
      navigate('/', { replace: true });
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getMyOrders();
      setOrders(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'CONFIRMED':
        return <Badge variant="success">Status: {status}</Badge>;
      case 'SHIPPED':
        return <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">Status: {status}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Status: {status}</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">Status: {status}</Badge>;
      default:
        return <Badge variant="secondary">Status: {status || 'PENDING'}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching order history from PostgreSQL backend..." />;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-destructive">Could Not Load Orders</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          Retry Fetching
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="h-7 w-7 text-primary" />
            <span>My Orders</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Persisted purchase records tracked in PostgreSQL database (day10_db)
          </p>
        </div>

        <Button
          onClick={fetchOrders}
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent className="space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto text-2xl">
              📦
            </div>
            <CardTitle className="text-xl">No orders placed yet</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              When you purchase products from the catalog, your order records and Celery status updates will show up here.
            </CardDescription>
            <Link to="/">
              <Button className="mt-2">
                <ShoppingBag className="h-4 w-4 mr-2" /> Start Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* shadcn/ui Table for Order History */
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Order Number</TableHead>
                <TableHead className="font-semibold">Date Placed</TableHead>
                <TableHead className="font-semibold">Items Count</TableHead>
                <TableHead className="font-semibold">Total Amount</TableHead>
                <TableHead className="font-semibold">Fulfillment Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <TableRow key={order.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-bold font-mono text-foreground">
                      #{order.order_number}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {dateStr}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium text-foreground">{order.items?.length || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">items</span>
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(order.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="btn btn-secondary inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 hover:underline px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <span>View Order Details</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
