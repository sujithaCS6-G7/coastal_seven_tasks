import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyOrdersQuery, useOrderDetailQuery } from '../hooks/useOrders';
import { useRealtime } from '../context/RealtimeContext';
import { getErrorMessage } from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  ShoppingBag,
  Package,
  Calendar,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Eye,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { OrderInvoiceGenerator } from '../components/BackgroundJobsPanel';
import type { OrderOut } from '../types/api';


const ORDER_STATUS_FILTERS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const OrderHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { isConnected, wsStatus } = useRealtime();

  const {
    data: orders = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useMyOrdersQuery(true);

  const { data: selectedOrderDetail, isLoading: detailLoading } =
    useOrderDetailQuery(selectedOrderId);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter(
      (order: OrderOut) => (order.status || '').toUpperCase() === statusFilter
    );
  }, [orders, statusFilter]);

  const totalSpent = useMemo(() => {
    return orders.reduce((sum: number, o: OrderOut) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const renderStatusBadge = (status: string) => {
    const normalized = (status || 'PENDING').toUpperCase();
    switch (normalized) {
      case 'DELIVERED':
        return <Badge className="bg-emerald-600 text-white">{normalized}</Badge>;
      case 'SHIPPED':
        return <Badge className="bg-blue-600 text-white">{normalized}</Badge>;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <Badge className="bg-amber-600 text-white">{normalized}</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">{normalized}</Badge>;
      default:
        return <Badge variant="secondary">{normalized}</Badge>;
    }
  };

  const errorMessage = queryError ? getErrorMessage(queryError) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <ShoppingBag className="h-7 w-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My Order History
            </h1>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
              {orders.length} Orders
            </Badge>
            <Badge
              variant="outline"
              data-testid="live-order-ws-badge"
              className={`text-[11px] gap-1 ${
                isConnected
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" /> Live Updates Active
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" /> WS: {wsStatus}
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track your previous purchases, itemized receipts, delivery addresses, and live order statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Catalog
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Orders Placed</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{orders.length}</p>
            </div>
            <Package className="h-8 w-8 text-primary/40" />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Spent</p>
              <p className="text-2xl font-extrabold text-foreground font-mono mt-1">
                ${totalSpent.toFixed(2)}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Shipments</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {
                  orders.filter((o) =>
                    ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(
                      (o.status || '').toUpperCase()
                    )
                  ).length
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {ORDER_STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => setStatusFilter(status)}
            className="text-xs h-8 px-3 shrink-0"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Error State */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading / Empty / Orders List */}
      {isLoading ? (
        <LoadingSpinner text="Loading your order history from FastAPI..." />
      ) : filteredOrders.length === 0 ? (
        <Card className="border border-border text-center py-12">
          <CardContent className="space-y-3">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-base font-bold text-foreground">No orders found</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {statusFilter === 'ALL'
                ? "You haven't placed any orders yet. Start browsing the catalog to place your first order!"
                : `No orders match the status filter "${statusFilter}".`}
            </p>
            <Button size="sm" onClick={() => navigate('/')}>
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: OrderOut) => (
            <Card
              key={order.id}
              data-testid={`order-card-${order.id}`}
              className="border border-border shadow-sm hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 space-y-4">
                {/* Order Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-extrabold font-mono text-foreground">
                        {order.order_number || `ORD-#${order.id}`}
                      </span>
                      {renderStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString()
                          : 'Recent Order'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {order.shipping_address}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Order Total</span>
                      <span className="text-lg font-extrabold font-mono text-foreground">
                        ${Number(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrderId(order.id)}
                      className="text-xs gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                  </div>
                </div>

                {/* Order Items Breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Items ({order.items?.length || 0})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(order.items || []).map((item) => (
                      <div
                        key={item.id || `${order.id}-${item.product_id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">
                            {item.product_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {item.quantity} &times; ${Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          ${Number(item.total_price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day 18: Asynchronous PDF Invoice Generation via Celery */}
                <OrderInvoiceGenerator
                  orderId={order.id}
                  orderNumber={order.order_number || `ORD-#${order.id}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}


      {/* Single Order Detail Modal (GET /orders/{order_id}) */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Order Details Modal"
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                Order Details #{selectedOrderId}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                aria-label="Close order details"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading || !selectedOrderDetail ? (
              <LoadingSpinner text="Fetching order details..." />
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="font-mono font-bold">{selectedOrderDetail.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {renderStatusBadge(selectedOrderDetail.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Address:</span>
                  <span className="font-medium text-right max-w-xs">
                    {selectedOrderDetail.shipping_address}
                  </span>
                </div>
                <div className="border-t border-border pt-2 space-y-1.5">
                  {(selectedOrderDetail.items || []).map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-mono font-semibold">
                        ${Number(item.total_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
                  <span>Total Amount</span>
                  <span className="font-mono">
                    ${Number(selectedOrderDetail.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage;
