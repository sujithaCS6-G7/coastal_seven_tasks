import React, { useState, useMemo, useCallback } from 'react';
import { getErrorMessage } from '../api/axiosClient';
import { useAdminOrdersQuery, useUpdateOrderStatusMutation } from '../hooks/useOrders';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  DollarSign,
  RefreshCw,
  Shield,
  Layers,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const AdminOrdersPage = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { toast } = useToast();

  // TanStack Query: Cached Admin Orders with background revalidation
  const {
    data: orders = [],
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch: fetchOrders,
  } = useAdminOrdersQuery('all');

  // TanStack Query: Optimistic Order Status Mutation
  const updateStatusMutation = useUpdateOrderStatusMutation();

  const handleStatusChange = useCallback(
    async (orderId, newStatus) => {
      try {
        await updateStatusMutation.mutateAsync({ orderId, newStatus });
        toast({
          title: 'Optimistic Status Update Confirmed',
          description: `Order #${orderId} updated to ${newStatus} with zero UI lag.`,
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: 'Update Failed (Rolled Back)',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
      }
    },
    [updateStatusMutation, toast]
  );

  // Memoized KPI Metrics
  const metrics = useMemo(() => {
    const totalRev = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const processing = orders.filter((o) =>
      ['CONFIRMED', 'PROCESSING', 'PENDING'].includes(o.status)
    ).length;
    return {
      totalRevenue: totalRev,
      totalOrders: orders.length,
      delivered,
      processing,
    };
  }, [orders]);

  // Memoized Filtered orders
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter((o) => o.status.toUpperCase() === statusFilter);
  }, [orders, statusFilter]);

  const getStatusBadge = (status, isOptimistic) => {
    const label = isOptimistic ? `${status} (Syncing...)` : status;
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">{label}</Badge>;
      case 'SHIPPED':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">{label}</Badge>;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">{label}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge variant="secondary">{label}</Badge>;
    }
  };

  const error = queryError ? getErrorMessage(queryError) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-primary" />
              <span>Customer Orders &amp; Purchases</span>
            </h1>
            <Badge variant="default" className="text-xs bg-indigo-600 text-white gap-1 py-1">
              <Shield className="h-3 w-3" /> Admin Dashboard
            </Badge>
            <Badge variant="outline" className="text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
              <Zap className="h-3 w-3" /> Optimistic Updates Enabled
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by TanStack Query caching, automatic background revalidation, and instant optimistic status mutations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders()}
          className="text-xs self-start sm:self-auto gap-1.5"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Revalidate Orders</span>
        </Button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Total Sales Revenue
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1.5">
            ${metrics.totalRevenue.toFixed(2)}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Across all orders</span>
        </Card>

        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" /> Total Customer Orders
          </span>
          <p className="text-2xl font-extrabold text-foreground mt-1.5">
            {metrics.totalOrders}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Placed on Nexora</span>
        </Card>

        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-500" /> Pending / Processing
          </span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            {metrics.processing}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Awaiting delivery</span>
        </Card>

        <Card className="p-4 border-border bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Fulfilled &amp; Delivered
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {metrics.delivered}
          </p>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Completed shipments</span>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center gap-2 pb-4">
        {['ALL', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {status}
            {status !== 'ALL' && (
              <span className="ml-1.5 opacity-70 text-[10px]">
                ({orders.filter((o) => o.status.toUpperCase() === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Retrieving live customer orders via TanStack Query..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center my-6">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchOrders()} className="mt-4 text-xs">
            Try Again
          </Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center my-6">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Orders Found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No customer orders matched the "{statusFilter}" status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-2">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Top Banner */}
              <div className="bg-muted/30 border-b border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {order.order_number}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status, order._optimistic)}

                  {/* Interactive Optimistic Status Changer */}
                  <select
                    value={order.status.toUpperCase()}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    aria-label={`Change status for order ${order.order_number}`}
                    className="text-xs bg-background border border-border rounded-md px-2 py-1 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        Set: {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Card Body: Customer Details & Items Purchased */}
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" /> Customer Account
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {order.user?.username || `User #${order.user_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {order.user?.email || 'No email attached'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery Address
                    </span>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {order.shipping_address || 'Standard Shipping'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" /> Products Purchased ({order.items?.length || 0} items)
                  </span>

                  <div className="rounded-lg border border-border divide-y divide-border/60 overflow-hidden">
                    {(order.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-muted/10 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{item.product_name}</p>
                          <span className="text-[11px] text-muted-foreground">
                            Product ID #{item.product_id} &bull; Qty: {item.quantity} &times; ${Number(item.unit_price).toFixed(2)}
                          </span>
                        </div>

                        <span className="font-bold text-foreground font-mono">
                          ${Number(item.total_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">Payment Method: Online / Prepaid</span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2">Grand Total:</span>
                    <span className="text-lg font-extrabold text-foreground font-mono">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
