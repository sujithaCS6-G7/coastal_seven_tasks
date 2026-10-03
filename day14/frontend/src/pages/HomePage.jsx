import React, { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { getErrorMessage } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import {
  useProductsQuery,
  useInfiniteProductsQuery,
  useDeleteProductMutation,
  useInvalidateProducts,
} from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import {
  LayoutGrid,
  List,
  Zap,
  PackageOpen,
  RefreshCw,
  Plus,
  Shield,
  Database,
  Infinity as InfinityIcon,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

// Component-level Code Splitting for Admin Modal
const ProductFormModal = lazy(() => import('../components/ProductFormModal'));

export const HomePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Admin Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Filtering, Sorting & Pagination Mode States
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300); // 300ms debounce prevents per-keystroke re-renders
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'list'
  const [infiniteMode, setInfiniteMode] = useState(true); // Default true to showcase Day 14 Infinite Scroll

  // TanStack Query: Standard cached query (also used to derive categories)
  const {
    data: fullCatalogData,
    isLoading: isFullLoading,
    isFetching: isFullFetching,
    error: fullError,
    refetch: refetchFull,
    dataUpdatedAt,
  } = useProductsQuery(selectedCategory);

  // TanStack Query: Infinite Scrolling Pagination (pageSize = 3)
  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: infiniteError,
    refetch: refetchInfinite,
  } = useInfiniteProductsQuery(selectedCategory, 3);

  // TanStack Query: Optimistic Delete Mutation
  const deleteProductMutation = useDeleteProductMutation();
  const invalidateProducts = useInvalidateProducts();

  // Intersection Observer sentinel ref for automatic Infinite Scroll
  const loadMoreSentinelRef = useRef(null);

  const handleLoadNextPage = useCallback(() => {
    if (infiniteMode && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [infiniteMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useIntersectionObserver({
    targetRef: loadMoreSentinelRef,
    onIntersect: handleLoadNextPage,
    enabled: infiniteMode && Boolean(hasNextPage) && !isFetchingNextPage,
  });

  // Combine pages when in infinite scroll mode, or use full catalog
  const activeProducts = useMemo(() => {
    if (infiniteMode) {
      if (!infiniteData?.pages) return [];
      const seen = new Set();
      const merged = [];
      for (const page of infiniteData.pages) {
        for (const item of page.products || []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      return merged;
    }
    return fullCatalogData?.products || [];
  }, [infiniteMode, infiniteData, fullCatalogData]);

  const totalServerCount = useMemo(() => {
    if (infiniteMode && infiniteData?.pages?.[0]) {
      return infiniteData.pages[0].total || activeProducts.length;
    }
    return fullCatalogData?.total || activeProducts.length;
  }, [infiniteMode, infiniteData, fullCatalogData, activeProducts.length]);

  const isRedisCached = Boolean(
    infiniteMode ? infiniteData?.pages?.[0]?.cached : fullCatalogData?.cached
  );

  // Derive unique categories (memoized)
  const categories = useMemo(() => {
    const source = fullCatalogData?.products || activeProducts;
    const set = new Set(source.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [fullCatalogData?.products, activeProducts]);

  // Client-side search (using debouncedSearch), filtering, and sorting (memoized)
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...activeProducts];

    // 1. Debounced Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // 2. Price filter
    const min = parseFloat(minPrice);
    if (!isNaN(min) && min >= 0) {
      result = result.filter((p) => p.price >= min);
    }
    const max = parseFloat(maxPrice);
    if (!isNaN(max) && max >= 0) {
      result = result.filter((p) => p.price <= max);
    }

    // 3. In-Stock filter
    if (inStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // 4. Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'featured':
      default:
        result.sort((a, b) => a.id - b.id);
        break;
    }

    return result;
  }, [activeProducts, debouncedSearch, minPrice, maxPrice, inStockOnly, sortBy]);

  // Memoized callbacks (useCallback) to prevent child re-renders
  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setModalOpen(true);
  }, []);

  const handleDeleteProduct = useCallback(
    async (product) => {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete "${product.name}" (ID #${product.id})?`
      );
      if (!confirmed) return;

      try {
        await deleteProductMutation.mutateAsync(product.id);
        toast({
          title: 'Optimistic Delete Complete',
          description: `"${product.name}" removed immediately & synced with TanStack Query cache.`,
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: 'Delete Failed (Rolled Back)',
          description: getErrorMessage(err),
          variant: 'destructive',
        });
      }
    },
    [deleteProductMutation, toast]
  );

  const handleModalSuccess = useCallback(() => {
    invalidateProducts();
  }, [invalidateProducts]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('featured');
  }, []);

  const handleManualRefresh = useCallback(() => {
    refetchFull();
    refetchInfinite();
    toast({
      title: 'TanStack Query Revalidated',
      description: 'Server cache revalidated in background.',
      variant: 'info',
    });
  }, [refetchFull, refetchInfinite, toast]);

  const loading = infiniteMode ? isInfiniteLoading : isFullLoading;
  const errorObj = infiniteMode ? infiniteError : fullError;
  const error = errorObj ? getErrorMessage(errorObj) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors">
      {/* Hero / Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <span>Explore Nexora Gear</span>
            </h1>
            <Badge variant="outline" className="text-[11px] border-primary/40 text-primary bg-primary/5 font-semibold">
              Day 14 Optimized
            </Badge>
            {isAdmin && (
              <Badge variant="default" className="text-xs bg-indigo-600 text-white gap-1 py-1">
                <Shield className="h-3 w-3" /> Admin Mode
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> TanStack Query Active
            </span>
            <span>&bull;</span>
            <span>Zustand Global Store</span>
            <span>&bull;</span>
            <span>Debounced Search (300ms)</span>
            {isRedisCached && (
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Zap className="h-3 w-3 mr-0.5 fill-current" /> Redis + React Query Cached
              </Badge>
            )}
            {dataUpdatedAt > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground/80">
                (Synced {new Date(dataUpdatedAt).toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Infinite Scroll Toggle, Add Product (Admin), Layout Mode, Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Infinite Scroll vs Full Catalog Mode Toggle */}
          <Button
            type="button"
            variant={infiniteMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInfiniteMode((prev) => !prev)}
            className="text-xs gap-1.5"
            title="Toggle TanStack useInfiniteQuery Pagination"
          >
            <InfinityIcon className="h-3.5 w-3.5" />
            <span>{infiniteMode ? 'Infinite Scroll: ON' : 'Infinite Scroll: OFF'}</span>
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingProduct(null);
                setModalOpen(true);
              }}
              className="text-xs font-semibold gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Product</span>
            </Button>
          )}

          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <Button
              variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('grid')}
              aria-label="Grid layout view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={() => setLayoutMode('list')}
              aria-label="List layout view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="text-xs"
            title="Revalidate TanStack Query Cache"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFullFetching ? 'animate-spin' : ''}`} />
            Revalidate
          </Button>
        </div>
      </div>

      {/* Main Content Layout: Filters Sidebar + Products Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <ProductFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            inStockOnly={inStockOnly}
            onInStockToggle={setInStockOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onResetFilters={handleResetFilters}
            totalResults={filteredAndSortedProducts.length}
          />
        </div>

        {/* Products Results Container */}
        <div className="lg:col-span-3">
          {/* Active Filter & Cache Status Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground bg-muted/30 px-3.5 py-2.5 rounded-lg border border-border">
            <p>
              Showing <strong className="text-foreground">{filteredAndSortedProducts.length}</strong> loaded of{' '}
              <strong className="text-foreground">{totalServerCount}</strong> total catalog products
            </p>
            <div className="flex items-center gap-2">
              {searchQuery !== debouncedSearch && (
                <Badge variant="outline" className="text-[10px] animate-pulse">
                  Debouncing search...
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Database className="h-3 w-3 text-primary" />
                {infiniteMode ? 'useInfiniteQuery (Page Chunking)' : 'useQuery (Full Cache)'}
              </Badge>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching cached catalog via TanStack Query..." />
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
              <p className="text-sm font-semibold text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="mt-4 text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">No Products Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No catalog items matched your current search, price, or category criteria.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <>
              {layoutMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredAndSortedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      layout="grid"
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAndSortedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      layout="list"
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
              )}

              {/* Infinite Scroll Sentinel & Load More Controls */}
              {infiniteMode && (
                <div
                  ref={loadMoreSentinelRef}
                  className="mt-8 flex flex-col items-center justify-center py-6 border-t border-dashed border-border"
                >
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading next page of products via useInfiniteQuery...</span>
                    </div>
                  ) : hasNextPage ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        Loaded {activeProducts.length} of {totalServerCount} products
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        className="text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <InfinityIcon className="h-3.5 w-3.5" />
                        <span>Load More Products ({totalServerCount - activeProducts.length} remaining)</span>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      All {totalServerCount} catalog products loaded into TanStack Query cache
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lazy-Loaded Admin Create / Edit Modal */}
      {modalOpen && (
        <Suspense fallback={null}>
          <ProductFormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={handleModalSuccess}
            product={editingProduct}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
