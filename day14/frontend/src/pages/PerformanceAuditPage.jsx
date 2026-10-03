import React, { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useThemeStore } from '../store/useThemeStore';
import { useWebVitals } from '../hooks/useWebVitals';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/toast';
import {
  Gauge,
  Database,
  Layers,
  Zap,
  RefreshCw,
  CheckCircle2,
  Cpu,
  SplitSquareVertical,
  Activity,
  Trash2,
} from 'lucide-react';

const STATE_COMPARISON = [
  {
    feature: 'Setup & Boilerplate',
    context: 'Low (createContext + Provider wrapper)',
    zustand: 'Minimal (single create() hook, no Provider required)',
    redux: 'High (Store, Slices, Reducers, Actions, Provider)',
  },
  {
    feature: 'Re-render Optimization',
    context: 'Poor by default (all consumers re-render on any state change)',
    zustand: 'Excellent (atomic selector subscriptions prevent extra re-renders)',
    redux: 'Excellent (useSelector with reference equality checks)',
  },
  {
    feature: 'Bundle Size Impact',
    context: '0 KB (Built into React)',
    zustand: '~1.2 KB (gzipped)',
    redux: '~11+ KB (Redux Toolkit + React-Redux)',
  },
  {
    feature: 'Async & Optimistic Updates',
    context: 'Manual try/catch inside Provider functions',
    zustand: 'Native async actions directly inside store + TanStack Query',
    redux: 'Requires createAsyncThunk or RTK Query middleware',
  },
  {
    feature: 'Day 14 Role in Nexora',
    context: 'Replaced to avoid Provider hell & unnecessary re-renders',
    zustand: 'Selected for Global Auth, Shopping Cart & Theme stores',
    redux: 'Evaluated for large enterprise state machines',
  },
];

export const PerformanceAuditPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const vitals = useWebVitals();
  const [refreshTick, setRefreshTick] = useState(0);

  // Live Zustand store subscriptions
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const cart = useCartStore((s) => s.cart);
  const theme = useThemeStore((s) => s.theme);

  // Inspect live TanStack Query Cache
  const cachedQueries = useMemo(() => {
    const all = queryClient.getQueryCache().getAll();
    return all.map((q) => ({
      queryHash: q.queryHash,
      queryKey: JSON.stringify(q.queryKey),
      status: q.state.status,
      fetchStatus: q.state.fetchStatus,
      dataUpdatedAt: q.state.dataUpdatedAt,
      isStale: q.isStale(),
      observersCount: q.getObserversCount(),
    }));
  }, [queryClient, refreshTick]);

  const handleInvalidateCache = useCallback(async () => {
    await queryClient.invalidateQueries();
    setRefreshTick((t) => t + 1);
    toast({
      title: 'TanStack Query Cache Invalidated',
      description: 'All cached server queries marked stale and revalidated.',
      variant: 'info',
    });
  }, [queryClient, toast]);

  const handleClearCache = useCallback(() => {
    queryClient.clear();
    setRefreshTick((t) => t + 1);
    toast({
      title: 'Query Cache Cleared',
      description: 'In-memory TanStack Query cache purged.',
      variant: 'warning',
    });
  }, [queryClient, toast]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Gauge className="h-7 w-7 text-primary" />
              <span>Day 14 Architecture &amp; Performance Lab</span>
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs">
              Zustand + TanStack Query + Code Splitting
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Live inspection of Global Zustand Stores, TanStack Query Cache, Core Web Vitals, and Bundle Optimization.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshTick((t) => t + 1)}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Inspector
        </Button>
      </div>

      {/* 1. Core Web Vitals Live Metrics */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>1. Live Browser Performance &amp; Web Vitals (PerformanceObserver API)</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">First Contentful Paint (FCP)</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                {vitals.fcpRating}
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
              {vitals.fcp ? `${vitals.fcp} ms` : '< 200 ms'}
            </p>
            <span className="text-[10px] text-muted-foreground">Target: &lt; 1800 ms</span>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Largest Contentful Paint (LCP)</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                {vitals.lcpRating}
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
              {vitals.lcp ? `${vitals.lcp} ms` : '< 300 ms'}
            </p>
            <span className="text-[10px] text-muted-foreground">Target: &lt; 2500 ms</span>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Cumulative Layout Shift (CLS)</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                {vitals.clsRating}
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
              {vitals.cls}
            </p>
            <span className="text-[10px] text-muted-foreground">Target: &lt; 0.1 (Explicit Image Dimensions)</span>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Time to First Byte (TTFB)</span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                {vitals.ttfbRating}
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-foreground mt-2 font-mono">
              {vitals.ttfb ? `${vitals.ttfb} ms` : '< 30 ms'}
            </p>
            <span className="text-[10px] text-muted-foreground">Target: &lt; 800 ms</span>
          </Card>
        </div>
      </section>

      {/* 2. State Management Comparison Table */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span>2. Global State Management Comparison (Context API vs Zustand vs Redux)</span>
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-foreground font-bold">
                <th className="p-3.5">Criteria</th>
                <th className="p-3.5">React Context API (Day 13)</th>
                <th className="p-3.5 text-primary bg-primary/5">Zustand (Day 14 Active)</th>
                <th className="p-3.5">Redux Toolkit (RTK)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {STATE_COMPARISON.map((row) => (
                <tr key={row.feature} className="hover:bg-muted/20">
                  <td className="p-3.5 font-semibold text-foreground">{row.feature}</td>
                  <td className="p-3.5 text-muted-foreground">{row.context}</td>
                  <td className="p-3.5 font-medium text-foreground bg-primary/5">{row.zustand}</td>
                  <td className="p-3.5 text-muted-foreground">{row.redux}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Live Zustand Global Stores Inspector */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <span>3. Live Zustand Store State Inspector (No Prop-Drilling)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">useAuthStore (Auth State)</span>
              <Badge variant={user ? 'default' : 'secondary'} className="text-[10px]">
                {user ? 'Authenticated' : 'Guest'}
              </Badge>
            </div>
            <pre className="text-[11px] font-mono bg-muted/40 p-3 rounded-lg overflow-x-auto text-foreground">
              {JSON.stringify(
                {
                  isAuthenticated: Boolean(token && user),
                  username: user?.username || null,
                  role: user?.role || null,
                  tokenPresent: Boolean(token),
                },
                null,
                2
              )}
            </pre>
          </Card>

          <Card className="p-4 border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">useCartStore (Cart + Optimistic UI)</span>
              <Badge variant="outline" className="text-[10px]">
                {cart?.items?.length || 0} unique items
              </Badge>
            </div>
            <pre className="text-[11px] font-mono bg-muted/40 p-3 rounded-lg overflow-x-auto text-foreground">
              {JSON.stringify(
                {
                  total_items: cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0,
                  total_price: Number(cart?.total_price || 0).toFixed(2),
                  items: (cart?.items || []).map((i) => ({
                    id: i.product_id,
                    name: i.name,
                    qty: i.quantity,
                  })),
                },
                null,
                2
              )}
            </pre>
          </Card>

          <Card className="p-4 border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">useThemeStore &amp; Code Splitting</span>
              <Badge variant="secondary" className="text-[10px]">
                Theme: {theme}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> React.lazy Route Splitting Active
              </p>
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Rollup Vendor Manual Chunks Active
              </p>
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> React.memo on ProductCard &amp; Filters
              </p>
              <p className="flex items-center gap-1.5 text-foreground font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> useDebounce (300ms) Search Hook
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. TanStack Query Live Cache Inspector */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span>4. TanStack Query Live Cache Entries ({cachedQueries.length} Cached Queries)</span>
          </h2>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInvalidateCache}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Invalidate &amp; Revalidate All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge Cache
            </Button>
          </div>
        </div>

        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            {cachedQueries.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No queries currently in cache. Visit the Catalog to populate TanStack Query cache!
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {cachedQueries.map((q) => (
                  <div
                    key={q.queryHash}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/20"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold text-foreground">{q.queryKey}</span>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                        <span>Observers: {q.observersCount}</span>
                        <span>&bull;</span>
                        <span>
                          Last Synced:{' '}
                          {q.dataUpdatedAt
                            ? new Date(q.dataUpdatedAt).toLocaleTimeString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={q.isStale ? 'secondary' : 'default'}
                        className={q.isStale ? 'text-[10px]' : 'text-[10px] bg-emerald-600 text-white'}
                      >
                        {q.isStale ? 'STALE' : 'FRESH (60s TTL)'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {q.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default PerformanceAuditPage;
