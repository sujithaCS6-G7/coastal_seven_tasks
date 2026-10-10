import React, { useEffect, useState } from 'react';
import { taskService } from '../api/taskService';
import { useProductsQuery } from '../hooks/useProducts';
import { OrderInvoiceGenerator, AdminBackgroundJobsCenter } from '../components/BackgroundJobsPanel';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { API_BASE_URL } from '../config/env';
import {
  Cpu,
  FileText,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DemoOrder {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string | null;
  customer: string;
  items_count: number;
}

export const CeleryTasksPage: React.FC = () => {
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const { data: catalogData, refetch: refetchCatalog, isFetching: fetchingCatalog } = useProductsQuery('All');
  const allProducts = catalogData?.products || [];

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await taskService.getDemoOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" data-testid="celery-tasks-page">
      {/* Top Banner */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-emerald-500/10 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-indigo-600 text-white gap-1">
                <Cpu className="h-3.5 w-3.5" /> Day 18 Backend Celery Worker &amp; PostgreSQL Hub
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected to FastAPI ({API_BASE_URL})
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Celery Background Tasks &amp; Database Optimization Lab
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Trigger real asynchronous Celery tasks (PDF Invoice Generation &amp; Bulk CSV Product Import),
              watch real-time task polling (<code>PENDING → STARTED → COMPLETED</code>) with progress bars,
              and see imported CSV products appear live in the PostgreSQL Store Catalog below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Backend Swagger API ({API_BASE_URL}/docs)</span>
            </a>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span>Store Catalog &amp; PG Search</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1 & 2: Bulk CSV Import + SQLAlchemy N+1 Query Optimization Benchmark */}
      <AdminBackgroundJobsCenter />

      {/* Section 3: Live PostgreSQL Products Table (Shows CSV-Imported Products Immediately!) */}
      <Card className="border border-border shadow-sm" data-testid="live-csv-catalog-table">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <span>Live Store Catalog in PostgreSQL ({allProducts.length} Products — Includes CSV Imports)</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Every valid row imported by the Celery CSV task above is saved in the PostgreSQL <code>products</code> table and appears both here and on the main <Link to="/" className="text-primary underline font-semibold">Catalog Home Page (/)</Link>.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCatalog()}
                disabled={fetchingCatalog}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingCatalog ? 'animate-spin' : ''}`} />
                <span>Refresh Catalog</span>
              </Button>
              <Link to="/">
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Open Store Catalog (/)</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2.5 px-3 font-bold">ID</th>
                  <th className="py-2.5 px-3 font-bold">Product Name</th>
                  <th className="py-2.5 px-3 font-bold">Category</th>
                  <th className="py-2.5 px-3 font-bold">Price</th>
                  <th className="py-2.5 px-3 font-bold">Stock</th>
                  <th className="py-2.5 px-3 font-bold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {allProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-primary">#{p.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{p.name}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(p.price).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{p.stock}</td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-md truncate">
                      {p.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Asynchronous PDF Invoice Generation via Celery */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Celery Asynchronous PDF Invoice Generation</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Click <strong>Generate PDF Invoice</strong> on any order below to start the Celery task (
                <code>POST /tasks/invoices/&#123;order_id&#125;</code>), poll <code>GET /tasks/&#123;task_id&#125;</code>, and download the generated PDF 1.4 invoice.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                POST /tasks/invoices/&#123;order_id&#125;
              </Badge>
              <Button variant="ghost" size="sm" onClick={loadOrders} className="h-8 text-xs gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {loadingOrders ? (
            <p className="text-xs text-muted-foreground py-4">Loading orders from PostgreSQL...</p>
          ) : orders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No orders found in database.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">
                        Order #{order.id} • {order.order_number}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customer: <strong className="text-foreground">{order.customer}</strong> •{' '}
                        {order.items_count} item(s) •{' '}
                        <strong className="text-foreground">${order.total_amount.toFixed(2)}</strong>
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px] uppercase">
                      {order.status}
                    </Badge>
                  </div>

                  <OrderInvoiceGenerator orderId={order.id} orderNumber={order.order_number} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CeleryTasksPage;
